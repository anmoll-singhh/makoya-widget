import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { runScan } from "@/lib/scanner";
import { buildReport } from "@/lib/scanner/report-builder";
import { validateScanUrl, sanitiseUrl } from "@/lib/utils/url";
import { saveScan, type ScanRecord } from "@/lib/scans";
import { recordScanDerivatives } from "@/lib/scan-derivatives";
import { captureError } from "@/lib/observability";

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
  const record = await saveScan(client, siteId, url, report);

  // Fire-AFTER-store: derive trackable `issues` rows + a `scan_completed`
  // activity entry from the now-persisted scan. This is BEST-EFFORT and must
  // NEVER alter or break this function's result. `recordScanDerivatives` already
  // swallows every failure into captureError; the extra try/catch here is a
  // belt-and-suspenders guarantee that nothing — not even an unexpected synchronous
  // throw — can escape into the scan's return path. Requires the service-role
  // `client` (both targets are write-locked to the service key); the scan route
  // and cron rescan already pass the admin client.
  try {
    await recordScanDerivatives(client, siteId, record.id, report);
  } catch (err) {
    captureError(err, { where: "runAndStoreScan.derivatives", siteId });
  }

  return record;
}
