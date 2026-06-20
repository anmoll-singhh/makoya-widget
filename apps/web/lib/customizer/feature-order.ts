/**
 * feature-order.ts
 *
 * Pure helper functions for managing the ordered list of feature rows in the
 * widget customizer. A "row" is { key: FeatureKey; on: boolean } — the
 * customizer lets users reorder which features are shown and toggle each one.
 *
 * Design constraints:
 *  - All functions return NEW arrays; no mutation.
 *  - The canonical 15-key order is derived from FEATURE_META (which itself
 *    mirrors DEFAULT_CONFIG.featuresEnabled).
 *  - `buildFeatureRows` treats the incoming `enabled` list as the user's
 *    current preference: enabled keys come first (in the order given), then
 *    the remaining keys fill in canonical order. Unknown or duplicate keys in
 *    the `enabled` input are silently dropped.
 */

import type { FeatureKey } from "@/lib/shared";
import { FEATURE_META } from "./feature-meta";

export interface FeatureRow {
  key: FeatureKey;
  on: boolean;
}

/** Set of valid FeatureKey strings, derived from FEATURE_META at module load. */
const VALID_KEYS = new Set<string>(FEATURE_META.map((m) => m.key));

/** Canonical 15-key order (same as DEFAULT_CONFIG.featuresEnabled). */
const CANONICAL_ORDER: FeatureKey[] = FEATURE_META.map((m) => m.key);

/**
 * Build the full 15-row list from a user's current `enabled` preference.
 *
 * - Filters `enabled` to valid keys only, dedupes (first occurrence wins).
 * - Places those rows first with `on: true`, in the order given.
 * - Appends remaining keys in canonical order with `on: false`.
 *
 * Always returns exactly 15 rows.
 */
export function buildFeatureRows(enabled: FeatureKey[]): FeatureRow[] {
  // Dedupe and validate: keep only known keys, first occurrence wins.
  const seen = new Set<string>();
  const validEnabled: FeatureKey[] = [];
  for (const key of enabled) {
    if (VALID_KEYS.has(key) && !seen.has(key)) {
      seen.add(key);
      validEnabled.push(key);
    }
  }

  // Enabled rows first.
  const rows: FeatureRow[] = validEnabled.map((key) => ({ key, on: true }));

  // Fill remaining keys in canonical order.
  for (const key of CANONICAL_ORDER) {
    if (!seen.has(key)) {
      rows.push({ key, on: false });
    }
  }

  return rows;
}

/**
 * Extract the keys of all on-rows in row order.
 * Round-trips correctly through buildFeatureRows when all 15 are enabled.
 */
export function rowsToEnabled(rows: FeatureRow[]): FeatureKey[] {
  return rows.filter((r) => r.on).map((r) => r.key);
}

/**
 * Swap the row at `index` with its neighbor in direction `dir` (-1 = up, 1 = down).
 * No-ops when already at the array boundary. Returns a new array.
 */
export function moveRow(
  rows: FeatureRow[],
  index: number,
  dir: -1 | 1
): FeatureRow[] {
  const neighbor = index + dir;
  if (neighbor < 0 || neighbor >= rows.length) {
    // At boundary — return a shallow copy so callers always get a new array.
    return rows.slice();
  }
  const result = rows.slice();
  // Swap.
  [result[index], result[neighbor]] = [result[neighbor], result[index]];
  return result;
}
