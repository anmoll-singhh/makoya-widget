import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { summarizeCoverage, streakDays, trendDelta, getOverview } from "./overview";
import type { IssueRecord, IssueStatus } from "./issues";

/** Same minimal chainable Supabase stub used in reports.test.ts. No live DB. */
function fakeClient(tableResponses: Record<string, unknown>) {
  const client = {
    from(table: string) {
      const resp = tableResponses[table] ?? { data: null, error: null };
      const builder: Record<string, unknown> = {};
      const passthrough = () => builder;
      for (const verb of ["select", "eq", "neq", "gte", "lt", "order", "limit"]) {
        builder[verb] = passthrough;
      }
      builder.maybeSingle = () => Promise.resolve(resp);
      builder.single = () => Promise.resolve(resp);
      builder.then = (onF: (v: unknown) => unknown, onR?: (e: unknown) => unknown) =>
        Promise.resolve(resp).then(onF, onR);
      return builder;
    },
  };
  return client as unknown as SupabaseClient;
}

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

describe("getOverview", () => {
  it("assembles the view-model from the consumed data layers", async () => {
    const client = fakeClient({
      issues: {
        data: [
          { id: "1", site_id: "s", rule_id: "a", framework: "wcag", title: "t", status: "failing", checks_passing: 0, checks_total: 1, created_at: "x", updated_at: "x" },
          { id: "2", site_id: "s", rule_id: "b", framework: "wcag", title: "t", status: "needs_review", checks_passing: 0, checks_total: 1, created_at: "x", updated_at: "x" },
          { id: "3", site_id: "s", rule_id: "c", framework: "wcag", title: "t", status: "passing", checks_passing: 1, checks_total: 1, created_at: "x", updated_at: "x" },
          { id: "4", site_id: "s", rule_id: "d", framework: "wcag", title: "t", status: "passing", checks_passing: 1, checks_total: 1, created_at: "x", updated_at: "x" },
        ],
        error: null,
      },
      widget_event_daily: {
        data: [{ day: "2026-06-26", event: "open", feature_key: "", count: 42 }],
        error: null,
      },
      widget_heartbeats: {
        data: { site_id: "s", first_seen_at: "2026-06-20T12:00:00Z", last_seen_at: "2026-06-26T11:59:00Z", ping_count: 100, last_url: null },
        error: null,
      },
      activity_log: {
        data: [{ id: "a1", site_id: "s", actor: "system", type: "scan_completed", summary: "done", wcag_ref: null, created_at: "2026-06-26T00:00:00Z" }],
        error: null,
      },
      monthly_reports: {
        data: [
          { site_id: "s", period: "2026-06", score: 80, issues_found: 3, issues_resolved: 4, pdf_url: null, computed_at: "2026-06-26T00:00:00Z" },
          { site_id: "s", period: "2026-05", score: 70, issues_found: 6, issues_resolved: 1, pdf_url: null, computed_at: "2026-05-31T00:00:00Z" },
        ],
        error: null,
      },
      scans: { data: { id: "sc", site_id: "s", url: "u", score: 65, totals: { total: 3 }, issues: {}, created_at: "2026-06-26T00:00:00Z" }, error: null },
      remediation_log: { count: 4, error: null },
    });

    const out = await getOverview(client, "s");

    // Headline score prefers the latest monthly score over the latest scan.
    expect(out.score).toBe(80);
    expect(out.scoreDelta).toBe(10); // 80 - 70
    expect(out.openIssues).toBe(2); // 1 failing + 1 needs_review
    expect(out.needsHuman).toBe(1);
    expect(out.issuesResolvedThisMonth).toBe(4);
    expect(out.widgetOpens).toBe(42);
    expect(out.coverage).toEqual([{ framework: "wcag", pct: 50 }]); // 2 passing / 4 total
    // Trend is chronological (oldest first).
    expect(out.trend.map((t) => t.period)).toEqual(["2026-05", "2026-06"]);
    expect(out.activity).toHaveLength(1);
    expect(out.status).toBe("active"); // fresh heartbeat + score >= 50
  });

  it("falls back to the latest scan score when there are no monthly rows", async () => {
    const client = fakeClient({
      issues: { data: [], error: null },
      widget_event_daily: { data: [], error: null },
      widget_heartbeats: { data: null, error: null },
      activity_log: { data: [], error: null },
      monthly_reports: { data: [], error: null },
      scans: { data: { id: "sc", site_id: "s", url: "u", score: 55, totals: { total: 0 }, issues: {}, created_at: "x" }, error: null },
      remediation_log: { count: 0, error: null },
    });
    const out = await getOverview(client, "s");
    expect(out.score).toBe(55);
    expect(out.scoreDelta).toBeNull();
    expect(out.status).toBe("not_installed"); // no heartbeat
    expect(out.streakDays).toBe(0);
    expect(out.coverage).toEqual([]);
  });

  it("propagates an infra error from a consumed layer", async () => {
    const client = fakeClient({
      issues: { data: null, error: new Error("issues-fail") },
      widget_event_daily: { data: [], error: null },
      widget_heartbeats: { data: null, error: null },
      activity_log: { data: [], error: null },
      monthly_reports: { data: [], error: null },
      scans: { data: null, error: null },
      remediation_log: { count: 0, error: null },
    });
    await expect(getOverview(client, "s")).rejects.toThrow("issues-fail");
  });
});
