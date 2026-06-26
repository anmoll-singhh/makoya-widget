import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  rowToVpat,
  rowToManualAudit,
  daysInstalled,
  assembleProofStatus,
  getProofPack,
} from "./proof";

/** Same minimal chainable Supabase stub used in overview.test.ts. No live DB. */
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

describe("rowToVpat", () => {
  it("maps a snake_case row to a camelCase VpatDocument", () => {
    const doc = rowToVpat({
      id: "v1",
      site_id: "s",
      title: "VPAT 2.4 ACR",
      url: "https://cdn/x.pdf",
      generated_on: "2026-06-01",
      created_at: "2026-06-02T00:00:00Z",
    });
    expect(doc).toEqual({
      id: "v1",
      siteId: "s",
      title: "VPAT 2.4 ACR",
      url: "https://cdn/x.pdf",
      generatedOn: "2026-06-01",
      createdAt: "2026-06-02T00:00:00Z",
    });
  });

  it("tolerates a null generated_on", () => {
    expect(rowToVpat({ id: "v", site_id: "s", title: "t", url: "u", generated_on: null, created_at: "c" }).generatedOn).toBeNull();
  });
});

describe("rowToManualAudit", () => {
  it("maps a snake_case row to a camelCase ManualAudit", () => {
    const audit = rowToManualAudit({
      id: "a1",
      site_id: "s",
      auditor: "Expert Co.",
      summary: "Keyboard pass",
      report_url: "https://cdn/r.pdf",
      performed_on: "2026-05-10",
      created_at: "2026-05-11T00:00:00Z",
    });
    expect(audit).toEqual({
      id: "a1",
      siteId: "s",
      auditor: "Expert Co.",
      summary: "Keyboard pass",
      reportUrl: "https://cdn/r.pdf",
      performedOn: "2026-05-10",
      createdAt: "2026-05-11T00:00:00Z",
    });
  });

  it("tolerates null summary/report_url/performed_on", () => {
    const audit = rowToManualAudit({
      id: "a",
      site_id: "s",
      auditor: "X",
      summary: null,
      report_url: null,
      performed_on: null,
      created_at: "c",
    });
    expect(audit.summary).toBeNull();
    expect(audit.reportUrl).toBeNull();
    expect(audit.performedOn).toBeNull();
  });
});

describe("daysInstalled", () => {
  const now = Date.parse("2026-06-26T12:00:00Z");

  it("returns 0 when never installed (null first-seen)", () => {
    expect(daysInstalled(null, now)).toBe(0);
  });

  it("returns whole days since first-seen", () => {
    // first seen 2026-06-20T12:00Z, now 2026-06-26T12:00Z → 6 days
    expect(daysInstalled("2026-06-20T12:00:00Z", now)).toBe(6);
  });

  it("floors partial days", () => {
    // first seen 2026-06-24T00:00Z, now 2026-06-26T12:00Z → 2.5 → 2
    expect(daysInstalled("2026-06-24T00:00:00Z", now)).toBe(2);
  });

  it("does NOT go stale — counts days even from an old first-seen", () => {
    // 100 days ago, still counts (unlike streakDays which would reset to 0)
    const old = "2026-03-18T12:00:00Z";
    expect(daysInstalled(old, now)).toBe(100);
  });

  it("never returns a negative number for a future first-seen", () => {
    expect(daysInstalled("2026-06-27T12:00:00Z", now)).toBe(0);
  });

  it("returns 0 for an unparseable first-seen", () => {
    expect(daysInstalled("not-a-date", now)).toBe(0);
  });
});

