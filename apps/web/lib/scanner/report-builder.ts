/**
 * lib/scanner/report-builder.ts
 *
 * Converts a `RawScanResult` (engine output) into the public
 * `AccessibilityReport` shape (API output).
 *
 * Why a dedicated builder?
 * ─────────────────────────
 * The route handler's job is orchestration — parsing requests, calling the
 * engine, returning responses. Embedding report construction logic there
 * would make the handler hard to unit-test and would leak domain decisions
 * (grouping, scoring, totals) into the HTTP layer.
 *
 * This builder is:
 *  - Pure: no I/O, no side-effects — takes raw data, returns a report.
 *  - Testable: input/output are plain serialisable objects.
 *  - Single-responsibility: the only file that knows how RawScanResult
 *    maps to AccessibilityReport.
 *
 * Report structure produced:
 * ──────────────────────────
 *  score          — 0–100 integer derived from weighted violation counts.
 *  totals         — { critical, serious, moderate, minor, total } counts.
 *  issues         — violations grouped into four severity buckets.
 *  durationMs     — wall-clock milliseconds from browser launch to result.
 *  scannedAt      — ISO 8601 timestamp from the engine.
 *  wcagLevel      — the level that was scanned against.
 *  javascriptRendered — always true (Chromium renders JS before axe runs).
 */

import type { AccessibilityReport, AccessibilityIssue, IssueTotals, PageScanSummary } from "@/types";
import { scoreFromReport } from "@/lib/utils/score";
import type { RawScanResult, RawAxeViolation } from "./types";

// ---------------------------------------------------------------------------
// Severity grouping
// ---------------------------------------------------------------------------

/** Severity levels in priority order (used to index into the issues object). */
const SEVERITY_LEVELS = ["critical", "serious", "moderate", "minor"] as const;
type Severity = (typeof SEVERITY_LEVELS)[number];

/**
 * Converts a `RawAxeViolation` to the flat `AccessibilityIssue` shape that
 * crosses the HTTP boundary.
 *
 * The `nodes` array is passed through as-is — it is already normalised and
 * HTML-truncated by the scanner engine.
 */
function violationToIssue(violation: RawAxeViolation): AccessibilityIssue {
  return {
    id:          violation.id,
    description: violation.description,
    help:        violation.help,
    impact:      violation.impact,
    tags:        violation.tags,
    helpUrl:     violation.helpUrl,
    nodes:       violation.nodes,
  };
}

/**
 * Groups a flat array of violations into the four severity buckets.
 *
 * Violations without a recognised impact (null) fall into `minor` — this is
 * consistent with axe-core's own fallback behaviour and prevents them from
 * being silently dropped.
 */
function groupBySeverity(
  violations: RawAxeViolation[]
): AccessibilityReport["issues"] {
  const groups: AccessibilityReport["issues"] = {
    critical: [],
    serious:  [],
    moderate: [],
    minor:    [],
  };

  for (const v of violations) {
    const severity: Severity =
      v.impact !== null && (SEVERITY_LEVELS as readonly string[]).includes(v.impact)
        ? (v.impact as Severity)
        : "minor";

    groups[severity].push(violationToIssue(v));
  }

  return groups;
}

/**
 * Builds the `IssueTotals` object from the already-grouped issues.
 * Computing totals from the grouped arrays (rather than from the raw
 * violations list) ensures the numbers are always consistent with
 * what is returned in `issues`.
 */
function buildTotals(issues: AccessibilityReport["issues"]): IssueTotals {
  const critical = issues.critical.length;
  const serious  = issues.serious.length;
  const moderate = issues.moderate.length;
  const minor    = issues.minor.length;

  return {
    critical,
    serious,
    moderate,
    minor,
    total: critical + serious + moderate + minor,
  };
}

// ---------------------------------------------------------------------------
// Public builder
// ---------------------------------------------------------------------------

/**
 * Constructs the complete `AccessibilityReport` from a raw engine result.
 *
 * This is the single function the route handler calls — it handles grouping,
 * totals, and scoring so the handler stays clean.
 *
 * @param raw        Output from `runScan`.
 * @param requestUrl The sanitised URL from the request (used as the canonical
 *                   URL in the report; may differ from `raw.url` when the
 *                   engine follows a redirect).
 * @returns          Fully-populated `AccessibilityReport` ready to serialise.
 */
export function buildReport(
  raw: RawScanResult,
  requestUrl: string
): AccessibilityReport {
  const issues  = groupBySeverity(raw.violations);
  const totals  = buildTotals(issues);
  const score   = scoreFromReport(issues);

  return {
    url:                raw.url || requestUrl,
    scannedAt:          raw.scannedAt,
    wcagLevel:          raw.wcagLevel,
    score,
    issues,
    totalIssues:        totals.total,
    totals,
    javascriptRendered: raw.javascriptRendered,
    durationMs:         raw.durationMs,
    isPartialScan:      raw.isPartialScan,
    screenshot:         raw.screenshot,
  };
}

// ---------------------------------------------------------------------------
// Multi-page merged report builder
// ---------------------------------------------------------------------------

/**
 * Builds a unified `AccessibilityReport` from pre-merged violations produced
 * by the multi-scan orchestrator.
 *
 * The `violations` parameter is the output of `mergeViolations()` — already
 * cross-page deduplicated.  The `homepageResult` provides metadata (url,
 * scannedAt, wcagLevel, javascriptRendered) so the report looks identical
 * to a regular single-page report from the consumer's perspective.
 *
 * @param mergedViolations  Deduplicated violations across all scanned pages.
 * @param homepageResult    The homepage `RawScanResult` used for metadata.
 * @param pageResults       Per-page summaries for the UI breakdown panel.
 * @param pagesScanned      Total number of pages included in the merge.
 * @param requestUrl        The original sanitised request URL.
 */
export function buildMergedReport(
  mergedViolations: RawAxeViolation[],
  homepageResult: RawScanResult,
  pageResults: PageScanSummary[],
  pagesScanned: number,
  requestUrl: string
): AccessibilityReport {
  const issues     = groupBySeverity(mergedViolations);
  const totals     = buildTotals(issues);
  const score      = scoreFromReport(issues);
  const durationMs = pageResults.reduce((sum, p) => sum + p.durationMs, 0);

  return {
    url:                homepageResult.url || requestUrl,
    scannedAt:          homepageResult.scannedAt,
    wcagLevel:          homepageResult.wcagLevel,
    score,
    issues,
    totalIssues:        totals.total,
    totals,
    javascriptRendered: homepageResult.javascriptRendered,
    durationMs,
    pageResults,
    pagesScanned,
  };
}
