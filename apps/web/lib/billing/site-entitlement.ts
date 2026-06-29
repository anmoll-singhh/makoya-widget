import "server-only";
/**
 * lib/billing/site-entitlement.ts — SERVER helper that resolves a site's
 * effective plan + feature entitlement from its subscription.
 *
 * Wraps the pure `effectivePlan`/`planAllows` logic (lib/billing/entitlements.ts)
 * with the one DB read needed to know the site's subscription, and bridges the
 * legacy admin plan via `legacyToCatalogSlug`. Pages and API routes call this with
 * the cookie-bound Supabase client (RLS scopes the subscription read to the
 * owner) plus the already-loaded `site.plan` legacy value, so no extra site read
 * is needed.
 *
 * Errors propagate (the caller already wraps in try/catch → generic 500); the
 * subscription read itself never returns null (a site with no row resolves to the
 * Free/inactive default — see getSubscription), so the worst case is a Free
 * entitlement, never a crash.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSubscription, legacyToCatalogSlug } from "@/lib/billing";
import {
  effectivePlan,
  planAllows,
  type FeatureKey,
} from "@/lib/billing/entitlements";
import type { PlanSlug } from "@/lib/billing/plans";

export interface SiteEntitlement {
  /** The effective plan the site is entitled to right now. */
  plan: PlanSlug;
  /** Convenience predicate over `plan`. */
  allows: (feature: FeatureKey) => boolean;
}

/**
 * Resolve `siteId`'s effective entitlement. `legacyPlan` is the site's
 * `sites.plan` value (free|pro|managed), already available on the loaded site row.
 */
export async function getSiteEntitlement(
  client: SupabaseClient,
  siteId: string,
  legacyPlan: string
): Promise<SiteEntitlement> {
  const sub = await getSubscription(client, siteId);
  const plan = effectivePlan({
    status: sub.status,
    planSlug: sub.planSlug,
    legacySlug: legacyToCatalogSlug(legacyPlan),
  });
  return { plan, allows: (feature: FeatureKey) => planAllows(plan, feature) };
}
