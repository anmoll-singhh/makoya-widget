/**
 * lib/portfolio.test.ts
 *
 * Tests for the per-owner agent portfolio roll-up.
 *
 * These run env-free: listSites and getOverview are fully mocked — we test only
 * the merging/status-derivation logic here. The individual data functions have
 * their own tests; this file only locks the COMPOSITION contract.
 *
 * Mocking style mirrors app/api/sites/[id]/billing/route.test.ts:
 * vi.mock at module scope, then reassign return values per test.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Collaborator mocks ──────────────────────────────────────────────────────

const listSites = vi.fn();
const getOverview = vi.fn();

vi.mock("@/lib/sites", () => ({
  listSites: (...args: unknown[]) => listSites(...args),
}));

vi.mock("@/lib/overview", () => ({
  getOverview: (...args: unknown[]) => getOverview(...args),
}));

import { listAgents, portfolioKpis } from "./portfolio";

// Sentinel Supabase client — the module only passes it through to mocked fns.
const CLIENT = { auth: { getUser: vi.fn() } } as unknown as import("@supabase/supabase-js").SupabaseClient;
const OWNER = "owner-1";

// ── Shared fixtures ────────────────────────────────────────────────────────

const SITE_A = { id: "site-a", ownerId: OWNER, domain: "superdemo.jewlx.ai", plan: "pro", createdAt: "2026-06-01T00:00:00Z" };
const SITE_B = { id: "site-b", ownerId: OWNER, domain: "wellness.waves.co", plan: "free", createdAt: "2026-06-10T00:00:00Z" };

/** A minimal OverviewData stub with only the fields listAgents reads. */
function makeOverview(overrides: {
  score?: number | null;
  openIssues?: number;
  status?: string;
  trend?: { period: string; score: number | null }[];
}) {
  return {
    score: overrides.score ?? 80,
    scoreDelta: null,
    status: overrides.status ?? "active",
    streakDays: 14,
    openIssues: overrides.openIssues ?? 5,
    needsHuman: 0,
    issuesResolvedThisMonth: 0,
    widgetOpens: 100,
    coverage: [],
    trend: overrides.trend ?? [{ period: "2026-06", score: overrides.score ?? 80 }],
    activity: [],
  };
}

beforeEach(() => {
  listSites.mockReset();
  getOverview.mockReset();
});

// ── listAgents ─────────────────────────────────────────────────────────────

describe("listAgents", () => {
  it("returns one AgentSummary per site with merged overview data", async () => {
    listSites.mockResolvedValue([SITE_A, SITE_B]);
    getOverview
      .mockResolvedValueOnce(makeOverview({ score: 82, openIssues: 10, status: "active", trend: [{ period: "2026-06", score: 82 }] }))
      .mockResolvedValueOnce(makeOverview({ score: 44, openIssues: 30, status: "not_installed", trend: [] }));

    const agents = await listAgents(CLIENT, OWNER);

    expect(agents).toHaveLength(2);

    const a = agents[0];
    expect(a.id).toBe("site-a");
    expect(a.domain).toBe("superdemo.jewlx.ai");
    expect(a.plan).toBe("pro");
    expect(a.score).toBe(82);
    expect(a.openIssues).toBe(10);
    expect(a.status).toBe("active");
    expect(a.installed).toBe(true);
    expect(a.lastAuditAt).toBe("2026-06");

    const b = agents[1];
    expect(b.status).toBe("action_needed");
    expect(b.installed).toBe(false);
    expect(b.lastAuditAt).toBeNull();
  });

  it("maps action_needed install status to action_needed with installed:true", async () => {
    listSites.mockResolvedValue([SITE_A]);
    getOverview.mockResolvedValueOnce(makeOverview({ status: "action_needed" }));

    const agents = await listAgents(CLIENT, OWNER);
    expect(agents[0].status).toBe("action_needed");
    expect(agents[0].installed).toBe(true);
  });

  it("maps monitoring install status correctly", async () => {
    listSites.mockResolvedValue([SITE_A]);
    getOverview.mockResolvedValueOnce(makeOverview({ status: "monitoring" }));

    const agents = await listAgents(CLIENT, OWNER);
    expect(agents[0].status).toBe("monitoring");
    expect(agents[0].installed).toBe(true);
  });

  it("returns an empty array when the owner has no sites", async () => {
    listSites.mockResolvedValue([]);
    const agents = await listAgents(CLIENT, OWNER);
    expect(agents).toEqual([]);
  });

  it("returns a degraded summary (action_needed, nulls) when getOverview throws for one site", async () => {
    listSites.mockResolvedValue([SITE_A, SITE_B]);
    getOverview
      .mockResolvedValueOnce(makeOverview({ score: 82, openIssues: 10, status: "active" }))
      .mockRejectedValueOnce(new Error("db down"));

    const agents = await listAgents(CLIENT, OWNER);
    expect(agents).toHaveLength(2);
    expect(agents[0].status).toBe("active");
    // site-b degraded
    expect(agents[1].status).toBe("action_needed");
    expect(agents[1].score).toBeNull();
    expect(agents[1].installed).toBe(false);
  });
});

// ── portfolioKpis ──────────────────────────────────────────────────────────

describe("portfolioKpis", () => {
  it("computes total, avgScore, openIssues, needAttention correctly", () => {
    const agents = [
      { id: "a", name: "a.com", domain: "a.com", plan: "pro", status: "active" as const, score: 80, openIssues: 10, lastAuditAt: "2026-06", installed: true },
      { id: "b", name: "b.com", domain: "b.com", plan: "free", status: "action_needed" as const, score: 44, openIssues: 30, lastAuditAt: null, installed: false },
    ];
    const kpis = portfolioKpis(agents);
    expect(kpis.total).toBe(2);
    expect(kpis.avgScore).toBe(62); // Math.round((80+44)/2)
    expect(kpis.openIssues).toBe(40);
    expect(kpis.needAttention).toBe(1);
  });

  it("returns avgScore:null when all scores are null", () => {
    const agents = [
      { id: "a", name: "a.com", domain: "a.com", plan: "free", status: "action_needed" as const, score: null, openIssues: 0, lastAuditAt: null, installed: false },
    ];
    expect(portfolioKpis(agents).avgScore).toBeNull();
  });

  it("ignores null scores in the average calculation", () => {
    const agents = [
      { id: "a", name: "a.com", domain: "a.com", plan: "pro", status: "active" as const, score: 60, openIssues: 5, lastAuditAt: "2026-06", installed: true },
      { id: "b", name: "b.com", domain: "b.com", plan: "free", status: "monitoring" as const, score: null, openIssues: 0, lastAuditAt: null, installed: true },
    ];
    const kpis = portfolioKpis(agents);
    expect(kpis.avgScore).toBe(60); // only one non-null score
  });

  it("returns zeros/null for an empty agents array", () => {
    const kpis = portfolioKpis([]);
    expect(kpis.total).toBe(0);
    expect(kpis.avgScore).toBeNull();
    expect(kpis.openIssues).toBe(0);
    expect(kpis.needAttention).toBe(0);
  });
});
