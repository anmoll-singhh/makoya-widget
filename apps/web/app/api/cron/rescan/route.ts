import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { runAndStoreScan } from "@/lib/scan-runner";

export const runtime = "nodejs";
export const maxDuration = 60;

const STALE_MS = 7 * 24 * 60 * 60 * 1000;

export async function GET(req: Request) {
  if (req.headers.get("x-cron-secret") !== process.env.CRON_SECRET) {
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
      // Observable: a persistently failing site is logged and counted.
      console.error(`[cron/rescan] scan failed for site ${s.id} (${s.domain}):`, e instanceof Error ? e.message : e);
    }
  }
  return NextResponse.json({ ok: true, scanned, failed });
}
