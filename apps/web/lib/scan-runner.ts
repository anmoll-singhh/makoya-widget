import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { runScan } from "@/lib/scanner";
import { buildReport } from "@/lib/scanner/report-builder";
import { saveScan, type ScanRecord } from "@/lib/scans";

/** Runs a single-page scan for a site's domain and stores the result. */
export async function runAndStoreScan(
  client: SupabaseClient,
  siteId: string,
  domain: string
): Promise<ScanRecord> {
  const url = /^https?:\/\//i.test(domain) ? domain : `https://${domain}`;
  const raw = await runScan({ url, wcagLevel: "AA", timeoutMs: 30_000, scanInternalLinks: false });
  const report = buildReport(raw, url);
  return saveScan(client, siteId, url, report);
}
