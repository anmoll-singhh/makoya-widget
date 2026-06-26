/**
 * /api/sites/[id]/overview — AUTHED, owner-only Overview roll-up (GET).
 *
 * Powers the v3.1 Overview screen (headline score + trend, install status,
 * monitoring streak, open/needs-human issue counts, issues resolved this month,
 * widget opens, per-framework coverage, and the recent-activity feed). Mirrors
 * the auth+ownership discipline of /api/sites/[id]/analytics: 401 with no
 * session; 404 when the site doesn't exist or isn't the caller's (RLS already
 * scopes every consumed read to the owner — the ownership check turns a
 * not-found into a clean 404 rather than an empty 200, and avoids confirming
 * foreign site ids).
 *
 * The cookie-bound client is passed straight through so RLS enforces tenancy on
 * every fan-out read. Raw DB errors are never echoed to the client — the detail
 * is routed through the observability seam and a generic message is returned.
 */
import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getSite } from "@/lib/sites";
import { getOverview } from "@/lib/overview";
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
    const overview = await getOverview(supabase, id);
    return NextResponse.json(overview);
  } catch (e) {
    captureError(e, { route: "sites/[id]/overview" });
    return NextResponse.json({ error: "failed to load overview" }, { status: 500 });
  }
}
