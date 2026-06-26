/**
 * lib/validation/checkout.ts
 *
 * Zod request-body schema for the AUTHED `/api/sites/[id]/billing/checkout` POST
 * route — the "Buy now" action that records a site's chosen plan.
 *
 * Kept separate from `lib/validation/api.ts` (the public-funnel schemas) and
 * `lib/validation/issues.ts` so the billing lane owns its own boundary without
 * touching the shared file. The route parses this via `parseBody`, which DROPS
 * Zod's field-level detail → a generic 400, so internal field names never leak.
 *
 * The client supplies ONLY which tier + cadence it wants; the SERVER fixes the
 * status and price (never trust the client for plan state — CLAUDE.md "Backend /
 * data rules"). Only the three PURCHASABLE tiers are accepted here:
 *  - `free` is the default a site already has — there is nothing to buy.
 *  - `enterprise` is "contact sales" (custom price), not a self-serve purchase.
 * Accepting only `starter|growth|scale` means a client can never self-assign a
 * free downgrade or an enterprise tier through this endpoint.
 *
 * Honesty: this validates SHAPE only. It asserts no WCAG/ADA "compliance" or
 * "guarantee" claims — none of that copy lives here.
 */
import { z } from "zod";

/** The tiers that can be purchased via self-serve checkout. */
export const purchasablePlanSchema = z.enum(["starter", "growth", "scale"]);

/** Billing cadence (mirrors `BillingPeriod` in lib/billing/plans.ts). */
export const checkoutPeriodSchema = z.enum(["monthly", "yearly"]);

/** POST body: which purchasable tier, on which cadence. Nothing else. */
export const checkoutBodySchema = z.object({
  planSlug: purchasablePlanSchema,
  period: checkoutPeriodSchema,
});

export type CheckoutBody = z.infer<typeof checkoutBodySchema>;
