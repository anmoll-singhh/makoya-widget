/**
 * lib/scan-derivatives.ts — turns a freshly-STORED scan into its two side
 * artifacts: the trackable `issues` rows (v3.1 Audit/Issues screen) and a
 * `scan_completed` entry in the `activity_log` feed.
 *
 * Why this lives in its own file (not inline in scan-runner.ts):
 *  - It is the SINGLE place that derives issues + activity from a scan, so both
 *    the /api/scan route and the cron rescan get identical behaviour for free.
 *  - It is pure orchestration over `upsertIssuesFromScan` + `logActivity` and so
 *    is unit-testable with a fake client WITHOUT importing the headless scan
 *    engine (Playwright/axe) that scan-runner.ts pulls in.
 *
 * NON-NEGOTIABLE resilience contract — this runs on the LIVE scan choke-point:
 *  - It MUST be impossible for this to throw into the scan's return path. Every
 *    failure is sent to `captureError` and swallowed; the scan result must come
 *    back even if these best-effort writes fail entirely.
 *  - It fires AFTER the scan row is persisted (it needs the stored `scanId`).
 *  - It writes through the SERVICE-ROLE client only — `issues` and `activity_log`
 *    are both write-locked to the service key (RLS: select-only owner policy, no
 *    write policy), exactly like `leads`. Callers (scan route + cron) already
 *    pass the admin client into the runner.
 *  - Public/ephemeral scans have no owning site → no `siteId` → we skip cleanly.
 *
 * Honesty: nothing here asserts any WCAG/ADA "compliance" — it records which
 * rules a scan found failing and that a scan completed.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AccessibilityReport } from "@/types";
import { upsertIssuesFromScan } from "@/lib/issues";
import { logActivity } from "@/lib/activity";
import { captureError } from "@/lib/observability";

/**
 * Best-effort: upsert the scan's failing rules into `issues`, then append a
 * `scan_completed` activity entry. NEVER throws — any infra failure is captured
 * and swallowed so the originating scan can still return its result.
 *
 * @param service service-role Supabase client (required — both targets are
 *   write-locked to the service key).
 * @param siteId owning site id; empty/falsey for a public ephemeral scan → skip.
 * @param scanId the id of the just-stored scan row (links issues to the scan).
 * @param report the built report; we read `report.issues` (grouped) + `report.score`.
 */
export async function recordScanDerivatives(
  service: SupabaseClient,
  siteId: string,
  scanId: string,
  report: AccessibilityReport
): Promise<void> {
  // Public/ephemeral scans own no site row → nothing to persist or feed.
  if (!siteId) return;

  try {
    await upsertIssuesFromScan(service, siteId, scanId, report.issues);
    await logActivity(service, {
      siteId,
      type: "scan_completed",
      summary: `Scan completed — score ${report.score}`,
    });
  } catch (err) {
    // Swallow: derivatives are best-effort and must NEVER break the scan path.
    captureError(err, { where: "recordScanDerivatives", siteId, scanId });
  }
}
