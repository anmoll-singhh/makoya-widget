/**
 * /api/sites/[id]/analytics — AUTHED, owner-only widget-usage analytics (GET).
 *
 * Powers the v3.1 Analytics screen. Mirrors the auth+ownership discipline of
 * /api/sites/[id]/config: 401 with no session; 404 when the site doesn't exist
 * or isn't the caller's (RLS already scopes the rollup read to the owner — the
 * ownership check just turns a not-found into a clean 404 rather than an empty
 * 200, and avoids confirming foreign site ids).
 *
 * `?days=` selects the window (default 30, clamped 1..365). The cookie-bound
 * client is passed straight through so RLS enforces tenancy on the read.
 */
import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getSite } from "@/lib/sites";
import { getWidgetAnalytics } from "@/lib/analytics";

const DEFAULT_DAYS = 30;
const MIN_DAYS = 1;
const MAX_DAYS = 365;

function parseDays(raw: string | null): number {
  const n = raw ? Number(raw) : DEFAULT_DAYS;
  if (!Number.isFinite(n)) return DEFAULT_DAYS;
  return Math.min(MAX_DAYS, Math.max(MIN_DAYS, Math.floor(n)));
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const days = parseDays(new URL(req.url).searchParams.get("days"));

  try {
    const analytics = await getWidgetAnalytics(supabase, id, days);
    return NextResponse.json(analytics);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "failed to load analytics" }, { status: 500 });
  }
}
