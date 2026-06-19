import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { createSite } from "@/lib/sites";

export async function POST(req: Request) {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }
  const domain = typeof body?.domain === "string" ? body.domain.trim() : "";
  if (!domain) return NextResponse.json({ error: "domain required" }, { status: 400 });

  try {
    const site = await createSite(supabase, user.id, domain);
    return NextResponse.json(site, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "failed to create site" }, { status: 500 });
  }
}
