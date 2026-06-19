import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getSite } from "@/lib/sites";
import { getLatestScan, createConsultationRequest } from "@/lib/scans";

export async function POST(req: Request) {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { siteId?: string; type?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const siteId = body?.siteId;
  const type = body?.type === "book_call" ? "book_call" : "full_report";
  if (!siteId) return NextResponse.json({ error: "siteId required" }, { status: 400 });

  const site = await getSite(supabase, siteId);
  if (!site || site.ownerId !== user.id) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const latest = await getLatestScan(supabase, siteId);
  // RLS makes consultation_requests service-role only; insert with admin client AFTER ownership check.
  await createConsultationRequest(getAdminSupabase(), { siteId, scanId: latest?.id ?? null, type });
  return NextResponse.json({ ok: true });
}
