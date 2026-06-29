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
import { purgeSiteBundle } from "@/lib/config-cache";
import { captureError } from "@/lib/observability";
import { configPatchSchema } from "@/lib/validation/config-patch";
import { parseBody } from "@/lib/validation/api";

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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const site = await getSite(supabase, id);
  if (!site || site.ownerId !== user.id)
    return NextResponse.json({ error: "not found" }, { status: 404 });

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const parsed = parseBody(configPatchSchema, rawBody);
  if (!parsed.ok) return NextResponse.json({ error: "invalid config fields" }, { status: 400 });

  const patch = parsed.data as Partial<SiteConfig>;

  // Server-side plan gating: free plan cannot use branding controls.
  if (site.plan === "free") {
    patch.hideBranding = false;
    delete patch.panelTitle;
    delete patch.accessibilityStatementUrl;
  }

  try {
    await updateConfig(supabase, id, patch);
    // Invalidate the public config cache so the widget picks up the edit on the
    // next load (one-hop propagation). Best-effort: purge never throws, and the
    // 300s TTL is the backstop if it somehow no-ops.
    await purgeSiteBundle(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    captureError(e, { route: "sites/[id]/config#PATCH" });
    return NextResponse.json({ error: "update failed" }, { status: 500 });
  }
}
