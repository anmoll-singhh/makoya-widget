/**
 * lib/scanner/types.ts
 *
 * Internal types for the scanner engine.
 *
 * Why separate from the top-level types/?
 * ─────────────────────────────────────────
 * `types/index.ts` holds the public API contract (what crosses the HTTP
 * boundary). This file holds implementation details — raw axe-core results,
 * browser context options — that consumers of the API never need to see.
 *
 * Keeping them separate prevents leaking internal complexity into the public
 * surface and allows the engine internals to evolve without breaking callers.
 */

import type { EngineMeta, SeverityLevel, WcagLevel } from "@/types";

// ---------------------------------------------------------------------------
// Scanner engine input
// ---------------------------------------------------------------------------

/**
 * Resolved, validated options passed to the scanner engine.
 * The API route builds this from the raw `ScanRequest` after validation.
 */
export interface ResolvedScanOptions {
  /** Validated and sanitised URL (already passed through `validateScanUrl`). */
  url: string;

  /** WCAG level — resolved to "AA" if not provided by the caller. */
  wcagLevel: WcagLevel;

  /** Timeout in ms — already clamped to `MAX_SCAN_TIMEOUT_MS`. */
  timeoutMs: number;

  /**
   * When true the scanner extracts internal same-domain links from the page
   * before closing the browser session and returns them in `RawScanResult`.
   * Sub-page scans are orchestrated by the route handler, NOT recursively
   * inside the engine, to keep resource usage predictable.
   */
  scanInternalLinks?: boolean;
}

// ---------------------------------------------------------------------------
// Raw axe-core result shape
// ---------------------------------------------------------------------------

/**
 * Minimal subset of an axe-core violation we actually use.
 *
 * axe-core's full type is available via `@axe-core/playwright` but importing
 * it here would expose the dependency to all consumers of this type.
 * We extract only what we need and map it to our domain model in the engine.
 *
 * Update this interface when the engine mapping logic changes.
 */
export interface RawAxeViolation {
  id: string;
  description: string;
  /** Concise remediation guidance sourced from axe-core's `help` field. */
  help: string;
  impact: SeverityLevel | null;
  tags: string[];
  helpUrl: string;
  nodes: RawAxeNode[];
  /**
   * TRUE number of offending instances (post-dedup, post-verification),
   * independent of the display-capped `nodes` array. Drives the score.
   */
  totalInstances: number;
}

export interface RawAxeNode {
  target: string[];
  html: string;
  failureSummary: string | null;
}

// ---------------------------------------------------------------------------
// Engine output (pre-score)
// ---------------------------------------------------------------------------

/**
 * Intermediate result produced by the scanner engine before scoring is applied.
 * The route handler adds `score` via `scoreFromReport` and returns the full
 * `AccessibilityReport` to the client.
 */
export interface RawScanResult {
  url: string;
  scannedAt: string;
  wcagLevel: WcagLevel;
  violations: RawAxeViolation[];
  javascriptRendered: boolean;
  durationMs: number;
  /**
   * Internal links discovered on the page during the homepage scan.
   * Only populated when `ResolvedScanOptions.scanInternalLinks` is true.
   * Already filtered (same-domain, no binary files) and deduplicated.
   */
  extractedLinks?: string[];
  /**
   * @deprecated Retired in v2 — the engine no longer degrades to a reduced
   * ruleset. Never set by the v2 engine; kept for type compatibility.
   */
  isPartialScan?: boolean;
  /** Base64 JPEG data-URL thumbnail of the page taken after render. */
  screenshot?: string;
  /**
   * Engine/model provenance (axe version, ruleset hash, content hash, etc.).
   * Lets a score change be attributed to the site vs the engine.
   */
  engineMeta?: EngineMeta;
}
