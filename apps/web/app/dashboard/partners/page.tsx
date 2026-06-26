/**
 * app/dashboard/partners/page.tsx  (RSC — C12)
 *
 * Partner program screen. Session-level RSC (not per-siteId) that:
 *  1. Verifies the Supabase session — redirects to /login if absent.
 *  2. Renders PartnersClient.
 *
 * PartnersClient fetches from the partner APIs:
 *   GET  /api/partner              → { partner, clients?, summary? }
 *   POST /api/partner/enroll       → enroll this org as a partner (idempotent)
 *   GET/PATCH /api/partner/white-label → white-label branding config
 *
 * HARD RULES (plan § C12):
 *   - "14" clients / "39" agents / "$6.2k" revenue → NEVER hard-coded
 *   - Client count = real data.clients.length / summary.clientCount
 *   - Agents managed = real summary.agentsManaged
 *   - Revenue = $0 with honest note until Stripe is live
 */
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { PartnersClient } from "./_PartnersClient";

export default async function PartnersPage() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard/partners");
  }

  return <PartnersClient />;
}
