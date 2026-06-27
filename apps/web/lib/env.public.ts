/**
 * lib/env.public.ts — public (NEXT_PUBLIC_*) environment variables only.
 *
 * This module is safe to import from client components, server components,
 * and "use client" files alike. It NEVER exposes server secrets.
 *
 * Public vars fail-fast in production so a missing key crashes at boot rather
 * than producing opaque Supabase/PostHog errors at runtime. In dev we warn
 * only, so local scaffolding still boots with placeholders.
 *
 * Server secrets (SERVICE_ROLE_KEY, RESEND_API_KEY, ADMIN_EMAILS, etc.) live
 * in lib/env.server.ts which carries `import "server-only"`.
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
  SUPABASE_ANON_KEY: requiredPublic(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ),
  APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  // Public copy of the Sentry DSN — safe to ship in the browser bundle.
  // Empty = Sentry disabled (no-op). NEVER the server SENTRY_DSN here.
  SENTRY_DSN_PUBLIC: process.env.NEXT_PUBLIC_SENTRY_DSN ?? "",
  // PostHog key is public by design (write-only events, ships in browser bundle).
  POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "",
  POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
};
