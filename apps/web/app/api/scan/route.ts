import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getSite } from "@/lib/sites";
import { getLatestScan } from "@/lib/scans";
import { runAndStoreScan } from "@/lib/scan-runner";
import { topPlainIssues } from "@/lib/scanner/plain-language";
import {
  reserveInteractiveSlot,
  releaseInteractiveSlot,
  acquireScanLock,
  releaseScanLock,
} from "@/lib/scan-queue";
import { env } from "@/lib/env.server";
import type { AccessibilityReport } from "@/types";
import type { ScanRecord } from "@/lib/scans";

export const runtime = "nodejs";
export const maxDuration = 60;

const STALE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Wait briefly for an IN-PROGRESS scan (started by the cron worker or another user)
 * to land, instead of launching a second Chromium for the same site. Polls the
 * recency cache every 2.5s for up to ~40s (well under maxDuration 60). Returns the
 * fresh scan if one appears, else null (caller replies 202 "in_progress").
 */
async function pollForFreshScan(
  client: Parameters<typeof getLatestScan>[0],
  siteId: string
): Promise<ScanRecord | null> {
  for (let i = 0; i < 16; i++) {
    await new Promise((r) => setTimeout(r, 2500));
    const s = await getLatestScan(client, siteId);
    if (s && Date.now() - new Date(s.createdAt).getTime() < STALE_MS) return s;
  }
  return null;
}

export async function POST(req: Request) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { siteId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const siteId = body?.siteId;
  if (!siteId) return NextResponse.json({ error: "siteId required" }, { status: 400 });

  const site = await getSite(supabase, siteId);
  if (!site || site.ownerId !== user.id)
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  // Recency cache: reuse a recent scan, else run a fresh one (stored via service role).
  let scan = await getLatestScan(supabase, siteId);
  const fresh = scan && Date.now() - new Date(scan.createdAt).getTime() < STALE_MS;
  if (!fresh) {
    // Shed load: cap concurrent INTERACTIVE scans so a burst can't spawn unbounded
    // Chromium. Fails OPEN when Upstash is unconfigured (local dev).
    const slot = await reserveInteractiveSlot(env.SCAN_INTERACTIVE_MAX_INFLIGHT);
    if (!slot) {
      return NextResponse.json(
        { error: "The scanner is busy right now — please retry in a moment." },
        { status: 503 }
      );
    }
    try {
      // De-dupe: if a scan for this site is already running (cron worker or another
      // user), don't launch a SECOND Chromium — wait briefly for its result. The lock
      // is shared with the worker, so cron + interactive never collide.
      const token = await acquireScanLock(siteId, 90);
      if (token === null) {
        const polled = await pollForFreshScan(supabase, siteId);
        if (polled) {
          scan = polled;
        } else {
          return NextResponse.json({ status: "in_progress" }, { status: 202 });
        }
      } else {
        try {
          scan = await runAndStoreScan(getAdminSupabase(), siteId, site.domain);
        } finally {
          await releaseScanLock(siteId, token);
        }
      }
    } catch (e) {
      // Generic message only — never echo the engine error text, which embeds
      // the target URL and could act as an SSRF oracle. The machine code is safe.
      const err = e as { code?: string };
      return NextResponse.json(
        { error: "Could not scan this site right now.", code: err?.code },
        { status: 502 }
      );
    } finally {
      await releaseInteractiveSlot();
    }
  }
  const report = { issues: scan!.issues } as AccessibilityReport;
  return NextResponse.json({
    scanId: scan!.id,
    score: scan!.score,
    totals: scan!.totals,
    createdAt: scan!.createdAt,
    plainTop3: topPlainIssues(report, 3),
  });
}
