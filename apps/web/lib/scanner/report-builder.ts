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
import { scoreBreakdownFromReport } from "@/lib/utils/score";
import { deriveEvidence } from "./enrich";
import type { RawScanResult, RawAxeViolation } from "./types";

// ---------------------------------------------------------------------------
// Severity grouping
// ---------------------------------------------------------------------------

/** Severity levels in priority order (used to index into the issues object). */
const SEVERITY_LEVELS = ["critical", "serious", "moderate", "minor"] as const;
type Severity = (typeof SEVERITY_LEVELS)[number];

/**
 * Converts a `RawAxeViolation` to the enriched `AccessibilityIssue` shape that
 * crosses the HTTP boundary.
 *
 * Enrichment adds the evidence every issue must carry: the impacted WCAG
 * criterion + level, plain-language "why it matters / who it affects", and the
 * TRUE instance count (drives the score). `pointsContributed` is attached
 * afterwards once the score breakdown is computed. The `nodes` array is passed
 * through as-is (already normalised, display-capped, and HTML-truncated by the
 * engine).
 */
function violationToIssue(violation: RawAxeViolation): AccessibilityIssue {
  const evidence = deriveEvidence(
    violation.id,
    violation.tags,
    violation.help,
    violation.description
  );
  return {
    id:            violation.id,
    description:   violation.description,
    help:          violation.help,
    impact:        violation.impact,
    tags:          violation.tags,
    helpUrl:       violation.helpUrl,
    nodes:         violation.nodes,
    wcag:          evidence.wcag,
    whyItMatters:  evidence.whyItMatters,
    whoItAffects:  evidence.whoItAffects,
    disabilityGroups: evidence.disabilityGroups,
    howToFix:      evidence.howToFix,
    measuredEvidence: extractMeasuredEvidence(violation),
    instanceCount: violation.totalInstances,
  };
}

/**
 * Pulls a measured fact out of a violation's first node when one is available,
 * so the issue is visibly evidence-backed. Today this parses axe's
 * colour-contrast failure summary (which states the actual vs required ratio);
 * other rules return undefined (no fabricated numbers). Pure + best-effort.
 */
function extractMeasuredEvidence(violation: RawAxeViolation): string | undefined {
  const summary = violation.nodes?.[0]?.failureSummary ?? "";
  if (!summary) return undefined;

  // axe colour-contrast summary contains e.g. "contrast of 2.3:1" and
  // "Expected contrast ratio of 4.5:1".
  if (violation.id === "color-contrast" || violation.id === "color-contrast-enhanced") {
    const actual = summary.match(/contrast of ([\d.]+):1/i)?.[1];
    const required = summary.match(/Expected contrast ratio of ([\d.]+):1/i)?.[1];
    if (actual && required) return `Measured contrast ${actual}:1 — needs at least ${required}:1`;
    if (actual) return `Measured contrast ${actual}:1`;
  }
  return undefined;
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
  const breakdown = scoreBreakdownFromReport(issues);
  attachPoints(issues, breakdown);

  return {
    url:                raw.url || requestUrl,
    scannedAt:          raw.scannedAt,
    wcagLevel:          raw.wcagLevel,
    score:              breakdown.score,
    issues,
    totalIssues:        totals.total,
    totals,
    javascriptRendered: raw.javascriptRendered,
    durationMs:         raw.durationMs,
    screenshot:         raw.screenshot,
    scoreBreakdown:     breakdown,
    engineMeta:         raw.engineMeta,
  };
}

/**
 * Attaches each rule's `pointsContributed` (from the score breakdown) back onto
 * the matching issue, so the report carries per-issue point attribution.
 */
function attachPoints(
  issues: AccessibilityReport["issues"],
  breakdown: ReturnType<typeof scoreBreakdownFromReport>
): void {
  const byId = new Map(breakdown.lineItems.map((li) => [li.ruleId, li.pointsContributed]));
  (["critical", "serious", "moderate", "minor"] as const).forEach((sev) => {
    for (const issue of issues[sev]) {
      issue.pointsContributed = byId.get(issue.id) ?? 0;
    }
  });
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
  const breakdown  = scoreBreakdownFromReport(issues);
  attachPoints(issues, breakdown);
  const durationMs = pageResults.reduce((sum, p) => sum + p.durationMs, 0);

  return {
    url:                homepageResult.url || requestUrl,
    scannedAt:          homepageResult.scannedAt,
    wcagLevel:          homepageResult.wcagLevel,
    score:              breakdown.score,
    issues,
    totalIssues:        totals.total,
    totals,
    javascriptRendered: homepageResult.javascriptRendered,
    durationMs,
    pageResults,
    pagesScanned,
    scoreBreakdown:     breakdown,
    engineMeta:         homepageResult.engineMeta,
  };
}
