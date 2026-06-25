/**
 * instrumentation-client.ts — Next.js 15.3+ browser instrumentation.
 *
 * This file is the modern replacement for `sentry.client.config.ts` when you're
 * NOT using `withSentryConfig` (which we intentionally avoid — see
 * instrumentation.ts for why). Next.js loads it on the client before the app
 * hydrates, so initialising Sentry here captures unhandled browser errors and
 * promise rejections in production.
 *
 * Uses the PUBLIC DSN (`NEXT_PUBLIC_SENTRY_DSN`, surfaced as `env.SENTRY_DSN_PUBLIC`)
 * — the same Sentry project DSN, just the copy that's safe to ship in the client
 * bundle. Empty string ⇒ `enabled: false` ⇒ `Sentry.init` is a no-op, so the
 * browser bundle works identically without Sentry configured (bootstrap-safe).
 *
 * Errors only: `tracesSampleRate: 0` keeps us off performance tracing to protect
 * the free-tier quota.
 */
import * as Sentry from "@sentry/nextjs";

import { env } from "@/lib/env";

Sentry.init({
  dsn: env.SENTRY_DSN_PUBLIC,
  enabled: !!env.SENTRY_DSN_PUBLIC,
  // Errors only — no client performance traces (preserve free-tier quota).
  tracesSampleRate: 0,
});

/**
 * Next.js 15 App Router navigation instrumentation hook. Exported so Next can
 * notify Sentry when a client-side route transition starts. Guarded/optional:
 * present across @sentry/nextjs v10, but we reference it defensively so a future
 * SDK that drops it can't break the client entry point.
 */
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
