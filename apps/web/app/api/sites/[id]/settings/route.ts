/**
 * /api/sites/[id]/settings — AUTHED, owner-only PRIVATE site settings (GET + PATCH).
 *
 * Powers the v3.1 Settings screen (#12): the operator's contact details +
 * notification preferences. These are ACCOUNT METADATA and must NEVER reach the
 * widget, so they live in their own `site_settings` table (see lib/site-settings.ts)
 * — the public /api/config/[siteId] endpoint never reads them.
 *
 * Auth + ownership discipline mirrors /api/sites/[id]/analytics and
 * /api/sites/[id]/config: 401 with no session; 404 when the site doesn't exist
 * or isn't the caller's. The cookie-bound (owner) client is passed straight
 * through so RLS enforces tenancy on the read AND the write.
 *
 * Errors are GENERIC (never echo a raw DB error — it can leak table/column
 * internals); detail is routed through the observability seam. A malformed PATCH
 * body is a generic 400 via `parseBody`, which drops Zod's field-level messages.
 */
import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getSite } from "@/lib/sites";
import { getSiteSettings, upsertSiteSettings } from "@/lib/site-settings";
import { parseBody } from "@/lib/validation/api";
import { siteSettingsPatchSchema } from "@/lib/validation/site-settings";
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
    const settings = await getSiteSettings(supabase, id);
    return NextResponse.json(settings);
  } catch (e) {
    captureError(e, { route: "sites/[id]/settings#GET" });
    return NextResponse.json({ error: "failed to load settings" }, { status: 500 });
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
  if (!site || site.ownerId !== user.id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  const parsed = parseBody(siteSettingsPatchSchema, raw);
  if (!parsed.ok) return NextResponse.json({ error: "bad request" }, { status: 400 });

  try {
    const settings = await upsertSiteSettings(supabase, id, parsed.data);
    return NextResponse.json(settings);
  } catch (e) {
    captureError(e, { route: "sites/[id]/settings#PATCH" });
    return NextResponse.json({ error: "failed to save settings" }, { status: 500 });
  }
}
