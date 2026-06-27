import { describe, it, expect } from "vitest";
import { buildReportContent } from "./report-content";

const base = {
  url: "https://shop.example/products",
  score: 72,
  totals: { critical: 1, serious: 3, moderate: 2, minor: 4 },
  topIssues: [
    {
      id: "color-contrast",
      impact: "serious" as const,
      help: "Text is hard to read against its background",
      whatItMeans: "Some text doesn't stand out enough from its background colour.",
      whoItAffects: "People with low vision or colour blindness.",
    },
  ],
  isPartialScan: false,
  generatedAt: new Date("2026-06-23T10:00:00Z"),
};

describe("buildReportContent", () => {
  it("derives the host and echoes the scanned url + score", () => {
    const c = buildReportContent(base);
    expect(c.host).toBe("shop.example");
    expect(c.url).toBe("https://shop.example/products");
    expect(c.score).toBe(72);
  });

  it("computes the total when omitted and exposes a severity breakdown", () => {
    const c = buildReportContent(base);
    expect(c.totals.total).toBe(10); // 1+3+2+4
    const counts = Object.fromEntries(c.severityRows.map((r) => [r.key, r.count]));
    expect(counts).toEqual({ critical: 1, serious: 3, moderate: 2, minor: 4 });
  });

  it("carries the issues through with their plain-English fields", () => {
    const c = buildReportContent(base);
    expect(c.issues).toHaveLength(1);
    expect(c.issues[0].title).toContain("hard to read");
    expect(c.issues[0].whoItAffects).toContain("low vision");
  });

  it("includes an honest disclaimer and concrete next steps", () => {
    const c = buildReportContent(base);
    expect(c.disclaimer.length).toBeGreaterThan(40);
    expect(c.nextSteps.length).toBeGreaterThan(0);
  });

  it("NEVER makes compliance / legal-guarantee claims (honest-hybrid guardrail)", () => {
    const c = buildReportContent(base);
    const banned = /\b(WCAG[- ]?compliant|ADA[- ]?compliant|fully compliant|guaranteed|lawsuit-?proof)\b/i;
    const allText = [
      c.host,
      c.intro,
      c.scoreVerdict,
      c.disclaimer,
      c.footer,
      ...c.nextSteps,
      ...c.issues.flatMap((i) => [i.title, i.whatItMeans, i.whoItAffects]),
      ...c.remainingItems.map((r) => r.title),
    ].join(" \n ");
    expect(banned.test(allText)).toBe(false);
  });

  it("clamps an out-of-range score into 0..100", () => {
    expect(buildReportContent({ ...base, score: 130 }).score).toBe(100);
    expect(buildReportContent({ ...base, score: -5 }).score).toBe(0);
  });

  it("handles a clean page with no issues", () => {
    const c = buildReportContent({
      ...base,
      score: 100,
      totals: { critical: 0, serious: 0, moderate: 0, minor: 0 },
      topIssues: [],
    });
    expect(c.totals.total).toBe(0);
    expect(c.issues).toHaveLength(0);
    expect(c.scoreVerdict.length).toBeGreaterThan(0);
  });

  it("notes a partial scan when flagged", () => {
    const c = buildReportContent({ ...base, isPartialScan: true });
    expect(c.partialNote).toBeTruthy();
  });

  it("builds a remainingItems punch-list that mirrors the issue list", () => {
    const c = buildReportContent(base);
    expect(c.remainingItems).toHaveLength(c.issues.length);
    expect(c.remainingItems[0]).toMatchObject({
      num: 1,
      severity: expect.any(String),
      title: expect.any(String),
      status: "Open",
    });
  });

  it("sorts issues by severity (critical first) and the punch-list matches", () => {
    const c = buildReportContent({
      ...base,
      totals: { critical: 1, serious: 1, moderate: 1, minor: 1 },
      topIssues: [
        { id: "a", impact: "minor" as const,    help: "Minor issue",    whatItMeans: "m", whoItAffects: "u" },
        { id: "b", impact: "critical" as const, help: "Critical issue", whatItMeans: "m", whoItAffects: "u" },
        { id: "c", impact: "moderate" as const, help: "Moderate issue", whatItMeans: "m", whoItAffects: "u" },
        { id: "d", impact: "serious" as const,  help: "Serious issue",  whatItMeans: "m", whoItAffects: "u" },
      ],
    });
    expect(c.issues.map((i) => i.impact)).toEqual(["critical", "serious", "moderate", "minor"]);
    // punch-list order follows sorted issues
    expect(c.remainingItems.map((r) => r.severity)).toEqual(["Critical", "Serious", "Moderate", "Minor"]);
    expect(c.remainingItems.map((r) => r.num)).toEqual([1, 2, 3, 4]);
  });

  it("produces an empty remainingItems list when there are no issues", () => {
    const c = buildReportContent({
      ...base,
      score: 100,
      totals: { critical: 0, serious: 0, moderate: 0, minor: 0 },
      topIssues: [],
    });
    expect(c.remainingItems).toEqual([]);
  });
});
