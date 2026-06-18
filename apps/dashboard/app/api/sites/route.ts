import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { domain } = await req.json();
  if (!domain) return NextResponse.json({ error: "domain required" }, { status: 400 });
  const site = await db.createSite(session.email, domain);
  return NextResponse.json(site);
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const site = await db.getSite(id);
  if (!site || site.ownerEmail !== session.email) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const patch = await req.json();
  // Enforce server-side: free plan cannot hide branding.
  if (site.plan === "free") patch.hideBranding = false;
  await db.updateConfig(id, patch);
  // REQUIRED_MANUAL_SETUP (prod): after save, purge the CDN cache for /config/{id}.json
  return NextResponse.json({ ok: true });
}
