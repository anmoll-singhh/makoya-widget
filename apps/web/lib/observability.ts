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
import { PostHog } from "posthog-node";

import { env } from "@/lib/env.server";

const isProd = process.env.NODE_ENV === "production";

/**
 * Lazily-built server-side PostHog client (singleton). Only constructed when a
 * key is configured. `flushAt:1` + `flushInterval:0` send each event immediately
 * — serverless functions are short-lived and may freeze before a batch flushes,
 * so we don't buffer. Returns null when analytics is disabled (no key).
 */
let phServer: PostHog | null = null;
let phServerInit = false;
function serverPosthog(): PostHog | null {
  if (phServerInit) return phServer;
  phServerInit = true;
  if (env.POSTHOG_KEY) {
    phServer = new PostHog(env.POSTHOG_KEY, {
      host: env.POSTHOG_HOST,
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return phServer;
}

/** Funnel/product event. The names we care about: scan_started, scan_completed,
 *  report_emailed, signup, checkout_started, plan_upgraded.
 *
 *  Server-side events are captured under a `distinctId` taken from props when the
 *  caller knows one (so they stitch to the visitor's client-side funnel), else a
 *  generic "server" id. NEVER throws — a failed analytics send must not break a
 *  route. No-op when no PostHog key is configured. */
export function track(event: string, props?: Record<string, unknown>): void {
  if (!isProd) console.debug(`[track] ${event}`, props ?? {});
  try {
    const ph = serverPosthog();
    if (!ph) return;
    const distinctId = (typeof props?.distinctId === "string" && props.distinctId) || "server";
    ph.capture({ distinctId, event, properties: props ?? {} });
  } catch {
    // Analytics must never break a request path.
  }
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
 *
 * Two destinations, both no-ops until their key is set, both wrapped so a failure
 * NEVER breaks the gate (the config route's never-500 / fail-open contract must
 * survive a broken reporter):
 *   1. Sentry — a `warning`-level message, GROUPED BY `reason` (one issue per
 *      check, with a running count) so the founder sees enforcement volume at a
 *      glance; siteId/host/status ride along as `extra`.
 *   2. PostHog — a `widget_gate_denied` funnel event keyed to the site, so the
 *      denial path shows up alongside the rest of the product funnel.
 * In non-prod we also emit a `console.debug` (dev only — never prod, to avoid
 * leaking siteId/host/licenseStatus into production server logs as the prior
 * TODO warned). This was an EMPTY no-op before: enforcement ran blind in prod.
 */
export function logWidgetGate(info: {
  siteId: string;
  host: string | null;
  status: string;
  enforced: boolean;
  /** Which check produced the would-be denial (Phase 1.5). */
  reason: "domain" | "license" | "token" | "no-site";
}): void {
  if (!isProd) console.debug(`[widget-gate] ${info.reason}`, info);

  // Sentry: group by reason so all sites' "domain" denials collapse into one
  // issue with a count (funnel visibility, not per-site noise). Never throws.
  if (env.SENTRY_DSN || env.SENTRY_DSN_PUBLIC) {
    try {
      Sentry.captureMessage(`widget-gate:${info.reason}`, {
        level: "warning",
        extra: { ...info },
        fingerprint: ["widget-gate", info.reason],
      });
    } catch {
      // Observability must never break the gate.
    }
  }

  // PostHog: a product-funnel event (no-op without a key). `track` is itself
  // wrapped to never throw; `distinctId` stitches to the site.
  track("widget_gate_denied", { distinctId: info.siteId, ...info });
}
