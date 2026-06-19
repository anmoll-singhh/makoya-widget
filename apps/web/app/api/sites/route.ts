import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { createSite } from "@/lib/sites";
import { validateScanUrl } from "@/lib/utils/url";

export async function POST(req: Request) {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { domain?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }
  const domain = typeof body?.domain === "string" ? body.domain.trim() : "";
  if (!domain) return NextResponse.json({ error: "domain required" }, { status: 400 });

  // SSRF + format guard at the source: reject internal/reserved/invalid hosts
  // so an unsafe domain is never stored or later scanned.
  try {
    validateScanUrl(domain);
  } catch {
    return NextResponse.json(
      { error: "Enter a valid public website domain (e.g. example.com)." },
      { status: 400 }
    );
  }

  try {
    const site = await createSite(supabase, user.id, domain);
    return NextResponse.json(site, { status: 201 });
  } catch {
    // Generic message — don't echo raw DB/library errors to the client.
    return NextResponse.json({ error: "Could not create the site. Please try again." }, { status: 500 });
  }
}
