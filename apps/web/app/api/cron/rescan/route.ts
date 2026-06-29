/**
 * /api/cron/rescan — the PRODUCER half of the scan pipeline (daily Vercel Cron).
 *
 * It no longer scans anything. The old version looped over EVERY site, ran an N+1
 * "latest scan" query per site, and scanned inline inside one 60s function — which
 * dies past a few hundred sites and OOMs running Chromium serially. Now it just
 * ENQUEUES stale site ids onto the Redis queue (lib/scan-queue.ts); the dispatcher
 * cron (/api/cron/scan-dispatch) claims bounded batches and fans them out to the
 * worker (/api/internal/scan-worker), one Chromium per Vercel instance.
 *
 * Stale = no scan in 7 days (or never scanned), computed by the set-based,
 * keyset-paginated `sites_needing_rescan` RPC so finding stale sites is cheap even
 * at hundreds of thousands of rows. Enqueue dedupes automatically (ZSET member).
 */
import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { enqueueSites, queueDepth } from "@/lib/scan-queue";
import { captureError, track } from "@/lib/observability";

export const runtime = "nodejs";
export const maxDuration = 60;

const STALE_MS = 7 * 24 * 60 * 60 * 1000;
const PAGE = 1000;

export async function GET(req: Request) {
  // Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}`. Also accept an
  // `x-cron-secret` header for manual invocation. Fail closed if CRON_SECRET is unset.
  const expected = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  const headerSecret = req.headers.get("x-cron-secret");
  if (!expected || (auth !== `Bearer ${expected}` && headerSecret !== expected)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const admin = getAdminSupabase();
  const staleBefore = new Date(Date.now() - STALE_MS).toISOString();
  let after: string | null = null;
  let enqueued = 0;
  try {
    // Keyset-paginate through stale sites and enqueue each page. Bounded loop guard
    // (defensive) in case of an unexpectedly huge backlog.
    for (let guard = 0; guard < 10_000; guard++) {
      const { data, error } = (await admin.rpc("sites_needing_rescan", {
        p_stale_before: staleBefore,
        p_limit: PAGE,
        p_after: after,
      })) as { data: { id: string }[] | null; error: { message?: string } | null };
      if (error) throw error;
      const ids = (data ?? []).map((r) => r.id);
      if (ids.length === 0) break;
      await enqueueSites(ids);
      enqueued += ids.length;
      after = ids[ids.length - 1];
      if (ids.length < PAGE) break;
    }
  } catch (e) {
    captureError(e, { route: "cron/rescan" });
    return NextResponse.json({ error: "enqueue failed" }, { status: 502 });
  }

  const depth = await queueDepth();
  track("scan_rescan_enqueued", { enqueued, queueDepth: depth });
  return NextResponse.json({ ok: true, enqueued, queueDepth: depth });
}
