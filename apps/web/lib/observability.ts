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
 *   NEXT_PUBLIC_POSTHOG_KEY  — PostHog project key (product analytics, later phase)
 *   NEXT_PUBLIC_POSTHOG_HOST — PostHog host (default https://us.i.posthog.com)
 *   SENTRY_DSN               — Sentry DSN (server error reporting) — WIRED below
 *
 * Sentry status: `captureError()` now forwards to Sentry when `env.SENTRY_DSN`
 * is set, while ALWAYS keeping the existing `console.error` so logs are
 * unchanged. The actual `Sentry.init()` happens in `instrumentation.ts` (server
 * + edge) and `instrumentation-client.ts` (browser) — those are the Next 15
 * entry points; this seam only *captures*. PostHog (product funnel) remains a
 * no-op TODO for a later phase. We deliberately do NOT use `withSentryConfig`
 * (it would clobber next.config + needs a source-map auth token we don't have);
 * plain `Sentry.init` in the instrumentation files works fully without it.
 */
import * as Sentry from "@sentry/nextjs";

import { env } from "@/lib/env";

const isProd = process.env.NODE_ENV === "production";

/** Funnel/product event. The names we care about: scan_started, scan_completed,
 *  report_emailed, signup, checkout_started, plan_upgraded. */
export function track(event: string, props?: Record<string, unknown>): void {
  // TODO(phase-3): forward to PostHog when NEXT_PUBLIC_POSTHOG_KEY is set.
  if (!isProd) console.debug(`[track] ${event}`, props ?? {});
}

/** Server-side error capture. Use in route catch blocks instead of bare console.
 *
 * Always logs to `console.error` (unchanged behaviour). Additionally forwards to
 * Sentry when `env.SENTRY_DSN` is configured. The Sentry call is wrapped so this
 * function NEVER throws — even if Sentry is somehow un-initialised — because a
 * crash inside the error reporter must not take down the route that's already
 * handling a failure. When DSN is empty, Sentry stays disabled and we skip the
 * call entirely (bootstrap-safe no-op). */
export function captureError(err: unknown, context?: Record<string, unknown>): void {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[error] ${message}`, context ?? {});

  // Forward when EITHER DSN is configured: the server reads SENTRY_DSN, but in a
  // client/browser context that var is stripped (it isn't NEXT_PUBLIC) and only
  // SENTRY_DSN_PUBLIC survives — so gating on SENTRY_DSN alone would silently drop
  // any client-side captureError() call even though instrumentation-client.ts has
  // Sentry enabled. Checking both keeps capture working on whichever side runs.
  if (env.SENTRY_DSN || env.SENTRY_DSN_PUBLIC) {
    try {
      Sentry.captureException(err, context ? { extra: context } : undefined);
    } catch {
      // Reporting must never break the caller — swallow any Sentry-side error.
    }
  }
}

/**
 * Widget license/domain gate decision (Phase 1). Logged on EVERY would-be denial
 * — including monitor mode (`enforced:false`), where the verdict is computed but
 * the widget is still served — so the founder can watch the funnel before
 * flipping `WIDGET_ENFORCE=true`. Routed through this seam, never raw console at
 * the call site (CLAUDE.md observability rule).
 */
export function logWidgetGate(info: {
  siteId: string;
  host: string | null;
  status: string;
  enforced: boolean;
  /** Which check produced the would-be denial (Phase 1.5). */
  reason: "domain" | "license" | "token" | "no-site";
}): void {
  // TODO(phase-3): forward to PostHog/Sentry as a structured event.
  console.warn(`[widget-gate] ${info.enforced ? "deny" : "monitor_would_deny"}`, info);
}
