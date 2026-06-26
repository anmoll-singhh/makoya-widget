/**
 * app/api/cron/recompute-reports/route.ts — the scheduler for the v3.1 monthly
 * Reports rollup.
 *
 * `lib/reports.recomputeMonthly` upserts ONE site's `monthly_reports` row for a
 * given 'YYYY-MM' period, but nothing called it on a schedule — this route is
 * that caller. A Vercel Cron (see vercel.json) hits it daily and it recomputes
 * the CURRENT UTC month's rollup for every site, so each site's latest score +
 * issue/fix counts stay fresh without a manual trigger. Recomputing the open
 * month repeatedly is intentionally idempotent: the upsert is keyed on
 * (site_id, period), so a daily run just overwrites the in-progress month.
 *
 * Auth mirrors app/api/cron/rescan EXACTLY: Vercel Cron sends
 * `Authorization: Bearer ${CRON_SECRET}`; we also accept an `x-cron-secret`
 * header for manual invocation. Fail CLOSED if CRON_SECRET is unset.
 *
 * Resilience: writes go through the SERVICE-ROLE client (the table is
 * write-locked to the service key, same as rescan). Each site is recomputed in
 * its own try/catch so one bad site can't abort the batch — failures route
 * through `captureError` (the observability seam, never raw console) and are
 * counted. The response is a small generic JSON summary.
 */
import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { recomputeMonthly, periodOf } from "@/lib/reports";
import { captureError } from "@/lib/observability";

export const runtime = "nodejs";
export const maxDuration = 60;

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
  const period = periodOf(new Date().toISOString());
  const { data: sites } = await admin.from("sites").select("id");

  let processed = 0;
  for (const s of sites ?? []) {
    try {
      await recomputeMonthly(admin, s.id, period);
      processed++;
    } catch (e) {
      // One persistently failing site must not abort the rest of the batch.
      captureError(e, { route: "cron/recompute-reports", siteId: s.id, period });
    }
  }

  return NextResponse.json({ ok: true, processed });
}
