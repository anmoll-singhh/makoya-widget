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

// ---------------------------------------------------------------------------
// Resolved-IP SSRF classifier (defence against DNS rebinding)
// ---------------------------------------------------------------------------
//
// `isPublicHttpUrl` is a string/AST check: it cannot see that a perfectly public
// hostname (`evil.example.com`) resolves to a private/internal IP. That is the
// DNS-rebinding gap. The scan path closes it by performing its OWN DNS lookup
// (`dns.promises.lookup(host, { all: true })`) and passing every resolved
// address through these pure, synchronous predicates BEFORE the browser opens a
// connection — and again after redirects where feasible.
//
// Everything below is deliberately:
//   • PURE + SYNCHRONOUS  → unit-testable on any box, no network, no Chromium;
//   • FAIL-CLOSED         → anything we cannot confidently classify as public is
//                           treated as disallowed (return `true`), so a parsing
//                           gap never becomes an SSRF bypass.
//
// We classify (and therefore reject) the same families the hostname gate covers,
// but at the IP level: loopback, RFC-1918 private, link-local (incl. the cloud
// metadata IP 169.254.169.254), CGNAT, unspecified, IPv6 loopback/unspecified,
// unique-local (fc00::/7), link-local (fe80::/10), and the IPv4-mapped IPv6
// forms of any of the above (`::ffff:a.b.c.d` and its hex `::ffff:7f00:1` form).

/** True if a parsed IPv4 octet quad falls in a disallowed range. */
function isDisallowedIpv4(parts: number[]): boolean {
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return true; // malformed → fail closed
  }
  const [a, b] = parts;
  if (a === 0) return true; // 0.0.0.0/8 "this network" / unspecified
  if (a === 127) return true; // 127.0.0.0/8 loopback
  if (a === 10) return true; // 10.0.0.0/8 private
  if (a === 192 && b === 168) return true; // 192.168.0.0/16 private
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 private
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local (metadata)
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
  return false;
}

/** Parse a dotted-quad string to octets, or null if it isn't a clean IPv4. */
function parseIpv4(s: string): number[] | null {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(s);
  if (!m) return null;
  const parts = [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])];
  if (parts.some((n) => n > 255)) return null;
  return parts;
}

/**
 * Classifies a single resolved IP (v4 or v6) as disallowed for the scanner.
 * PURE + SYNCHRONOUS + FAIL-CLOSED: anything not provably a public address
 * returns `true`. Never throws.
 *
 * This is the resolved-IP backstop for DNS rebinding — call it on EVERY address
 * returned by `dns.promises.lookup(host, { all: true })`.
 */
export function isDisallowedIp(ip: unknown): boolean {
  if (typeof ip !== "string") return true;
  let s = ip.trim().toLowerCase();
  if (s === "") return true;

  // Strip surrounding brackets and an IPv6 zone id (e.g. "fe80::1%eth0").
  s = s.replace(/^\[|\]$/g, "");
  const pct = s.indexOf("%");
  if (pct !== -1) s = s.slice(0, pct);

  // ── Pure IPv4 ──────────────────────────────────────────────────────────────
  const v4 = parseIpv4(s);
  if (v4) return isDisallowedIpv4(v4);

  // ── IPv6 ─────────────────────────────────────────────────────────────────
  if (s.includes(":")) {
    // Loopback / unspecified in any compressed or expanded spelling.
    if (s === "::1" || s === "::") return true;
    if (/^(0:){7}0$/.test(s)) return true; // 0:0:0:0:0:0:0:0
    if (/^(0:){7}0*1$/.test(s)) return true; // 0:0:0:0:0:0:0:1

    // IPv4-mapped / IPv4-compatible: "::ffff:a.b.c.d" (and "::a.b.c.d").
    // Extract the trailing dotted-quad and classify it as IPv4.
    const mapped = /:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/.exec(s);
    if (mapped) {
      const inner = parseIpv4(mapped[1]);
      return inner ? isDisallowedIpv4(inner) : true;
    }

    // Hex-encoded IPv4-mapped form, e.g. "::ffff:7f00:0001" == 127.0.0.1.
    const hexMapped = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(s);
    if (hexMapped) {
      const hi = parseInt(hexMapped[1], 16);
      const lo = parseInt(hexMapped[2], 16);
      const quad = [(hi >> 8) & 0xff, hi & 0xff, (lo >> 8) & 0xff, lo & 0xff];
      return isDisallowedIpv4(quad);
    }

    // Unique-local fc00::/7 (fc.. and fd..).
    if (/^f[cd][0-9a-f]{2}:/.test(s)) return true;
    // Link-local fe80::/10 (fe80.. through febf..).
    if (/^fe[89ab][0-9a-f]:/.test(s)) return true;

    // A syntactically plausible global IPv6 address — allow it. We do a light
    // sanity check that it only contains hex groups / "::" so junk fails closed.
    if (/^[0-9a-f:]+$/.test(s) && (s.includes("::") || s.split(":").length === 8)) {
      return false;
    }
    return true; // anything else with a colon → fail closed
  }

  // Not parseable as v4 or v6 → fail closed.
  return true;
}

/**
 * True if ANY address in a `dns.lookup(host, { all: true })` result is
 * disallowed. An EMPTY list also fails closed (a host that resolves to nothing
 * should never be scanned). Use this to reject the moment one resolved address
 * is internal — the core DNS-rebinding defence.
 */
export function anyDisallowedAddress(addresses: ReadonlyArray<{ address: string }>): boolean {
  if (!Array.isArray(addresses) || addresses.length === 0) return true;
  return addresses.some((a) => isDisallowedIp(a?.address));
}
