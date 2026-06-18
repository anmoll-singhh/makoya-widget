/**
 * POST /api/scan-ingest
 * Called by the public scanner after a scan + email capture. Stores the scan
 * and creates a lead. THIS is the funnel join between scanner and dashboard.
 *
 * Body: { url, email, score, totals, siteId? }
 * REQUIRED_MANUAL_SETUP (email follow-up): RESEND_API_KEY to send the report
 * + day-2 follow-up. Get it at resend.com → API Keys.
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }
  const { url, email, score, totals, siteId = null } = body;
  if (!url || typeof score !== "number" || !totals) {
    return NextResponse.json({ error: "url, score, totals required" }, { status: 400 });
  }
  const scan = await db.addScan({ siteId, url, score, totals });
  let lead = null;
  if (email) lead = await db.addLead({ email, url, scanId: scan.id });

  // REQUIRED_MANUAL_SETUP: if (process.env.RESEND_API_KEY && email) send report email here.
  return NextResponse.json({ ok: true, scanId: scan.id, leadId: lead?.id ?? null });
}
