/**
 * /api/cron/scan-dispatch — the DISPATCHER half of the scan pipeline (every minute).
 *
 * Claims a bounded batch of due jobs from the Redis queue (leasing each via the
 * visibility timeout) and fans them out as parallel POSTs to the worker route
 * (/api/internal/scan-worker). The worker returns 202 in <1s and runs Chromium in
 * the background (one per instance — Vercel scales instances horizontally), so this
 * dispatcher only ever awaits fast acks and comfortably finishes within 60s.
 *
 * The batch size (SCAN_DISPATCH_BATCH) is the concurrency cap AND the cost dial:
 * ~D concurrent worker instances per minute. Raise it for more throughput, lower it
 * to cut cost / stay under your Vercel concurrent-execution limit.
 *
 * Reliability: claimBatch leases jobs (not removes), so if a worker never acks (crash,
 * freeze) the job re-surfaces after the lease and is retried; after MAX_DELIVERIES it
 * is dead-lettered by the worker. Never throws — a Redis/worker blip just means this
 * tick dispatches fewer (or zero) jobs; the next tick catches up.
 */
import { NextResponse } from "next/server";
import { claimBatch, queueDepth } from "@/lib/scan-queue";
import { env } from "@/lib/env.server";
import { track } from "@/lib/observability";

export const runtime = "nodejs";
export const maxDuration = 60;

// Lease long enough to cover the worker's max scan time (worker maxDuration 300s)
// plus slack, so a slow-but-alive scan is never double-dispatched.
const VISIBILITY_MS = 6 * 60 * 1000;

export async function GET(req: Request) {
  const expected = env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  const headerSecret = req.headers.get("x-cron-secret");
  if (!expected || (auth !== `Bearer ${expected}` && headerSecret !== expected)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Without a reachable worker URL there is nothing to dispatch TO (e.g. local dev).
  // Don't claim jobs we can't deliver — leave them visible for a real deployment.
  if (!env.APP_URL) {
    return NextResponse.json({ ok: true, dispatched: 0, reason: "no APP_URL" });
  }

  const batch = Math.max(0, env.SCAN_DISPATCH_BATCH);
  const ids = await claimBatch(batch, VISIBILITY_MS);
  if (ids.length === 0) {
    return NextResponse.json({ ok: true, dispatched: 0, queueDepth: await queueDepth() });
  }

  const workerUrl = `${env.APP_URL}/api/internal/scan-worker`;
  const results = await Promise.allSettled(
    ids.map((siteId) =>
      fetch(workerUrl, {
        method: "POST",
        headers: { "content-type": "application/json", "x-scan-secret": env.SCAN_WORKER_SECRET },
        body: JSON.stringify({ siteId }),
        // The worker replies 202 fast; cap the wait so one unreachable instance
        // can't stall the whole dispatch tick.
        signal: AbortSignal.timeout(10_000),
      })
    )
  );
  const dispatched = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.length - dispatched;

  // Jobs that failed to dispatch keep their lease and re-surface after VISIBILITY_MS,
  // so they are retried next tick — no explicit requeue needed.
  track("scan_dispatch_tick", { dispatched, failed, queueDepth: await queueDepth() });
  return NextResponse.json({ ok: true, dispatched, failed });
}
