import { getServerSupabase } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/roles";
import { env } from "@/lib/env.server";

/** Returns the signed-in user only if they are an operator (admin). Else null. */
export async function getAdminUser(): Promise<{ id: string; email: string } | null> {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email || !isAdmin(user.email, env.ADMIN_EMAILS)) return null;
  return { id: user.id, email: user.email };
}
