/**
 * /api/sites/[id]/audit — AUTHED, owner-only READ of the latest Full Audit (GET).
 *
 * Returns the built, honesty-guarded report content (buildAuditReport) assembled
 * from the `scan_audits` sidecar. The sidecar is self-contained (it stores the
 * scan's url/score/scannedAt alongside the per-rule rows), so the header and the
 * rows are provably from one page load — no scan join here.
 *
 * AUTH: 401 (no session), 404 (site not owned), 404 { error: "no_audit" } when
 * the site has never had a deep audit (the client shows a "run your first full
 * audit" state). Service key is never used — RLS scopes the read to the owner.
 */
import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getSite } from "@/lib/sites";
import { getLatestAudit } from "@/lib/audits";
import { buildAuditReport } from "@/lib/audit/audit-content";
import { captureError } from "@/lib/observability";

export const runtime = "nodejs";

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
    captureError(e, { route: "sites/[id]/audit", step: "getLatestAudit" });
    return NextResponse.json({ error: "failed to load audit" }, { status: 500 });
  }

  if (!audit) {
    return NextResponse.json({ error: "no_audit" }, { status: 404 });
  }

  const content = buildAuditReport({
    url: audit.detail.url,
    score: audit.detail.score,
    scannedAt: audit.detail.scannedAt,
    rules: audit.detail.rules,
  });

  return NextResponse.json({
    content,
    scanId: audit.scanId,
    generatedAt: audit.detail.generatedAt,
  });
}
