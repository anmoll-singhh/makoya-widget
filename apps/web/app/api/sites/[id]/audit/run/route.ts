/**
 * /api/sites/[id]/audit/run — AUTHED, owner-only trigger for a DEEP AUDIT (POST).
 *
 * A deep audit re-scans the site with axe reporting ALL result buckets so the
 * Full Audit report can show every rule's outcome + code snapshots. It is
 * materially heavier than a funnel scan, so this route deliberately reuses the
 * SAME back-pressure machinery as /api/scan and adds a tight rate limit:
 *   - `checkRateLimit`      → per-user+site cap (deep audits are expensive).
 *   - `reserveInteractiveSlot` → caps concurrent Chromium instances.
 *   - `acquireScanLock`     → de-dupes with cron + other users (never launches a
 *                             second browser for the same site).
 * On a lock miss we reply 202 (a deep audit is already running) and the client
 * polls GET /api/sites/[id]/audit for the result.
 *
 * AUTH / SECURITY: same discipline as every /api/sites/[id]/* route — 401 (no
 * session), 404 (not owned), service key never used for reads. The actual scan
 * + sidecar write run through the service-role admin client inside
 * runAndStoreScan (both `scans` and `scan_audits` are write-locked to it).
 */
import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getSite } from "@/lib/sites";
import { runAndStoreScan } from "@/lib/scan-runner";
import {
  reserveInteractiveSlot,
  releaseInteractiveSlot,
  acquireScanLock,
  releaseScanLock,
} from "@/lib/scan-queue";
import { checkRateLimit } from "@/lib/rate-limit";
import { captureError } from "@/lib/observability";
import { env } from "@/lib/env.server";

// The engine is Node-only (Playwright/axe); deep audits need the full budget.
export const runtime = "nodejs";
export const maxDuration = 60;

// Deep audits are costly, so throttle hard: a handful per hour per site/owner.
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60 * 60 * 1000;

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await getServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const site = await getSite(supabase, id);
  if (!site || site.ownerId !== user.id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // Per-owner+site throttle. Fails OPEN when Upstash is unconfigured (local dev).
  if (
    await checkRateLimit(`${user.id}:${id}`, {
      name: "audit-run",
      limit: RATE_LIMIT,
      windowMs: RATE_WINDOW_MS,
    })
  ) {
    return NextResponse.json(
      { error: "You've run several full audits recently — please wait a bit before the next one." },
      { status: 429 }
    );
  }

  // Shed load: cap concurrent interactive scans (shared budget with /api/scan).
  const slot = await reserveInteractiveSlot(env.SCAN_INTERACTIVE_MAX_INFLIGHT);
  if (!slot) {
    return NextResponse.json(
      { error: "The scanner is busy right now — please retry in a moment." },
      { status: 503 }
    );
  }

  try {
    // De-dupe: don't launch a second browser if a scan for this site is already
    // running. Longer lease than a funnel scan because deep audits run longer.
    const token = await acquireScanLock(id, 120);
    if (token === null) {
      return NextResponse.json({ status: "in_progress" }, { status: 202 });
    }
    try {
      const record = await runAndStoreScan(getAdminSupabase(), id, site.domain, {
        deepAudit: true,
      });
      return NextResponse.json({ scanId: record.id, ready: true }, { status: 200 });
    } finally {
      await releaseScanLock(id, token);
    }
  } catch (e) {
    // Generic message only — never echo the engine error (it embeds the target
    // URL and could act as an SSRF oracle). The machine code is safe to return.
    captureError(e, { route: "sites/[id]/audit/run" });
    const err = e as { code?: string };
    return NextResponse.json(
      { error: "Could not run the full audit right now.", code: err?.code },
      { status: 502 }
    );
  } finally {
    await releaseInteractiveSlot();
  }
}
