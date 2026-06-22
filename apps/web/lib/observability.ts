/**
 * observability.ts — the SINGLE seam for product analytics + error reporting.
 *
 * Phase 0 scaffold: these are env-guarded no-ops today, so nothing breaks and no
 * paid SDK is pulled in (bootstrap / OSS-first). When we wire PostHog (product
 * funnel) and Sentry (errors) in a later phase, they get implemented HERE and
 * nowhere else — every call site already routes through this module.
 *
 * Why a seam now instead of later: it keeps analytics/error calls out of feature
 * code, so adding the real SDKs is a one-file change rather than a refactor.
 *
 * Env vars (set when we turn these on):
 *   NEXT_PUBLIC_POSTHOG_KEY  — PostHog project key (product analytics)
 *   NEXT_PUBLIC_POSTHOG_HOST — PostHog host (default https://us.i.posthog.com)
 *   SENTRY_DSN               — Sentry DSN (server error reporting)
 */

const isProd = process.env.NODE_ENV === "production";

/** Funnel/product event. The names we care about: scan_started, scan_completed,
 *  report_emailed, signup, checkout_started, plan_upgraded. */
export function track(event: string, props?: Record<string, unknown>): void {
  // TODO(phase-3): forward to PostHog when NEXT_PUBLIC_POSTHOG_KEY is set.
  if (!isProd) console.debug(`[track] ${event}`, props ?? {});
}

/** Server-side error capture. Use in route catch blocks instead of bare console. */
export function captureError(err: unknown, context?: Record<string, unknown>): void {
  // TODO(phase-0/1): forward to Sentry when SENTRY_DSN is set.
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[error] ${message}`, context ?? {});
}
