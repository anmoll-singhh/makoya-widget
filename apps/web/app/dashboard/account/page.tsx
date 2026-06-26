/**
 * app/dashboard/account/page.tsx  (RSC — C11)
 *
 * Account settings screen. A session-level RSC (not per-siteId) that:
 *  1. Verifies the Supabase session — redirects to /login if absent.
 *  2. Passes the user's email to AccountClient.
 *
 * AccountClient fetches from the org-tenancy APIs:
 *   GET/POST      /api/org            → org name / caller role
 *   GET/POST      /api/team           → roster, invites, invite with one-time token
 *   GET/POST/DEL  /api/org/api-keys   → list / create (secret once) / revoke
 *
 * Tabs: Profile | Team | Security | API
 *
 * Ported from the richest existing wiring in /v3/Dashboard.tsx (AccountScreen +
 * AccountProfile + AccountTeam + AccountSecurity + AccountApiKeys), re-skinned
 * to v7 markup classes.
 */
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { AccountClient } from "./_AccountClient";

export default async function AccountPage() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard/account");
  }

  return <AccountClient email={user.email ?? ""} />;
}
