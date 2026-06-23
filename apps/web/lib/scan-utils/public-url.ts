/**
 * lib/scan-utils/public-url.ts
 *
 * SSRF guard for the PUBLIC scanner endpoint (`/api/public-scan`).
 *
 * Why a second guard on top of `validateScanUrl`?
 * ───────────────────────────────────────────────
 * `lib/utils/url.ts#validateScanUrl` already rejects the classic private/
 * reserved ranges and non-http(s) protocols — and the public route DOES call it
 * (it is the single choke-point before the headless browser navigates). But the
 * public route is unauthenticated and internet-exposed, so we want a small,
 * dependency-free, *synchronously-testable* predicate that:
 *
 *   1. is a pure boolean (no throwing) so it can be unit-tested in isolation on
 *      a Windows box where the real Chromium scan cannot run, and
 *   2. closes two gaps the generic validator leaves open for a public funnel:
 *        • the `.local` mDNS suffix (and bare single-label hostnames that
 *          resolve on a LAN, e.g. `router`), and
 *        • bracketed/loopback IPv6 forms (`[::1]`, `::1`, `[::ffff:127.0.0.1]`).
 *
 * This is defence-in-depth, not a replacement: the route still calls
 * `validateScanUrl` for normalisation + the canonical AppError path. Keeping the
 * predicate here means both layers agree and the gap-closing rules have one home.
 *
 * NOTE on DNS rebinding: like `validateScanUrl`, this is a *string/AST* check on
 * the hostname, not a resolved-IP check. A determined attacker can still point a
 * public DNS name at a private IP. Network-level egress controls (VPC firewall,
 * blocked link-local metadata IP) remain the real backstop in production — this
 * is documented honestly so nobody mistakes it for complete protection.
 */

// ---------------------------------------------------------------------------
// Constants — mirror lib/utils/url.ts so the two layers can't drift apart.
// ---------------------------------------------------------------------------

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "0.0.0.0",
  "::1",
  "[::]",
  "[::1]",
  "metadata.google.internal", // GCP metadata endpoint
  "metadata", // bare-label form sometimes used internally
]);

/** Private / reserved IPv4 ranges (RFC 1918, RFC 3927, RFC 6598, loopback). */
const PRIVATE_IPV4_PATTERNS: RegExp[] = [
  /^127\./, // 127.0.0.0/8 loopback
  /^10\./, // 10.0.0.0/8
  /^192\.168\./, // 192.168.0.0/16
  /^172\.(1[6-9]|2\d|3[01])\./, // 172.16.0.0/12
  /^169\.254\./, // 169.254.0.0/16 link-local (incl. cloud metadata 169.254.169.254)
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, // 100.64.0.0/10 CGNAT
];

// ---------------------------------------------------------------------------
// Predicate
// ---------------------------------------------------------------------------

/**
 * Returns true only if `raw` is a syntactically-valid, public http(s) URL that
 * is safe to hand to the scanner. Never throws.
 *
 * Accepts bare domains ("example.com") by trying an `https://` prefix, matching
 * the UX affordance in `validateScanUrl` so the public page accepts the same
 * inputs the rest of the app does.
 *
 * Rejects:
 *  - non-string / empty / over-long input,
 *  - non-http(s) schemes (javascript:, file:, data:, ftp:, gopher:, …),
 *  - localhost / loopback / link-local / private / CGNAT IPv4,
 *  - loopback/unspecified IPv6 (`::1`, `::`, IPv4-mapped loopback),
 *  - the `.local` mDNS suffix and bare single-label hostnames (no dot),
 *  - cloud metadata hostnames.
 */
export function isPublicHttpUrl(raw: unknown): boolean {
  if (typeof raw !== "string") return false;
  const trimmed = raw.trim();
  if (trimmed === "" || trimmed.length > 2048) return false;

  let u: URL;
  try {
    u = new URL(trimmed);
  } catch {
    // Allow bare domains like "example.com" by retrying with a scheme — but a
    // value that already declared a non-http(s) scheme (e.g. "javascript:…")
    // parsed successfully above and is rejected on protocol, so we only reach
    // here for genuinely scheme-less input.
    try {
      u = new URL(`https://${trimmed}`);
    } catch {
      return false;
    }
  }

  // 1. Protocol allowlist.
  if (u.protocol !== "http:" && u.protocol !== "https:") return false;

  // 2. Hostname required.
  const host = u.hostname.toLowerCase();
  if (!host) return false;

  // 3. Explicit blocklist (exact hostnames).
  if (BLOCKED_HOSTNAMES.has(host)) return false;

  // 4. IPv6 loopback / unspecified, including bracketed and IPv4-mapped forms.
  //    URL.hostname strips the brackets, so we test the inner value.
  if (host === "::1" || host === "::" || host.includes("[")) return false;
  if (/^::ffff:127\./.test(host)) return false; // IPv4-mapped loopback
  if (/^(fc|fd)[0-9a-f]{2}:/.test(host)) return false; // fc00::/7 unique-local
  if (/^fe80:/.test(host)) return false; // link-local IPv6

  // 5. Private / reserved IPv4 ranges.
  if (PRIVATE_IPV4_PATTERNS.some((re) => re.test(host))) return false;

  // 6. mDNS `.local` suffix — resolves on the LAN, never a public site.
  if (host === "local" || host.endsWith(".local")) return false;

  // 7. Bare single-label hostnames (no dot) resolve via local search domains
  //    (e.g. "router", "intranet"). A real public site always has a TLD.
  if (!host.includes(".")) return false;

  return true;
}
