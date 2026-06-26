/**
 * /api/partner — the caller's partner account + dashboard summary.
 *
 *   GET → if the caller's org is enrolled as a partner, return its partner
 *         account, the client portfolio, and the three Partners dashboard cards
 *         (clientCount / agentsManaged / monthlyRevenueCents). If the caller has
 *         no org, or their org isn't a partner, return `{ partner: null }` (200) —
 *         the screen renders an "enroll" empty state rather than erroring.
 *
 * Authorization: the partner is ALWAYS derived from the caller's own membership
 * (team_members → org → partner_accounts), never from request input, so a caller
 * can never read another org's partner data. Reads use the cookie client (RLS
 * scopes them). The per-client agent counts need to read the CLIENT orgs'
 * rosters, which the partner's own members can't read under RLS — that single
 * privileged aggregate uses the service role, and only AFTER the caller has been
 * confirmed to own the partner. Errors route through the observability seam.
 */

import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getMembershipForUser } from "@/lib/org";
import {
  getPartnerForOrg,
  listPartnerClients,
  listCommissions,
  summarizePartner,
  type PartnerClientSummary,
} from "@/lib/partner";
import { captureError } from "@/lib/observability";

export async function GET() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const membership = await getMembershipForUser(supabase, user.id);
    if (!membership) return NextResponse.json({ partner: null });

    const partner = await getPartnerForOrg(supabase, membership.orgId);
    if (!partner) return NextResponse.json({ partner: null });

    const [clients, commissions] = await Promise.all([
      listPartnerClients(supabase, partner.id),
      listCommissions(supabase, partner.id),
    ]);

    // Agent (team member) counts per managed client org. The partner's own
    // members can't read client rosters under RLS, so this aggregate read uses
    // the service role — safe here because we've already confirmed the caller
    // owns this partner and we only count their own clients' orgs.
    const clientOrgIds = clients.map((c) => c.clientOrgId);
    const agentsByOrg: Record<string, number> = {};
    if (clientOrgIds.length > 0) {
      const { data, error } = await getAdminSupabase()
        .from("team_members")
        .select("org_id")
        .in("org_id", clientOrgIds);
      if (error) throw error;
      for (const r of (data ?? []) as { org_id: string }[]) {
        agentsByOrg[r.org_id] = (agentsByOrg[r.org_id] ?? 0) + 1;
      }
    }

    // Revenue is taken from the authoritative commissions table (current period),
    // not derived per-client; summarizePartner handles client + agent totals.
    const parts: PartnerClientSummary[] = clients.map((c) => ({
      agents: agentsByOrg[c.clientOrgId] ?? 0,
      monthlyRevenueCents: 0,
    }));
    const base = summarizePartner(parts);
    const period = new Date().toISOString().slice(0, 7); // YYYY-MM
    const monthlyRevenueCents = commissions
      .filter((m) => m.period === period)
      .reduce((s, m) => s + m.amountCents, 0);

    return NextResponse.json({
      partner,
      clients,
      summary: { ...base, monthlyRevenueCents },
    });
  } catch (err) {
    captureError(err, { route: "GET /api/partner", userId: user.id });
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
