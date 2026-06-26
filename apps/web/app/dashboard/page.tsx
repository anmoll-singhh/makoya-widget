/**
 * app/dashboard/page.tsx  (RSC)
 *
 * v7 redirect entry point.
 *   - 0 or >1 sites  → /dashboard/agents (portfolio view; user can pick or add)
 *   - exactly 1 site → /dashboard/<id>   (jump straight into that agent)
 *
 * The layout already required a valid session and pre-loaded sites; we read
 * them fresh here via the cookie-bound client so the redirect reflects the
 * CURRENT state (avoids stale layout data on hard nav).
 */

import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { listSites } from "@/lib/sites";

export default async function DashboardPage() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Layout already handles no-session → redirect to login. If somehow we reach
  // here without a user, redirect to agents (portfolio shows empty state).
  if (!user) {
    redirect("/dashboard/agents");
  }

  const sites = await listSites(supabase, user.id);

  if (sites.length === 1) {
    redirect(`/dashboard/${sites[0].id}`);
  }

  // 0 sites or >1 sites → portfolio (agents page handles empty state)
  redirect("/dashboard/agents");
}
