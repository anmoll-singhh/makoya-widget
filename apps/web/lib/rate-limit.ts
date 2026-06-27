/**
 * lib/rate-limit.ts — durable, cross-instance rate limiting for the PUBLIC routes.
 *
 * Why this exists: the public funnel routes (/api/public-scan, /api/scan-ingest)
 * previously throttled with a per-process `Map`. On Vercel serverless that is
 * effectively a no-op — each request can land on a fresh instance with its own
 * empty Map, so an attacker (or a noisy client) is never actually limited. This
 * module replaces that with a SHARED counter backed by Upstash Redis, which every
 * instance reads/writes, so the window is enforced across the whole fleet.
 *
 * Public contract — `checkRateLimit(key, { limit, windowMs })` returns:
 *   - `true`  → the caller is OVER the limit (the route should reply 429).
 *   - `false` → the caller is allowed through.
 * This boolean sense deliberately mirrors the old `rateLimited(key)` helpers in
 * the routes, so swapping the mechanism barely touches the route logic.
 *
 * Two backends, chosen at CALL time (not import time) so the decision stays
 * testable without module-mocking and respects env set after import:
 *  1. Upstash (durable): used when BOTH `UPSTASH_REDIS_REST_URL` and
 *     `UPSTASH_REDIS_REST_TOKEN` are configured. A single Redis client is shared,
 *     and one `Ratelimit` instance is memoised per namespace (the bucket identity)
 *     so we don't rebuild it on every request.
 *  2. In-memory (fallback): used when Upstash is NOT configured (local dev, or a
 *     misconfigured deploy). Same window+max semantics the routes used before, so
 *     nothing breaks without Redis — it's just per-instance and therefore weak.
 *
 * Hard rules:
 *  - NEVER THROW. Every Upstash call is wrapped in try/catch.
 *  - FAIL OPEN on any Redis error (return `false` = allow). Rationale: these are
 *    PUBLIC funnel endpoints whose job is to let real visitors in. If our Redis is
 *    down or rate-limited, blocking every legitimate user is a worse outcome than
 *    briefly under-enforcing the throttle. Availability for real users beats strict
 *    enforcement when the limiter's own dependency is unhealthy.
 *  - Async signature for both paths: Upstash is inherently async; the in-memory
 *    path resolves synchronously but the function stays `async` for one call site.
 */
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "@/lib/env.server";

/** Options mirror the per-route constants: `limit` requests per `windowMs`. */
export interface RateLimitOptions {
  /** Max allowed requests within the window before `checkRateLimit` returns true. */
  limit: number;
  /** Rolling window length in milliseconds. */
  windowMs: number;
  /**
   * Per-caller NAMESPACE — keeps independent endpoints from sharing one counter.
   *
   * This MUST be distinct per logical bucket. Upstash builds its Redis key as
   * `${prefix}:${key}`, so without a per-endpoint prefix two routes that pass the
   * same `key` (here, the IP) would increment the SAME counter — e.g. a visitor's
   * scans would eat into their email-submit budget and block the lead. We fold
   * `name` into the Upstash prefix AND the in-memory key. Defaults to
   * `"<limit>:<windowMs>"` (which still separates our two routes, since their
   * limits differ), but routes should pass an explicit name for clarity + safety
   * against two endpoints that happen to share the same limit/window.
   */
  name?: string;
}

/** The bucket namespace: explicit `name`, else the limit/window signature. */
function namespaceOf(opts: RateLimitOptions): string {
  return opts.name ?? `${opts.limit}:${opts.windowMs}`;
}

// ── Upstash backend (durable, cross-instance) ──────────────────────────────────
//
// A single Redis client is shared across the process (cheap, REST-based, no socket
// to leak). Built lazily on first configured use so an unconfigured deploy never
// touches Upstash at all. `Ratelimit` instances are memoised per window/limit pair
// because constructing one is non-trivial and the route always uses fixed values.

let redisSingleton: Redis | null = null;
// Keyed by NAMESPACE, which is the bucket identity (it also becomes the Upstash
// Redis key prefix and the in-memory key prefix). CONTRACT: a given namespace must
// always be called with the same (limit, windowMs) — every real caller passes a
// unique `name` with fixed limits, and the default namespace embeds the limit and
// window, so this holds. Mixing limits under one namespace is unsupported (it would
// also corrupt the shared Redis window), which is why the cache key is the
// namespace alone and not a per-call composite that could mask the misuse.
const limiterCache = new Map<string, Ratelimit>();

function getRedis(url: string, token: string): Redis {
  if (!redisSingleton) {
    redisSingleton = new Redis({ url, token });
  }
  return redisSingleton;
}

function getLimiter(redis: Redis, namespace: string, limit: number, windowMs: number): Ratelimit {
  let limiter = limiterCache.get(namespace);
  if (!limiter) {
    // Sliding window matches the intent of the old fixed-window Map (a rolling
    // count over the last `windowMs`). The duration string is whole seconds.
    const windowSec = Math.max(1, Math.round(windowMs / 1000));
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, `${windowSec} s`),
      // Per-bucket prefix → the Redis key is `makoya_rl:<namespace>:<ip>`, so each
      // endpoint counts independently and never bleeds into another's budget.
      prefix: `makoya_rl:${namespace}`,
      // We do our own analytics via the observability seam; keep Redis writes lean.
      analytics: false,
    });
    limiterCache.set(namespace, limiter);
  }
  return limiter;
}

// ── In-memory backend (fallback) ───────────────────────────────────────────────
//
// Same window + max semantics as the routes' original `rateLimited()` helpers:
// a fixed window keyed by caller, reset once `windowMs` has elapsed since the first
// hit. Per-process only — fine for local dev and as a degraded-mode safety net.
// Keyed by `key|limit|windowMs` so different route configs don't collide.

const memoryHits = new Map<string, { n: number; t: number }>();

function checkInMemory(namespace: string, key: string, limit: number, windowMs: number): boolean {
  const bucketKey = `${namespace}|${key}`;
  const now = Date.now();
  const cur = memoryHits.get(bucketKey);
  if (!cur || now - cur.t > windowMs) {
    memoryHits.set(bucketKey, { n: 1, t: now });
    return false;
  }
  cur.n++;
  return cur.n > limit;
}

/**
 * Returns `true` when `key` is OVER the limit (caller should 429), `false` when
 * allowed. Reads env at call time to pick the backend. Never throws; on any
 * Upstash error it FAILS OPEN (returns `false`) — see the file header for why.
 */
export async function checkRateLimit(key: string, opts: RateLimitOptions): Promise<boolean> {
  const { limit, windowMs } = opts;
  const namespace = namespaceOf(opts);
  const url = env.UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN;

  // Not configured → in-memory fallback (keeps local dev + misconfig working).
  if (!url || !token) {
    return checkInMemory(namespace, key, limit, windowMs);
  }

  try {
    const limiter = getLimiter(getRedis(url, token), namespace, limit, windowMs);
    const { success } = await limiter.limit(key);
    // `success === true` means the request is ALLOWED → not limited → return false.
    return !success;
  } catch {
    // Redis unreachable / errored. FAIL OPEN: never block real users because our
    // own limiter dependency is unhealthy. Under-enforcing briefly beats a funnel
    // outage. We intentionally do NOT fall back to the in-memory path here — that
    // would silently mask a Redis outage with a weaker guarantee; allowing through
    // is the explicit, documented choice.
    return false;
  }
}
