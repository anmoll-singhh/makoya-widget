import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env.server";

/** Service-role client. SERVER-ONLY. Bypasses RLS — use only for the public
 *  config endpoint and admin/operator features. Never import into a client component. */
export function getAdminSupabase() {
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key || key.startsWith("YOUR_")) {
    // Fail fast: a server feature that needs the service role must not run with a missing key.
    throw new Error(
      "[env] SUPABASE_SERVICE_ROLE_KEY is not set — required for admin/scan/config features."
    );
  }
  return createClient(env.SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
