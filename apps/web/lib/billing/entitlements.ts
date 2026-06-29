/**
 * lib/billing/entitlements.ts — PURE plan-tier feature gating (no I/O).
 *
 * This is the single source of truth for "what can a site on plan X do?". The
 * dashboard pages, the API routes, and the upgrade-prompt UI all derive their
 * behaviour from the maps below so a feature can never be locked in one place and
 * open in another.
 *
 * Tiers rank free < starter < growth < scale < enterprise. A feature is allowed
 * when the site's EFFECTIVE plan ranks at or above the feature's minimum plan.
 *
 * ── Entitlement contract (founder decision 2026-06-29) ────────────────────────
 * Stripe is not wired yet, so no subscription is ever truly `active`. To make
 * tier gating real and demonstrable today, a site is entitled to its catalog
 * `planSlug` while its subscription status is `active` OR `trialing` ("selected,
 * awaiting payment"). Any other status (`inactive`/`past_due`/`canceled`) falls
 * back to the legacy admin plan (`sites.plan`, mapped through the catalog
 * adapter) — so the admin CRM can still grant a tier, and an un-chosen site sits
 * at Free. When real payments land, tighten `effectivePlan` to `active`-only.
 *
 * NOTE: enforcement is SERVER-SIDE. The UI soft-locks (shows an upgrade prompt)
 * for nicer UX + upsell, but the gated API routes independently return 403, so a
 * crafted client request can never reach a pro feature it hasn't paid for.
 *
 * This module is PURE and has no `server-only` marker on purpose: the label
 * helpers (`requiredPlanFor`, `planLabel`) are imported by client components to
 * render the upgrade copy.
 */
import type { PlanSlug } from "@/lib/billing/plans";

/** Subscription lifecycle states (kept in sync with lib/billing.ts). */
export type SubscriptionStatusLike =
  | "inactive"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled";

/** The gateable pro capabilities. Site-level unless noted. */
export type FeatureKey =
  | "statement" // accessibility statement generator
  | "analytics" // widget usage analytics
  | "proof_pack" // proof-of-effort pack
  | "vpat" // VPAT / ACR
  | "remediation_log"
  | "remove_branding"
  | "multi_site"
  | "full_api"
  | "partners"
  | "sso";

/** Ordinal rank of each plan; higher = more capable. */
const PLAN_RANK: Record<PlanSlug, number> = {
  free: 0,
  starter: 1,
  growth: 2,
  scale: 3,
  enterprise: 4,
};

/**
 * The LOWEST plan that includes each feature. Transcribed from the feature
 * matrix in lib/billing/plans.ts (PLAN_CATALOG) so the cards and the gate agree.
 */
const FEATURE_MIN_PLAN: Record<FeatureKey, PlanSlug> = {
  statement: "starter",
  analytics: "starter",
  proof_pack: "growth",
  vpat: "growth",
  remediation_log: "growth",
  remove_branding: "growth",
  multi_site: "growth",
  full_api: "scale",
  partners: "scale",
  sso: "enterprise",
};

/** Human-facing plan names for upgrade copy. */
const PLAN_LABELS: Record<PlanSlug, string> = {
  free: "Free",
  starter: "Starter",
  growth: "Growth",
  scale: "Scale",
  enterprise: "Enterprise",
};

/** PURE: numeric rank of a plan (unknown → 0/Free floor). */
export function planRank(slug: PlanSlug): number {
  return PLAN_RANK[slug] ?? 0;
}

/** PURE: does `slug` include `feature`? Inclusive of the minimum plan. */
export function planAllows(slug: PlanSlug, feature: FeatureKey): boolean {
  return planRank(slug) >= planRank(FEATURE_MIN_PLAN[feature]);
}

/** PURE: the lowest plan slug that unlocks `feature` (for upgrade prompts). */
export function requiredPlanFor(feature: FeatureKey): PlanSlug {
  return FEATURE_MIN_PLAN[feature];
}

/** PURE: human label for a plan slug. */
export function planLabel(slug: PlanSlug): string {
  return PLAN_LABELS[slug] ?? slug;
}

/**
 * PURE: resolve a site's EFFECTIVE entitlement plan from its subscription state.
 * See the entitlement contract above. `legacySlug` is the admin `sites.plan`
 * already mapped through `legacyToCatalogSlug`.
 */
export function effectivePlan(args: {
  status: SubscriptionStatusLike;
  planSlug: PlanSlug;
  legacySlug: PlanSlug;
}): PlanSlug {
  if (args.status === "active" || args.status === "trialing") return args.planSlug;
  return args.legacySlug;
}
