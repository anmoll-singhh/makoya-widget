import { describe, it, expect } from "vitest";
import { periodOf, monthRange, rowToMonthlyReport } from "./reports";

describe("periodOf", () => {
  it("returns YYYY-MM (UTC) for an ISO timestamp", () => {
    expect(periodOf("2026-06-26T15:30:00Z")).toBe("2026-06");
    expect(periodOf("2026-01-01T00:00:00Z")).toBe("2026-01");
    expect(periodOf("2026-12-31T23:59:59Z")).toBe("2026-12");
  });

  it("uses UTC, not local time (late-UTC instant stays in its UTC month)", () => {
    // 2026-06-30T23:30:00Z is still June in UTC regardless of local TZ.
    expect(periodOf("2026-06-30T23:30:00Z")).toBe("2026-06");
  });
});

describe("monthRange", () => {
  it("returns the half-open UTC range for a mid-year month", () => {
    expect(monthRange("2026-06")).toEqual({
      startIso: "2026-06-01T00:00:00.000Z",
      endIso: "2026-07-01T00:00:00.000Z",
    });
  });

  it("rolls December over into the next January", () => {
    expect(monthRange("2026-12")).toEqual({
      startIso: "2026-12-01T00:00:00.000Z",
      endIso: "2027-01-01T00:00:00.000Z",
    });
  });

  it("handles January", () => {
    expect(monthRange("2026-01")).toEqual({
      startIso: "2026-01-01T00:00:00.000Z",
      endIso: "2026-02-01T00:00:00.000Z",
    });
  });
});

describe("rowToMonthlyReport", () => {
  it("maps a snake_case row to a camelCase MonthlyReport", () => {
    const row = {
      site_id: "site-1",
      period: "2026-06",
      score: 82,
      issues_found: 9,
      issues_resolved: 4,
      pdf_url: "https://cdn/x.pdf",
      computed_at: "2026-06-26T00:00:00Z",
    };
    expect(rowToMonthlyReport(row)).toEqual({
      siteId: "site-1",
      period: "2026-06",
      score: 82,
      issuesFound: 9,
      issuesResolved: 4,
      pdfUrl: "https://cdn/x.pdf",
      computedAt: "2026-06-26T00:00:00Z",
    });
  });

  it("tolerates null score / pdf_url and missing counts", () => {
    const rec = rowToMonthlyReport({
      site_id: "s",
      period: "2026-05",
      score: null,
      pdf_url: null,
      computed_at: "2026-05-01T00:00:00Z",
    });
    expect(rec.score).toBeNull();
    expect(rec.pdfUrl).toBeNull();
    expect(rec.issuesFound).toBe(0);
    expect(rec.issuesResolved).toBe(0);
  });
});
