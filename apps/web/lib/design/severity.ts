/**
 * lib/design/severity.ts
 *
 * Severity levels, score bands, and sorting logic — pure functions for
 * accessibility issue classification and display.
 *
 * Why this exists:
 * ─────────────────
 * Severity is a business/UX decision that sits above raw issue data. It drives:
 *  - Which issues appear first in the report (worst-first sorting).
 *  - The color palette for each issue card and the overall score badge.
 *  - The band thresholds that map numeric scores (0–100) to pass/fail verdicts.
 *
 * Keeping it here means:
 *  - Severity metadata (ranks, labels, CSS tokens) is independently testable.
 *  - The sort and band logic are deterministic and reusable across components.
 *  - CSS variables can refer to the same token strings, avoiding duplication.
 *
 * Severity model:
 * ───────────────
 * Four levels, ranked worst-first: critical (0) > serious (1) > moderate (2) > minor (3).
 * Each maps to a CSS variable namespace (--sev-* and --sev-*-bg for backgrounds).
 *
 * Score bands (0–100):
 *  - ≥90:  "passed" (green/success)
 *  - 75–89:  "serious" (orange/warning)
 *  - 50–74:  "moderate" (yellow/caution)
 *  - <50:  "critical" (red/danger)
 *
 * Both are used by UI components (ScoreMark, IssueCard) and exported as pure data
 * so they can be consumed by tests, PDF renderers, and email templates.
 */

/**
 * The four accessibility severity levels, ranked worst-first.
 */
export type Severity = "critical" | "serious" | "moderate" | "minor";

/**
 * Metadata for each severity level: rank (0 = worst), label, and CSS variable names.
 *
 * Rank is used for sorting; lower ranks appear first.
 * Token is the main CSS variable (--sev-*); bgToken is the background variant.
 * Labels are title-cased for UI display.
 */
export const SEVERITY_META: Record<Severity, { label: string; token: string; bgToken: string; rank: number }> = {
  critical: { label: "Critical", token: "--sev-critical", bgToken: "--sev-critical-bg", rank: 0 },
  serious: { label: "Serious", token: "--sev-serious", bgToken: "--sev-serious-bg", rank: 1 },
  moderate: { label: "Moderate", token: "--sev-moderate", bgToken: "--sev-moderate-bg", rank: 2 },
  minor: { label: "Minor", token: "--sev-minor", bgToken: "--sev-minor-bg", rank: 3 },
};

/**
 * Maps a numeric accessibility score (0–100) to a severity band.
 * Used by <ScoreMark> to select the correct color token and label.
 *
 * Thresholds:
 *  - ≥90:  "passed" (no issues / excellent compliance)
 *  - 75–89:  "serious" (has serious issues)
 *  - 50–74:  "moderate" (has moderate issues)
 *  - <50:  "critical" (has critical issues / poor compliance)
 *
 * Returns an object with `token` (CSS variable name) and `label` (display text).
 */
export function scoreBand(score: number): { token: string; label: string } {
  if (score >= 90) {
    return { token: "--sev-passed", label: "Passed" };
  }
  if (score >= 75) {
    return { token: "--sev-serious", label: "Serious" };
  }
  if (score >= 50) {
    return { token: "--sev-moderate", label: "Moderate" };
  }
  return { token: "--sev-critical", label: "Critical" };
}

/**
 * Sorts items by severity, worst-first (critical → serious → moderate → minor),
 * with null impact ranked last. Preserves input order on ties (stable sort).
 *
 * Generic over any type with an `impact: Severity | null` field.
 *
 * @param items - Array of items to sort
 * @returns A new array sorted by severity rank (ascending), nulls last
 */
export function sortBySeverity<T extends { impact: Severity | null }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const rankA = a.impact === null ? 99 : SEVERITY_META[a.impact].rank;
    const rankB = b.impact === null ? 99 : SEVERITY_META[b.impact].rank;
    return rankA - rankB;
  });
}
