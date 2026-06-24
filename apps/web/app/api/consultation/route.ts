/**
 * /api/consultation — authed: an owner requests a full report / books a call for
 * one of THEIR sites. Ownership is verified against the auth user before any
 * write. The request body is validated with a Zod schema so we never index into
 * untyped input; failures return a generic 400 with no field-level detail.
 */

import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getSite } from "@/lib/sites";
import { getLatestScan, createConsultationRequest } from "@/lib/scans";
import { parseBody, consultationBodySchema } from "@/lib/validation/api";

export async function POST(req: Request) {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const parsed = parseBody(consultationBodySchema, json);
  if (!parsed.ok) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
  const siteId = parsed.data.siteId;
  // Default preserved: anything other than an explicit "book_call" is a full report.
  const type = parsed.data.type === "book_call" ? "book_call" : "full_report";

  const site = await getSite(supabase, siteId);
  if (!site || site.ownerId !== user.id) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const latest = await getLatestScan(supabase, siteId);
  // RLS makes consultation_requests service-role only; insert with admin client AFTER ownership check.
  await createConsultationRequest(getAdminSupabase(), { siteId, scanId: latest?.id ?? null, type });
  return NextResponse.json({ ok: true });
}
