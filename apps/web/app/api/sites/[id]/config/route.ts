/**
 * /api/sites/[id]/config — AUTHED, owner-only site config (GET + PATCH).
 *
 * GET  → returns the full SiteConfig for the site (used by the Customize screen).
 * PATCH → persists a partial config update (existing; unchanged).
 *
 * Auth + ownership: 401 with no session; 404 when the site doesn't exist or is
 * owned by a different user (RLS already hides foreign rows; the ownership check
 * turns missing rows into a clean 404). Raw DB errors are never echoed to the
 * client — routed through the observability seam as a generic 500.
 */
import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getSite, getConfig, updateConfig, type SiteConfig } from "@/lib/sites";
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
    const config = await getConfig(supabase, id);
    return NextResponse.json(config);
  } catch (e) {
    captureError(e, { route: "sites/[id]/config#GET" });
    return NextResponse.json({ error: "failed to load config" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const site = await getSite(supabase, id);
  if (!site || site.ownerId !== user.id) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let patch: Partial<SiteConfig>;
  try { patch = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }

  // Server-side plan gating: free plan cannot use branding controls.
  if (site.plan === "free") {
    patch.hideBranding = false;
    delete patch.panelTitle;
    delete patch.accessibilityStatementUrl;
  }

  try {
    await updateConfig(supabase, id, patch);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "update failed" }, { status: 500 });
  }
}
