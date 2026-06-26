import { describe, it, expect } from "vitest";
import {
  severityToStatus,
  frameworkForCriterion,
  rowToIssue,
  upsertIssuesFromScan,
  listIssues,
  updateIssue,
  getIssueSiteId,
  type IssueStatus,
} from "./issues";

// ── severityToStatus: PURE mapping (all branches) ─────────────────────────────
describe("severityToStatus", () => {
  it("maps critical and serious to failing", () => {
    expect(severityToStatus("critical")).toBe("failing");
    expect(severityToStatus("serious")).toBe("failing");
  });

  it("maps moderate and minor to needs_review", () => {
    expect(severityToStatus("moderate")).toBe("needs_review");
    expect(severityToStatus("minor")).toBe("needs_review");
  });

  it("maps unknown / null / undefined to needs_review", () => {
    expect(severityToStatus("whatever")).toBe("needs_review");
    expect(severityToStatus(null)).toBe("needs_review");
    expect(severityToStatus(undefined)).toBe("needs_review");
  });

  it("is case-insensitive on the impact string", () => {
    expect(severityToStatus("CRITICAL")).toBe("failing");
    expect(severityToStatus("Serious")).toBe("failing");
  });
});

// ── frameworkForCriterion: PURE seam (single source today) ────────────────────
describe("frameworkForCriterion", () => {
  it("returns wcag for any criterion (single source for now)", () => {
    expect(frameworkForCriterion("1.1.1")).toBe("wcag");
    expect(frameworkForCriterion(null)).toBe("wcag");
    expect(frameworkForCriterion("")).toBe("wcag");
  });
});

// ── rowToIssue: snake_case row → camelCase IssueRecord ────────────────────────
describe("rowToIssue", () => {
  it("maps a full snake_case row", () => {
    const rec = rowToIssue({
      id: "issue-1",
      site_id: "site-1",
      scan_id: "scan-1",
      rule_id: "color-contrast",
      wcag_criterion: "1.4.3",
      framework: "wcag",
      title: "Elements must meet contrast",
      status: "failing",
      checks_passing: 2,
      checks_total: 5,
      assignee_id: "user-9",
      created_at: "2026-06-26T00:00:00Z",
      updated_at: "2026-06-26T01:00:00Z",
      resolved_at: null,
    });
    expect(rec).toEqual({
      id: "issue-1",
      siteId: "site-1",
      scanId: "scan-1",
      ruleId: "color-contrast",
      wcagCriterion: "1.4.3",
      framework: "wcag",
      title: "Elements must meet contrast",
      status: "failing",
      checksPassing: 2,
      checksTotal: 5,
      assigneeId: "user-9",
      createdAt: "2026-06-26T00:00:00Z",
      updatedAt: "2026-06-26T01:00:00Z",
      resolvedAt: null,
    });
  });

  it("tolerates null scan/criterion/assignee and coerces null counts to 0", () => {
    const rec = rowToIssue({
      id: "issue-2",
      site_id: "site-1",
      scan_id: null,
      rule_id: "image-alt",
      wcag_criterion: null,
      framework: "wcag",
      title: "Images need alt text",
      status: "needs_review",
      checks_passing: null,
      checks_total: null,
      assignee_id: null,
      created_at: "2026-06-26T00:00:00Z",
      updated_at: "2026-06-26T00:00:00Z",
      resolved_at: null,
    });
    expect(rec.scanId).toBeNull();
    expect(rec.wcagCriterion).toBeNull();
    expect(rec.assigneeId).toBeNull();
    expect(rec.checksPassing).toBe(0);
    expect(rec.checksTotal).toBe(0);
  });
});

// ── A minimal in-memory fake Supabase client (no live DB) ─────────────────────
// Models just enough of the `issues` table for the write/read/update fns.
function makeFakeClient() {
  let seq = 0;
  const rows: any[] = [];

  function from(_table: string) {
    const state: {
      op: "select" | "update" | null;
      patch: any;
      filters: Record<string, any>;
      neq?: { col: string; val: any };
      inFilter?: { col: string; vals: any[] };
    } = { op: null, patch: null, filters: {} };

    const matches = (r: any) => {
      for (const [col, val] of Object.entries(state.filters)) {
        if (r[col] !== val) return false;
      }
      if (state.neq && r[state.neq.col] === state.neq.val) return false;
      if (state.inFilter && !state.inFilter.vals.includes(r[state.inFilter.col])) return false;
      return true;
    };

    const builder: any = {
      select() {
        state.op = "select";
        return builder;
      },
      upsert(input: any) {
        const list = Array.isArray(input) ? input : [input];
        for (const row of list) {
          const existing = rows.find(
            (r) => r.site_id === row.site_id && r.rule_id === row.rule_id
          );
          if (existing) Object.assign(existing, row);
          else rows.push({ id: `issue-${++seq}`, ...row });
        }
        return Promise.resolve({ error: null });
      },
      update(patch: any) {
        state.op = "update";
        state.patch = patch;
        return builder;
      },
      eq(col: string, val: any) {
        state.filters[col] = val;
        return builder;
      },
      neq(col: string, val: any) {
        state.neq = { col, val };
        return builder;
      },
      in(col: string, vals: any[]) {
        state.inFilter = { col, vals };
        return builder;
      },
      maybeSingle() {
        const found = rows.filter(matches);
        return Promise.resolve({ data: found[0] ?? null, error: null });
      },
      then(resolve: (v: any) => void) {
        if (state.op === "update") {
          const affected = rows.filter(matches);
          for (const r of affected) Object.assign(r, state.patch);
          resolve({ data: affected, error: null });
          return;
        }
        resolve({ data: rows.filter(matches), error: null });
      },
    };
    return builder;
  }

  return { from, _rows: rows } as any;
}

