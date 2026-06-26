/**
 * /api/team — the caller's org roster + team invites.
 *
 *   GET  → list members of the caller's org (RLS-scoped read).
 *   POST → invite a teammate. Gated by role: only owner/admin (`canManageTeam`)
 *          may invite. Returns the raw invite token EXACTLY ONCE so the caller can
 *          build the invite link; the token is never persisted (only its hash).
 *
 * Authed: 401 with no session; 404 when the caller has no org; 403 when the
 * caller's role can't manage the team. Membership write tables are service-role
 * only this wave, so the actual insert uses getAdminSupabase() AFTER the role
 * check. Errors route through the observability seam → generic 500.
 */

import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getMembershipForUser, listTeam, createInvite } from "@/lib/org";
import { canManageTeam } from "@/lib/roles";
import { captureError } from "@/lib/observability";
import { parseBody } from "@/lib/validation/api";
import { createInviteBodySchema } from "@/lib/validation/org";

export async function GET() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const membership = await getMembershipForUser(supabase, user.id);
    if (!membership) return NextResponse.json({ error: "not found" }, { status: 404 });
    const team = await listTeam(supabase, membership.orgId);
    return NextResponse.json({ team });
  } catch (err) {
    captureError(err, { route: "GET /api/team", userId: user.id });
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
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
  const parsed = parseBody(createInviteBodySchema, json);
  if (!parsed.ok) return NextResponse.json({ error: "invalid request" }, { status: 400 });

  try {
    const membership = await getMembershipForUser(supabase, user.id);
    if (!membership) return NextResponse.json({ error: "not found" }, { status: 404 });
    if (!canManageTeam(membership.role)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    // Write tables are service-role only this wave; insert AFTER the role check.
    const { invite, rawToken } = await createInvite(getAdminSupabase(), {
      orgId: membership.orgId,
      email: parsed.data.email,
      role: parsed.data.role,
      invitedBy: user.id,
    });
    // rawToken is returned ONCE for the caller to build the invite link; never logged.
    return NextResponse.json({ invite, token: rawToken }, { status: 201 });
  } catch (err) {
    captureError(err, { route: "POST /api/team", userId: user.id });
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
