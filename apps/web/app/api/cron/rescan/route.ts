import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { runAndStoreScan } from "@/lib/scan-runner";
import { captureError } from "@/lib/observability";

export const runtime = "nodejs";
export const maxDuration = 60;

const STALE_MS = 7 * 24 * 60 * 60 * 1000;

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
  const { data: sites } = await admin.from("sites").select("id, domain");
  let scanned = 0;
  let failed = 0;
  for (const s of sites ?? []) {
    const { data: latest } = await admin
      .from("scans").select("created_at").eq("site_id", s.id)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    const stale = !latest || Date.now() - new Date(latest.created_at).getTime() > STALE_MS;
    if (!stale) continue;
    try {
      await runAndStoreScan(admin, s.id, s.domain);
      scanned++;
    } catch (e) {
      failed++;
      captureError(e, { route: "cron/rescan", siteId: s.id });
    }
  }
  return NextResponse.json({ ok: true, scanned, failed });
}
