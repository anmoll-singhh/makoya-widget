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
};
