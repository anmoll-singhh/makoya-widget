/**
 * lib/scan-queue.ts — a small, reliable job queue for accessibility scans, built on
 * the Upstash Redis already wired for rate-limiting + config caching.
 *
 * WHY a queue (not the old inline cron loop): the daily rescan used to scan EVERY
 * stale site sequentially inside one 60s function — impossible past a few hundred
 * sites, and running multiple headless-Chromium in one function OOMs. This decouples
 * trigger from execution: a producer ENQUEUES stale site ids here; a dispatcher
 * CLAIMS bounded batches and fans them out to a worker route (one Chromium per Vercel
 * instance, scaled horizontally).
 *
 * WHY a ZSET (not LPUSH/LPOP): a sorted set scored by "visible-at" epoch-ms gives us,
 * for free, the three things a naive list can't:
 *   • Dedupe — member = siteId, so a site is enqueued at most once (re-ZADD just
 *     updates the score).
 *   • Visibility timeout / lease — CLAIMING a job pushes its score to now+visibility
 *     instead of removing it; if a worker crashes mid-scan, the job re-surfaces
 *     automatically after the timeout. No reaper needed.
 *   • Atomic claim — the claim is a single Lua EVAL, so two dispatcher ticks can
 *     never hand the same siteId to two workers.
 * Delivery is therefore at-least-once; the worker re-checks the 7-day recency rule
 * before scanning, so a rare double-delivery is an idempotent no-op (wasted compute,
 * never double data). Poison messages (repeatedly failing) are dead-lettered after
 * MAX_DELIVERIES so one bad site can't wedge the queue.
 *
 * Hard rules (mirror rate-limit.ts / config-cache.ts):
 *  - NEVER THROW. Every Redis call is wrapped; a cron/route must never crash on a
 *    Redis blip.
 *  - SAFE WHEN UNCONFIGURED. With Upstash env unset: enqueue/ack/deadLetter/locks
 *    no-op, claimBatch returns [] (nothing to scan), and the interactive lock/cap
 *    fail OPEN (the user's scan proceeds) — so local dev without Redis never blocks
 *    a real scan and never silently swallows one mid-flight.
 */
import "server-only";
import { Redis } from "@upstash/redis";
import { env } from "@/lib/env.server";

const Q_KEY = "scan:q"; // ZSET member=siteId score=visibleAt(ms)
const DELIVERIES_KEY = "scan:deliveries"; // HASH siteId -> delivery count
const DLQ_KEY = "scan:dlq"; // ZSET member=siteId score=deadLetteredAt(ms)
const lockKey = (siteId: string) => `scan:lock:${siteId}`;
const INFLIGHT_KEY = "scan:inflight"; // STRING counter — interactive concurrency cap

/** A site delivered this many times without an ack is treated as poison. */
const MAX_DELIVERIES = 5;

/** Sentinel returned by acquireScanLock when Upstash is unconfigured — lets the
 *  interactive path proceed (lock is an optimisation, not a correctness gate). */
const UNLOCKED_SENTINEL = "no-redis";

let redisSingleton: Redis | null = null;
function getRedis(): Redis | null {
  const url = env.UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  if (!redisSingleton) redisSingleton = new Redis({ url, token });
  return redisSingleton;
}

// ── Producer ────────────────────────────────────────────────────────────────

/**
 * Enqueue site ids for scanning, visible immediately (score = now). Dedupe is
 * automatic (ZADD of an existing member just refreshes its score). Chunked to keep
 * each pipeline small. No-op / never-throws when unconfigured.
 */
export async function enqueueSites(siteIds: string[]): Promise<void> {
  const redis = getRedis();
  if (!redis || siteIds.length === 0) return;
  const now = Date.now();
  try {
    for (let i = 0; i < siteIds.length; i += 500) {
      const chunk = siteIds.slice(i, i + 500);
      // ZADD key {score, member} ...
      await redis.zadd(
        Q_KEY,
        ...(chunk.map((id) => ({ score: now, member: id })) as [
          { score: number; member: string },
          ...{ score: number; member: string }[],
        ])
      );
    }
  } catch {
    /* best-effort: next producer run re-enqueues still-stale sites */
  }
}

// ── Dispatcher ────────────────────────────────────────────────────────────────

// Atomically take up to `n` due jobs (score <= now) and LEASE them by pushing their
// score to now+visibility, so they re-surface if the worker dies. Returns the claimed
// siteIds. One round-trip, race-free across concurrent dispatcher ticks.
const CLAIM_LUA = `
local now = tonumber(ARGV[1])
local vt  = tonumber(ARGV[2])
local n   = tonumber(ARGV[3])
local due = redis.call('ZRANGEBYSCORE', KEYS[1], '-inf', now, 'LIMIT', 0, n)
for _, m in ipairs(due) do redis.call('ZADD', KEYS[1], now + vt, m) end
return due
`;

