import type { SupabaseClient } from "@supabase/supabase-js";
import type { AccessibilityReport } from "@/types";
import { scanRowToRecord, type ScanRecord } from "./scans-mappers";

export type { ScanRecord };

export async function saveScan(
  client: SupabaseClient,
  siteId: string,
  url: string,
  report: AccessibilityReport
): Promise<ScanRecord> {
  const { data, error } = await client
    .from("scans")
    .insert({
      site_id: siteId,
      url,
      score: report.score,
      totals: report.totals,
      issues: report.issues,
      score_breakdown: report.scoreBreakdown ?? null,
      engine_meta: report.engineMeta ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return scanRowToRecord(data);
}

export async function getLatestScan(
  client: SupabaseClient,
  siteId: string
): Promise<ScanRecord | null> {
  const { data, error } = await client
    .from("scans")
    .select("*")
    .eq("site_id", siteId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? scanRowToRecord(data) : null;
}

/** One point on the per-scan score-over-time trend (the Overview sparkline). */
export interface ScoreTrendPoint {
  scannedAt: string;
  score: number;
}

/**
 * Returns the site's last `limit` real scan scores as a chronological
 * (oldest → newest) trend of `{ scannedAt, score }`. Unlike the MONTHLY rollup
 * (lib/reports.ts), which only exists after a service-role recompute job runs,
 * this reads the raw `scans` table directly so a site that has simply been
 * scanned a few times has a usable trend immediately.
 *
 * RLS scopes the read to the caller's own sites (pass the cookie-bound client).
 * Rows with a non-numeric score are skipped defensively. Throws on infra error,
 * matching the rest of this module (the authed route surfaces a generic 500).
 */
export async function getScoreTrend(
  client: SupabaseClient,
  siteId: string,
  limit = 12
): Promise<ScoreTrendPoint[]> {
  const { data, error } = await client
    .from("scans")
    .select("score, created_at")
    .eq("site_id", siteId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;

  // Fetched newest-first (so the `limit` keeps the most RECENT N); reverse to
  // chronological for charting. Drop any row with a non-finite score.
  return (data ?? [])
    .filter((r: any) => typeof r.score === "number" && Number.isFinite(r.score))
    .map((r: any): ScoreTrendPoint => ({ scannedAt: r.created_at, score: r.score }))
    .reverse();
}

export async function createConsultationRequest(
  client: SupabaseClient,
  args: { siteId: string; scanId: string | null; type: "full_report" | "book_call"; note?: string }
): Promise<void> {
  const { error } = await client.from("consultation_requests").insert({
    site_id: args.siteId,
    scan_id: args.scanId,
    type: args.type,
    note: args.note ?? null,
  });
  if (error) throw error;
}
