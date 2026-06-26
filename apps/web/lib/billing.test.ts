import { describe, it, expect } from "vitest";
import {
  legacyToCatalogSlug,
  isWithinQuota,
  quotaStatus,
  rowToPlanQuota,
  rowToSubscription,
  getPlanQuota,
  getSubscription,
  listPlanQuotas,
  DEFAULT_SUBSCRIPTION_SLUG,
} from "./billing";

// ── legacyToCatalogSlug: the additive adapter (legacy sites.plan → catalog) ────
describe("legacyToCatalogSlug", () => {
  it("maps the three legacy slugs onto the catalog set", () => {
    expect(legacyToCatalogSlug("free")).toBe("free");
    expect(legacyToCatalogSlug("pro")).toBe("growth");
    expect(legacyToCatalogSlug("managed")).toBe("scale");
  });
  it("falls back to free for unknown/empty input (never throws)", () => {
    expect(legacyToCatalogSlug("")).toBe("free");
    expect(legacyToCatalogSlug("enterprise-typo")).toBe("free");
    expect(legacyToCatalogSlug("STARTER")).toBe("free"); // case-sensitive legacy values
  });
});

// ── isWithinQuota: null limit = unlimited; else used <= limit ───────────────────
describe("isWithinQuota", () => {
  it("treats a null limit as unlimited", () => {
    expect(isWithinQuota(0, null)).toBe(true);
    expect(isWithinQuota(9_999_999, null)).toBe(true);
  });
  it("is true under and AT the limit, false over it", () => {
    expect(isWithinQuota(4999, 5000)).toBe(true); // under
    expect(isWithinQuota(5000, 5000)).toBe(true); // equal (inclusive)
    expect(isWithinQuota(5001, 5000)).toBe(false); // over
  });
});

// ── quotaStatus: the shaped view the dashboard renders ─────────────────────────
describe("quotaStatus", () => {
  it("computes remaining/overage for a bounded limit (under)", () => {
    expect(quotaStatus(2000, 5000)).toEqual({
      used: 2000,
      limit: 5000,
      remaining: 3000,
      overage: 0,
      unlimited: false,
      exceeded: false,
    });
  });
  it("is not exceeded exactly at the limit", () => {
    expect(quotaStatus(5000, 5000)).toEqual({
      used: 5000,
      limit: 5000,
      remaining: 0,
      overage: 0,
      unlimited: false,
      exceeded: false,
    });
  });
  it("reports overage and exceeded when over the limit (remaining clamps to 0)", () => {
    expect(quotaStatus(6200, 5000)).toEqual({
      used: 6200,
      limit: 5000,
      remaining: 0,
      overage: 1200,
      unlimited: false,
      exceeded: true,
    });
  });
  it("reports unlimited with null limit (no remaining/overage)", () => {
    expect(quotaStatus(123_456, null)).toEqual({
      used: 123456,
      limit: null,
      remaining: null,
      overage: 0,
      unlimited: true,
      exceeded: false,
    });
  });
});

// ── mappers ────────────────────────────────────────────────────────────────────
describe("rowToPlanQuota", () => {
  it("maps a snake_case plan_quotas row to camelCase, tolerating nulls", () => {
    const q = rowToPlanQuota({
      slug: "growth",
      visit_limit: 30000,
      site_limit: 3,
      seat_limit: 3,
      vpat_per_year: 1,
      monthly_price_cents: 16900,
      yearly_price_cents: 149000,
      stripe_price_id_monthly: null,
      stripe_price_id_yearly: null,
    });
    expect(q).toMatchObject({
      slug: "growth",
      visitLimit: 30000,
      siteLimit: 3,
      seatLimit: 3,
      vpatPerYear: 1,
      monthlyPriceCents: 16900,
      yearlyPriceCents: 149000,
      stripePriceIdMonthly: null,
      stripePriceIdYearly: null,
    });
  });
  it("keeps null limits as unlimited (enterprise)", () => {
    const q = rowToPlanQuota({
      slug: "enterprise",
      visit_limit: null,
      site_limit: null,
      seat_limit: null,
      vpat_per_year: null,
      monthly_price_cents: null,
      yearly_price_cents: null,
    });
    expect(q.visitLimit).toBeNull();
    expect(q.monthlyPriceCents).toBeNull();
  });
});