/**
 * Claim up to `n` due jobs, leasing each for `visibilityMs`. Returns [] when
 * unconfigured or on any error (nothing to dispatch this tick — safe).
 */
export async function claimBatch(n: number, visibilityMs: number): Promise<string[]> {
  const redis = getRedis();
  if (!redis || n <= 0) return [];
  try {
    const res = (await redis.eval(CLAIM_LUA, [Q_KEY], [Date.now(), visibilityMs, n])) as unknown;
    return Array.isArray(res) ? (res as string[]) : [];
  } catch {
    return [];
  }
}

// ── Worker bookkeeping ──────────────────────────────────────────────────────

/** Successful completion: remove the job and reset its delivery count. */
export async function ackScan(siteId: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.zrem(Q_KEY, siteId);
    await redis.hdel(DELIVERIES_KEY, siteId);
  } catch {
    /* best-effort: a missed ack just means the lease expires and re-delivers once */
  }
}

/**
 * Count this delivery; if it has now failed too many times, move it to the DLQ and
 * stop redelivering. Returns true when the job was dead-lettered (caller should give
 * up on it), false when it should remain in the queue for another attempt.
 */
export async function recordDeliveryAndMaybeDeadLetter(siteId: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  try {
    const count = await redis.hincrby(DELIVERIES_KEY, siteId, 1);
    if (count >= MAX_DELIVERIES) {
      await redis.zadd(DLQ_KEY, { score: Date.now(), member: siteId });
      await redis.zrem(Q_KEY, siteId);
      await redis.hdel(DELIVERIES_KEY, siteId);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// ── In-flight lock (shared by worker AND interactive scan) ────────────────────

/**
 * Try to take the per-site scan lock for `ttlSec`. Returns a token to release with
 * on success, or null if another scan already holds it. When unconfigured returns a
 * sentinel token so the interactive path proceeds unlocked (lock is best-effort).
 */
export async function acquireScanLock(siteId: string, ttlSec: number): Promise<string | null> {
  const redis = getRedis();
  if (!redis) return UNLOCKED_SENTINEL;
  const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  try {
    const ok = await redis.set(lockKey(siteId), token, { nx: true, ex: ttlSec });
    return ok === "OK" ? token : null;
  } catch {
    // Redis blip → fail OPEN: don't block a real scan because the lock is unhealthy.
    return UNLOCKED_SENTINEL;
  }
}

// Release only if we still own the lock (compare-and-delete), so we never delete a
// lock another worker has since acquired after our lease expired.
const UNLOCK_LUA = `
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('DEL', KEYS[1])
else
  return 0
end
`;

export async function releaseScanLock(siteId: string, token: string): Promise<void> {
  const redis = getRedis();
  if (!redis || token === UNLOCKED_SENTINEL) return;
  try {
    await redis.eval(UNLOCK_LUA, [lockKey(siteId)], [token]);
  } catch {
    /* best-effort: the lock's TTL is the backstop */
  }
}

// ── Interactive concurrency cap ───────────────────────────────────────────────

/**
 * Reserve one interactive-scan slot. Returns true if under the cap (caller proceeds
 * and MUST call releaseInteractiveSlot in finally), false if the cap is hit (caller
 * should 503/429). Fails OPEN (true) when unconfigured or on error. The counter
 * carries a TTL so a leaked slot self-heals.
 */
export async function reserveInteractiveSlot(max: number): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return true;
  try {
    const n = await redis.incr(INFLIGHT_KEY);
    if (n === 1) await redis.expire(INFLIGHT_KEY, 120); // first reserver sets the TTL
    if (n > max) {
      await redis.decr(INFLIGHT_KEY); // we didn't get a slot — give it back
      return false;
    }
    return true;
  } catch {
    return true; // unhealthy limiter must not block real scans
  }
}

export async function releaseInteractiveSlot(): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    const n = await redis.decr(INFLIGHT_KEY);
    if (n < 0) await redis.set(INFLIGHT_KEY, 0); // clamp; never let it go negative
  } catch {
    /* best-effort: the TTL clears any drift */
  }
}

// ── Observability ─────────────────────────────────────────────────────────────

/** Current queue depth (visible + leased). 0 when unconfigured/error. */
export async function queueDepth(): Promise<number> {
  const redis = getRedis();
  if (!redis) return 0;
  try {
    return (await redis.zcard(Q_KEY)) ?? 0;
  } catch {
    return 0;
  }
}
