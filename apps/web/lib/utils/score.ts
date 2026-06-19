/**
 * lib/utils/score.ts
 *
 * Accessibility score calculation.
 *
 * Why this exists:
 * ─────────────────
 * Scoring is a business-logic decision that sits above raw violation data.
 * It does not belong inside the scanner engine (which just collects facts)
 * nor inside a UI component (which just renders). Keeping it here means:
 *  - The algorithm is independently testable.
 *  - The score stays consistent whether it's shown in the API response,
 *    a PDF export, or an email notification.
 *  - Tweaking weights doesn't require touching the scanner or the UI.
 *
 * Scoring model:
 * ──────────────
 * Each violation type carries a penalty weight proportional to its real-world
 * impact on users with disabilities:
 *
 *   critical  → 10 points  (e.g. keyboard trap, missing form label)
 *   serious   →  5 points  (e.g. insufficient colour contrast)
 *   moderate  →  2 points  (e.g. missing landmark regions)
 *   minor     →  1 point   (e.g. redundant alt text)
 *
 * Score = max(0, 100 − Σ(count × weight)) clamped to [0, 100].
 *
 * This is intentionally simple and transparent. It is NOT the same algorithm
 * as Google Lighthouse's weighted-category model — our goal is a quick
 * actionable signal, not a composite UX metric.
 */

import type { AccessibilityReport, SeverityLevel } from "@/types";

// ---------------------------------------------------------------------------
// Weight configuration
// ---------------------------------------------------------------------------

/**
 * Penalty per violation instance, keyed by severity.
 * Adjust these values to tune how aggressively each severity impacts the score.
 * Keep `critical` >= `serious` >= `moderate` >= `minor` for intuitive results.
 */
export const SEVERITY_WEIGHTS: Record<SeverityLevel, number> = {
  critical: 15,
  serious:  10,
  moderate: 5,
  minor:    2,
};

// ---------------------------------------------------------------------------
// Score calculation
// ---------------------------------------------------------------------------

/**
 * Computes an accessibility score from 0 to 100 for the given issue counts.
 *
 * This is the canonical implementation — all callers (API route, tests,
 * CLI tools) must use this function so scores are consistent.
 *
 * @param counts - Number of violations per severity level.
 * @returns Integer score in [0, 100].
 */
export function calculateScore(
  counts: Record<SeverityLevel, number>
): number {
  // Compute weighted penalty based on unique issue counts
  const totalPenalty = (Object.entries(counts) as [SeverityLevel, number][])
    .reduce((sum, [severity, count]) => sum + count * SEVERITY_WEIGHTS[severity], 0);

  // Ensure score stays within 0‑100 range
  return Math.max(0, Math.round(100 - totalPenalty));
}

// ---------------------------------------------------------------------------
// Report helpers
// ---------------------------------------------------------------------------

/**
 * Extracts per-severity issue counts from a completed `AccessibilityReport`
 * and returns the score. Use after building a report to populate its
 * `score` field.
 */
export function scoreFromReport(
  issues: AccessibilityReport["issues"]
): number {
  // Count unique issue IDs per severity to avoid double‑penalising duplicates
  const uniqueCounts = {
    critical: new Set(issues.critical.map(i => i.id)).size,
    serious:  new Set(issues.serious.map(i => i.id)).size,
    moderate: new Set(issues.moderate.map(i => i.id)).size,
    minor:    new Set(issues.minor.map(i => i.id)).size,
  } as Record<SeverityLevel, number>;

  return calculateScore(uniqueCounts);
}

/**
 * Maps a numeric score to a qualitative grade label.
 * Used for badge colours and summary text in the report UI.
 *
 * Thresholds are intentionally conservative — a site with any critical
 * violations should never receive an "Excellent" label.
 */
export function scoreToGrade(
  score: number
): { label: string; description: string } {
  if (score >= 90) return { label: "Excellent", description: "Excellent accessibility compliance." };
  if (score >= 75) return { label: "Good",      description: "Good accessibility compliance." };
  if (score >= 50) return { label: "Needs Improvement", description: "Accessibility needs improvement." };
  return              { label: "Poor",     description: "Poor accessibility compliance." };
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
