/**
 * app/dashboard/agents/new/page.tsx  (RSC wrapper)
 *
 * Thin RSC shell that guards the session then hands off to the
 * <AddAgent> client component. Redirect guard matches the pattern used by
 * layout.tsx (session required for all /dashboard/* routes).
 */

import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { AddAgent } from "./AddAgent";

export default async function NewAgentPage() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard/agents/new");
  }

  return (
    <div className="wrap">
      <AddAgent />
    </div>
  );
}
