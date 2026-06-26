/**
 * app/api/sites/[id]/billing/route.test.ts
 *
 * Locks the v3.1 Billing summary's USAGE contract:
 *  - On the happy path the route shapes `usage` from `quotaStatus(usedOpens,
 *    quota.visitLimit)` — this is the SOFT over-quota signal the dashboard warns
 *    on (it never gates the widget; widget rule #1: always render).
 *  - Usage is BEST-EFFORT: if the monthly-opens read throws, the route must NOT
 *    500 the whole screen — it degrades to `usage: null` and still returns
 *    subscription + quota + catalog, routing the error through captureError.
 *
 * Runs env-free: every collaborator (Supabase, getSite, the billing data layer,
 * the catalog, observability) is mocked. No live Supabase, no network. The PURE
 * `quotaStatus` math itself is exercised in lib/billing.test.ts; here we assert
 * the route composes it correctly and honours the null-fallback.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Collaborator mocks ──────────────────────────────────────────────────────
const getUser = vi.fn();
const getSite = vi.fn();
const getSubscription = vi.fn();
const getPlanQuota = vi.fn();
const getMonthlyWidgetOpens = vi.fn();
const captureError = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  // The route passes this straight into the (mocked) data-layer calls, so an
  // opaque sentinel with a working auth.getUser() is all that's needed.
  getServerSupabase: () => ({ auth: { getUser: () => getUser() } }),
}));

vi.mock("@/lib/sites", () => ({
  getSite: (...args: unknown[]) => getSite(...args),
}));

vi.mock("@/lib/billing/plans", () => ({
  PLAN_CATALOG: [{ slug: "free" }, { slug: "growth" }],
}));

vi.mock("@/lib/observability", () => ({
  captureError: (...args: unknown[]) => captureError(...args),
}));

// Keep the PURE helpers (quotaStatus, legacyToCatalogSlug) real; only stub the
// I/O reads so the test exercises the route's actual shaping logic.
vi.mock("@/lib/billing", async () => {
  const actual = await vi.importActual<typeof import("@/lib/billing")>("@/lib/billing");
  return {
    ...actual,
    getSubscription: (...args: unknown[]) => getSubscription(...args),
    getPlanQuota: (...args: unknown[]) => getPlanQuota(...args),
    getMonthlyWidgetOpens: (...args: unknown[]) => getMonthlyWidgetOpens(...args),
  };
});

import { GET } from "./route";

const OWNER = "owner-1";
const SITE_ID = "site-1";

function call(id = SITE_ID) {
  return GET(new Request(`https://app.test/api/sites/${id}/billing`), {
    params: Promise.resolve({ id }),
  });
}

beforeEach(() => {
  getUser.mockReset();
  getSite.mockReset();
  getSubscription.mockReset();
  getPlanQuota.mockReset();
  getMonthlyWidgetOpens.mockReset();
  captureError.mockReset();

  getUser.mockResolvedValue({ data: { user: { id: OWNER } } });
  getSite.mockResolvedValue({ id: SITE_ID, ownerId: OWNER, plan: "pro" });
  getSubscription.mockResolvedValue({ siteId: SITE_ID, planSlug: "growth", status: "inactive" });
  getPlanQuota.mockResolvedValue({ slug: "growth", visitLimit: 30000 });
});

describe("GET /api/sites/[id]/billing — usage shaping", () => {
  it("shapes `usage` from quotaStatus(opens, quota.visitLimit) on the happy path", async () => {
    getMonthlyWidgetOpens.mockResolvedValue(12000);

    const res = await call();
    const json = (await res.json()) as Record<string, any>;

    expect(res.status).toBe(200);
    expect(json.usage).toEqual({
      used: 12000,
      limit: 30000,
      remaining: 18000,
      overage: 0,
      unlimited: false,
      exceeded: false,
    });
    // The other fields are still present.
    expect(json.subscription.planSlug).toBe("growth");
    expect(json.quota.visitLimit).toBe(30000);
    expect(json.catalog).toHaveLength(2);
    expect(captureError).not.toHaveBeenCalled();
  });

  it("flags `exceeded` when this month's opens are over the visit limit", async () => {
    getMonthlyWidgetOpens.mockResolvedValue(31000);

    const res = await call();
    const json = (await res.json()) as Record<string, any>;

    expect(json.usage.exceeded).toBe(true);
    expect(json.usage.overage).toBe(1000);
  });

  it("treats a null visit limit as unlimited", async () => {
    getPlanQuota.mockResolvedValue({ slug: "enterprise", visitLimit: null });
    getMonthlyWidgetOpens.mockResolvedValue(999999);

    const res = await call();
    const json = (await res.json()) as Record<string, any>;

    expect(json.usage).toMatchObject({ unlimited: true, exceeded: false, limit: null });
  });

  it("degrades to usage:null (does NOT 500) when the opens read throws", async () => {
    getMonthlyWidgetOpens.mockRejectedValue(new Error("rollup unavailable"));

    const res = await call();
    const json = (await res.json()) as Record<string, any>;

    expect(res.status).toBe(200);
    expect(json.usage).toBeNull();
    // The rest of the screen still loads…
    expect(json.subscription.planSlug).toBe("growth");
    expect(json.quota.visitLimit).toBe(30000);
    // …and the error is routed through the observability seam.
    expect(captureError).toHaveBeenCalledTimes(1);
  });
});

describe("GET /api/sites/[id]/billing — auth & ownership", () => {
  it("returns 401 with no session", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const res = await call();
    expect(res.status).toBe(401);
  });

  it("returns 404 when the site is not the caller's", async () => {
    getSite.mockResolvedValue({ id: SITE_ID, ownerId: "someone-else", plan: "pro" });
    const res = await call();
    expect(res.status).toBe(404);
  });

  it("returns 500 when a CORE read (subscription) throws", async () => {
    getSubscription.mockRejectedValue(new Error("db down"));
    const res = await call();
    expect(res.status).toBe(500);
  });
});
