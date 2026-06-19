import type { AccessibilityReport, IssueTotals } from "@/types";

export interface ScanRecord {
  id: string;
  siteId: string;
  url: string;
  score: number;
  totals: IssueTotals;
  issues: AccessibilityReport["issues"];
  createdAt: string;
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
  };
}
