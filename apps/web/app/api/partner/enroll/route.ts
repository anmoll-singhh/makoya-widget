/**
 * /api/partner/enroll — enroll the caller's org into the Partner (agency /
 * white-label) program.
 *
 *   POST → enroll the caller's OWN org as a partner. Idempotent: if the org is
 *          already a partner, the existing account is returned (200); otherwise a
 *          new partner account is created (201).
 *
 * Authed + role-gated: 401 with no session; 404 when the caller has no org; 403
 * when the caller's role can't manage the team (`canManageTeam` — owner/admin).
 *
 * Tenancy: the org is ALWAYS the caller's own (`membership.orgId`), never read
 * from the request body, so there is no cross-tenant enrollment path. The write
 * is service-role (partner tables have no member WRITE policy) and runs only
 * AFTER the role check. Errors route through the observability seam → generic 500.
 */

import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getMembershipForUser } from "@/lib/org";
import { canManageTeam } from "@/lib/roles";
import { getPartnerForOrg, enrollPartner } from "@/lib/partner";
import { captureError } from "@/lib/observability";

export async function POST() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const membership = await getMembershipForUser(supabase, user.id);
    if (!membership) return NextResponse.json({ error: "not found" }, { status: 404 });
    if (!canManageTeam(membership.role))
      return NextResponse.json({ error: "forbidden" }, { status: 403 });

    // Idempotent: a re-enroll of an already-enrolled org returns the existing
    // account rather than erroring on the unique(org_id) constraint.
    const existing = await getPartnerForOrg(supabase, membership.orgId);
    if (existing) return NextResponse.json({ partner: existing });

    // Service-role write AFTER the role check; org is always the caller's own.
    const partner = await enrollPartner(getAdminSupabase(), membership.orgId);
    return NextResponse.json({ partner }, { status: 201 });
  } catch (err) {
    captureError(err, { route: "POST /api/partner/enroll", userId: user.id });
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
