import { describe, it, expect } from "vitest";
import { summarizeCoverage, streakDays, trendDelta } from "./overview";
import type { IssueRecord, IssueStatus } from "./issues";

/** Minimal IssueRecord factory for coverage tests. */
function issue(framework: string, status: IssueStatus): IssueRecord {
  return {
    id: Math.random().toString(36).slice(2),
    siteId: "s",
    scanId: null,
    ruleId: "r",
    wcagCriterion: null,
    framework,
    title: "t",
    status,
    checksPassing: 0,
    checksTotal: 0,
    assigneeId: null,
    createdAt: "2026-06-01T00:00:00Z",
    updatedAt: "2026-06-01T00:00:00Z",
    resolvedAt: null,
  };
}

function group(records: IssueRecord[]): Record<IssueStatus, IssueRecord[]> {
  const g: Record<IssueStatus, IssueRecord[]> = { failing: [], needs_review: [], passing: [] };
  for (const r of records) g[r.status].push(r);
  return g;
}

describe("summarizeCoverage", () => {
  it("returns [] for empty issues", () => {
    expect(summarizeCoverage(group([]))).toEqual([]);
  });

  it("computes pct = passing / (passing+failing+needs_review) rounded for a single framework", () => {
    // 3 passing, 1 failing → 3/4 = 75
    const coverage = summarizeCoverage(
      group([
        issue("wcag", "passing"),
        issue("wcag", "passing"),
        issue("wcag", "passing"),
        issue("wcag", "failing"),
      ])
    );
    expect(coverage).toEqual([{ framework: "wcag", pct: 75 }]);
  });

  it("counts needs_review in the denominator", () => {
    // 1 passing, 1 needs_review → 1/2 = 50
    const coverage = summarizeCoverage(
      group([issue("wcag", "passing"), issue("wcag", "needs_review")])
    );
    expect(coverage).toEqual([{ framework: "wcag", pct: 50 }]);
  });

  it("orders multiple frameworks stably (alphabetical) and rounds", () => {
    const coverage = summarizeCoverage(
      group([
        issue("section508", "passing"),
        issue("section508", "failing"),
        issue("section508", "failing"), // 1/3 = 33.33 → 33
        issue("ada", "passing"), // 1/1 = 100
      ])
    );
    expect(coverage).toEqual([
      { framework: "ada", pct: 100 },
      { framework: "section508", pct: 33 },
    ]);
  });
});

describe("streakDays", () => {
  const now = Date.parse("2026-06-26T12:00:00Z");

  it("returns 0 when never installed (null first/last seen)", () => {
    expect(streakDays(null, null, now)).toBe(0);
    expect(streakDays("2026-06-20T00:00:00Z", null, now)).toBe(0);
    expect(streakDays(null, "2026-06-26T00:00:00Z", now)).toBe(0);
  });

  it("returns 0 when last-seen is stale (> 2 days ago)", () => {
    // last seen 3 days ago → stale
    expect(streakDays("2026-06-01T12:00:00Z", "2026-06-23T11:00:00Z", now)).toBe(0);
  });

  it("returns whole days from first-seen to now when fresh", () => {
    // first seen 2026-06-20T12:00Z, now 2026-06-26T12:00Z → 6 days; last seen recent
    expect(streakDays("2026-06-20T12:00:00Z", "2026-06-26T11:00:00Z", now)).toBe(6);
  });

  it("floors partial days", () => {
    // first seen 2026-06-24T00:00Z, now 2026-06-26T12:00Z → 2.5 days → 2
    expect(streakDays("2026-06-24T00:00:00Z", "2026-06-26T11:00:00Z", now)).toBe(2);
  });
});

describe("trendDelta", () => {
  it("returns null with fewer than 2 points", () => {
    expect(trendDelta([])).toBeNull();
    expect(trendDelta([{ period: "2026-06", score: 80 }])).toBeNull();
  });

  it("returns latest minus previous non-null", () => {
    expect(
      trendDelta([
        { period: "2026-05", score: 70 },
        { period: "2026-06", score: 80 },
      ])
    ).toBe(10);
  });

  it("returns null when the latest score is null", () => {
    expect(
      trendDelta([
        { period: "2026-05", score: 70 },
        { period: "2026-06", score: null },
      ])
    ).toBeNull();
  });

  it("skips null gaps to find the previous non-null score", () => {
    expect(
      trendDelta([
        { period: "2026-04", score: 70 },
        { period: "2026-05", score: null },
        { period: "2026-06", score: 90 },
      ])
    ).toBe(20);
  });

  it("returns null when there is no previous non-null score", () => {
    expect(
      trendDelta([
        { period: "2026-05", score: null },
        { period: "2026-06", score: 80 },
      ])
    ).toBeNull();
  });
});
