import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { runScan } from "@/lib/scanner";
import { buildReport } from "@/lib/scanner/report-builder";
import { validateScanUrl, sanitiseUrl } from "@/lib/utils/url";
import { saveScan, type ScanRecord } from "@/lib/scans";
import { recordScanDerivatives } from "@/lib/scan-derivatives";
import { saveAudit } from "@/lib/audits";
import { captureError } from "@/lib/observability";

/** Options for a stored scan. `deepAudit` opts into the heavier Full-Audit pass. */
export interface RunAndStoreOptions {
  /**
   * When true, capture the per-rule deep audit (pass/fail/review/n-a + code
   * snapshots for EVERY rule) and store it in the `scan_audits` sidecar in this
   * same flow. Owner-triggered only — it is materially heavier than a funnel
   * scan. The scan row + score are identical either way.
   */
  deepAudit?: boolean;
}

/**
 * Runs a single-page scan for a site's domain and stores the result.
 * SSRF guard: validateScanUrl rejects internal/loopback/private/link-local
 * hosts and non-http(s) protocols before the headless browser ever navigates.
 * This is the single choke-point for every scan (the /api/scan route and cron).
 *
 * When `opts.deepAudit` is set, the engine also returns per-rule audit data
 * (`raw.ruleAudit`) which we persist to `scan_audits` keyed to THIS scan — so
 * the Full Audit report's header score and per-rule rows can never come from
 * two different page loads.
 */
export async function runAndStoreScan(
  client: SupabaseClient,
  siteId: string,
  domain: string,
  opts: RunAndStoreOptions = {}
): Promise<ScanRecord> {
  const url = sanitiseUrl(validateScanUrl(domain)); // throws AppError(INVALID_URL) on SSRF/invalid
  const deepAudit = opts.deepAudit === true;
  const raw = await runScan({
    url,
    wcagLevel: "AA",
    // Deep audits serialise far more nodes, so give the whole run more headroom
    // (the engine caps axe separately and still fails honestly on timeout).
    timeoutMs: deepAudit ? 45_000 : 30_000,
    scanInternalLinks: false,
    deepAudit,
  });
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

  // Deep-audit sidecar — same best-effort contract: a failure here must never
  // break the scan's return path. Written with the same service-role client.
  if (deepAudit && raw.ruleAudit && raw.ruleAudit.length > 0) {
    try {
      await saveAudit(client, siteId, record.id, {
        url: report.url,
        score: report.score,
        scannedAt: report.scannedAt,
        rules: raw.ruleAudit,
        engineMeta: raw.engineMeta,
      });
    } catch (err) {
      captureError(err, { where: "runAndStoreScan.audit", siteId });
    }
  }

  return record;
}
