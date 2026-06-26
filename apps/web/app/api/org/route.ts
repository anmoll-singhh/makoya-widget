/**
 * /api/org — the signed-in user's organization.
 *
 *   GET  → { org, role }. RLS-scoped read; 404 when the caller has no org.
 *   POST → rename the org. Gated by role: only owner/admin (canManageTeam) may
 *          update. Uses the service-role client AFTER the role check (organizations
 *          has no member WRITE policy). Body: { name: string }. Returns the
 *          updated org on success.
 *
 * Authed: 401 with no session. 403 when the role can't manage the org.
 * Errors go through the observability seam → generic 500 (no raw DB detail out).
 */

import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getMembershipForUser, getOrgForUser, updateOrg } from "@/lib/org";
import { canManageTeam } from "@/lib/roles";
import { captureError } from "@/lib/observability";
import { parseBody } from "@/lib/validation/api";
import { updateOrgBodySchema } from "@/lib/validation/org";

export async function GET() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const membership = await getMembershipForUser(supabase, user.id);
    if (!membership) return NextResponse.json({ error: "not found" }, { status: 404 });
    const org = await getOrgForUser(supabase, user.id);
    if (!org) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ org, role: membership.role });
  } catch (err) {
    captureError(err, { route: "GET /api/org", userId: user.id });
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Parse + validate body before any DB work (400 on bad shape)
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const parsed = parseBody(updateOrgBodySchema, json);
  if (!parsed.ok) return NextResponse.json({ error: "invalid request" }, { status: 400 });

  try {
    // Resolve membership to get orgId + role. Use the cookie-bound client (RLS).
    const membership = await getMembershipForUser(supabase, user.id);
    if (!membership) return NextResponse.json({ error: "not found" }, { status: 404 });

    // Only owner/admin may rename the org.
    if (!canManageTeam(membership.role)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    // Write uses service-role AFTER role is confirmed (organizations has no member WRITE policy).
    const updated = await updateOrg(getAdminSupabase(), membership.orgId, { name: parsed.data.name });
    return NextResponse.json({ org: updated });
  } catch (err) {
    captureError(err, { route: "POST /api/org", userId: user.id });
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
