/**
 * app/dashboard/page.tsx  (RSC)
 *
 * v7 redirect entry point.
 *   - >=1 site → /dashboard/<first id> (default-select an agent so the user
 *                lands on a populated Overview, never a blank/portfolio screen;
 *                the "Agents" nav still opens the full portfolio)
 *   - 0 sites  → /dashboard/agents      (portfolio empty state → "Add agent")
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
  // here without a user, redirect to login with a next param so the user lands
  // back here after signing in.
  if (!user) {
    redirect("/login?next=/dashboard");
  }

  const sites = await listSites(supabase, user.id);

  // Default-select the first agent so a multi-site owner lands on a populated
  // Overview instead of a blank/portfolio screen. The sidebar "Agents" link and
  // the agent switcher still expose the full portfolio.
  if (sites.length >= 1) {
    redirect(`/dashboard/${sites[0].id}`);
  }

  // 0 sites → portfolio (handles the empty "Add your first agent" state)
  redirect("/dashboard/agents");
}
