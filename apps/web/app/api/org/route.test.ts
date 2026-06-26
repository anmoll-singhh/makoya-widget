/**
 * app/api/org/route.test.ts
 *
 * Locks the GET / POST /api/org contract:
 *   GET:  401 no session; 404 no org; 200 { org, role } on the happy path.
 *   POST: 401 no session; 400 invalid body; 403 non-manager role;
 *         200 { org } when owner/admin renames the org successfully.
 *
 * Runs env-free: every collaborator is mocked. Mirrors the style of
 * app/api/sites/route.test.ts.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Collaborator mocks ──────────────────────────────────────────────────────

const getUser = vi.fn();
const getMembershipForUserFn = vi.fn();
const getOrgForUserFn = vi.fn();
const updateOrgFn = vi.fn();
const captureError = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  getServerSupabase: () => ({ auth: { getUser: () => getUser() } }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getAdminSupabase: () => ({}),
}));

vi.mock("@/lib/org", () => ({
  getMembershipForUser: (...args: unknown[]) => getMembershipForUserFn(...args),
  getOrgForUser: (...args: unknown[]) => getOrgForUserFn(...args),
  updateOrg: (...args: unknown[]) => updateOrgFn(...args),
}));

vi.mock("@/lib/observability", () => ({
  captureError: (...args: unknown[]) => captureError(...args),
}));

import { GET, POST } from "./route";

const USER_ID = "user-abc";
const ORG_ID = "org-xyz";

const MOCK_MEMBERSHIP_OWNER = { orgId: ORG_ID, role: "owner" as const };
const MOCK_MEMBERSHIP_DEVELOPER = { orgId: ORG_ID, role: "developer" as const };

const MOCK_ORG = {
  id: ORG_ID,
  name: "Test Org",
  createdBy: USER_ID,
  createdAt: "2026-06-26T00:00:00Z",
};

function makeGetReq() {
  return new Request("https://app.test/api/org");
}

function makePostReq(body: unknown) {
  return new Request("https://app.test/api/org", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  getUser.mockReset();
  getMembershipForUserFn.mockReset();
  getOrgForUserFn.mockReset();
  updateOrgFn.mockReset();
  captureError.mockReset();

  // Defaults for the happy paths
  getUser.mockResolvedValue({ data: { user: { id: USER_ID } } });
  getMembershipForUserFn.mockResolvedValue(MOCK_MEMBERSHIP_OWNER);
  getOrgForUserFn.mockResolvedValue(MOCK_ORG);
  updateOrgFn.mockResolvedValue({ ...MOCK_ORG, name: "Renamed Org" });
});

// ── GET /api/org ────────────────────────────────────────────────────────────

describe("GET /api/org", () => {
  it("returns 401 with no session", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 404 when the user has no membership", async () => {
    getMembershipForUserFn.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(404);
  });

  it("returns 404 when the org row is missing", async () => {
    getOrgForUserFn.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(404);
  });

  it("returns 200 with org and role on the happy path", async () => {
    const res = await GET();
    const json = await res.json() as Record<string, unknown>;
    expect(res.status).toBe(200);
    expect(json.org).toEqual(MOCK_ORG);
    expect(json.role).toBe("owner");
  });

  it("returns 500 when getMembershipForUser throws, via captureError", async () => {
    getMembershipForUserFn.mockRejectedValue(new Error("db down"));
    const res = await GET();
    expect(res.status).toBe(500);
    expect(captureError).toHaveBeenCalledTimes(1);
    const json = await res.json() as Record<string, string>;
    expect(json.error).not.toContain("db down");
  });
});

// ── POST /api/org ───────────────────────────────────────────────────────────

describe("POST /api/org", () => {
  it("returns 401 with no session", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(makePostReq({ name: "New Name" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 for an empty name", async () => {
    const res = await POST(makePostReq({ name: "" }));
    expect(res.status).toBe(400);
    expect(updateOrgFn).not.toHaveBeenCalled();
  });

  it("returns 400 for a name that exceeds max length", async () => {
    const res = await POST(makePostReq({ name: "x".repeat(101) }));
    expect(res.status).toBe(400);
    expect(updateOrgFn).not.toHaveBeenCalled();
  });

  it("returns 400 when body is missing name", async () => {
    const res = await POST(makePostReq({}));
    expect(res.status).toBe(400);
    expect(updateOrgFn).not.toHaveBeenCalled();
  });

  it("returns 403 when the caller is a developer (non-manager)", async () => {
    getMembershipForUserFn.mockResolvedValue(MOCK_MEMBERSHIP_DEVELOPER);
    const res = await POST(makePostReq({ name: "New Name" }));
    expect(res.status).toBe(403);
    expect(updateOrgFn).not.toHaveBeenCalled();
  });

  it("returns 200 with updated org when owner renames successfully", async () => {
    const res = await POST(makePostReq({ name: "Renamed Org" }));
    const json = await res.json() as Record<string, unknown>;
    expect(res.status).toBe(200);
    expect((json.org as Record<string, unknown>)?.name).toBe("Renamed Org");
    expect(updateOrgFn).toHaveBeenCalledWith(
      expect.anything(),
      ORG_ID,
      { name: "Renamed Org" }
    );
  });

  it("returns 500 when updateOrg throws, via captureError", async () => {
    updateOrgFn.mockRejectedValue(new Error("insert failed"));
    const res = await POST(makePostReq({ name: "Any Name" }));
    expect(res.status).toBe(500);
    expect(captureError).toHaveBeenCalledTimes(1);
    const json = await res.json() as Record<string, string>;
    expect(json.error).not.toContain("insert failed");
  });
});
