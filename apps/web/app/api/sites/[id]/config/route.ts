import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getSite, updateConfig, type SiteConfig } from "@/lib/sites";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const site = await getSite(supabase, id);
  if (!site || site.ownerId !== user.id) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let patch: Partial<SiteConfig>;
  try { patch = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }

  // Server-side plan gating: free plan cannot hide branding.
  if (site.plan === "free") patch.hideBranding = false;

  try {
    await updateConfig(supabase, id, patch);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "update failed" }, { status: 500 });
  }
}
