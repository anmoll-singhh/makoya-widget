/**
 * lib/api-keys.ts — PURE crypto helpers for org API keys (Wave 3).
 *
 * Security contract (mirrors the invite-token discipline):
 *   • We NEVER store a raw API key. We store only its SHA-256 hash + an 8-char
 *     display prefix. The raw key is shown to the user exactly once, at creation.
 *   • Verification is constant-time (`crypto.timingSafeEqual`) so a comparison
 *     can't leak the hash byte-by-byte via timing.
 *
 * `hashApiKey` / `verifyApiKey` are pure and unit-tested. `generateApiKey` pulls
 * CSPRNG bytes from node:crypto, so it is server-only; never call it in the
 * browser. We import from "server-only"? No — keep it dependency-free so it is
 * unit-testable under vitest's node environment; callers (server routes) are the
 * trust boundary that keeps it off the client.
 */

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

const KEY_PREFIX = "mky_";
const PREFIX_LEN = 8;

/** SHA-256 hex of a raw key (lowercase, 64 chars). Pure + deterministic. */
export function hashApiKey(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

/**
 * Constant-time check that `raw` hashes to `hash`. Returns false (never throws)
 * on a malformed/short stored hash so a corrupt row can't crash the caller.
 */
export function verifyApiKey(raw: string, hash: string): boolean {
  const computed = hashApiKey(raw);
  const a = Buffer.from(computed, "utf8");
  const b = Buffer.from(hash, "utf8");
  if (a.length !== b.length) return false; // length differs → not equal; also a precondition of timingSafeEqual
  return timingSafeEqual(a, b);
}

/**
 * Generate a fresh API key. `raw` = `mky_` + 32 url-safe random bytes (base64url,
 * ~43 chars); `prefix` = first 8 chars of `raw` (for display); `hash` =
 * sha256(raw). Only the prefix + hash are persisted; the raw value is returned to
 * be shown to the user once and then discarded by the caller.
 */
export function generateApiKey(): { raw: string; prefix: string; hash: string } {
  const raw = KEY_PREFIX + randomBytes(32).toString("base64url");
  return { raw, prefix: raw.slice(0, PREFIX_LEN), hash: hashApiKey(raw) };
}
