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
import { lookup } from "node:dns/promises";
import { runScan } from "@/lib/scanner";
import { buildReport } from "@/lib/scanner/report-builder";
import { topPlainIssues } from "@/lib/scanner/plain-language";
import { validateScanUrl, sanitiseUrl } from "@/lib/utils/url";
import { isPublicHttpUrl, anyDisallowedAddress } from "@/lib/scan-utils/public-url";
import { parseBody, publicScanBodySchema } from "@/lib/validation/api";
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

/**
 * Resolve `host` via DNS and return true if ANY resolved address is private/
 * internal — the defence against DNS rebinding that the string-only gates can't
 * provide. Fail-closed: a lookup failure (NXDOMAIN, etc.) returns `true`, since
 * a host we can't safely resolve must never be scanned. Never throws.
 *
 * We deliberately return only a boolean — the caller emits a GENERIC error so we
 * never reveal WHY a host was rejected (no internal-vs-external SSRF oracle).
 */
async function resolvesToDisallowed(host: string): Promise<boolean> {
  try {
    const addrs = await lookup(host, { all: true });
    return anyDisallowedAddress(addrs);
  } catch {
    return true; // unresolvable → fail closed
  }
}

export async function POST(req: Request): Promise<NextResponse> {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many scans from this connection. Please wait a minute and try again." },
      { status: 429 }
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // ── Schema gate: reject malformed bodies before any SSRF/scan work ──────────
  const parsed = parseBody(publicScanBodySchema, json);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Enter a public website address (e.g. example.com).", code: "INVALID_URL" },
      { status: 400 }
    );
  }

  // ── SSRF gate (layer 1): cheap string/AST predicate, never throws ──────────
  if (!isPublicHttpUrl(parsed.data.url)) {
    return NextResponse.json(
      { error: "Enter a public website address (e.g. example.com).", code: "INVALID_URL" },
      { status: 400 }
    );
  }

  // ── SSRF gate (layer 2) + normalisation ────────────────────────────────────
  // validateScanUrl also normalises (adds https://, strips creds) and is the
  // shared choke-point used by the authed scan path, so both agree on policy.
  let parsedUrl: URL;
  try {
    parsedUrl = validateScanUrl(parsed.data.url);
  } catch (e) {
    const code = isAppError(e) ? e.code : "INVALID_URL";
    return NextResponse.json(
      { error: "That address can't be scanned. Try a public website like example.com.", code },
      { status: 400 }
    );
  }
  const url = sanitiseUrl(parsedUrl);

  // ── SSRF gate (layer 3): resolved-IP check (DNS-rebinding defence) ──────────
  // The string gates can't see that a public hostname resolves to a private IP.
  // We resolve here and reject if ANY address is internal. Generic error only —
  // never reveal that the host was internal (no SSRF oracle).
  if (await resolvesToDisallowed(parsedUrl.hostname)) {
    return NextResponse.json(
      { error: "That address can't be scanned. Try a public website like example.com.", code: "INVALID_URL" },
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

    // ── Post-redirect re-validation (DNS-rebinding via redirect) ──────────────
    // The engine may have followed redirects to a different host than the one we
    // resolved above. If the FINAL host resolves to an internal address, discard
    // the result rather than return data harvested from an internal target.
    // Generic error only — never reveal where the redirect landed.
    try {
      const finalHost = new URL(report.url).hostname;
      if (finalHost && finalHost !== parsedUrl.hostname && (await resolvesToDisallowed(finalHost))) {
        return NextResponse.json(
          { error: "That address can't be scanned. Try a public website like example.com.", code: "INVALID_URL" },
          { status: 400 }
        );
      }
    } catch {
      // If report.url isn't parseable we simply skip this extra check; the
      // pre-scan gates already cleared the original target.
    }

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
        disabilityGroups: i.disabilityGroups,
        howToFix: i.howToFix,
        measuredEvidence: i.measuredEvidence,
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
