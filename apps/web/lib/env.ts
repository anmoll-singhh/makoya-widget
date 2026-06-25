/**
 * Centralised env access.
 * Public vars (NEXT_PUBLIC_*) fail FAST in production — a missing key crashes at
 * boot rather than producing opaque Supabase errors at runtime. In dev we warn
 * only, so local scaffolding still boots with placeholders.
 *
 * Note: this module is imported by client components too, so it must NOT throw
 * on server-only secrets (they're undefined client-side). The service-role key
 * is validated at its single use site (lib/supabase/admin.ts), not here.
 */
const isProd = process.env.NODE_ENV === "production";

function requiredPublic(name: string, value: string | undefined): string {
  const missing = !value || value.startsWith("YOUR_") || value.includes("YOUR-PROJECT");
  if (missing) {
    const msg = `[env] ${name} is not set`;
    if (isProd) throw new Error(`${msg}. Set it before deploying.`);
    if (typeof window === "undefined") console.warn(`${msg} (placeholder — dev only).`);
    return value ?? "";
  }
  return value;
}

export const env = {
  SUPABASE_URL: requiredPublic("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
  SUPABASE_ANON_KEY: requiredPublic("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  ADMIN_EMAILS: process.env.ADMIN_EMAILS ?? "",
  APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  // Email (Resend). Server-only secret — undefined client-side, never throws here.
  // When RESEND_API_KEY is set, lib/email/index.ts uses Resend; otherwise the stub.
  RESEND_API_KEY: process.env.RESEND_API_KEY ?? "",
  // Must be a Resend-verified sending domain. Today: mailer.jewlx.ai.
  EMAIL_FROM: process.env.EMAIL_FROM ?? "Makoya <reports@mailer.jewlx.ai>",
  // Widget signed-token secret (Phase 1.5). Server-only — like RESEND_API_KEY it
  // must NEVER reach the client bundle and must NOT fail-fast (empty = monitor-safe:
  // lib/licensing/token.ts then treats verification as a no-op). Read it from here.
  WIDGET_SIGNING_SECRET: process.env.WIDGET_SIGNING_SECRET ?? "",
  // Upstash Redis (durable, cross-instance rate limiting). Server-only secrets.
  // BOTH empty = no durable limiter configured → lib/rate-limit.ts falls back to
  // the in-memory limiter (so local dev + missing-config never breaks the route).
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL ?? "",
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN ?? "",
  // Sentry error reporting. SENTRY_DSN is server-side; NEXT_PUBLIC_SENTRY_DSN is
  // the SAME DSN exposed to the browser bundle for client error capture. Empty =
  // Sentry disabled (init no-ops) so nothing breaks without it (bootstrap-safe).
  SENTRY_DSN: process.env.SENTRY_DSN ?? "",
  SENTRY_DSN_PUBLIC: process.env.NEXT_PUBLIC_SENTRY_DSN ?? "",
};
