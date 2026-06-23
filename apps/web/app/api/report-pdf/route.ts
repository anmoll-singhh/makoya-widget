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
import { isValidEmail } from "@/lib/utils/email";

// @react-pdf/renderer is Node-only.
export const runtime = "nodejs";
export const maxDuration = 30;

// ── crude per-instance rate limit (mirrors the other public routes) ──────────
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 20;
const hits = new Map<string, { n: number; t: number }>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const cur = hits.get(key);
  if (!cur || now - cur.t > RATE_WINDOW_MS) {
    hits.set(key, { n: 1, t: now });
    return false;
  }
  cur.n++;
  return cur.n > RATE_MAX;
}

// Hard ceiling on the raw body so a giant payload can't exhaust memory before
// we even parse it. A legitimate report is a few KB.
const MAX_BODY_BYTES = 64 * 1024;
const MAX_ISSUES_IN = 60;

function isHttpUrl(v: unknown): v is string {
  if (typeof v !== "string" || v.length === 0 || v.length > 2048) return false;
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

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
    };
  });
}

export async function POST(req: Request): Promise<NextResponse> {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) {
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

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { url, email, score, totals, topIssues, isPartialScan } = body ?? {};

  // ── Email gate (server-side enforcement) ───────────────────────────────────
  // The PDF is the lead magnet: it cannot be downloaded without an email. The
  // /scan UI captures the lead (via /api/scan-ingest) before requesting the PDF;
  // enforcing it here too means the gate can't be bypassed by calling the API
  // directly. We don't trust the client to self-gate.
  if (!isValidEmail(email)) {
    return NextResponse.json(
      { error: "An email address is required to download the report." },
      { status: 400 }
    );
  }

  if (!isHttpUrl(url)) {
    return NextResponse.json({ error: "A valid scanned URL is required." }, { status: 400 });
  }

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
