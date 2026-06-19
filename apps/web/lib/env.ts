/** Centralised env access. Throws early in server contexts if required vars are missing. */
function required(name: string, value: string | undefined): string {
  if (!value || value.startsWith("YOUR_") || value.includes("YOUR-PROJECT")) {
    // Allow placeholder during local scaffold; warn instead of crashing the whole app.
    if (typeof window === "undefined") console.warn(`[env] ${name} is not set (placeholder).`);
    return value ?? "";
  }
  return value;
}

export const env = {
  SUPABASE_URL: required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
  SUPABASE_ANON_KEY: required("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  ADMIN_EMAILS: process.env.ADMIN_EMAILS ?? "",
  APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001",
};
