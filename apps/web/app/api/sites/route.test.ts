/**
 * app/api/sites/route.test.ts
 *
 * Locks the GET / POST /api/sites contract:
 *  - GET:  401 with no session; 200 {agents, kpis} with session.
 *  - POST: 401 no session; 400 invalid/SSRF domain; 201 {siteId, token} on valid.
 *
 * Runs env-free: every collaborator is mocked. Mirrors the style of
 * app/api/sites/[id]/billing/route.test.ts.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Collaborator mocks ──────────────────────────────────────────────────────

const getUser = vi.fn();
const listAgentsFn = vi.fn();
const portfolioKpisFn = vi.fn();
const createSite = vi.fn();
const mintSiteToken = vi.fn();
const captureError = vi.fn();
const checkRateLimit = vi.fn();
const isPublicHttpUrl = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  getServerSupabase: () => ({ auth: { getUser: () => getUser() } }),
}));

vi.mock("@/lib/portfolio", () => ({
  listAgents: (...args: unknown[]) => listAgentsFn(...args),
  portfolioKpis: (...args: unknown[]) => portfolioKpisFn(...args),
}));

vi.mock("@/lib/sites", () => ({
  createSite: (...args: unknown[]) => createSite(...args),
}));

vi.mock("@/lib/licensing/token", () => ({
  mintSiteToken: (...args: unknown[]) => mintSiteToken(...args),
}));

vi.mock("@/lib/observability", () => ({
  captureError: (...args: unknown[]) => captureError(...args),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: (...args: unknown[]) => checkRateLimit(...args),
}));

vi.mock("@/lib/scan-utils/public-url", () => ({
  isPublicHttpUrl: (...args: unknown[]) => isPublicHttpUrl(...args),
}));

import { GET, POST } from "./route";

const OWNER = "owner-1";
const SITE_ID = "site-abc";
const TOKEN = "v1.testhash";

const MOCK_AGENTS = [
  { id: SITE_ID, name: "example.com", domain: "example.com", plan: "pro", status: "active", score: 80, openIssues: 5, lastAuditAt: "2026-06", installed: true },
];
const MOCK_KPIS = { total: 1, avgScore: 80, openIssues: 5, needAttention: 0 };

function makeGetReq() {
  return new Request("https://app.test/api/sites");
}

function makePostReq(body: unknown) {
  return new Request("https://app.test/api/sites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  getUser.mockReset();
  listAgentsFn.mockReset();
  portfolioKpisFn.mockReset();
  createSite.mockReset();
  mintSiteToken.mockReset();
  captureError.mockReset();
  checkRateLimit.mockReset();
  isPublicHttpUrl.mockReset();

  // Defaults for the happy paths
  getUser.mockResolvedValue({ data: { user: { id: OWNER } } });
  listAgentsFn.mockResolvedValue(MOCK_AGENTS);
  portfolioKpisFn.mockReturnValue(MOCK_KPIS);
  createSite.mockResolvedValue({ id: SITE_ID, ownerId: OWNER, domain: "example.com", plan: "free", createdAt: "2026-06-26T00:00:00Z" });
  mintSiteToken.mockReturnValue(TOKEN);
  checkRateLimit.mockResolvedValue(false); // not rate limited
  isPublicHttpUrl.mockReturnValue(true); // public domain by default
});

// ── GET /api/sites ─────────────────────────────────────────────────────────

describe("GET /api/sites", () => {
  it("returns 401 with no session", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const res = await GET(makeGetReq());
    expect(res.status).toBe(401);
  });

  it("returns 200 with agents and kpis on the happy path", async () => {
    const res = await GET(makeGetReq());
    const json = await res.json() as Record<string, unknown>;
    expect(res.status).toBe(200);
    expect(json.agents).toEqual(MOCK_AGENTS);
    expect(json.kpis).toEqual(MOCK_KPIS);
    expect(listAgentsFn).toHaveBeenCalledWith(expect.anything(), OWNER);
  });

  it("returns 500 when listAgents throws", async () => {
    listAgentsFn.mockRejectedValue(new Error("db down"));
    const res = await GET(makeGetReq());
    expect(res.status).toBe(500);
    expect(captureError).toHaveBeenCalledTimes(1);
    const json = await res.json() as Record<string, string>;
    // Never echo raw errors
    expect(json.error).not.toContain("db down");
  });
});

// ── POST /api/sites ────────────────────────────────────────────────────────

describe("POST /api/sites", () => {
  it("returns 401 with no session", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(makePostReq({ domain: "example.com" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 for a missing domain", async () => {
    const res = await POST(makePostReq({}));
    expect(res.status).toBe(400);
  });

  it("returns 400 for an empty domain", async () => {
    const res = await POST(makePostReq({ domain: "" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for an SSRF-unsafe domain (isPublicHttpUrl returns false)", async () => {
    isPublicHttpUrl.mockReturnValue(false);
    const res = await POST(makePostReq({ domain: "localhost" }));
    expect(res.status).toBe(400);
    expect(createSite).not.toHaveBeenCalled();
  });

  it("returns 201 with siteId and token on valid domain", async () => {
    const res = await POST(makePostReq({ domain: "example.com" }));
    expect(res.status).toBe(201);
    const json = await res.json() as Record<string, string>;
    expect(json.siteId).toBe(SITE_ID);
    expect(json.token).toBe(TOKEN);
    expect(createSite).toHaveBeenCalledWith(expect.anything(), OWNER, "example.com");
    expect(mintSiteToken).toHaveBeenCalledWith(SITE_ID);
  });

  it("accepts optional name field alongside domain", async () => {
    const res = await POST(makePostReq({ name: "My Site", domain: "example.com" }));
    expect(res.status).toBe(201);
    // createSite is called with domain only (no name column)
    expect(createSite).toHaveBeenCalledWith(expect.anything(), OWNER, "example.com");
  });

  it("strips https:// prefix from domain before storing", async () => {
    const res = await POST(makePostReq({ domain: "https://example.com" }));
    expect(res.status).toBe(201);
    expect(createSite).toHaveBeenCalledWith(expect.anything(), OWNER, "example.com");
  });

  it("returns 500 when createSite throws, via captureError", async () => {
    createSite.mockRejectedValue(new Error("insert failed"));
    const res = await POST(makePostReq({ domain: "example.com" }));
    expect(res.status).toBe(500);
    expect(captureError).toHaveBeenCalledTimes(1);
    const json = await res.json() as Record<string, string>;
    expect(json.error).not.toContain("insert failed");
  });
});
