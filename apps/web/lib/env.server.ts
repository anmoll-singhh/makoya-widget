/**
 * lib/env.server.ts — ALL environment variables, including server secrets.
 *
 * `import "server-only"` prevents this module from ever being bundled into
 * a client (browser) chunk. Any file that imports from here is automatically
 * server-only — a Next.js build error will fire if it leaks into "use client".
 *
 * Also re-exports the public subset so server files have a single import:
 *   import { env } from "@/lib/env.server";
 *   // env.SUPABASE_URL, env.POSTHOG_KEY, env.SUPABASE_SERVICE_ROLE_KEY, …
 */
import "server-only";
import { env as publicEnv } from "./env.public";

export const env = {
  // ── Public fields (re-exported from env.public for server convenience) ──
  ...publicEnv,

  // ── Server secrets — NEVER expose these to client bundles ───────────────
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  ADMIN_EMAILS: process.env.ADMIN_EMAILS ?? "",

  // Email (Resend). Empty = email disabled (stub used); never throws here.
  RESEND_API_KEY: process.env.RESEND_API_KEY ?? "",
  EMAIL_FROM: process.env.EMAIL_FROM ?? "Makoya <reports@mailer.jewlx.ai>",

  // Widget signed-token secret (Phase 1.5). Empty = token verification is
  // a no-op in lib/licensing/token.ts. Must never reach the client bundle.
  WIDGET_SIGNING_SECRET: process.env.WIDGET_SIGNING_SECRET ?? "",

  // Upstash Redis (durable rate limiting). Both empty = in-memory fallback.
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL ?? "",
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN ?? "",

  // Server-side Sentry DSN (NOT the NEXT_PUBLIC_ one). Empty = Sentry disabled.
  // The public DSN (SENTRY_DSN_PUBLIC) is available via the publicEnv spread above.
  SENTRY_DSN: process.env.SENTRY_DSN ?? "",
};
