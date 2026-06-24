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

/**
 * The disability groups an accessibility issue affects. Lets the UI show
 * concrete "who this hurts" badges/icons per issue instead of only a sentence,
 * and lets reports be filtered by audience. Derived from the rule, not guessed.
 */
export type DisabilityGroup =
  | "blind"                 // no vision — relies on a screen reader
  | "low-vision"            // partial vision — magnification, high contrast
  | "color-blind"           // cannot rely on colour to convey meaning
  | "deaf-hard-of-hearing"  // needs captions/transcripts for audio
  | "motor"                 // limited fine motor control — keyboard, large targets
  | "cognitive"             // memory/attention/learning — clarity, consistency
  | "vestibular"            // motion sensitivity — animation/parallax triggers
  | "speech";               // cannot use voice input/commands

/** Human-readable label for each disability group (for badges/legends). */
export const DISABILITY_GROUP_LABELS: Record<DisabilityGroup, string> = {
  "blind": "Blind",
  "low-vision": "Low vision",
  "color-blind": "Colour blindness",
  "deaf-hard-of-hearing": "Deaf / hard of hearing",
  "motor": "Motor / dexterity",
  "cognitive": "Cognitive",
  "vestibular": "Motion sensitivity",
  "speech": "Speech",
};

// ---------------------------------------------------------------------------
// Evidence + scoring value objects
// ---------------------------------------------------------------------------

/**
 * The WCAG success criterion an issue maps to — "the impacted standard".
 * `criterion`/`name`/`url` are null for best-practice rules that map to no
 * specific success criterion (we never fabricate one); `level` is then
 * "best-practice".
 */
export interface WcagInfo {
  /** Dotted criterion number, e.g. "1.4.3" — null for best-practice rules. */
  criterion: string | null;
  /** Criterion name, e.g. "Contrast (Minimum)" — null for best-practice. */
  name: string | null;
  /** Conformance level, or "best-practice" when there is no criterion. */
  level: "A" | "AA" | "AAA" | "best-practice";
  /** Link to the W3C "Understanding" doc — null for best-practice. */
  url: string | null;
  /** Additional criteria this rule also maps to (deterministic order). */
  others?: string[];
}

/**
 * One rule's contribution to the score — the auditable unit behind every
 * deducted point. Mirrors the scorer's output and crosses the wire/storage.
 */
export interface ScoreLineItem {
  ruleId: string;
  severity: SeverityLevel;
  /** True instance count used for the penalty (post-dedup). */
  instanceCount: number;
  /** Unrounded points this rule removed from 100 (line items sum to rawPenalty). */
  pointsContributed: number;
  wcagCriterion: string | null;
  level: string | null;
}

/** Fully explainable score result stored alongside every scan. */
export interface ScoreBreakdown {
  /** Integer 0–100. */
  score: number;
  /** Sum of all line-item penalties — may exceed 100. */
  rawPenalty: number;
  /** Penalty actually applied after clamping to [0, 100]. */
  appliedPenalty: number;
  /** Per-rule line items, sorted by `pointsContributed` desc. */
  lineItems: ScoreLineItem[];
  /** Scoring model version that produced this breakdown. */
  scoringModelVersion: number;

  /**
   * Penalty from issues that map to a real WCAG success criterion (the legal
   * baseline). Separated from best-practice so the report can say "X WCAG
   * conformance issues" vs "Y best-practice recommendations". Optional for
   * pre-split stored breakdowns.
   */
  wcagPenalty?: number;
  /** Penalty from best-practice (non-normative) rules only. */
  bestPracticePenalty?: number;
  /** Count of distinct rules that map to a WCAG criterion. */
  wcagIssueCount?: number;
  /** Count of distinct best-practice (non-WCAG) rules. */
  bestPracticeIssueCount?: number;
}

/**
 * Provenance recorded with every scan so a score change can be attributed to
 * the SITE changing vs the ENGINE/MODEL changing. This is what makes the
 * benchmark defensible.
 */
export interface EngineMeta {
  /** Exact axe-core version (e.g. "4.10.2"). */
  axeVersion: string;
  /** Our pipeline version. */
  engineVersion: number;
  /** Scoring model version. */
  scoringModelVersion: number;
  /** Hash of enabled axe tags + axe version + custom-check ids & version. */
  rulesetHash: string;
  /** Hash of the normalised structural/a11y DOM skeleton (change detector). */
  contentHash: string;
}

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

  /** DOM nodes that triggered this violation (display-capped). */
  nodes: IssueNode[];

  /**
   * The impacted WCAG success criterion + level. Optional for backward
   * compatibility with pre-v2 stored scans; always present on new scans.
   */
  wcag?: WcagInfo;

  /** Plain-language impact: what this means for real users. */
  whyItMatters?: string;

  /** Plain-language: which disability groups are affected. */
  whoItAffects?: string;

  /**
   * Structured disability groups this issue affects (for badges/filtering).
   * Derived from the rule's WCAG criterion + category — never fabricated.
   */
  disabilityGroups?: DisabilityGroup[];

  /**
   * Plain-language, concrete "how to fix this" guidance — curated per rule,
   * falling back to axe's `help` for unmapped rules. Distinct from `help`
   * (axe's terse text) by being action-oriented and jargon-light.
   */
  howToFix?: string;

  /**
   * The measured fact behind the failure, when the engine can extract one
   * (e.g. "Contrast 2.3:1 — needs 4.5:1"). Makes the issue visibly
   * fact-backed. Absent for rules with no measurable value.
   */
  measuredEvidence?: string;

  /**
   * TRUE number of offending instances (post-dedup, post-verification),
   * independent of the display-capped `nodes` array. Drives the score.
   * Optional for pre-v2 stored scans.
   */
  instanceCount?: number;

  /** Points this issue removed from the score (from the score breakdown). */
  pointsContributed?: number;
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
   * @deprecated Retired in v2 — the engine no longer degrades to a reduced
   * ruleset (it fails honestly with SCAN_TIMEOUT instead). Kept readable for
   * pre-v2 stored scans; never written by the v2 engine.
   */
  isPartialScan?: boolean;
  /** Base64 JPEG data-URL screenshot of the page taken after render. */
  screenshot?: string;

  /**
   * Auditable per-rule score breakdown (v2). Optional for pre-v2 stored scans.
   * Every deducted point is traceable to a line item here.
   */
  scoreBreakdown?: ScoreBreakdown;

  /**
   * Engine/model provenance (v2). Lets a score change be attributed to the
   * site vs the engine. Optional for pre-v2 stored scans.
   */
  engineMeta?: EngineMeta;
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