describe("rowToSubscription", () => {
  it("maps a snake_case billing_subscriptions row to camelCase", () => {
    const s = rowToSubscription({
      site_id: "site-1",
      plan_slug: "growth",
      period: "monthly",
      status: "active",
      renews_at: "2026-12-01T00:00:00Z",
      stripe_customer_id: "cus_123",
      stripe_subscription_id: "sub_123",
    });
    expect(s).toEqual({
      siteId: "site-1",
      planSlug: "growth",
      period: "monthly",
      status: "active",
      renewsAt: "2026-12-01T00:00:00Z",
      stripeCustomerId: "cus_123",
      stripeSubscriptionId: "sub_123",
    });
  });
});

// ── A minimal in-memory fake Supabase client (no live DB) ──────────────────────
function makeFakeClient(opts: {
  quotas?: Record<string, any>;
  subscriptions?: Record<string, any>;
  error?: any;
}) {
  function from(table: string) {
    const state: { filters: Record<string, any> } = { filters: {} };
    const builder: any = {
      select() {
        return builder;
      },
      eq(col: string, val: any) {
        state.filters[col] = val;
        return builder;
      },
      maybeSingle() {
        if (opts.error) return Promise.resolve({ data: null, error: opts.error });
        if (table === "plan_quotas") {
          return Promise.resolve({ data: opts.quotas?.[state.filters.slug] ?? null, error: null });
        }
        if (table === "billing_subscriptions") {
          return Promise.resolve({ data: opts.subscriptions?.[state.filters.site_id] ?? null, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      },
      then(resolve: (v: any) => void) {
        if (opts.error) return resolve({ data: null, error: opts.error });
        if (table === "plan_quotas") return resolve({ data: Object.values(opts.quotas ?? {}), error: null });
        return resolve({ data: [], error: null });
      },
    };
    return builder;
  }
  return { from } as any;
}

describe("getPlanQuota", () => {
  it("returns the mapped quota when the row exists", async () => {
    const client = makeFakeClient({
      quotas: { starter: { slug: "starter", visit_limit: 5000, site_limit: 1, seat_limit: 1, vpat_per_year: 0 } },
    });
    const q = await getPlanQuota(client, "starter");
    expect(q?.slug).toBe("starter");
    expect(q?.visitLimit).toBe(5000);
  });
  it("returns null when no row exists", async () => {
    const client = makeFakeClient({ quotas: {} });
    expect(await getPlanQuota(client, "scale")).toBeNull();
  });
  it("throws on an infra error", async () => {
    const client = makeFakeClient({ error: { message: "boom" } });
    await expect(getPlanQuota(client, "free")).rejects.toBeTruthy();
  });
});

describe("getSubscription", () => {
  it("returns the mapped subscription when a row exists", async () => {
    const client = makeFakeClient({
      subscriptions: {
        "site-1": { site_id: "site-1", plan_slug: "growth", period: "yearly", status: "active", renews_at: null },
      },
    });
    const s = await getSubscription(client, "site-1");
    expect(s.planSlug).toBe("growth");
    expect(s.status).toBe("active");
  });
  it("returns a default free/inactive record (never null) when no row exists", async () => {
    const client = makeFakeClient({ subscriptions: {} });
    const s = await getSubscription(client, "site-x");
    expect(s).toEqual({
      siteId: "site-x",
      planSlug: DEFAULT_SUBSCRIPTION_SLUG,
      period: "yearly",
      status: "inactive",
      renewsAt: null,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
    });
    expect(s.planSlug).toBe("free");
  });
  it("throws on an infra error", async () => {
    const client = makeFakeClient({ error: { message: "boom" } });
    await expect(getSubscription(client, "site-1")).rejects.toBeTruthy();
  });
});

describe("listPlanQuotas", () => {
  it("returns all quota rows mapped to camelCase", async () => {
    const client = makeFakeClient({
      quotas: {
        free: { slug: "free", visit_limit: 1000, site_limit: 1, seat_limit: 1, vpat_per_year: 0 },
        growth: { slug: "growth", visit_limit: 30000, site_limit: 3, seat_limit: 3, vpat_per_year: 1 },
      },
    });
    const all = await listPlanQuotas(client);
    expect(all).toHaveLength(2);
    expect(all.map((q) => q.slug).sort()).toEqual(["free", "growth"]);
  });
  it("throws on an infra error", async () => {
    const client = makeFakeClient({ error: { message: "boom" } });
    await expect(listPlanQuotas(client)).rejects.toBeTruthy();
  });
});
