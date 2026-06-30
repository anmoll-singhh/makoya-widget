/**
 * lib/widget-cors.ts
 *
 * Shared CORS + origin helpers for the PUBLIC widget POST routes
 * (`/api/widget-feedback`, `/api/widget-simplify`). These endpoints are called
 * by the embeddable widget running on arbitrary customer domains, so:
 *
 *  1. They MUST answer the browser's `OPTIONS` preflight and emit CORS headers,
 *     or the call is blocked before it reaches us.
 *  2. They do a BEST-EFFORT origin check against the site's registered domain
 *     allowlist — the same lenient policy as `/api/config/[siteId]` (Origin is
 *     attacker-spoofable outside a real browser, so this is deterrence, not a
 *     cryptographic wall; the rate-limit + service-role writes are the real
 *     guardrails).
 *
 * Policy (mirrors the config route's `isAllowedDomain`):
 *   - empty allowlist (site not yet configured) → allow (lenient),
 *   - non-empty allowlist + missing Origin → block (a real browser always sends
 *     Origin on a cross-origin fetch, so a missing one is a non-browser client),
 *   - otherwise the Origin host must be explicitly listed.
 */

/** Reflect the caller's Origin (or `*`) so the browser accepts the response. */
export function corsHeaders(origin: string | null): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    Vary: "Origin",
  };
}

/** Origin header → bare lowercase hostname, null-safe. */
export function hostFromOrigin(origin: string | null): string | null {
  if (!origin) return null;
  try {
    return new URL(origin).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/** Best-effort domain deterrence; see policy in the file header. */
export function isAllowedOrigin(origin: string | null, allowed: string[]): boolean {
  if (allowed.length === 0) return true; // not configured yet → lenient
  const host = hostFromOrigin(origin);
  if (!host) return false; // non-empty allowlist + no/garbled Origin → block
  return allowed.includes(host);
}
