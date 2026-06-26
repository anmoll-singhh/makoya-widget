/**
 * app/api/sites/[id]/billing/checkout/route.test.ts
 *
 * Locks the "Buy now" checkout contract (payment DEFERRED):
 *  - Auth + ownership mirror the billing summary route: 401 with no session; 404
 *    when the site isn't the caller's.
 *  - The body is Zod-validated via `parseBody` → a generic 400 for bad json or a
 *    non-purchasable / malformed plan (free/enterprise/unknown). The client only
 *    ever supplies planSlug + period; the SERVER sets status + price.
 *  - The happy path calls `selectPlan(adminClient, id, planSlug, period)` and
 *    returns `{ ok:true, subscription, paymentPending:true }` — it NEVER charges.
 *  - A core write failure routes through captureError → generic 500.
 *
 * Runs env-free: every collaborator (Supabase, getSite, selectPlan, the admin
 * client, observability) is mocked. No live Supabase, no Stripe, no network.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const getUser = vi.fn();
const getSite = vi.fn();
const selectPlan = vi.fn();
const getAdminSupabase = vi.fn();
const captureError = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  getServerSupabase: () => ({ auth: { getUser: () => getUser() } }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getAdminSupabase: () => getAdminSupabase(),
}));

vi.mock("@/lib/sites", () => ({
  getSite: (...args: unknown[]) => getSite(...args),
}));

vi.mock("@/lib/billing", () => ({
  selectPlan: (...args: unknown[]) => selectPlan(...args),
}));

vi.mock("@/lib/observability", () => ({
  captureError: (...args: unknown[]) => captureError(...args),
}));

import { POST } from "./route";

const OWNER = "owner-1";
const SITE_ID = "site-1";

function call(body: unknown, id = SITE_ID) {
  const init: RequestInit = { method: "POST" };
  if (typeof body === "string") init.body = body;
  else if (body !== undefined) init.body = JSON.stringify(body);
  return POST(new Request(`https://app.test/api/sites/${id}/billing/checkout`, init), {
    params: Promise.resolve({ id }),
  });
}

beforeEach(() => {
  getUser.mockReset();
  getSite.mockReset();
  selectPlan.mockReset();
  getAdminSupabase.mockReset();
  captureError.mockReset();

  getUser.mockResolvedValue({ data: { user: { id: OWNER } } });
  getSite.mockResolvedValue({ id: SITE_ID, ownerId: OWNER, plan: "free" });
  getAdminSupabase.mockReturnValue({ __admin: true });
  selectPlan.mockResolvedValue({
    siteId: SITE_ID,
    planSlug: "growth",
    period: "monthly",
    status: "trialing",
    renewsAt: null,
  });
});

describe("POST /api/sites/[id]/billing/checkout — happy path", () => {
  it("records the plan as trialing via selectPlan and returns paymentPending", async () => {
    const res = await call({ planSlug: "growth", period: "monthly" });
    const json = (await res.json()) as Record<string, any>;

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.paymentPending).toBe(true);
    expect(json.subscription).toMatchObject({ planSlug: "growth", status: "trialing" });

    // Uses the SERVICE-ROLE client (billing_subscriptions has no owner write policy).
    expect(selectPlan).toHaveBeenCalledWith({ __admin: true }, SITE_ID, "growth", "monthly");
    expect(captureError).not.toHaveBeenCalled();
  });
});

describe("POST /api/sites/[id]/billing/checkout — validation", () => {
  it("400 on bad json", async () => {
    const res = await call("{not json");
    expect(res.status).toBe(400);
    expect(selectPlan).not.toHaveBeenCalled();
  });

  it("400 on a non-purchasable plan (free)", async () => {
    const res = await call({ planSlug: "free", period: "monthly" });
    expect(res.status).toBe(400);
    expect(selectPlan).not.toHaveBeenCalled();
  });

  it("400 on enterprise (contact sales, not purchasable)", async () => {
    const res = await call({ planSlug: "enterprise", period: "yearly" });
    expect(res.status).toBe(400);
    expect(selectPlan).not.toHaveBeenCalled();
  });

  it("400 on an unknown period", async () => {
    const res = await call({ planSlug: "growth", period: "weekly" });
    expect(res.status).toBe(400);
    expect(selectPlan).not.toHaveBeenCalled();
  });
});

describe("POST /api/sites/[id]/billing/checkout — auth & ownership", () => {
  it("401 with no session", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const res = await call({ planSlug: "growth", period: "monthly" });
    expect(res.status).toBe(401);
    expect(selectPlan).not.toHaveBeenCalled();
  });

  it("404 when the site is not the caller's", async () => {
    getSite.mockResolvedValue({ id: SITE_ID, ownerId: "someone-else", plan: "free" });
    const res = await call({ planSlug: "growth", period: "monthly" });
    expect(res.status).toBe(404);
    expect(selectPlan).not.toHaveBeenCalled();
  });

  it("404 when the site does not exist", async () => {
    getSite.mockResolvedValue(null);
    const res = await call({ planSlug: "growth", period: "monthly" });
    expect(res.status).toBe(404);
  });

  it("500 (generic) when selectPlan throws", async () => {
    selectPlan.mockRejectedValue(new Error("db down"));
    const res = await call({ planSlug: "growth", period: "monthly" });
    expect(res.status).toBe(500);
    expect(captureError).toHaveBeenCalledTimes(1);
  });
});
