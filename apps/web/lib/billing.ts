/**
 * lib/billing.ts — billing data layer + PURE quota helpers (v3.1 Billing screen).
 *
 * Two tables back this (see supabase/migrations/20260626210000_billing.sql):
 *  - `plan_quotas`           — reference data: per-slug limits + price cents +
 *                              (placeholder) Stripe price ids. Readable by any
 *                              signed-in user; writes are service-role only.
 *  - `billing_subscriptions` — per-site subscription state. Owners read their own
 *                              (RLS); writes are service-role only (a future
 *                              Stripe webhook).
 *
 * NON-BREAKING NOTE: the live admin CRM still drives `sites.plan` with the legacy
 * slugs `free|pro|managed`. This wave introduces the NEW catalog slug model
 * (`free|starter|growth|scale|enterprise`) ALONGSIDE it. `legacyToCatalogSlug` is
 * the adapter that maps legacy→catalog (`pro→growth`, `managed→scale`) so the
 * billing screen can show the right tier without changing `sites.plan`. The full
 * slug cutover (retiring `pro`/`managed`) is a deliberate LATER step.
 *
 * Error discipline mirrors lib/heartbeat.ts / lib/issues.ts: a Supabase `error`
 * is an INFRA failure → THROW (the authed route surfaces a generic 500 via the
 * observability seam). The quota math lives in PURE functions with no I/O so it
 * is exhaustively unit-tested without a database. Quota enforcement is
 * SERVER-SIDE only and SOFT — over-quota warns + prompts upgrade; it NEVER hard-
 * kills the widget (widget rule #1: always render).
 *
 * Honesty: nothing here asserts WCAG/ADA "compliance" or any "guarantee" — these
 * are commercial plan/quota/subscription records only.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlanSlug, BillingPeriod } from "@/lib/billing/plans";

/** Subscription lifecycle states (mirror the DB check constraint). */
export type SubscriptionStatus = "inactive" | "trialing" | "active" | "past_due" | "canceled";

/** The slug a site falls back to when it has no subscription row. */
export const DEFAULT_SUBSCRIPTION_SLUG: PlanSlug = "free";

/** camelCase view of a `plan_quotas` row. `null` limit/price = unlimited/custom. */
export interface PlanQuotaRecord {
  slug: PlanSlug;
  visitLimit: number | null;
  siteLimit: number | null;
  seatLimit: number | null;
  vpatPerYear: number | null;
  monthlyPriceCents: number | null;
  yearlyPriceCents: number | null;
  stripePriceIdMonthly: string | null;
  stripePriceIdYearly: string | null;
}

