/**
 * GET /api/org — the signed-in user's organization + their role within it.
 *
 * Authed: 401 with no session. Reads through the cookie-bound client (RLS scopes
 * the read to the caller's own org via the Wave 3 member-read policies). Returns
 * 404 when the user belongs to no org. Errors are logged through the
 * observability seam and surfaced as a generic 500 (no internal detail leaks).
 */

import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getMembershipForUser, getOrgForUser } from "@/lib/org";
import { captureError } from "@/lib/observability";

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
