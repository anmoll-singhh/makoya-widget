/**
 * lib/licensing/token.ts — server-only HMAC site-token mint/verify (Phase 1.5 §A1).
 *
 * The widget snippet carries a `data-token` alongside `data-site`. The token is a
 * deterministic HMAC over the siteId, proving the pair was provisioned by us — it
 * is an ANTI-FORGERY signature, not an anti-enumeration secret (siteIds are
 * already unguessable UUIDs). Because it's deterministic there is NO DB storage:
 * mint and verify both recompute `HMAC_SHA256(secret, siteId)`.
 *
 * Token shape (VERSIONED): `"v1." + base64url(HMAC_SHA256(secret, siteId))`.
 * The `v1.` prefix is mandatory — it lets a future secret/scheme rotation add a
 * new version (e.g. `v2.`) without hard-breaking the pasted fleet.
 *
 * Hard rules:
 *  - SERVER-ONLY. The secret must never reach the client bundle, so nothing in a
 *    client component may import this file. The dashboard mints in its RSC and
 *    passes the resulting string down as a prop.
 *  - Monitor-safe: with no secret configured (`WIDGET_SIGNING_SECRET=""`), verify
 *    returns `{ok:true, reason:"ok"}` so the gate can never block on an unset key.
 *  - NEVER throws. The config route has a never-500 contract; a malformed secret
 *    or token resolves to `{ok:false, reason:"bad"}`, never an exception.
 */
import crypto from "node:crypto";

/** Server-only signing secret. Empty string ("") = not configured = monitor-safe. */
function signingSecret(): string {
  return process.env.WIDGET_SIGNING_SECRET ?? "";
}

const VERSION_PREFIX = "v1.";

/** base64url (no padding) of a Buffer. */
function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Recompute the raw HMAC signature (base64url, no version prefix) for a siteId. */
function sign(secret: string, siteId: string): string {
  return base64url(crypto.createHmac("sha256", secret).update(siteId).digest());
}

/**
 * Mints the long-lived token a merchant pastes into their snippet. Deterministic
 * for a given (secret, siteId), so re-minting always yields the same value.
 * With no secret configured this still returns a stable `v1.` value, but the
 * gate treats verification as monitor-safe (see `verifySiteToken`).
 */
export function mintSiteToken(siteId: string): string {
  return VERSION_PREFIX + sign(signingSecret(), siteId);
}

/**
 * Verifies a token against a siteId.
 *   - secret unset ("")     → {ok:true,  reason:"ok"}     (monitor-safe; never blocks)
 *   - token missing/empty   → {ok:false, reason:"missing"} (grace-eligible at the gate)
 *   - token present + match  → {ok:true,  reason:"ok"}
 *   - token present + wrong  → {ok:false, reason:"bad"}
 * Any thrown error inside the crypto path is swallowed → {ok:false, reason:"bad"},
 * so a malformed secret/token can never break the never-500 route.
 */
export function verifySiteToken(
  siteId: string,
  token: string | null | undefined
): { ok: boolean; reason: "ok" | "missing" | "bad" } {
  const secret = signingSecret();
  if (secret === "") return { ok: true, reason: "ok" }; // not configured → monitor-safe
  if (!token) return { ok: false, reason: "missing" };

  try {
    const expected = mintSiteToken(siteId); // includes the v1. prefix
    const a = Buffer.from(token);
    const b = Buffer.from(expected);
    // timingSafeEqual THROWS on unequal-length buffers — length guard first.
    if (a.length !== b.length) return { ok: false, reason: "bad" };
    return crypto.timingSafeEqual(a, b) ? { ok: true, reason: "ok" } : { ok: false, reason: "bad" };
  } catch {
    // Malformed secret/token must never escape — the route never 500s.
    return { ok: false, reason: "bad" };
  }
}
