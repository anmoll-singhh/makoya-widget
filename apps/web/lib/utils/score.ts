/**
 * lib/utils/score.ts
 *
 * Accessibility score calculation — evidence-based, deterministic.
 *
 * Why this exists:
 * ─────────────────
 * Scoring is a business-logic decision that sits above raw violation data.
 * It does not belong inside the scanner engine (which just collects facts)
 * nor inside a UI component (which just renders). Keeping it here means:
 *  - The algorithm is independently testable.
 *  - The score stays consistent whether shown in the API response,
 *    a PDF export, or an email notification.
 *  - Tweaking weights doesn't require touching the scanner or the UI.
 *
 * Scoring model (v2 — instance-weighted, diminishing returns):
 * ────────────────────────────────────────────────────────────
 * Each violated rule deducts by severity, scaled by how WIDESPREAD it is.
 * A single instance deducts the base weight; additional instances hurt more
 * but with diminishing returns (a logarithmic curve) so a pervasive bug
 * matters more than a one-off without instantly zeroing an otherwise-healthy
 * site.
 *
 *   penalty(rule) = weight[severity] × (1 + ln(instanceCount))
 *   rawPenalty    = Σ penalty(rule)
 *   appliedPenalty= clamp(rawPenalty, 0, 100)
 *   score         = round(100 − appliedPenalty)
 *
 * This is intentionally simple and transparent: every point lost is a line
 * item tied to a specific rule, severity, WCAG criterion, and instance count.
 * It is deterministic — identical input always yields identical output.
 *
 * v1 (superseded) counted DISTINCT rule ids only (prevalence-blind): one
 * contrast failure and 300 of them deducted the same. v2 reflects evidence.
 */

import type {
  AccessibilityReport,
  ScoreBreakdown,
  ScoreLineItem,
  SeverityLevel,
} from "@/types";

export type { ScoreBreakdown, ScoreLineItem };

// ---------------------------------------------------------------------------
// Model version + weight configuration
// ---------------------------------------------------------------------------

/**
 * Bumped whenever the weights or the curve change, so a score shift caused by
 * US (a model change) is never mistaken for the SITE changing. Stored in every
 * scan's `engine_meta` and gates score-to-score comparisons across versions.
 */
export const SCORING_MODEL_VERSION = 2 as const;

/**
 * Penalty per FIRST instance of a violated rule, keyed by severity.
 * Additional instances scale via the diminishing-returns curve below.
 *
 * Keep `critical >= serious >= moderate >= minor` for intuitive results.
 * These supersede the v1 weights (15/10/5/2) and are calibrated against a
 * real-world sample so the distribution is not degenerate.
 */
export const SEVERITY_WEIGHTS: Record<SeverityLevel, number> = {
  critical: 12,
  serious: 7,
  moderate: 3,
  minor: 1,
};

// ---------------------------------------------------------------------------
// Public scoring API (v2)
// ---------------------------------------------------------------------------

/** One violated rule fed into the scorer. */
export interface ScoreInput {
  ruleId: string;
  severity: SeverityLevel;
  /** True number of offending instances (post-dedup); floored to 1. */
  instanceCount: number;
  /** WCAG success criterion (e.g. "1.4.3"), passed through to the breakdown. */
  wcagCriterion?: string | null;
  /** Conformance level / "best-practice", passed through to the breakdown. */
  level?: string | null;
}

/**
 * `ScoreLineItem` and `ScoreBreakdown` are the canonical domain types in
 * `@/types` (they cross the wire and are stored). They are re-exported above
 * so scoring callers can import them from here.
 */

/**
 * Diminishing-returns multiplier for instance count.
 * instanceCount 1 → 1.0 (just the base weight); grows logarithmically.
 * Counts below 1 are floored to 1 (a violation always has ≥1 instance).
 */
function instanceFactor(instanceCount: number): number {
  const n = Number.isFinite(instanceCount) && instanceCount > 1 ? instanceCount : 1;
  return 1 + Math.log(n);
}

/**
 * Computes the evidence-based score and its auditable breakdown.
 *
 * Pure function — no I/O, no randomness. The canonical implementation that all
 * callers (API route, PDF, tests) must use so scores are consistent.
 */
export function computeScore(inputs: ScoreInput[]): ScoreBreakdown {
  const lineItems: ScoreLineItem[] = inputs.map((input) => ({
    ruleId: input.ruleId,
    severity: input.severity,
    instanceCount: input.instanceCount,
    pointsContributed: SEVERITY_WEIGHTS[input.severity] * instanceFactor(input.instanceCount),
    wcagCriterion: input.wcagCriterion ?? null,
    level: input.level ?? null,
  }));

  lineItems.sort((a, b) => b.pointsContributed - a.pointsContributed);

  const rawPenalty = lineItems.reduce((sum, li) => sum + li.pointsContributed, 0);
  const appliedPenalty = Math.max(0, Math.min(100, rawPenalty));
  const score = Math.round(100 - appliedPenalty);

  return {
    score,
    rawPenalty,
    appliedPenalty,
    lineItems,
    scoringModelVersion: SCORING_MODEL_VERSION,
  };
}

// ---------------------------------------------------------------------------
// Report helpers
// ---------------------------------------------------------------------------

/**
 * Builds the score breakdown from a completed `AccessibilityReport`'s grouped
 * issues. The severity bucket the issue lives in is authoritative; instance
 * count comes from the issue's `instanceCount` (true count), falling back to
 * the displayed node count, then 1.
 */
export function scoreBreakdownFromReport(
  issues: AccessibilityReport["issues"]
): ScoreBreakdown {
  const inputs: ScoreInput[] = [];
  (["critical", "serious", "moderate", "minor"] as const).forEach((severity) => {
    for (const issue of issues[severity]) {
      inputs.push({
        ruleId: issue.id,
        severity,
        instanceCount: issue.instanceCount ?? issue.nodes?.length ?? 1,
        wcagCriterion: issue.wcag?.criterion ?? null,
        level: issue.wcag?.level ?? null,
      });
    }
  });
  return computeScore(inputs);
}

/**
 * Convenience: just the numeric score from a report's grouped issues.
 * Kept for callers that only need the number.
 */
export function scoreFromReport(issues: AccessibilityReport["issues"]): number {
  return scoreBreakdownFromReport(issues).score;
}

/**
 * Maps a numeric score to a qualitative grade label.
 * Used for badge colours and summary text in the report UI.
 *
 * NOTE: thresholds are pending re-derivation from the v2 calibration run
 * (the v2 distribution is harsher/more realistic than v1). A site with any
 * critical violations should never read as "Excellent".
 */
export function scoreToGrade(
  score: number
): { label: string; description: string } {
  if (score >= 90) return { label: "Excellent", description: "Excellent accessibility compliance." };
  if (score >= 75) return { label: "Good", description: "Good accessibility compliance." };
  if (score >= 50) return { label: "Needs Improvement", description: "Accessibility needs improvement." };
  return { label: "Poor", description: "Poor accessibility compliance." };
}

/**
 * Computes the final accessibility assessment object.
 * Returns the numeric score, the grade label, and a short summary description.
 */
export function assessReport(
  issues: AccessibilityReport["issues"]
): { score: number; grade: string; summary: string } {
  const score = scoreFromReport(issues);
  const { label, description } = scoreToGrade(score);
  return { score, grade: label, summary: description };
}
