/**
 * lib/scanner/constants.ts
 *
 * Shared constants for the scanner engine.
 *
 * Why a separate constants file?
 * ────────────────────────────────
 * Magic numbers scattered across scanner files make it hard to reason about
 * resource limits. Centralising here means changing the viewport size or
 * Chromium flags only requires editing one file, not hunting across the engine.
 */

/**
 * Viewport used for all scans.
 * 1280×800 is a common "laptop" breakpoint that exercises responsive layouts
 * without the overhead of a 4K framebuffer.
 */
export const SCAN_VIEWPORT = { width: 1280, height: 800 } as const;

/**
 * axe-core rule tags that map to the requested WCAG level.
 *
 * Passing tags to axe limits the audit to rules relevant to the chosen
 * conformance level, which keeps scan times predictable and avoids
 * surfacing rules the site owner hasn't opted into.
 */
/**
 * Extended WCAG tag map used by the engine.
 *
 * All levels always include wcag21a / wcag21aa because WCAG 2.1 is now the
 * minimum legal standard in most jurisdictions, and best-practice rules are
 * included unconditionally as they cover high-value heuristics that do not
 * map to a specific WCAG criterion.
 */
export const WCAG_TAG_MAP = {
  A:   ["wcag2a",  "wcag21a",  "best-practice"],
  AA:  ["wcag2a",  "wcag2aa",  "wcag21a",  "wcag21aa",  "best-practice"],
  AAA: ["wcag2a",  "wcag2aa",  "wcag2aaa", "wcag21a",  "wcag21aa", "best-practice"],
} as const;

/** Max byte length for a stored HTML snippet (mirrors the engine constant). */
export const MAX_HTML_SNIPPET_BYTES = 512 as const;

/** Milliseconds reserved for the axe analysis pass. */
export const AXE_ANALYSIS_TIMEOUT_MS = 15_000 as const;

/** Milliseconds to wait for network idle after DOMContentLoaded. */
export const NETWORK_IDLE_TIMEOUT_MS = 5_000 as const;