/** camelCase view of a `billing_subscriptions` row. */
export interface SubscriptionRecord {
  siteId: string;
  planSlug: PlanSlug;
  period: BillingPeriod;
  status: SubscriptionStatus;
  renewsAt: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

/** The shaped quota view the dashboard renders for one dimension (e.g. visits). */
export interface QuotaStatus {
  used: number;
  limit: number | null;
  /** Remaining allowance; null when unlimited. Clamped to ≥0. */
  remaining: number | null;
  /** How far over the limit (0 when within or unlimited). */
  overage: number;
  unlimited: boolean;
  exceeded: boolean;
}

// ── PURE helpers (no I/O — fully unit-tested) ──────────────────────────────────

/**
 * PURE: map a legacy `sites.plan` value onto the v3.1 catalog slug.
 *  - free → free, pro → growth, managed → scale.
 *  - anything else (incl. already-catalog slugs that aren't legacy, empties,
 *    typos) → free. Case-sensitive: the legacy column only ever holds the three
 *    lowercase values, so an unexpected value is safest treated as the floor.
 * Never throws — this is the adapter that keeps the live admin untouched.
 */
export function legacyToCatalogSlug(plan: string): PlanSlug {
  switch (plan) {
    case "free":
      return "free";
    case "pro":
      return "growth";
    case "managed":
      return "scale";
    default:
      return "free";
  }
}

/**
 * PURE: is `used` within `limit`? A `null` limit means unlimited (always true).
 * Otherwise the check is INCLUSIVE — being exactly at the limit is still within.
 */
export function isWithinQuota(used: number, limit: number | null): boolean {
  if (limit === null) return true;
  return used <= limit;
}

/**
 * PURE: shape a usage count + limit into the dashboard's quota view. A `null`
 * limit is unlimited (no remaining/overage, never exceeded). `remaining` and
 * `overage` are clamped to ≥0; `exceeded` is strictly over the limit.
 */
export function quotaStatus(used: number, limit: number | null): QuotaStatus {
  if (limit === null) {
    return { used, limit: null, remaining: null, overage: 0, unlimited: true, exceeded: false };
  }
  const remaining = Math.max(0, limit - used);
  const overage = Math.max(0, used - limit);
  return { used, limit, remaining, overage, unlimited: false, exceeded: used > limit };
}

// ── mappers ────────────────────────────────────────────────────────────────────

/** snake_case `plan_quotas` row → camelCase record. Tolerates null limits/prices. */
export function rowToPlanQuota(row: any): PlanQuotaRecord {
  return {
    slug: row.slug as PlanSlug,
    visitLimit: row.visit_limit ?? null,
    siteLimit: row.site_limit ?? null,
    seatLimit: row.seat_limit ?? null,
    vpatPerYear: row.vpat_per_year ?? null,
    monthlyPriceCents: row.monthly_price_cents ?? null,
    yearlyPriceCents: row.yearly_price_cents ?? null,
    stripePriceIdMonthly: row.stripe_price_id_monthly ?? null,
    stripePriceIdYearly: row.stripe_price_id_yearly ?? null,
  };
}

/** snake_case `billing_subscriptions` row → camelCase record. */
export function rowToSubscription(row: any): SubscriptionRecord {
  return {
    siteId: row.site_id,
    planSlug: row.plan_slug as PlanSlug,
    period: row.period as BillingPeriod,
    status: row.status as SubscriptionStatus,
    renewsAt: row.renews_at ?? null,
    stripeCustomerId: row.stripe_customer_id ?? null,
    stripeSubscriptionId: row.stripe_subscription_id ?? null,
  };
}

// ── reads (throw on infra; sensible defaults instead of null surprises) ─────────

/**
 * Reads one plan's quota row. Mirrors getSite's error discipline: infra `error`
 * → throw; no row → null (the slug isn't seeded — caller decides).
 */
export async function getPlanQuota(
  client: SupabaseClient,
  slug: PlanSlug
): Promise<PlanQuotaRecord | null> {
  const { data, error } = await client.from("plan_quotas").select("*").eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data ? rowToPlanQuota(data) : null;
}

/** Reads every plan quota (the full catalog reference set). Throws on infra error. */
export async function listPlanQuotas(client: SupabaseClient): Promise<PlanQuotaRecord[]> {
  const { data, error } = await client.from("plan_quotas").select("*");
  if (error) throw error;
  return (data ?? []).map(rowToPlanQuota);
}

/**
 * Reads a site's subscription. RLS scopes the read to the owner. Unlike most
 * reads this NEVER returns null: a site with no subscription row is, by
 * definition, on the Free / inactive default — returning that record keeps every
 * caller off the null-handling treadmill. Throws on infra error.
 */
export async function getSubscription(
  client: SupabaseClient,
  siteId: string
): Promise<SubscriptionRecord> {
  const { data, error } = await client
    .from("billing_subscriptions")
    .select("*")
    .eq("site_id", siteId)
    .maybeSingle();
  if (error) throw error;
  if (data) return rowToSubscription(data);
  return {
    siteId,
    planSlug: DEFAULT_SUBSCRIPTION_SLUG,
    period: "yearly",
    status: "inactive",
    renewsAt: null,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
  };
}
