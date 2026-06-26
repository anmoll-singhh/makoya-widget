/**
 * lib/billing/stripe.ts — DEFERRED Stripe seam (placeholders only).
 *
 * Stripe is the founder's chosen processor, but the Stripe ACCOUNT does not exist
 * yet, so this wave ships ONLY the shape of the integration. There is deliberately
 * NO Stripe SDK dependency, NO secret handling, and NO network call here. The
 * `plan_quotas.stripe_price_id_*` columns stay null until the account is wired.
 *
 * When the account exists, replace the throwing bodies below with real calls
 * (signature-verified + idempotent webhooks, server-side checkout sessions) and
 * have the webhook handler write `billing_subscriptions` via the SERVICE ROLE —
 * never trust the client for plan state (see CLAUDE.md "Backend / data rules").
 *
 * Until then every entry point THROWS a clear, catchable error so any premature
 * caller fails loudly rather than silently pretending billing works.
 */
import type { BillingPeriod, PlanSlug } from "@/lib/billing/plans";

/** Thrown by every stub so callers fail loudly until Stripe is configured. */
export const STRIPE_NOT_CONFIGURED = "Stripe not configured";

export interface CheckoutSessionParams {
  siteId: string;
  slug: PlanSlug;
  period: BillingPeriod;
}

/**
 * Create a Stripe Checkout session for a site's plan purchase.
 * TODO(stripe): wire when account exists — build a Checkout Session from the
 * plan's `stripe_price_id_{monthly,yearly}`, return its URL. Server-side only.
 */
export async function createCheckoutSession(_params: CheckoutSessionParams): Promise<{ url: string }> {
  // TODO(stripe): wire when account exists.
  throw new Error(STRIPE_NOT_CONFIGURED);
}

/**
 * Handle a verified Stripe webhook event (subscription created/updated/canceled)
 * and upsert `billing_subscriptions` via the SERVICE ROLE.
 * TODO(stripe): wire when account exists — verify the signature, dedupe by event
 * id (idempotent), then map the event to a subscription row.
 */
export async function handleWebhookEvent(_rawBody: string, _signature: string): Promise<void> {
  // TODO(stripe): wire when account exists.
  throw new Error(STRIPE_NOT_CONFIGURED);
}
