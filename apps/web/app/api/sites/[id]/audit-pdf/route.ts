/**
 * /api/sites/[id]/audit-pdf — AUTHED, owner-only PDF of the latest Full Audit (GET).
 *
 * Builds the honesty-guarded report content from the `scan_audits` sidecar and
 * streams a branded PDF as an attachment download. Same auth discipline as the
 * other /api/sites/[id]/* routes (401 / 404 / 404 no_audit). @react-pdf/renderer
 * is Node-only, so this route stays on the Node runtime.
 */
import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getSite } from "@/lib/sites";
import { getLatestAudit } from "@/lib/audits";
import { buildAuditReport } from "@/lib/audit/audit-content";
import { renderAuditPdf, auditFilename } from "@/lib/pdf/render-audit";
import { captureError } from "@/lib/observability";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

  let audit;
  try {
    audit = await getLatestAudit(supabase, id);
  } catch (e) {
    captureError(e, { route: "sites/[id]/audit-pdf", step: "getLatestAudit" });
    return NextResponse.json({ error: "failed to load audit" }, { status: 500 });
  }
  if (!audit) return NextResponse.json({ error: "no_audit" }, { status: 404 });

  try {
    const content = buildAuditReport({
      url: audit.detail.url,
      score: audit.detail.score,
      scannedAt: audit.detail.scannedAt,
      rules: audit.detail.rules,
    });
    const pdf = await renderAuditPdf(content);
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${auditFilename(audit.detail.url)}"`,
        "Cache-Control": "no-store",
        "Content-Length": String(pdf.length),
      },
    });
  } catch (e) {
    captureError(e, { route: "sites/[id]/audit-pdf", step: "renderAuditPdf" });
    return NextResponse.json({ error: "failed to generate PDF" }, { status: 500 });
  }
}
