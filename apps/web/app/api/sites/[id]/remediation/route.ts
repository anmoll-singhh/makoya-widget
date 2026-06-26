/**
 * /api/sites/[id]/remediation — AUTHED, owner-only remediation log (GET).
 *
 * Powers the v3.1 Reports "remediation" tab. Mirrors the auth+ownership
 * discipline of /api/sites/[id]/analytics: 401 with no session; 404 when the
 * site doesn't exist or isn't the caller's (RLS already scopes the read to the
 * owner — the ownership check turns a not-found into a clean 404 rather than an
 * empty 200, and avoids confirming foreign site ids).
 *
 * The cookie-bound client is passed straight through so RLS enforces tenancy on
 * the read. Raw DB errors are never echoed to the client — the detail is routed
 * through the observability seam and a generic message is returned.
 */
import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getSite } from "@/lib/sites";
import { listRemediation } from "@/lib/remediation";
import { captureError } from "@/lib/observability";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const site = await getSite(supabase, id);
  if (!site || site.ownerId !== user.id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  try {
    const remediation = await listRemediation(supabase, id);
    return NextResponse.json(remediation);
  } catch (e) {
    captureError(e, { route: "sites/[id]/remediation" });
    return NextResponse.json({ error: "failed to load remediation" }, { status: 500 });
  }
}
