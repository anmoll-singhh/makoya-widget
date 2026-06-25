/**
 * lib/scan/types.ts — the shapes the /scan surface shares across its pieces.
 *
 * These mirror the JSON returned by POST /api/public-scan exactly, so the result
 * object flows untouched from the fetch → the orchestrator → the presentational
 * components (and into <IssueCard>, whose `Issue` type is a superset of `TopIssue`).
 * Keeping them in one module means the page orchestrator and the section
 * components built in parallel can't disagree about the contract.
 */

export type Severity = "critical" | "serious" | "moderate" | "minor";

export interface ScanTotals {
  critical: number;
  serious: number;
  moderate: number;
  minor: number;
  total: number;
}

/** One plain-English finding — matches `topIssues[]` from /api/public-scan and is
 *  directly assignable to <IssueCard>'s `Issue` prop. */
export interface TopIssue {
  id: string;
  impact: Severity | null;
  /** Plain-English headline (the API sends the issue title in `help`). */
  help: string;
  whatItMeans: string;
  whoItAffects: string;
  disabilityGroups?: string[];
  howToFix?: string;
  measuredEvidence?: string;
}

export interface ScanResult {
  score: number;
  totals: ScanTotals;
  finalUrl: string;
  isPartialScan: boolean;
  topIssues: TopIssue[];
}
