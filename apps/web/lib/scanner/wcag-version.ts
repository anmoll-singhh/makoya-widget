/**
 * lib/scanner/wcag-version.ts
 *
 * Maps a WCAG success-criterion number (e.g. "1.4.3", "2.5.8") to the WCAG
 * specification version that introduced it: "2.0" | "2.1" | "2.2".
 *
 * Classification rule:
 *  - WCAG 2.2 added: 2.4.11, 2.4.12, 2.4.13, 2.5.7, 2.5.8, 3.2.6, 3.3.7,
 *    3.3.8, 3.3.9. (Source: WCAG 2.2 Understanding docs.)
 *  - WCAG 2.1 added: 1.3.4, 1.3.5, 1.3.6, 1.4.10, 1.4.11, 1.4.12, 1.4.13,
 *    2.1.4, 2.2.6, 2.5.1, 2.5.2, 2.5.3, 2.5.4, 4.1.3.
 *    (Source: WCAG 2.1 Understanding docs.)
 *  - All other valid dotted criteria (e.g. 1.1.1, 1.4.3, 2.4.7) are WCAG 2.0.
 *
 * Returns null when the input is not a recognisable dotted criterion (e.g. an
 * empty string, "best-practice", or a malformed value). Never throws.
 *
 * This is a pure function with no I/O — safe to import in server or client code.
 */

export type WcagVersion = "2.0" | "2.1" | "2.2";

/**
 * Criteria introduced in WCAG 2.2 (not present in 2.0 or 2.1).
 * Source: https://www.w3.org/TR/WCAG22/#new-features-in-wcag-2-2
 */
const WCAG_22_CRITERIA = new Set<string>([
  "2.4.11", // Focus Not Obscured (Minimum) — AA
  "2.4.12", // Focus Not Obscured (Enhanced) — AAA
  "2.4.13", // Focus Appearance — AAA
  "2.5.7",  // Dragging Movements — AA
  "2.5.8",  // Target Size (Minimum) — AA
  "3.2.6",  // Consistent Help — A
  "3.3.7",  // Redundant Entry — A
  "3.3.8",  // Accessible Authentication (Minimum) — AA
  "3.3.9",  // Accessible Authentication (Enhanced) — AAA
]);

/**
 * Criteria introduced in WCAG 2.1 (not present in 2.0; 2.2 supersedes some).
 * 2.2-specific criteria are checked first so this set only covers 2.1-exclusive
 * additions. Source: https://www.w3.org/TR/WCAG21/#new-features-in-wcag-2-1
 */
const WCAG_21_CRITERIA = new Set<string>([
  "1.3.4",  // Orientation — AA
  "1.3.5",  // Identify Input Purpose — AA
  "1.3.6",  // Identify Purpose — AAA
  "1.4.10", // Reflow — AA
  "1.4.11", // Non-text Contrast — AA
  "1.4.12", // Text Spacing — AA
  "1.4.13", // Content on Hover or Focus — AA
  "2.1.4",  // Character Key Shortcuts — A
  "2.2.6",  // Timeouts — AAA
  "2.5.1",  // Pointer Gestures — A
  "2.5.2",  // Pointer Cancellation — A
  "2.5.3",  // Label in Name — A
  "2.5.4",  // Motion Actuation — A
  "4.1.3",  // Status Messages — AA
]);

/** Regex for a valid dotted WCAG criterion: digits.digits.digits */
const CRITERION_RE = /^\d+\.\d+\.\d+$/;

/**
 * Returns the WCAG version that introduced `criterion`, or null when the input
 * is not a recognisable criterion number.
 *
 * @example
 * getWcagVersion("1.4.3")  // "2.0"
 * getWcagVersion("1.4.10") // "2.1"
 * getWcagVersion("2.5.8")  // "2.2"
 * getWcagVersion("")       // null
 */
export function getWcagVersion(criterion: string | null | undefined): WcagVersion | null {
  if (!criterion || !CRITERION_RE.test(criterion)) return null;
  if (WCAG_22_CRITERIA.has(criterion)) return "2.2";
  if (WCAG_21_CRITERIA.has(criterion)) return "2.1";
  return "2.0";
}
