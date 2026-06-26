/**
 * /api/team/accept — accept a team invite by its raw token.
 *
 *   POST { token } → bind the invited email to the caller's authenticated user
 *                    and consume the invite.
 *
 * Authed: 401 with no session. The token identifies the invite; the actual
 * acceptance is service-role (team_invites/team_members have no member WRITE
 * policy) and runs AFTER auth. `acceptInvite` enforces the security check that
 * the caller's verified email matches the address the invite was issued for —
 * possessing the token alone must NOT let a different account join.
 *
 * Result mapping is deliberately GENERIC: both an invalid/expired token and an
 * email mismatch collapse to the same 400 copy so we never reveal which check
 * failed (an enumeration / info-leak vector). Infra errors route through the
 * observability seam → generic 500.
 */

import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { acceptInvite } from "@/lib/org";
import { captureError } from "@/lib/observability";
import { parseBody } from "@/lib/validation/api";
import { acceptInviteBodySchema } from "@/lib/validation/invite";

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
  const parsed = parseBody(acceptInviteBodySchema, json);
  if (!parsed.ok) return NextResponse.json({ error: "invalid request" }, { status: 400 });

  try {
    // Service-role write AFTER auth; the email-match check lives in acceptInvite.
    const result = await acceptInvite(getAdminSupabase(), parsed.data.token, {
      id: user.id,
      email: user.email ?? "",
    });
    if (!result.ok) {
      // Generic copy: do NOT leak whether the token was wrong or the email
      // mismatched (both are expected "no"s, not infra failures).
      return NextResponse.json(
        { error: "This invite is invalid or was issued for a different email." },
        { status: 400 }
      );
    }
    return NextResponse.json({ ok: true, orgId: result.orgId });
  } catch (err) {
    captureError(err, { route: "POST /api/team/accept", userId: user.id });
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
