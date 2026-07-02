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

  /**
   * When true the engine ALSO runs a second independent engine
   * (HTML_CodeSniffer) and cross-validates findings against axe-core, tagging
   * agreed issues "high confidence" and adding second-engine-only coverage.
   * Defaults OFF — the in-browser runner needs a live Lambda verification pass
   * before it's enabled in prod (the merge logic is already unit-tested).
   */
  useSecondEngine?: boolean;

  /**
   * When true the engine runs a DEEP AUDIT: axe is asked for ALL four result
   * buckets (violations, passes, incomplete, inapplicable) instead of only
   * violations, so we can render the accessScan-style per-rule breakdown
   * (every check → outcome + code snapshots). This is heavier (axe serialises
   * far more nodes over the CDP bridge), so it is OWNER-TRIGGERED only, never
   * the fast public funnel scan. See `ruleAudit` on RawScanResult.
   *
   * The violation set — and therefore the score — is IDENTICAL to a normal
   * scan; deep audit only ADDS the pass/incomplete/inapplicable context.
   */
  deepAudit?: boolean;
}

// ---------------------------------------------------------------------------
// Deep-audit per-rule result (accessScan-parity report data)
// ---------------------------------------------------------------------------

/**
 * The outcome axe assigned to a rule for THIS page.
 *
 * axe places every rule into exactly one bucket per run, so a rule has exactly
 * one outcome (it never simultaneously "passes" and "fails" in axe's model):
 *  - "fail"           → rule has ≥1 failing node (`violations`); `count` = failures.
 *  - "pass"           → all tested nodes passed (`passes`);      `count` = passes.
 *  - "review"         → axe could not decide (`incomplete`);     `count` = nodes to review.
 *  - "not-applicable" → the rule matched no elements (`inapplicable`); `count` = 0.
 *
 * We deliberately DO NOT fabricate a "successes AND failures on the same row"
 * number the way a proprietary engine might — an axe pass and an axe failure are
 * different node sets and mixing them would be dishonest.
 */
export type AuditOutcome = "fail" | "pass" | "review" | "not-applicable";

/** One capped element snapshot shown under a rule (selector + truncated HTML). */
export interface AuditNodeSample {
  /** axe target selector path for the element. */
  target: string[];
  /** Element outerHTML, already truncated to MAX_HTML_SNIPPET_BYTES. */
  html: string;
}

/**
 * One rule's deep-audit result. `count` is the TRUE number of nodes in the
 * outcome bucket (pre display-cap); `sample` is a capped list of snapshots for
 * display. Rule metadata (WCAG criterion, level, best-practice split) is
 * resolved downstream from `tags` via `resolveWcag`.
 */
export interface RuleAuditResult {
  id: string;
  description: string;
  help: string;
  helpUrl: string;
  /** axe impact — only meaningful for "fail"; null otherwise. */
  impact: SeverityLevel | null;
  tags: string[];
  outcome: AuditOutcome;
  /** TRUE node count in the outcome bucket (0 for not-applicable). */
  count: number;
  /** Capped element snapshots (≤ MAX_AUDIT_SAMPLE_NODES). */
  sample: AuditNodeSample[];
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

  /**
   * Second-engine (HTML_CodeSniffer) telemetry — present only when
   * `useSecondEngine` was set. `loaded` distinguishes "engine ran" from
   * "engine couldn't load in this environment" (the key signal for verifying
   * the in-Lambda integration). Cross-validation promotes agreed issues to
   * "high" confidence.
   */
  secondEngineMeta?: {
    loaded: boolean;
    findings: number;
    highConfidence: number;
  };

  /**
   * Per-rule deep-audit results — populated ONLY when
   * `ResolvedScanOptions.deepAudit` was true. Drives the accessScan-style Full
   * Audit report. Absent on normal funnel scans.
   */
  ruleAudit?: RuleAuditResult[];
}
