/**
 * lib/pdf/report-content.caps.test.ts
 *
 * /api/report-pdf accepts a client-supplied payload (url, score, totals,
 * topIssues) and feeds it to buildReportContent. Because that input is
 * untrusted, the builder defends itself: it caps the issue list, truncates
 * over-long fields, coerces unknown severities, and floors negative/NaN counts.
 * The existing test covers the happy path; this suite locks the DEFENSIVE caps
 * so a hostile/oversized payload can never blow up the PDF render.
 *
 * Pure function — env-free.
 */
import { describe, it, expect } from "vitest";
import { buildReportContent, type ReportPdfIssue } from "./report-content";

const baseTotals = { critical: 0, serious: 0, moderate: 0, minor: 0 };

function issue(over: Partial<ReportPdfIssue> = {}): ReportPdfIssue {
  return {
    id: "rule",
    impact: "serious",
    help: "Some issue",
    whatItMeans: "It means something.",
    whoItAffects: "Some users.",
    ...over,
  };
}

describe("buildReportContent — defensive input caps", () => {
  it("caps the issue list at 50 even when given far more", () => {
    const topIssues = Array.from({ length: 500 }, (_, i) => issue({ id: `rule-${i}` }));
    const c = buildReportContent({
      url: "https://x.test",
      score: 50,
      totals: baseTotals,
      topIssues,
    });
    expect(c.issues).toHaveLength(50);
  });

  it("truncates over-long string fields to 600 chars", () => {
    const huge = "A".repeat(5000);
    const c = buildReportContent({
      url: "https://x.test",
      score: 50,
      totals: baseTotals,
      topIssues: [issue({ id: huge, help: huge, whatItMeans: huge, whoItAffects: huge })],
    });
    const only = c.issues[0];
    expect(only.id.length).toBe(600);
    expect(only.title.length).toBe(600);
    expect(only.whatItMeans.length).toBe(600);
    expect(only.whoItAffects.length).toBe(600);
  });

  it("coerces an unknown / hostile impact value to null (never trusts JSON)", () => {
    const c = buildReportContent({
      url: "https://x.test",
      score: 50,
      totals: baseTotals,
      // intentionally bypass the type to simulate untrusted JSON
      topIssues: [issue({ impact: "blocker" as unknown as ReportPdfIssue["impact"] })],
    });
    expect(c.issues[0].impact).toBeNull();
    expect(c.issues[0].impactLabel).toBe("");
  });

  it("keeps a valid impact and supplies its label", () => {
    const c = buildReportContent({
      url: "https://x.test",
      score: 50,
      totals: baseTotals,
      topIssues: [issue({ impact: "critical" })],
    });
    expect(c.issues[0].impact).toBe("critical");
    expect(c.issues[0].impactLabel).toBe("Critical");
  });

  it("floors negative / fractional / NaN totals to safe non-negative integers", () => {
    const c = buildReportContent({
      url: "https://x.test",
      score: 50,
      totals: {
        critical: -5,
        serious: 2.9,
        moderate: Number.NaN,
        minor: Infinity as unknown as number,
      },
      topIssues: [],
    });
    const counts = Object.fromEntries(c.severityRows.map((r) => [r.key, r.count]));
    expect(counts.critical).toBe(0); // negative floored
    expect(counts.serious).toBe(2); // truncated, not rounded
    expect(counts.moderate).toBe(0); // NaN → 0
    expect(counts.minor).toBe(0); // Infinity not finite → 0
    expect(c.totals.total).toBe(2); // derived from the safe parts
  });

  it("ignores a non-finite supplied total and recomputes from the parts", () => {
    const c = buildReportContent({
      url: "https://x.test",
      score: 50,
      totals: { critical: 1, serious: 1, moderate: 1, minor: 1, total: Number.NaN },
      topIssues: [],
    });
    expect(c.totals.total).toBe(4);
  });

  it("clamps a non-finite score to 0", () => {
    const c = buildReportContent({
      url: "https://x.test",
      score: Number.NaN,
      totals: baseTotals,
      topIssues: [],
    });
    expect(c.score).toBe(0);
  });

  it("tolerates a missing topIssues array", () => {
    const c = buildReportContent({
      url: "https://x.test",
      score: 80,
      totals: baseTotals,
      topIssues: undefined as unknown as ReportPdfIssue[],
    });
    expect(c.issues).toEqual([]);
  });

  it("uses an injectable generatedAt for a deterministic date label", () => {
    const c = buildReportContent({
      url: "https://x.test",
      score: 80,
      totals: baseTotals,
      topIssues: [],
      generatedAt: new Date("2026-06-24T12:34:56Z"),
    });
    expect(c.dateLabel).toBe("2026-06-24");
  });
});
