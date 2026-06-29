/**
 * /api/internal/scan-worker — the WORKER half of the scan pipeline.
 *
 * Invoked ONLY by the dispatcher (/api/cron/scan-dispatch) with a shared secret. It
 * is the single place a headless Chromium runs in the BACKGROUND path — exactly ONE
 * scan per function instance, so heavy Chromium never contends inside one function;
 * Vercel scales instances horizontally up to the dispatcher's batch size.
 *
 * Flow:
 *   1. Auth by `x-scan-secret` (SCAN_WORKER_SECRET, falls back to CRON_SECRET). This
 *      endpoint launches Chromium against a DB-supplied domain, so an unauthenticated
 *      caller would be a DoS/SSRF amplifier — reject hard. (The SSRF guard inside
 *      runAndStoreScan still protects the target URL.)
 *   2. Per-site lock (shared with the interactive route) so cron + a user can't both
 *      scan the same site at once. Already-locked → no-op 200.
 *   3. Idempotency re-check: if a FRESH scan already exists (the 7-day rule), ack and
 *      return — this is what makes at-least-once delivery a safe no-op on redelivery.
 *   4. Otherwise return 202 immediately and run the scan in `after()` (Fluid keeps the
 *      instance alive to maxDuration); ack on success, dead-letter after repeated
 *      failures, always release the lock.
 */
import { NextResponse, after } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getSite } from "@/lib/sites";
import { getLatestScan } from "@/lib/scans";
import { runAndStoreScan } from "@/lib/scan-runner";
import {
  acquireScanLock,
  releaseScanLock,
  ackScan,
  recordDeliveryAndMaybeDeadLetter,
} from "@/lib/scan-queue";
import { captureError, track } from "@/lib/observability";

export const runtime = "nodejs";
export const maxDuration = 300;

const STALE_MS = 7 * 24 * 60 * 60 * 1000;
const LOCK_TTL_SEC = 180; // > worst-case scan; the queue lease (6m) is the real backstop

export async function POST(req: Request) {
  const secret = req.headers.get("x-scan-secret");
  if (secret !== process.env.SCAN_WORKER_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let siteId: string | undefined;
  try {
    siteId = (await req.json())?.siteId;
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  if (!siteId) return NextResponse.json({ error: "siteId required" }, { status: 400 });

  // Take the per-site lock. If another scan holds it, this is a no-op — leave the job
  // leased; it will re-surface and we'll retry if that scan didn't ack.
  const token = await acquireScanLock(siteId, LOCK_TTL_SEC);
  if (token === null) {
    return NextResponse.json({ ok: true, skipped: "locked" });
  }

  const admin = getAdminSupabase();
  const site = await getSite(admin, siteId);
  if (!site) {
    // Site deleted since enqueue → drop the job, free the lock.
    await ackScan(siteId);
    await releaseScanLock(siteId, token);
    return NextResponse.json({ ok: true, skipped: "no-site" });
  }

  // Idempotency: a fresh scan already exists → nothing to do (safe on redelivery).
  const latest = await getLatestScan(admin, siteId);
  if (latest && Date.now() - new Date(latest.createdAt).getTime() < STALE_MS) {
    await ackScan(siteId);
    await releaseScanLock(siteId, token);
    return NextResponse.json({ ok: true, skipped: "fresh" });
  }

  const id = siteId; // narrow for the closure
  after(async () => {
    try {
      await runAndStoreScan(admin, id, site.domain);
      await ackScan(id);
      track("scan_worker_completed", { siteId: id });
    } catch (e) {
      const dead = await recordDeliveryAndMaybeDeadLetter(id);
      captureError(e, { route: "internal/scan-worker", siteId: id, deadLettered: dead });
    } finally {
      await releaseScanLock(id, token);
    }
  });

  return NextResponse.json({ ok: true, accepted: true }, { status: 202 });
}
