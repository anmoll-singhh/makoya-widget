/**
 * instrumentation.ts — Next.js 15 server + edge runtime instrumentation hook.
 *
 * Next.js calls the exported `register()` once per runtime at server start. We
 * use it to initialise Sentry for the SERVER (`nodejs`) and EDGE (`edge`)
 * runtimes so unhandled errors thrown in server components, route handlers,
 * middleware and server actions reach Sentry in production.
 *
 * Why here (and not `withSentryConfig`): we deliberately do NOT wrap
 * next.config.mjs with `withSentryConfig` — it would clobber our existing
 * security headers / serverExternalPackages / webpack override and it needs a
 * source-map upload auth token we don't have. The manual Next 15 setup is just:
 *   - `instrumentation.ts`           → server + edge `Sentry.init` (this file)
 *   - `instrumentation-client.ts`    → browser `Sentry.init`
 *   - `export const onRequestError`  → the official Next 15 nested-error hook
 * which works fully without the build-time plugin.
 *
 * Bootstrap-safe: `env.SENTRY_DSN` defaults to "" when unset, so `enabled` is
 * false and `Sentry.init` becomes a no-op. Nothing breaks without config.
 *
 * Errors only — `tracesSampleRate: 0` disables performance/transaction tracing
 * so we don't burn the free Sentry quota; we want crash reports, not spans.
 */
import * as Sentry from "@sentry/nextjs";

import { env } from "@/lib/env";

export async function register(): Promise<void> {
  // Node.js server runtime (route handlers, RSC, server actions, most of the app).
  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init({
      dsn: env.SENTRY_DSN,
      enabled: !!env.SENTRY_DSN,
      // Errors only — no performance traces (preserve free-tier quota).
      tracesSampleRate: 0,
    });
  }

  // Edge runtime (middleware, edge route handlers).
  if (process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn: env.SENTRY_DSN,
      enabled: !!env.SENTRY_DSN,
      tracesSampleRate: 0,
    });
  }
}

/**
 * Official Next.js 15 hook: captures errors thrown while rendering server
 * components / executing route handlers (the nested React Server Component
 * errors that `register()` alone can't see). Next calls this with the error +
 * request context; Sentry's helper formats and reports it. No-op without a DSN.
 */
export const onRequestError = Sentry.captureRequestError;
