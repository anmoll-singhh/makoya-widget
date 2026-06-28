/**
 * /api/sites/[id]/verify-install — AUTHED, owner-only live installation check (GET).
 *
 * WHY THIS EXISTS:
 *   The install-status route reports whether the widget has phoned home via
 *   heartbeat. This route takes a more direct approach: it fetches the site's
 *   registered domain over https and inspects the returned HTML to determine
 *   whether the Makoya loader snippet is present in the page source.
 *
 *   This catches the case where the owner pasted the snippet but the widget
 *   hasn't yet sent its first heartbeat ping (typical in the first few minutes
 *   after install), giving the owner faster feedback than waiting for a ping.
 *
 * SSRF PREVENTION:
 *   We NEVER accept a URL from the client. Instead we read the domain from the
 *   SITE RECORD in the database (the same domain the owner registered at site
 *   creation). We then run it through validateScanUrl() — the same SSRF guard
 *   used by the public scanner — before issuing the fetch. A domain like
 *   "localhost" or a private IP range that somehow made it into the DB cannot
 *   be used to probe internal infrastructure.
 *
 * AUTH / SECURITY:
 *   Same pattern as all /api/sites/[id]/* routes:
 *     - 401 → no session.
 *     - 404 → site doesn't exist OR isn't owned by the caller (avoids confirming
 *              foreign site IDs; RLS already enforces tenancy on DB reads).
 *     - 200 with installed:false → fetch succeeded but snippet not detected.
 *     - 500 → internal error (detail routed to captureError, never echoed to
 *              client).
 *
 * DETECTION (pure string/regex — no DOM, no eval, no trusted-types issues):
 *   1. A <script> tag whose src attribute contains "/widget/loader.js"
 *   2. A data-site attribute whose value exactly matches the site's ID
 *   3. (bonus) Presence of #makoya-widget-root marker in the HTML
 *   Both (1) and (2) must be present for installed:true. The exported
 *   detectMakoyaLoader() helper is the pure, unit-testable core of this logic.
 *
 * SAFETY GUARDS:
 *   - AbortController timeout: 10 s max.
 *   - Response size cap: first 512 KB only (avoids holding huge downloads).
 *   - Redirects followed (up to runtime default).
 *   - All exceptions caught; never throws a 500 with internal detail.
 *   - Fetched HTML treated as completely untrusted (no exec, no parse).
 */

import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getSite } from "@/lib/sites";
import { validateScanUrl } from "@/lib/utils/url";
import { captureError } from "@/lib/observability";

// Node-only runtime: the edge runtime's fetch doesn't honour all redirect
// modes and the AbortController timing differs. Keep consistent with the
// other /api/sites/[id]/* routes.
export const runtime = "nodejs";

/** Maximum bytes consumed from the target page. Keeps memory bounded. */
const MAX_BYTES = 512 * 1024; // 512 KB

/** Fetch timeout — gives slow sites a fair chance without blocking the UI. */
const FETCH_TIMEOUT_MS = 10_000;

// ---------------------------------------------------------------------------
// Pure detection helper (exported for unit tests)
// ---------------------------------------------------------------------------

/** Result of inspecting a page's raw HTML for the Makoya loader. */
export interface DetectResult {
  installed: boolean;
  reason: string;
  details: {
    loaderFound: boolean;
    siteIdMatch: boolean;
    widgetRootFound: boolean;
  };
}

/**
 * Inspects raw HTML text to determine whether the Makoya loader snippet is
 * present for `siteId`. This is the pure, testable core of the route — it has
 * no I/O and no side effects.
 *
 * Both (loaderFound && siteIdMatch) must be true for installed:true.
 * Detecting the loader without the right data-site gives an actionable
 * "data-site mismatch" reason rather than a generic "not found".
 *
 * siteId is regex-escaped before use so IDs containing regex metacharacters
 * (dots, plusses, etc.) are matched literally.
 */
