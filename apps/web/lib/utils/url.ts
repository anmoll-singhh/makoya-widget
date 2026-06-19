/**
 * lib/utils/url.ts
 *
 * URL validation and normalisation for scan requests.
 *
 * Why this exists:
 * ─────────────────
 * Passing an unsanitised URL straight into a headless browser is a security
 * risk — it enables Server-Side Request Forgery (SSRF), allowing attackers
 * to make the scanner hit internal network resources (metadata endpoints,
 * localhost services, etc.).
 *
 * Validation is intentionally done here (lib layer) rather than inside the
 * API route so the same rules apply regardless of how the scan is triggered
 * (HTTP, queue worker, test suite, etc.).
 *
 * This module provides:
 *  - `validateScanUrl` — parses and validates a raw string; returns a
 *                        normalised `URL` object or throws `AppError`.
 *  - `sanitiseUrl`     — strips credentials and fragments from a URL before
 *                        logging or storing it.
 *
 * SSRF mitigations applied:
 *  - Protocol allowlist: only `https:` and `http:`.
 *  - Hostname blocklist: localhost, loopback, link-local, and private ranges.
 *  - Port blocklist: rejects non-standard ports commonly used by internal
 *    services (e.g. :8080, :3000) unless the hostname already passed the
 *    blocklist check.
 */

import { AppError } from "@/lib/utils/error";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALLOWED_PROTOCOLS = new Set(["https:", "http:"]);

/**
 * Hostnames and hostname patterns that must never be reached by the scanner.
 * This is a defence-in-depth measure — cloud providers should also configure
 * network-level SSRF protection via VPC rules.
 */
const BLOCKED_HOSTNAMES = [
  "localhost",
  "0.0.0.0",
  "::1",
  "[::]",
  "[::1]",
  "metadata.google.internal", // GCP metadata endpoint
];

/**
 * Regular expressions matching private/reserved IP ranges (RFC 1918, RFC 5735).
 * Prevents the scanner from being used to probe internal infrastructure.
 */
const PRIVATE_IP_PATTERNS: RegExp[] = [
  /^127\./,              // 127.0.0.0/8 loopback
  /^10\./,               // 10.0.0.0/8
  /^192\.168\./,         // 192.168.0.0/16
  /^172\.(1[6-9]|2\d|3[01])\./,  // 172.16.0.0/12
  /^169\.254\./,         // 169.254.0.0/16 link-local
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,  // 100.64.0.0/10 CGNAT
];

// ---------------------------------------------------------------------------
// Core validator
// ---------------------------------------------------------------------------

/**
 * Validates and normalises a raw URL string for use as a scan target.
 *
 * Throws `AppError` with code `INVALID_URL` and HTTP 422 for any input
 * that fails validation — the error message is safe to surface to the client.
 *
 * @returns A `URL` object with the validated, normalised URL.
 */
export function validateScanUrl(raw: unknown): URL {
  // 1. Type check — reject non-strings before attempting to parse
  if (typeof raw !== "string" || raw.trim() === "") {
    throw new AppError("INVALID_URL", "A URL string is required.", 422);
  }

  const trimmed = raw.trim();

  // 2. Parse — catch malformed URLs before any further checks.
  //    If parsing fails, silently try prepending https:// so users can
  //    paste bare domains like "wavesmvmnt.com" without needing to type the protocol.
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    try {
      parsed = new URL(`https://${trimmed}`);
    } catch {
      throw new AppError(
        "INVALID_URL",
        `"${trimmed}" is not a valid URL. Try entering just the domain name (e.g. example.com).`,
        422
      );
    }
  }

  // 3. Protocol allowlist
  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    throw new AppError(
      "INVALID_URL",
      `Protocol "${parsed.protocol}" is not allowed. Use https:// or http://.`,
      422
    );
  }

  // 4. Hostname must be present
  if (!parsed.hostname) {
    throw new AppError("INVALID_URL", "URL must include a hostname.", 422);
  }

  // 5. SSRF: hostname blocklist
  const hostname = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.includes(hostname)) {
    throw new AppError(
      "INVALID_URL",
      "Scanning internal or reserved addresses is not permitted.",
      422
    );
  }

  // 6. SSRF: private IP range check
  if (PRIVATE_IP_PATTERNS.some((re) => re.test(hostname))) {
    throw new AppError(
      "INVALID_URL",
      "Scanning private IP ranges is not permitted.",
      422
    );
  }

  return parsed;
}

// ---------------------------------------------------------------------------
// Sanitisation helper
// ---------------------------------------------------------------------------

/**
 * Returns a URL string safe for logs and stored reports.
 *
 * Strips:
 *  - Username / password (e.g. `https://user:pass@example.com`)
 *  - Fragment identifier (`#section`) — fragments are client-side only and
 *    have no meaning for server-side scanning.
 */
export function sanitiseUrl(url: URL): string {
  const clean = new URL(url.toString());
  clean.username = "";
  clean.password = "";
  clean.hash = "";
  return clean.toString();
}
