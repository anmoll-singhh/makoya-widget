import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { runScan } from "@/lib/scanner";
import { buildReport } from "@/lib/scanner/report-builder";
import { validateScanUrl, sanitiseUrl } from "@/lib/utils/url";
import { saveScan, type ScanRecord } from "@/lib/scans";

/**
 * Runs a single-page scan for a site's domain and stores the result.
 * SSRF guard: validateScanUrl rejects internal/loopback/private/link-local
 * hosts and non-http(s) protocols before the headless browser ever navigates.
 * This is the single choke-point for every scan (the /api/scan route and cron).
 */
export async function runAndStoreScan(
  client: SupabaseClient,
  siteId: string,
  domain: string
): Promise<ScanRecord> {
  const url = sanitiseUrl(validateScanUrl(domain)); // throws AppError(INVALID_URL) on SSRF/invalid
  const raw = await runScan({ url, wcagLevel: "AA", timeoutMs: 30_000, scanInternalLinks: false });
  const report = buildReport(raw, url);
  return saveScan(client, siteId, url, report);
}