export function detectMakoyaLoader(html: string, siteId: string): DetectResult {
  // Check 1: loader script tag — src contains "/widget/loader.js"
  const loaderFound = /\bsrc=["'][^"']*\/widget\/loader\.js["']/i.test(html);

  // Check 2: data-site attribute matching this site's ID exactly.
  // Escape the siteId so any regex metacharacters in the ID are literal.
  const escapedId = siteId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const siteIdMatch = new RegExp(`data-site=["']${escapedId}["']`, "i").test(html);

  // Check 3: widget root marker — bonus signal, present once the widget has
  // rendered on the page at least once (less reliable in static snapshots but
  // useful to surface in details so owners can diagnose caching issues).
  const widgetRootFound = /id=["']makoya-widget-root["']/i.test(html);

  if (loaderFound && siteIdMatch) {
    return {
      installed: true,
      reason: "installed ✓",
      details: { loaderFound, siteIdMatch, widgetRootFound },
    };
  }

  if (loaderFound && !siteIdMatch) {
    return {
      installed: false,
      reason: "found loader but data-site mismatch — check your snippet",
      details: { loaderFound, siteIdMatch, widgetRootFound },
    };
  }

  return {
    installed: false,
    reason: "loader script not found in page HTML",
    details: { loaderFound, siteIdMatch, widgetRootFound },
  };
}

// ---------------------------------------------------------------------------
// Route response shape
// ---------------------------------------------------------------------------

interface VerifyInstallResponse {
  installed: boolean;
  reason: string;
  checkedUrl: string;
  details?: DetectResult["details"];
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await getServerSupabase();

  // ── Auth gate ─────────────────────────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // ── Ownership gate ────────────────────────────────────────────────────────
  // RLS already hides other owners' rows; the explicit ownerId check converts
  // "not found OR not mine" into a clean 404 without leaking foreign site IDs.
  const site = await getSite(supabase, id);
  if (!site || site.ownerId !== user.id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // ── Domain presence check ─────────────────────────────────────────────────
  // If the owner hasn't set a real domain yet, return a friendly result rather
  // than an error — the UI can guide them to set it.
  const rawDomain = site.domain?.trim();
  if (!rawDomain || rawDomain === "example.com") {
    const body: VerifyInstallResponse = {
      installed: false,
      reason: "no domain set — update your site settings first",
      checkedUrl: "",
    };
    return NextResponse.json(body);
  }

  // ── Build + SSRF-validate the target URL ──────────────────────────────────
  // We construct the URL from the STORED domain (not from anything the client
  // sent). validateScanUrl() applies the same blocklist used by the public
  // scanner: localhost, loopback, RFC 1918 private ranges, cloud metadata
  // endpoints. This is defence-in-depth — the domain was already validated
  // on site creation, but belt-and-suspenders guards against stale DB state.
  let targetUrl: URL;
  try {
    // Prepend https:// — the domain column stores bare hostnames ("example.com")
    // not full URLs. validateScanUrl() handles this form.
    targetUrl = validateScanUrl(`https://${rawDomain}`);
  } catch {
    // validateScanUrl threw AppError — domain is private/reserved/invalid.
    const body: VerifyInstallResponse = {
      installed: false,
      reason: "domain is not a reachable public address",
      checkedUrl: `https://${rawDomain}`,
    };
    return NextResponse.json(body);
  }

  const checkedUrl = targetUrl.toString();

  // ── Fetch the page HTML ───────────────────────────────────────────────────
  let html: string;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch(checkedUrl, {
        signal: controller.signal,
        headers: {
          // Identify ourselves honestly so site owners see the crawler in
          // their access logs.
          "User-Agent": "Makoya-InstallVerifier/1.0 (+https://makoya.app/about)",
          Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        },
        redirect: "follow",
      });
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      const body: VerifyInstallResponse = {
        installed: false,
        reason: `site unreachable — HTTP ${res.status}`,
        checkedUrl,
      };
      return NextResponse.json(body);
    }

    // Read up to MAX_BYTES to keep memory bounded. Most pages are well under
    // this limit; very large pages are truncated (the snippet should appear
    // near </body> so it may be cut off — that's an edge case we note in the
    // details rather than silently claiming "not installed").
    const buf = await res.arrayBuffer();
    const slice = buf.byteLength <= MAX_BYTES ? buf : buf.slice(0, MAX_BYTES);
    html = new TextDecoder("utf-8", { fatal: false }).decode(slice);
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === "AbortError";
    const body: VerifyInstallResponse = {
      installed: false,
      reason: isTimeout
        ? `site unreachable — timed out after ${FETCH_TIMEOUT_MS / 1000} s`
        : "site unreachable — network or DNS error",
      checkedUrl,
    };
    return NextResponse.json(body);
  }

  // ── Inspect HTML ──────────────────────────────────────────────────────────
  // Use the pure detection helper — no I/O here, just pattern matching.
  try {
    const detect = detectMakoyaLoader(html, id);
    const body: VerifyInstallResponse = {
      installed: detect.installed,
      reason: detect.reason,
      checkedUrl,
      details: detect.details,
    };
    return NextResponse.json(body);
  } catch (err) {
    // Shouldn't throw, but if somehow it does, don't leak internals.
    captureError(err, { route: "sites/[id]/verify-install", step: "detect" });
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
