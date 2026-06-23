import type { AccessibilityReport, EngineMeta, IssueTotals, ScoreBreakdown } from "@/types";

export interface ScanRecord {
  id: string;
  siteId: string;
  url: string;
  score: number;
  totals: IssueTotals;
  issues: AccessibilityReport["issues"];
  createdAt: string;
  /** Auditable per-rule score breakdown (v2). Null for pre-v2 scans. */
  scoreBreakdown?: ScoreBreakdown;
  /** Engine/model provenance (v2). Null for pre-v2 scans. */
  engineMeta?: EngineMeta;
}

export function scanRowToRecord(row: any): ScanRecord {
  return {
    id: row.id,
    siteId: row.site_id,
    url: row.url,
    score: row.score,
    totals: row.totals,
    issues: row.issues,
    createdAt: row.created_at,
    // Surface the v2 columns when present (added by 20260623000000_scan_evidence).
    scoreBreakdown: row.score_breakdown ?? undefined,
    engineMeta: row.engine_meta ?? undefined,
  };
}
