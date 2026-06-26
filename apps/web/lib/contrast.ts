/**
 * lib/contrast.ts — a tiny, dependency-free WCAG contrast utility for the v3.1
 * customize screen (#6).
 *
 * Why this exists:
 * ────────────────
 * When an operator picks a brand `primaryColor` for the widget launcher/active
 * toggles, the customize UI should tell them whether that colour has enough
 * contrast against its background to be perceivable. WCAG 2.x treats the launcher
 * and toggles as "UI components / graphical objects", whose minimum is 3:1
 * (SC 1.4.11) — not the 4.5:1 that applies to body text. So we expose the raw
 * ratio plus a `meetsAaUi` helper at the 3:1 bar.
 *
 * This is PURE math (no DOM, no I/O) so it is trivially unit-testable and can run
 * on the server or client. It computes the official relative-luminance formula:
 *   https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 *   https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
 *
 * Honesty: this reports a per-pair contrast ratio. It is a design aid, NOT a
 * claim that a site is WCAG/ADA "compliant" (per the repo's compliance guardrail).
 */

/** The WCAG minimum contrast for UI components / graphical objects (SC 1.4.11). */
const AA_UI_MIN_RATIO = 3;

/**
 * Parse a hex colour (`#rgb`, `rgb`, `#rrggbb`, or `rrggbb`) into 0..255 RGB.
 * Throws on anything that is not a valid 3- or 6-digit hex string so callers see
 * a clear error rather than a silently-wrong ratio.
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.trim().replace(/^#/, "").toLowerCase();
  let full: string;
  if (/^[0-9a-f]{3}$/.test(h)) {
    // Expand shorthand: "abc" → "aabbcc".
    full = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  } else if (/^[0-9a-f]{6}$/.test(h)) {
    full = h;
  } else {
    throw new Error(`invalid hex colour: ${hex}`);
  }
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

/** Linearize one 0..255 channel per the WCAG sRGB transfer function. */
function linearizeChannel(value8bit: number): number {
  const c = value8bit / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** Relative luminance (0 = black, 1 = white) of an RGB colour. */
function relativeLuminance(rgb: { r: number; g: number; b: number }): number {
  const r = linearizeChannel(rgb.r);
  const g = linearizeChannel(rgb.g);
  const b = linearizeChannel(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Contrast ratio between two hex colours, in the range 1 (identical) .. 21
 * (black vs white). Order-independent. Accepts 3- or 6-digit hex, with or
 * without a leading `#`.
 */
export function contrastRatio(hexA: string, hexB: string): number {
  const lA = relativeLuminance(hexToRgb(hexA));
  const lB = relativeLuminance(hexToRgb(hexB));
  const lighter = Math.max(lA, lB);
  const darker = Math.min(lA, lB);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Does a contrast ratio meet the WCAG AA bar for UI components (≥ 3:1)?
 * Use this for the launcher button / active toggles on the customize screen.
 */
export function meetsAaUi(ratio: number): boolean {
  return ratio >= AA_UI_MIN_RATIO;
}
