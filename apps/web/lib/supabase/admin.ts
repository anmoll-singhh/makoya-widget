import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/** Service-role client. SERVER-ONLY. Bypasses RLS — use only for the public
 *  config endpoint and admin/operator features. Never import into a client component. */
export function getAdminSupabase() {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
