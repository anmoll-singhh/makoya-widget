/**
 * lib/heartbeat.ts — widget liveness ("heartbeat") data layer for the v3.1
 * install-verification / monitoring-streak / uptime features.
 *
 * The widget is UNAUTHENTICATED: it runs on the merchant's site and has no
 * Supabase session. So heartbeats are written via the SERVICE ROLE from a public
 * server route (`/api/heartbeat`), exactly like `leads` — the `widget_heartbeats`
 * / `widget_uptime_days` tables have RLS on with a SELECT-only owner policy and
 * NO write policy, so only the service key can write them. Owners READ their own
 * site's liveness through the authed `/api/sites/[id]/install-status` route.
 *
 * Error discipline mirrors `lib/sites.ts`:
 *  - a Supabase `error` is an INFRA failure → THROW (the caller decides whether
 *    to swallow). `recordHeartbeat` deliberately lets infra errors propagate; the
 *    public route wraps the whole handler in never-500 best-effort telemetry.
 *  - simply no row → return `null` (mirrors `getSite`).
 *
 * Columns are snake_case in Postgres; the mappers convert to camelCase.
 *
 * Honesty: nothing here asserts any WCAG/ADA "compliance" — these are pure
 * liveness/telemetry signals (is the widget phoning home, and how recently).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * The four states the dashboard renders for a site's install:
 *  - active        → widget phoned home very recently AND the latest scan is OK.
 *  - monitoring    → widget seen within the last week but not in the last 30 min
 *                    (normal for low-traffic sites; we're still watching it).
 *  - action_needed → either seen recently with a poor score, or gone quiet for
 *                    over a week (likely removed / broken snippet).
 *  - not_installed → we have never received a heartbeat for this site.
 */
export type InstallStatus = "active" | "monitoring" | "action_needed" | "not_installed";

export interface HeartbeatRecord {
  siteId: string;
  firstSeenAt: string;
  lastSeenAt: string;
  pingCount: number;
  lastUrl: string | null;
}

/** snake_case heartbeat row → camelCase record. Tolerates null ping_count/last_url. */
export function rowToHeartbeat(row: any): HeartbeatRecord {
  return {
    siteId: row.site_id,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    pingCount: typeof row.ping_count === "number" ? row.ping_count : Number(row.ping_count ?? 0),
    lastUrl: row.last_url ?? null,
  };
}

// Liveness thresholds. Kept as named constants so the derivation rules read
// declaratively and the tests can mirror the boundaries exactly.
const ACTIVE_WINDOW_MS = 30 * 60_000; // 30 minutes: "phoned home just now"
const MONITORING_WINDOW_MS = 7 * 24 * 60 * 60_000; // 7 days: "still watching"
const LOW_SCORE_THRESHOLD = 50; // latest scan below this = needs attention

/**
 * PURE derivation of the install status from the last heartbeat + latest scan
 * score. No I/O — fully unit-tested. `nowMs` is injectable for deterministic
 * tests and defaults to the wall clock.
 *
 * Rules (in order):
 *  1. never seen → not_installed
 *  2. seen ≤ 30 min ago → action_needed if score is known and < 50, else active
 *  3. seen > 30 min but ≤ 7 days ago → monitoring
 *  4. seen > 7 days ago → action_needed
 */
export function deriveInstallStatus(args: {
  lastSeenAt: string | null;
  nowMs?: number;
  latestScore: number | null;
}): InstallStatus {
  const { lastSeenAt, latestScore } = args;
  if (!lastSeenAt) return "not_installed";

  const now = args.nowMs ?? Date.now();
  const age = now - Date.parse(lastSeenAt);

  if (age <= ACTIVE_WINDOW_MS) {
    if (latestScore != null && latestScore < LOW_SCORE_THRESHOLD) return "action_needed";
    return "active";
  }
  if (age <= MONITORING_WINDOW_MS) return "monitoring";
  return "action_needed";
}

/**
 * Records a widget heartbeat. MUST be called with the SERVICE-ROLE client (the
 * tables are write-locked to the service key). Behaviour:
 *  - upsert `widget_heartbeats` on conflict(site_id): bump last_seen_at=now(),
 *    ping_count = ping_count + 1, store last_url; an insert seeds first_seen_at.
 *  - upsert today's `widget_uptime_days` row, incrementing `pings`.
 *
 * We do a read-modify-write for the counters (RPC-free, simple + correct):
 * read the current row, then upsert the incremented values. A heartbeat is
 * best-effort telemetry sent frequently, so the small race on the counter under
 * concurrent pings is acceptable (it can only undercount by a few, never corrupt
 * state). Infra errors are NOT swallowed here — they THROW so the caller (the
 * never-500 route) decides; this keeps the data layer honest and testable.
 */
export async function recordHeartbeat(
  service: SupabaseClient,
  siteId: string,
  url?: string | null
): Promise<void> {
  const nowIso = new Date().toISOString();
  const today = nowIso.slice(0, 10); // YYYY-MM-DD (UTC) for the uptime day bucket

  // ── heartbeats: read current ping_count, then upsert the bumped row ──────────
  const existing = await service
    .from("widget_heartbeats")
    .select("ping_count")
    .eq("site_id", siteId)
    .maybeSingle();
  if (existing.error) throw existing.error;

  const prevCount =
    existing.data && typeof existing.data.ping_count !== "undefined"
      ? Number(existing.data.ping_count ?? 0)
      : 0;

  const hbRow: Record<string, unknown> = {
    site_id: siteId,
    last_seen_at: nowIso,
    ping_count: prevCount + 1,
    last_url: url ?? null,
  };
  // Only seed first_seen_at on the very first ping so re-pings keep the original.
  if (!existing.data) hbRow.first_seen_at = nowIso;

  const hbUpsert = await service
    .from("widget_heartbeats")
    .upsert(hbRow, { onConflict: "site_id" });
  if (hbUpsert.error) throw hbUpsert.error;

  // ── uptime days: read today's count, then upsert the incremented row ─────────
  const dayRead = await service
    .from("widget_uptime_days")
    .select("pings")
    .eq("site_id", siteId)
    .eq("day", today)
    .maybeSingle();
  if (dayRead.error) throw dayRead.error;

  const prevPings = dayRead.data ? Number(dayRead.data.pings ?? 0) : 0;
  const dayUpsert = await service
    .from("widget_uptime_days")
    .upsert({ site_id: siteId, day: today, pings: prevPings + 1 } as never, {
      onConflict: "site_id,day",
    });
  if (dayUpsert.error) throw dayUpsert.error;
}

/**
 * Reads the heartbeat for one site. Mirrors `getSite`'s error discipline:
 * infra `error` → throw; no row → null.
 */
export async function getHeartbeat(
  client: SupabaseClient,
  siteId: string
): Promise<HeartbeatRecord | null> {
  const { data, error } = await client
    .from("widget_heartbeats")
    .select("*")
    .eq("site_id", siteId)
    .maybeSingle();
  if (error) throw error; // infra failure — caller decides
  return data ? rowToHeartbeat(data) : null;
}
