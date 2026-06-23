/**
 * /api/public-scan — the PUBLIC, unauthenticated WCAG scan endpoint.
 *
 * This powers the top of the sales funnel: a visitor pastes a URL on /scan, we
 * run a real axe-core scan and hand back a score + the worst issues in plain
 * English. No email is required to see the result — the email gate (which
 * creates a lead via /api/scan-ingest) comes AFTER, once they've seen value.
 *
 * Why this is separate from /api/scan (the authed route):
 *  - /api/scan is for signed-in owners scanning THEIR OWN registered sites; it
 *    persists the scan via `runAndStoreScan` and is cached per-site.
 *  - This route is for arbitrary public URLs typed by anonymous visitors. We
 *    deliberately DO NOT store the scan (no row, no scanId) — public scans are
 *    ephemeral. We only ever persist a `lead` later, and only with consent
 *    (the visitor entering their email on the next step).
 *
 * Security posture (public + unauthenticated → treat every input as hostile):
 *  1. SSRF: `isPublicHttpUrl` (string/AST gate) AND `validateScanUrl`
 *     (normalisation + canonical AppError) both run before the browser opens a
 *     single connection. Either rejecting → 400. We never let the engine touch a
 *     localhost / private / link-local / `.local` / non-http(s) target.
 *  2. Rate limit: crude per-instance IP throttle (same pattern as scan-ingest).
 *  3. Error opacity: we NEVER echo the engine error text back to the caller —
 *     it embeds the target URL and would turn the scanner into an SSRF/port-scan
 *     oracle (timeout vs connection-refused reveals what's reachable). We return
 *     a generic message + a safe machine `code`, exactly like /api/scan does.
 *
 * Honest copy: this endpoint reports real issues and a score. It NEVER claims
 * the site is "WCAG compliant", "ADA compliant", or "guaranteed" anything.
 */

import { NextResponse } from "next/server";
import { runScan } from "@/lib/scanner";
import { buildReport } from "@/lib/scanner/report-builder";
import { topPlainIssues } from "@/lib/scanner/plain-language";
import { validateScanUrl, sanitiseUrl } from "@/lib/utils/url";
import { isPublicHttpUrl } from "@/lib/scan-utils/public-url";
import { track, captureError } from "@/lib/observability";
import { isAppError } from "@/lib/utils/error";

// The real scan needs the Node runtime (Chromium) and the full Vercel budget.
export const runtime = "nodejs";
export const maxDuration = 60;

// ── crude per-instance rate limit ──────────────────────────────────────────
// Mirrors /api/scan-ingest. Good enough to stop accidental floods in the demo;
// replace with a durable cross-instance limiter (Upstash) when hardening. The
// limit is tighter here than scan-ingest because each call spins up a browser.
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 5;
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

export async function POST(req: Request): Promise<NextResponse> {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many scans from this connection. Please wait a minute and try again." },
      { status: 429 }
    );
  }

  let body: { url?: unknown };
  try {
    body = (await req.json()) as { url?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // ── SSRF gate (layer 1): cheap string/AST predicate, never throws ──────────
  if (!isPublicHttpUrl(body?.url)) {
    return NextResponse.json(
      { error: "Enter a public website address (e.g. example.com).", code: "INVALID_URL" },
      { status: 400 }
    );
  }

  // ── SSRF gate (layer 2) + normalisation ────────────────────────────────────
  // validateScanUrl also normalises (adds https://, strips creds) and is the
  // shared choke-point used by the authed scan path, so both agree on policy.
  let url: string;
  try {
    url = sanitiseUrl(validateScanUrl(body.url as string));
  } catch (e) {
    const code = isAppError(e) ? e.code : "INVALID_URL";
    return NextResponse.json(
      { error: "That address can't be scanned. Try a public website like example.com.", code },
      { status: 400 }
    );
  }

  track("scan_started", { source: "public" });

  // ── Run the real scan (NOT stored — public scans are ephemeral) ────────────
  try {
    const raw = await runScan({
      url,
      wcagLevel: "AA",
      timeoutMs: 30_000,
      scanInternalLinks: false,
    });
    const report = buildReport(raw, url);

    track("scan_completed", { source: "public", score: report.score, total: report.totals.total });

    return NextResponse.json({
      score: report.score,
      totals: report.totals,
      finalUrl: report.url,
      isPartialScan: report.isPartialScan ?? false,
      // Top 5 worst issues, already plain-English and severity-ordered.
      topIssues: topPlainIssues(report, 5).map((i) => ({
        id: i.id,
        impact: i.impact,
        help: i.title,
        whatItMeans: i.whatItMeans,
        whoItAffects: i.whoItAffects,
      })),
    });
  } catch (e) {
    // Generic message ONLY. Echoing the engine error would leak the target URL
    // and act as an SSRF/port-scan oracle. The machine code is safe to surface
    // (e.g. SCAN_TIMEOUT, PAGE_LOAD_FAILED) so the UI can tailor its hint.
    captureError(e, { route: "public-scan" });
    const code = isAppError(e) ? e.code : "INTERNAL_SERVER_ERROR";
    return NextResponse.json(
      { error: "We couldn't scan that site right now. Check the address and try again.", code },
      { status: 502 }
    );
  }
}
