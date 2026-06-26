import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  periodOf,
  monthRange,
  rowToMonthlyReport,
  listMonthlyReports,
  countRemediatedInRange,
  recomputeMonthly,
} from "./reports";

/**
 * Minimal chainable Supabase stub: every query verb returns the same builder,
 * which resolves (await / .then / .single / .maybeSingle) to the per-table
 * response. No live DB. `from` records each call so tests can assert the table.
 */
function fakeClient(tableResponses: Record<string, unknown>) {
  const calls: { table: string }[] = [];
  const client = {
    calls,
    from(table: string) {
      calls.push({ table });
      const resp = tableResponses[table] ?? { data: null, error: null };
      const builder: Record<string, unknown> = {};
      const passthrough = () => builder;
      for (const verb of [
        "select",
        "insert",
        "upsert",
        "update",
        "eq",
        "neq",
        "gte",
        "lt",
        "order",
        "limit",
      ]) {
        builder[verb] = passthrough;
      }
      builder.maybeSingle = () => Promise.resolve(resp);
      builder.single = () => Promise.resolve(resp);
      builder.then = (onF: (v: unknown) => unknown, onR?: (e: unknown) => unknown) =>
        Promise.resolve(resp).then(onF, onR);
      return builder;
    },
  };
  return client as unknown as SupabaseClient & { calls: { table: string }[] };
}

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

describe("listMonthlyReports", () => {
  it("maps rows (newest-first ordering is delegated to the query)", async () => {
    const client = fakeClient({
      monthly_reports: {
        data: [
          { site_id: "s", period: "2026-06", score: 82, issues_found: 9, issues_resolved: 4, pdf_url: null, computed_at: "2026-06-26T00:00:00Z" },
          { site_id: "s", period: "2026-05", score: 70, issues_found: 12, issues_resolved: 2, pdf_url: null, computed_at: "2026-05-31T00:00:00Z" },
        ],
        error: null,
      },
    });
    const out = await listMonthlyReports(client, "s");
    expect(out).toHaveLength(2);
    expect(out[0].period).toBe("2026-06");
    expect(out[0].issuesFound).toBe(9);
    expect(client.calls).toEqual([{ table: "monthly_reports" }]);
  });

  it("throws on infra error", async () => {
    const client = fakeClient({ monthly_reports: { data: null, error: new Error("boom") } });
    await expect(listMonthlyReports(client, "s")).rejects.toThrow("boom");
  });
});

describe("countRemediatedInRange", () => {
  it("returns the count from a head query", async () => {
    const client = fakeClient({ remediation_log: { count: 5, error: null } });
    expect(await countRemediatedInRange(client, "s", "2026-06-01T00:00:00.000Z", "2026-07-01T00:00:00.000Z")).toBe(5);
  });

  it("returns 0 when count is null", async () => {
    const client = fakeClient({ remediation_log: { count: null, error: null } });
    expect(await countRemediatedInRange(client, "s", "a", "b")).toBe(0);
  });

  it("throws on infra error", async () => {
    const client = fakeClient({ remediation_log: { count: null, error: new Error("nope") } });
    await expect(countRemediatedInRange(client, "s", "a", "b")).rejects.toThrow("nope");
  });
});

describe("recomputeMonthly", () => {
  it("upserts the latest scan's score + totals.total and the in-range resolved count", async () => {
    const client = fakeClient({
      scans: { data: { score: 88, totals: { total: 7 }, created_at: "2026-06-15T00:00:00Z" }, error: null },
      remediation_log: { count: 3, error: null },
      monthly_reports: {
        data: { site_id: "s", period: "2026-06", score: 88, issues_found: 7, issues_resolved: 3, pdf_url: null, computed_at: "2026-06-26T00:00:00Z" },
        error: null,
      },
    });
    const out = await recomputeMonthly(client, "s", "2026-06");
    expect(out).toEqual({
      siteId: "s",
      period: "2026-06",
      score: 88,
      issuesFound: 7,
      issuesResolved: 3,
      pdfUrl: null,
      computedAt: "2026-06-26T00:00:00Z",
    });
  });

  it("yields a null score and 0 found when there is no scan in the window", async () => {
    const client = fakeClient({
      scans: { data: null, error: null },
      remediation_log: { count: 0, error: null },
      monthly_reports: {
        data: { site_id: "s", period: "2026-04", score: null, issues_found: 0, issues_resolved: 0, pdf_url: null, computed_at: "2026-04-30T00:00:00Z" },
        error: null,
      },
    });
    const out = await recomputeMonthly(client, "s", "2026-04");
    expect(out.score).toBeNull();
    expect(out.issuesFound).toBe(0);
  });

  it("throws on scan infra error", async () => {
    const client = fakeClient({ scans: { data: null, error: new Error("scan-fail") } });
    await expect(recomputeMonthly(client, "s", "2026-06")).rejects.toThrow("scan-fail");
  });
});