describe("assembleProofStatus", () => {
  it("produces sensible zeros/false/empties when everything is empty", () => {
    const pack = assembleProofStatus({
      scanCount: 0,
      latestScan: null,
      remediationCount: 0,
      statement: null,
      heartbeat: null,
      vpat: [],
      manualAudits: [],
    });
    expect(pack).toEqual({
      auditHistory: { count: 0, latestScore: null, latestOn: null },
      remediationCount: 0,
      statementPublished: false,
      install: { daysInstalled: 0, firstSeenOn: null },
      vpat: [],
      manualAudits: [],
    });
  });

  it("maps populated parts correctly", () => {
    const now = Date.parse("2026-06-26T12:00:00Z");
    const vpat = [
      { id: "v", siteId: "s", title: "ACR", url: "u", generatedOn: "2026-06-01", createdAt: "c" },
    ];
    const manualAudits = [
      { id: "a", siteId: "s", auditor: "X", summary: null, reportUrl: null, performedOn: null, createdAt: "c" },
    ];
    const pack = assembleProofStatus({
      scanCount: 7,
      latestScan: { score: 82, createdAt: "2026-06-25T00:00:00Z" } as never,
      remediationCount: 12,
      statement: { siteId: "s" } as never,
      heartbeat: { firstSeenAt: "2026-06-20T12:00:00Z" } as never,
      vpat,
      manualAudits,
      nowMs: now,
    });
    expect(pack.auditHistory).toEqual({ count: 7, latestScore: 82, latestOn: "2026-06-25T00:00:00Z" });
    expect(pack.remediationCount).toBe(12);
    expect(pack.statementPublished).toBe(true);
    expect(pack.install).toEqual({ daysInstalled: 6, firstSeenOn: "2026-06-20T12:00:00Z" });
    expect(pack.vpat).toBe(vpat);
    expect(pack.manualAudits).toBe(manualAudits);
  });

  it("treats a null-score latest scan as a present audit with unknown score", () => {
    const pack = assembleProofStatus({
      scanCount: 1,
      latestScan: { score: null, createdAt: "2026-06-25T00:00:00Z" } as never,
      remediationCount: 0,
      statement: null,
      heartbeat: null,
      vpat: [],
      manualAudits: [],
    });
    expect(pack.auditHistory).toEqual({ count: 1, latestScore: null, latestOn: "2026-06-25T00:00:00Z" });
  });
});

describe("listVpat / listManualAudits", () => {
  it("getProofPack assembles the pack from the consumed data layers", async () => {
    const client = fakeClient({
      scans: { data: { id: "sc", site_id: "s", url: "u", score: 90, totals: {}, issues: {}, created_at: "2026-06-25T00:00:00Z" }, error: null },
      remediation_log: { count: 5, error: null },
      accessibility_statements: { data: { site_id: "s", brand_name: "B", jurisdictions: [], conformance_target: "WCAG 2.1 AA", contact_email: "a@b.com", html: "<p>", updated_at: "x" }, error: null },
      widget_heartbeats: { data: { site_id: "s", first_seen_at: "2026-06-20T12:00:00Z", last_seen_at: "2026-06-26T11:00:00Z", ping_count: 9, last_url: null }, error: null },
      vpat_documents: { data: [{ id: "v", site_id: "s", title: "ACR", url: "u", generated_on: "2026-06-01", created_at: "c" }], error: null },
      manual_audits: { data: [{ id: "a", site_id: "s", auditor: "X", summary: null, report_url: null, performed_on: null, created_at: "c" }], error: null },
    });

    const pack = await getProofPack(client, "s");
    expect(pack.auditHistory.latestScore).toBe(90);
    expect(pack.auditHistory.latestOn).toBe("2026-06-25T00:00:00Z");
    expect(pack.remediationCount).toBe(5);
    expect(pack.statementPublished).toBe(true);
    expect(pack.install.firstSeenOn).toBe("2026-06-20T12:00:00Z");
    expect(pack.vpat).toHaveLength(1);
    expect(pack.manualAudits).toHaveLength(1);
  });

  it("getProofPack returns sensible empties when nothing exists", async () => {
    const client = fakeClient({
      scans: { data: null, error: null },
      remediation_log: { count: 0, error: null },
      accessibility_statements: { data: null, error: null },
      widget_heartbeats: { data: null, error: null },
      vpat_documents: { data: [], error: null },
      manual_audits: { data: [], error: null },
    });
    const pack = await getProofPack(client, "s");
    expect(pack.statementPublished).toBe(false);
    expect(pack.install).toEqual({ daysInstalled: 0, firstSeenOn: null });
    expect(pack.auditHistory).toEqual({ count: 0, latestScore: null, latestOn: null });
    expect(pack.vpat).toEqual([]);
    expect(pack.manualAudits).toEqual([]);
  });

  it("getProofPack propagates an infra error from a consumed layer", async () => {
    const client = fakeClient({
      scans: { data: null, error: new Error("scans-fail") },
      remediation_log: { count: 0, error: null },
      accessibility_statements: { data: null, error: null },
      widget_heartbeats: { data: null, error: null },
      vpat_documents: { data: [], error: null },
      manual_audits: { data: [], error: null },
    });
    await expect(getProofPack(client, "s")).rejects.toThrow("scans-fail");
  });
});
