/**
 * lib/config-cache.ts — KV read-through cache for the PUBLIC widget config path.
 *
 * Why this exists: `GET /api/config/[siteId]` is the single endpoint every visitor
 * of every client site hits on every page load to boot the widget. Today it makes
 * TWO Postgres round-trips per call (license + config) with `no-store`, so the DB
 * sees (number of sites × their pageviews) queries — the architecture's hard scaling
 * ceiling. This module shifts that read onto Upstash Redis (HTTP, globally fast),
 * so Postgres only sees cache MISSES (≈ sites ÷ TTL): a tiny trickle. The per-request
 * gate (Origin allowlist + license + token) still runs on every call — we cache the
 * DATA, not the verdict — so correctness is unchanged.
 *
 * Source of truth stays Postgres. This is a read replica for ONE hot path:
 *   read  → cache-first, fall through to Postgres on miss, then populate.
 *   write → the dashboard PATCH (and any license/domain change) PURGES the key, so
 *           the next read repopulates from Postgres. One-hop propagation.
 *
 * Hard rules (mirror lib/rate-limit.ts):
 *  - NEVER THROW. Every Redis call is wrapped; the caller's never-500 / fail-OPEN
 *    contract must survive a Redis outage untouched.
 *  - NO-OP WHEN UNCONFIGURED. With Upstash env unset (local dev, or before the store
 *    is provisioned), reads return null (→ caller falls through to Postgres) and
 *    writes/purges do nothing. So this file is safe to ship BEFORE Upstash exists:
 *    behaviour is byte-identical to today until the env vars are set.
 *  - POSITIVE CACHE ONLY. We cache sites that EXIST. A missing site is never cached,
 *    so a freshly created site is visible immediately and a bad-id flood can't pin a
 *    negative result (it's rate-limited at the route instead).
 */
import "server-only";
import { Redis } from "@upstash/redis";
import { env } from "@/lib/env.server";
import type { SiteLicense, SiteConfig } from "@/lib/sites";

/**
 * The exact data the config route needs to compute its response, cached as one
 * value so a hit is a single Redis GET. `site` is the licensing facts (never null
 * here — we only cache existing sites); `config` may be null if the site somehow
 * has no config row (route falls back to DEFAULT_CONFIG, same as the DB path).
 */
export interface SiteBundle {
  site: SiteLicense;
  config: SiteConfig | null;
}

/** Versioned key prefix — bump `v1` if SiteBundle's shape ever changes. */
function keyFor(siteId: string): string {
  return `makoya_cfg:v1:${siteId}`;
}

/** TTL for a cached bundle. Short enough that a license/domain change with NO
 *  explicit purge (e.g. a future direct DB edit) self-heals within minutes; long
 *  enough that steady-state traffic almost never touches Postgres. Purges make the
 *  common edit path instant regardless. */
const TTL_SECONDS = 300;

// Single shared client, built lazily on first configured use (REST-based, no
// socket to leak), exactly like rate-limit.ts.
let redisSingleton: Redis | null = null;

function getRedis(): Redis | null {
  const url = env.UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null; // unconfigured → caller uses Postgres
  if (!redisSingleton) redisSingleton = new Redis({ url, token });
  return redisSingleton;
}

/**
 * Cache-read one site's bundle. Returns null on miss, on an unconfigured store, or
 * on ANY Redis error — every one of those means "ask Postgres", which is correct
 * and safe. Never throws.
 */
export async function readSiteBundle(siteId: string): Promise<SiteBundle | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    return (await redis.get<SiteBundle>(keyFor(siteId))) ?? null;
  } catch {
    return null; // Redis blip → fall through to Postgres
  }
}

/**
 * Cache-write one site's bundle with a TTL. Best-effort: a write failure just means
 * the next read misses and repopulates. Never throws; no-ops when unconfigured.
 */
export async function writeSiteBundle(siteId: string, bundle: SiteBundle): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.set(keyFor(siteId), bundle, { ex: TTL_SECONDS });
  } catch {
    /* best-effort: a missed write just means the next read repopulates */
  }
}

/**
 * Invalidate one site's cached bundle. Call after ANY write that changes a field the
 * widget reads: config edits (primaryColor, features, …) AND licensing changes
 * (license_status, allowed_domains, plan-driven gating). The next read repopulates
 * from Postgres. Never throws; no-ops when unconfigured.
 */
export async function purgeSiteBundle(siteId: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.del(keyFor(siteId));
  } catch {
    /* best-effort: the TTL is the backstop if an explicit purge fails */
  }
}
