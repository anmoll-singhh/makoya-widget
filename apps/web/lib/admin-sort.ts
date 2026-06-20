/**
 * admin-sort.ts
 *
 * Pure sort helpers for the admin clients overview table.
 *
 * Design notes:
 * - `sortClients` is a pure function — it returns a NEW array and never mutates
 *   the input. Safe to call in React render paths without useMemo concerns.
 * - Numeric keys (issues, score, open) apply a "nulls last" rule regardless of
 *   sort direction. A null issueCount means "we don't know yet" — it is neither
 *   best nor worst and should never float to the top when sorted desc.
 * - String keys (plan, email) use localeCompare so accented characters sort
 *   correctly if client emails ever include them.
 */

import type { AdminSiteRow } from "@/lib/admin";

export type SortKey = "issues" | "score" | "plan" | "email" | "open";

/** Map from SortKey to the AdminSiteRow field it drives. */
const NUMERIC_FIELD: Partial<Record<SortKey, keyof AdminSiteRow>> = {
  issues: "issueCount",
  score: "latestScore",
  open: "openRequests",
};

const STRING_FIELD: Partial<Record<SortKey, keyof AdminSiteRow>> = {
  plan: "plan",
  email: "ownerEmail",
};

/**
 * Sort `rows` by `key` in `dir` order.
 *
 * Null values for numeric keys ALWAYS sort to the bottom, regardless of `dir`.
 *
 * @example
 * // Default table state — most issues first, unknowns at the bottom:
 * sortClients(rows, "issues", "desc")
 */
export function sortClients(
  rows: AdminSiteRow[],
  key: SortKey,
  dir: "asc" | "desc"
): AdminSiteRow[] {
  const mul = dir === "asc" ? 1 : -1;

  return [...rows].sort((a, b) => {
    // --- Numeric keys ---
    const numField = NUMERIC_FIELD[key];
    if (numField !== undefined) {
      const av = a[numField] as number | null;
      const bv = b[numField] as number | null;

      // Both null — equal; preserve original order.
      if (av === null && bv === null) return 0;
      // Nulls always sink to the bottom (positive = b before a in JS sort).
      if (av === null) return 1;
      if (bv === null) return -1;

      return (av - bv) * mul;
    }

    // --- String keys ---
    const strField = STRING_FIELD[key];
    if (strField !== undefined) {
      const av = (a[strField] as string) ?? "";
      const bv = (b[strField] as string) ?? "";
      return av.localeCompare(bv) * mul;
    }

    return 0;
  });
}
