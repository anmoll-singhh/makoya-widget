/**
 * /api/sites/[id]/report-pdf — AUTHED, owner-only PDF download for a site's
 * latest scan (GET).
 *
 * WHY THIS EXISTS:
 *   The existing /api/report-pdf route is a public lead-magnet endpoint that
 *   requires an email address and accepts the full scan payload from the client.
 *   Dashboard users are already authenticated and should not need to re-supply
 *   scan data — they just want to download a report for their site. This route
 *   fetches the latest stored scan from the DB (server-side, owner-scoped via
 *   RLS), renders the PDF, and streams the bytes back as a download.
 *
 * AUTH / SECURITY:
 *   Same pattern as all /api/sites/[id]/* routes:
 *     - 401 → no session.
 *     - 404 → site doesn't exist OR isn't owned by the caller (avoids confirming
 *              foreign site ids; RLS already enforces tenancy on the DB reads).
 *     - 404 with { error: "no_scan" } → site exists but has no scan yet. The
 *              client uses this specific code to show an honest "no data yet"
 *              disabled state rather than a generic error.
 *     - 500 → DB or PDF rendering failure (detail goes to captureError / Sentry,
 *              never echoed to the client).
 *   Service key is NEVER used here — the cookie-bound authed client is sufficient
 *   for reads (RLS scopes every row to the owner).
 *
 * PDF CONTRACT:
 *   Calls renderReportPdf() (lib/pdf/render-report.ts) with data derived from
 *   the latest scan row. Input shape:
 *     { url, score, totals, topIssues: ReportPdfIssue[], isPartialScan }
 *   topIssues are flattened from the stored grouped issues object
 *   ({ critical, serious, moderate, minor }), severity order maintained.
 *   The same content honesty rules apply as the public route (no compliance
 *   claims, measured facts only). maxDuration is 30 s (same as the public route).
 *
 * DOWNLOAD CONTRACT:
 *   Returns Content-Type: application/pdf + Content-Disposition: attachment.
 *   The client does: fetch → blob → URL.createObjectURL → <a download>.click()
 *   → URL.revokeObjectURL. This keeps the download fully same-origin and avoids
 *   opening a new tab (which would be blocked by pop-up blockers anyway).
 */

import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getSite } from "@/lib/sites";
import { getLatestScan } from "@/lib/scans";
import { renderReportPdf, reportFilename } from "@/lib/pdf/render-report";
import { captureError } from "@/lib/observability";
import type { ReportPdfIssue } from "@/lib/pdf/report-content";
import type { AccessibilityReport } from "@/types";

// @react-pdf/renderer is Node-only — keep this route off the edge runtime.
export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Flattens the stored grouped-issues shape into the ordered flat array that
 * renderReportPdf expects. Severity order (critical → serious → moderate →
 * minor) is preserved so the most impactful issues appear first in the PDF.
 */
function flattenIssuesToPdf(
  issues: AccessibilityReport["issues"],
): ReportPdfIssue[] {
  const ORDER = ["critical", "serious", "moderate", "minor"] as const;
  const out: ReportPdfIssue[] = [];
  for (const sev of ORDER) {
    for (const issue of issues?.[sev] ?? []) {
      out.push({
        id: issue.id,
        impact: issue.impact,
        help: issue.help,
        whatItMeans: issue.whyItMatters ?? "",
        whoItAffects: issue.whoItAffects ?? "",
        disabilityGroups: issue.disabilityGroups,
        howToFix: issue.howToFix,
        measuredEvidence: issue.measuredEvidence,
      });
    }
  }
  return out;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await getServerSupabase();

  // ── Auth gate ────────────────────────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // ── Ownership gate (RLS already prevents cross-tenant reads; this converts
  //    "not found or not mine" into a clean 404 without leaking site ids) ───
  const site = await getSite(supabase, id);
  if (!site || site.ownerId !== user.id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // ── Fetch latest scan ─────────────────────────────────────────────────────
  let scan;
  try {
    scan = await getLatestScan(supabase, id);
  } catch (e) {
    captureError(e, { route: "sites/[id]/report-pdf", step: "getLatestScan" });
    return NextResponse.json(
      { error: "failed to load scan data" },
      { status: 500 },
    );
  }

  if (!scan) {
    // Honest: the site exists but has never been scanned. The client should
    // show a "no scan yet" state rather than a generic error.
    return NextResponse.json(
      { error: "no_scan" },
      { status: 404 },
    );
  }

  // ── Render PDF ────────────────────────────────────────────────────────────
  try {
    const pdf = await renderReportPdf({
      url: scan.url,
      score: scan.score,
      totals: scan.totals,
      topIssues: flattenIssuesToPdf(scan.issues),
      isPartialScan: scan.issues == null, // defensive: treat missing issues as partial
    });

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        // attachment forces a Save-As / download rather than inline rendering.
        "Content-Disposition": `attachment; filename="${reportFilename(scan.url)}"`,
        "Cache-Control": "no-store",
        "Content-Length": String(pdf.length),
      },
    });
  } catch (e) {
    captureError(e, { route: "sites/[id]/report-pdf", step: "renderReportPdf" });
    return NextResponse.json(
      { error: "failed to generate PDF" },
      { status: 500 },
    );
  }
}
