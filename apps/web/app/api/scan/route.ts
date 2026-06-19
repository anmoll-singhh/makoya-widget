import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getSite } from "@/lib/sites";
import { getLatestScan } from "@/lib/scans";
import { runAndStoreScan } from "@/lib/scan-runner";
import { topPlainIssues } from "@/lib/scanner/plain-language";
import type { AccessibilityReport } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const STALE_MS = 7 * 24 * 60 * 60 * 1000;

export async function POST(req: Request) {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
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
  if (!site || site.ownerId !== user.id) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  // Recency cache: reuse a recent scan, else run a fresh one (stored via service role).
  let scan = await getLatestScan(supabase, siteId);
  const fresh = scan && Date.now() - new Date(scan.createdAt).getTime() < STALE_MS;
  if (!fresh) {
    try {
      scan = await runAndStoreScan(getAdminSupabase(), siteId, site.domain);
    } catch (e) {
      const err = e as { message?: string; code?: string };
      return NextResponse.json({ error: err?.message ?? "scan failed", code: err?.code }, { status: 502 });
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