const SITE = "11111111-1111-1111-1111-111111111111";
const SCAN = "22222222-2222-2222-2222-222222222222";

// The scan-row `issues` JSONB shape: violations grouped into 4 severity buckets.
function groupedIssues() {
  return {
    critical: [
      { id: "image-alt", impact: "critical", help: "Images need alt", wcag: { criterion: "1.1.1" }, instanceCount: 4 },
    ],
    serious: [
      { id: "color-contrast", impact: "serious", help: "Contrast too low", wcag: { criterion: "1.4.3" }, instanceCount: 7 },
    ],
    moderate: [
      { id: "region", impact: "moderate", help: "Use landmarks", wcag: { criterion: null }, instanceCount: 2 },
    ],
    minor: [] as any[],
  };
}

describe("upsertIssuesFromScan", () => {
  it("maps grouped scan issues into rows with status + checks + criterion", async () => {
    const client = makeFakeClient();
    const res = await upsertIssuesFromScan(client, SITE, SCAN, groupedIssues());
    expect(res.upserted).toBe(3);
    expect(res.resolved).toBe(0);

    const byRule = Object.fromEntries(client._rows.map((r: any) => [r.rule_id, r]));
    expect(byRule["image-alt"].status).toBe("failing");
    expect(byRule["image-alt"].wcag_criterion).toBe("1.1.1");
    expect(byRule["image-alt"].checks_total).toBe(4);
    expect(byRule["image-alt"].framework).toBe("wcag");
    expect(byRule["image-alt"].scan_id).toBe(SCAN);
    expect(byRule["color-contrast"].status).toBe("failing");
    expect(byRule["region"].status).toBe("needs_review");
    expect(byRule["region"].wcag_criterion).toBeNull();
  });

  it("re-scan upserts on (site,rule) instead of duplicating", async () => {
    const client = makeFakeClient();
    await upsertIssuesFromScan(client, SITE, SCAN, groupedIssues());
    await upsertIssuesFromScan(client, SITE, SCAN, groupedIssues());
    expect(client._rows.length).toBe(3);
  });

  it("marks issues absent from the new scan as passing (resolved)", async () => {
    const client = makeFakeClient();
    await upsertIssuesFromScan(client, SITE, SCAN, groupedIssues());

    // Next scan only finds color-contrast → image-alt and region resolve.
    const next = {
      critical: [] as any[],
      serious: [
        { id: "color-contrast", impact: "serious", help: "Contrast too low", wcag: { criterion: "1.4.3" }, instanceCount: 1 },
      ],
      moderate: [] as any[],
      minor: [] as any[],
    };
    const res = await upsertIssuesFromScan(client, SITE, SCAN, next);
    expect(res.upserted).toBe(1);
    expect(res.resolved).toBe(2);

    const byRule = Object.fromEntries(client._rows.map((r: any) => [r.rule_id, r]));
    expect(byRule["image-alt"].status).toBe("passing");
    expect(byRule["image-alt"].resolved_at).toBeTruthy();
    expect(byRule["region"].status).toBe("passing");
    expect(byRule["color-contrast"].status).toBe("failing");
  });

  it("resolves all open issues when the scan finds nothing", async () => {
    const client = makeFakeClient();
    await upsertIssuesFromScan(client, SITE, SCAN, groupedIssues());
    const empty = { critical: [], serious: [], moderate: [], minor: [] };
    const res = await upsertIssuesFromScan(client, SITE, SCAN, empty);
    expect(res.upserted).toBe(0);
    expect(res.resolved).toBe(3);
  });
});

describe("listIssues", () => {
  it("groups the site's issues by status", async () => {
    const client = makeFakeClient();
    await upsertIssuesFromScan(client, SITE, SCAN, groupedIssues());
    const grouped = await listIssues(client, SITE);
    expect(grouped.failing.map((i) => i.ruleId).sort()).toEqual(["color-contrast", "image-alt"]);
    expect(grouped.needs_review.map((i) => i.ruleId)).toEqual(["region"]);
    expect(grouped.passing).toEqual([]);
  });
});

describe("getIssueSiteId", () => {
  it("returns the owning site_id for an existing issue", async () => {
    const client = makeFakeClient();
    await upsertIssuesFromScan(client, SITE, SCAN, groupedIssues());
    const target = client._rows.find((r: any) => r.rule_id === "region");
    expect(await getIssueSiteId(client, target.id)).toBe(SITE);
  });

  it("returns null for an unknown issue", async () => {
    const client = makeFakeClient();
    expect(await getIssueSiteId(client, "does-not-exist")).toBeNull();
  });
});

describe("updateIssue", () => {
  it("updates only status and assignee on the targeted row", async () => {
    const client = makeFakeClient();
    await upsertIssuesFromScan(client, SITE, SCAN, groupedIssues());
    const target = client._rows.find((r: any) => r.rule_id === "region");
    await updateIssue(client, target.id, { status: "passing" as IssueStatus, assigneeId: "user-7" });
    expect(target.status).toBe("passing");
    expect(target.assignee_id).toBe("user-7");
  });
});
