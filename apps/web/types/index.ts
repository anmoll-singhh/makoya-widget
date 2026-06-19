/**
 * types/index.ts
 *
 * Single source of truth for all domain types used across the scanner.
 * Centralising here means API routes, lib utilities, and UI components
 * all import from "@/types" — no circular imports, no duplication.
 */

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

/**
 * WCAG impact levels, ordered from most to least severe.
 * Matches the string literals used by axe-core so we can use them directly
 * without mapping.
 */
export type SeverityLevel = "critical" | "serious" | "moderate" | "minor";

/**
 * The WCAG conformance levels targeted by a scan.
 * "AA" is the legal baseline for most jurisdictions (ADA, EN 301 549, etc.).
 */
export type WcagLevel = "A" | "AA" | "AAA";

// ---------------------------------------------------------------------------
// Core domain models
// ---------------------------------------------------------------------------

/**
 * A single accessibility violation found on the scanned page.
 *
 * Designed to be a stable, serialisable value object — no methods,
 * no circular references — so it can be safely passed over the wire and
 * stored in any persistence layer without transformation.
 */
export interface AccessibilityIssue {
  /** Unique rule identifier (e.g. "color-contrast", "image-alt"). */
  id: string;

  /** Short human-readable description of the rule that was violated. */
  description: string;

  /**
   * Concise plain-English guidance on how to fix this violation.
   * Sourced directly from axe-core's `help` field (distinct from `description`
   * which explains what the rule checks, whereas `help` explains how to remediate).
   */
  help: string;

  /**
   * The impact level as reported by the underlying engine (axe-core).
   * `null` when impact cannot be determined (incomplete / needs-review).
   */
  impact: SeverityLevel | null;

  /** WCAG success criteria tags (e.g. ["wcag2a", "wcag143"]). */
  tags: string[];

  /** URL of the help article explaining the violation and how to fix it. */
  helpUrl: string;

  /** DOM nodes that triggered this violation. */
  nodes: IssueNode[];
}

/**
 * A specific DOM node that contributes to an AccessibilityIssue.
 * Keeping node data nested under the issue means the report is
 * self-contained and doesn't require a secondary lookup.
 */
export interface IssueNode {
  /** CSS selector path to the offending element. */
  target: string[];

  /** Outer HTML snippet for in-context display in the report UI. */
  html: string;

  /** Human-readable explanation of why this node failed. */
  failureSummary: string | null;
}

/**
 * Per-severity violation counts included in every report.
 * Allows dashboards to render severity breakdowns without iterating `issues`.
 */
export interface IssueTotals {
  critical: number;
  serious: number;
  moderate: number;
  minor: number;
  /** Sum across all levels — equals `AccessibilityReport.totalIssues`. */
  total: number;
}

/**
 * Lightweight per-page result included in multi-page scans.
 * Carries only the metrics needed for a breakdown panel — the full
 * `issues` array lives only in the merged `AccessibilityReport`.
 */
export interface PageScanSummary {
  /** The URL that was scanned. */
  url: string;

  /** Score 0–100 for this specific page. */
  score: number;

  /** Total violations found on this page (before cross-page dedup). */
  totalIssues: number;

  /** Per-severity breakdown for this page. */
  totals: IssueTotals;

  /** How long this individual page scan took. */
  durationMs: number;
}

export interface AccessibilityReport {
  /** The URL that was scanned. */
  url: string;

  /** ISO 8601 timestamp of when the scan completed. */
  scannedAt: string;

  /** WCAG level the scan was evaluated against. */
  wcagLevel: WcagLevel;

  /**
   * Accessibility score 0–100.
   * 100 = no violations found; lower scores reflect weighted violation counts.
   */
  score: number;

  /** Violations grouped by severity for fast UI rendering. */
  issues: {
    critical: AccessibilityIssue[];
    serious: AccessibilityIssue[];
    moderate: AccessibilityIssue[];
    minor: AccessibilityIssue[];
  };

  /** Total violation count across all severity levels. */
  totalIssues: number;

  /**
   * Per-severity counts for quick aggregation without iterating `issues`.
   * Mirrors the lengths of each `issues` array.
   */
  totals: IssueTotals;

  /** Whether the page required JavaScript rendering before scanning. */
  javascriptRendered: boolean;

  /** Duration of the scan in milliseconds. */
  durationMs: number;

  /**
   * Per-page breakdown when `scanInternalLinks` was true.
   * Absent for single-page scans to keep the payload lean.
   */
  pageResults?: PageScanSummary[];

  /**
   * Number of pages that were scanned (homepage + internal links).
   * Always 1 for standard single-page scans.
   */
  pagesScanned?: number;

  /**
   * True when the full-rule scan timed out and the report was built from a
   * reduced-ruleset fallback (WCAG 2.0 A + AA only, iframes skipped).
   * The UI should show a notice so the user knows the result is partial.
   */
  isPartialScan?: boolean;
  /** Base64 JPEG data-URL screenshot of the page taken after render. */
  screenshot?: string;
}

// ---------------------------------------------------------------------------
// API contract
// ---------------------------------------------------------------------------

/**
 * Body shape expected by POST /api/scan.
 * Validated at the route handler boundary via `lib/utils/url.ts`.
 */
export interface ScanRequest {
  /** Fully-qualified URL to scan (must pass URL validation). */
  url: string;

  /** WCAG conformance level. Defaults to "AA" when omitted. */
  wcagLevel?: WcagLevel;

  /**
   * Maximum time in milliseconds to wait for the page to load.
   * Capped server-side by the `MAX_SCAN_TIMEOUT_MS` constant.
   */
  timeoutMs?: number;

  /**
   * When true, the scanner extracts up to 3 internal same-domain links from
   * the homepage and scans them concurrently, merging all results into a
   * single unified report.
   * Total execution is bounded to 30 seconds regardless of this flag.
   */
  scanInternalLinks?: boolean;
}

/**
 * Shape returned by POST /api/scan on success (HTTP 200).
 * On failure, the route returns `ApiError` instead.
 */
export interface ScanResponse {
  success: true;
  data: AccessibilityReport;
}

/**
 * Shape returned by any API route on failure (HTTP 4xx / 5xx).
 * Using a discriminated union with `ScanResponse` via the `success` flag
 * lets callers type-narrow without instanceof checks.
 */
export interface ApiError {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
  };
}

/**
 * Machine-readable error codes used across all API responses.
 * Centralising here prevents magic string drift between client and server.
 */
export type ErrorCode =
  | "INVALID_URL"
  | "SCAN_TIMEOUT"
  | "BROWSER_LAUNCH_FAILED"
  | "PAGE_LOAD_FAILED"
  | "SCAN_ENGINE_ERROR"
  | "LINK_CRAWL_FAILED"
  | "INTERNAL_SERVER_ERROR";
