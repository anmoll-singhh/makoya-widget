import { describe, it, expect } from "vitest";
import { scanRowToRecord } from "./scans-mappers";

describe("scanRowToRecord", () => {
  it("maps a db row to a ScanRecord", () => {
    const row = {
      id: "sc1", site_id: "s1", url: "https://x.com", score: 80,
      totals: { critical: 0, serious: 1, moderate: 2, minor: 0, total: 3 },
      issues: { critical: [], serious: [], moderate: [], minor: [] },
      created_at: "2026-06-19T00:00:00Z",
    };
    expect(scanRowToRecord(row)).toEqual({
      id: "sc1", siteId: "s1", url: "https://x.com", score: 80,
      totals: row.totals, issues: row.issues, createdAt: "2026-06-19T00:00:00Z",
    });
  });
});
