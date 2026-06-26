/**
 * /api/partner/white-label — the partner's cosmetic white-label branding.
 *
 *   GET   → the caller's partner white-label config (or `{ config: null }` when
 *           none has been set yet).
 *   PATCH → update branding. Gated by role: only owner/admin (`canManageTeam`)
 *           may edit. The write table has no member write policy, so the upsert
 *           uses the service role AFTER the role check.
 *
 * Authorization: the partner is ALWAYS derived from the caller's own membership
 * (team_members → org → partner_accounts), never from request input — a caller
 * can never edit another org's branding. Authed: 401 with no session; 404 when
 * the caller has no org or their org isn't a partner; 403 when their role can't
 * manage the team. Validation failures yield a generic 400 (no field detail).
 *
 * Guardrail: branding is cosmetic only — no WCAG/ADA "compliance" claims here.
 */

import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getMembershipForUser } from "@/lib/org";
import { canManageTeam } from "@/lib/roles";
import { getPartnerForOrg, getWhiteLabel, upsertWhiteLabel } from "@/lib/partner";
import { captureError } from "@/lib/observability";
import { parseBody } from "@/lib/validation/api";
import { whiteLabelPatchSchema } from "@/lib/validation/partner";

export async function GET() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const membership = await getMembershipForUser(supabase, user.id);
    if (!membership) return NextResponse.json({ error: "not found" }, { status: 404 });
    const partner = await getPartnerForOrg(supabase, membership.orgId);
    if (!partner) return NextResponse.json({ error: "not found" }, { status: 404 });

    const config = await getWhiteLabel(supabase, partner.id);
    return NextResponse.json({ config });
  } catch (err) {
    captureError(err, { route: "GET /api/partner/white-label", userId: user.id });
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const parsed = parseBody(whiteLabelPatchSchema, json);
  if (!parsed.ok) return NextResponse.json({ error: "invalid request" }, { status: 400 });

  try {
    const membership = await getMembershipForUser(supabase, user.id);
    if (!membership) return NextResponse.json({ error: "not found" }, { status: 404 });
    if (!canManageTeam(membership.role))
      return NextResponse.json({ error: "forbidden" }, { status: 403 });

    // Derive the partner from the caller's own org — never from the body.
    const partner = await getPartnerForOrg(supabase, membership.orgId);
    if (!partner) return NextResponse.json({ error: "not found" }, { status: 404 });

    // Write table has no member write policy this wave; upsert AFTER the role check.
    const config = await upsertWhiteLabel(getAdminSupabase(), partner.id, parsed.data);
    return NextResponse.json({ config });
  } catch (err) {
    captureError(err, { route: "PATCH /api/partner/white-label", userId: user.id });
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
