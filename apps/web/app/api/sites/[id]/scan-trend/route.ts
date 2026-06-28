/**
 * /api/sites/[id]/scan-trend — AUTHED, owner-only per-scan score trend (GET).
 *
 * Powers the Overview "Accessibility score trend" sparkline from the raw `scans`
 * history (last N scores, chronological). Mirrors the auth + ownership discipline
 * of /api/sites/[id]/overview: 401 with no session; 404 when the site isn't the
 * caller's (RLS already scopes the `scans` read to the owner — the explicit
 * ownership check turns a foreign/unknown id into a clean 404 rather than an
 * empty 200, and avoids confirming foreign site ids).
 *
 * The cookie-bound client is passed straight through so RLS enforces tenancy.
 * Raw DB errors are never echoed — detail is routed through the observability
 * seam and a generic message is returned.
 */
import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getSite } from "@/lib/sites";
import { getScoreTrend } from "@/lib/scans";
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
    const trend = await getScoreTrend(supabase, id);
    return NextResponse.json({ trend });
  } catch (e) {
    captureError(e, { route: "sites/[id]/scan-trend" });
    return NextResponse.json({ error: "failed to load scan trend" }, { status: 500 });
  }
}
