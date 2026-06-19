import type { SupabaseClient } from "@supabase/supabase-js";
import type { AccessibilityReport } from "@/types";
import { scanRowToRecord, type ScanRecord } from "./scans-mappers";

export type { ScanRecord };

export async function saveScan(
  client: SupabaseClient, siteId: string, url: string, report: AccessibilityReport
): Promise<ScanRecord> {
  const { data, error } = await client
    .from("scans")
    .insert({ site_id: siteId, url, score: report.score, totals: report.totals, issues: report.issues })
    .select("*")
    .single();
  if (error) throw error;
  return scanRowToRecord(data);
}

export async function getLatestScan(client: SupabaseClient, siteId: string): Promise<ScanRecord | null> {
  const { data, error } = await client
    .from("scans").select("*").eq("site_id", siteId)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return data ? scanRowToRecord(data) : null;
}

export async function createConsultationRequest(
  client: SupabaseClient,
  args: { siteId: string; scanId: string | null; type: "full_report" | "book_call"; note?: string }
): Promise<void> {
  const { error } = await client.from("consultation_requests").insert({
    site_id: args.siteId, scan_id: args.scanId, type: args.type, note: args.note ?? null,
  });
  if (error) throw error;
}
