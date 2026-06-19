/**
 * Pure utilities for computing issue counts from scan totals.
 * This file has no server-only import, making it testable directly.
 */

/** Total accessibility issues from a scan's `totals` jsonb. Null if unusable. */
export function issueCountFromTotals(totals: unknown): number | null {
  if (!totals || typeof totals !== "object") return null;
  const t = totals as Record<string, unknown>;
  if (typeof t.total === "number") return t.total;
  const parts = ["critical", "serious", "moderate", "minor"].map((k) => (typeof t[k] === "number" ? (t[k] as number) : 0));
  const sum = parts.reduce((a, b) => a + b, 0);
  return sum > 0 ? sum : (Object.keys(t).length ? 0 : null);
}
