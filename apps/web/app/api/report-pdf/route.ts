/**
 * /api/report-pdf — PUBLIC endpoint that turns a scan result into a PDF.
 *
 * The /scan page already holds the result of /api/public-scan in client state.
 * Rather than re-running an (expensive, browser-spinning) scan, it POSTs that
 * result here and we render a branded, HONEST PDF the visitor can download.
 *
 * Security posture (public + unauthenticated → treat input as hostile):
 *  - This route does NOT scan, fetch, or open any URL — it only formats data the
 *    caller already has. So there is no SSRF surface; `url` is treated as an
 *    opaque, length-capped label (validated to be http(s) for display sanity).
 *  - DoS guard: the caller controls the payload, and PDF rendering is CPU/memory
 *    work. We cap the issue count and clip every string (in report-content.ts),
 *    reject oversized bodies, and rate-limit per IP.
 *  - No data leakage: we never read the DB here and never echo internal errors.
 *
 * Honest copy: all PDF text comes from buildReportContent(), which a unit test
 * forbids from making compliance/guarantee claims.
 */

import { NextResponse } from "next/server";
import { renderReportPdf, reportFilename } from "@/lib/pdf/render-report";
import type { ReportPdfInput, ReportPdfIssue } from "@/lib/pdf/report-content";
import { captureError } from "@/lib/observability";
import { parseBody, reportPdfBodySchema } from "@/lib/validation/api";
import { checkRateLimit } from "@/lib/rate-limit";

// @react-pdf/renderer is Node-only.
export const runtime = "nodejs";
export const maxDuration = 30;

// ── rate limit (durable, cross-instance via Upstash) ───────────────────────
// PDF rendering is CPU/memory work, so this PUBLIC route is throttled per IP.
// Delegated to lib/rate-limit.ts (shared Upstash counter when configured, else
// in-memory) with its own "report-pdf" namespace so its budget is independent of
// the scan/ingest routes. Limit preserved at 20/min.
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 20;

// Hard ceiling on the raw body so a giant payload can't exhaust memory before
// we even parse it. A legitimate report is a few KB.
const MAX_BODY_BYTES = 64 * 1024;
const MAX_ISSUES_IN = 60;

function sanitizeIssues(raw: unknown): ReportPdfIssue[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, MAX_ISSUES_IN).map((r) => {
    const o = (r ?? {}) as Record<string, unknown>;
    return {
      id: typeof o.id === "string" ? o.id : "",
      impact: (o.impact ?? null) as ReportPdfIssue["impact"], // re-validated in buildReportContent
      help: typeof o.help === "string" ? o.help : "",
      whatItMeans: typeof o.whatItMeans === "string" ? o.whatItMeans : "",
      whoItAffects: typeof o.whoItAffects === "string" ? o.whoItAffects : "",
      disabilityGroups: Array.isArray(o.disabilityGroups)
        ? o.disabilityGroups.filter((g): g is string => typeof g === "string")
        : undefined,
      howToFix: typeof o.howToFix === "string" ? o.howToFix : undefined,
      measuredEvidence: typeof o.measuredEvidence === "string" ? o.measuredEvidence : undefined,
    };
  });
}

export async function POST(req: Request): Promise<NextResponse> {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (await checkRateLimit(ip, { name: "report-pdf", limit: RATE_MAX, windowMs: RATE_WINDOW_MS })) {
    return NextResponse.json({ error: "Too many requests. Please wait a minute." }, { status: 429 });
  }

  // Reject oversized bodies early when the client declares a length.
  const declaredLen = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLen) && declaredLen > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large." }, { status: 413 });
  }

  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large." }, { status: 413 });
  }

  let json: unknown;
  try {
    json = JSON.parse(raw) as unknown;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // ── Schema gate (incl. server-side email gate) ─────────────────────────────
  // The PDF is the lead magnet: it cannot be downloaded without an email, and a
  // valid scanned http(s) URL is required. Enforcing both in the schema means the
  // gate can't be bypassed by calling the API directly — we don't trust the
  // client to self-gate. Generic error only; no field-level detail leaks.
  const parsed = parseBody(reportPdfBodySchema, json);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "An email address and a valid scanned URL are required to download the report." },
      { status: 400 }
    );
  }
  const { url, email, score, totals, topIssues, isPartialScan } = parsed.data;
  void email; // validated as the lead-magnet gate; not embedded in the PDF.

  // Everything below is clamped/coerced inside buildReportContent — we only need
  // to shape the input safely here.
  const input: ReportPdfInput = {
    url,
    score: typeof score === "number" ? score : 0,
    totals: (totals ?? {}) as ReportPdfInput["totals"],
    topIssues: sanitizeIssues(topIssues),
    isPartialScan: Boolean(isPartialScan),
  };

  try {
    const pdf = await renderReportPdf(input);
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${reportFilename(url)}"`,
        "Cache-Control": "no-store",
        "Content-Length": String(pdf.length),
      },
    });
  } catch (e) {
    captureError(e, { route: "report-pdf" });
    return NextResponse.json({ error: "We couldn't generate the PDF right now." }, { status: 500 });
  }
}
