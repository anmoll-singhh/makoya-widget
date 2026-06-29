/**
 * lib/analytics.ts — widget-usage analytics (v3.1 Analytics screen).
 *
 * Two tables back this (see supabase/migrations/20260626130000_widget_events.sql):
 *  - `widget_events`      — raw, append-only telemetry rows written by the public
 *                           widget through the SERVICE ROLE (RLS has no write
 *                           policy). One row per reported event.
 *  - `widget_event_daily` — the pre-aggregated rollup the dashboard reads. Keyed
 *                           by (site_id, day, event, feature_key); `count` is the
 *                           running total. Owners may SELECT their own rows; RLS
 *                           makes cross-tenant reads impossible.
 *
 * Error discipline mirrors lib/sites.ts: a Supabase `error` is an INFRA failure →
 * throw (callers decide how to degrade); the public ingest route wraps the throw
 * in its never-500 contract so telemetry stays best-effort.
 *
 * The shaping math lives in `summarizeDaily`, a PURE function with no I/O so it is
 * exhaustively unit-tested without a database.
 *
 * Honesty: this module measures usage only. It asserts no WCAG/ADA "compliance"
 * or "guarantee" — none of that copy lives here.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_CONFIG, type FeatureKey } from "@makoya/shared";

export type WidgetEventName = "open" | "feature_activated";

export interface WidgetEventInput {
  event: WidgetEventName;
  /** Required for `feature_activated`; ignored for `open`. */
  featureKey?: string | null;
  /** Epoch millis the event occurred. Defaults to now() when absent. */
  ts?: number;
}

export interface WidgetAnalytics {
  opens: number;
  featureActivations: number;
  mostUsed: { featureKey: string; count: number } | null;
  opensOverTime: { day: string; count: number }[];
  usageByFeature: { featureKey: string; count: number }[];
}

/** Row shape read back from `widget_event_daily` (the only input summarize needs). */
export interface DailyRow {
  day: string;
  event: string;
  feature_key: string;
  count: number;
}

// Runtime allow-list of valid feature keys, derived read-only from the canonical
// shared config so this can never drift from the widget's FeatureKey union.
const VALID_FEATURE_KEYS = new Set<string>(DEFAULT_CONFIG.featuresEnabled);
const VALID_EVENTS = new Set<WidgetEventName>(["open", "feature_activated"]);

/** UTC date (YYYY-MM-DD) for an epoch-millis timestamp (or now()). */
function dayOf(ts?: number): string {
  const d = ts !== undefined && Number.isFinite(ts) ? new Date(ts) : new Date();
  return d.toISOString().slice(0, 10);
}

/**
 * Normalises + filters raw input into accepted events. Invalid event names, and
 * `feature_activated` events whose featureKey is missing/unknown, are DROPPED
 * silently (telemetry is best-effort; one bad row must not poison a batch).
 */
interface AcceptedEvent {
  event: WidgetEventName;
  featureKey: string; // "" for opens
  ts?: number;
}
function accept(events: WidgetEventInput[]): AcceptedEvent[] {
  const out: AcceptedEvent[] = [];
  for (const e of events) {
    if (!e || !VALID_EVENTS.has(e.event as WidgetEventName)) continue;
    if (e.event === "feature_activated") {
      const fk = e.featureKey ?? "";
      if (!VALID_FEATURE_KEYS.has(fk)) continue; // drop unknown/missing feature
      out.push({ event: "feature_activated", featureKey: fk as FeatureKey, ts: e.ts });
    } else {
      out.push({ event: "open", featureKey: "", ts: e.ts });
    }
  }
  return out;
}

/**
 * Inserts raw rows AND increments the daily rollup per (day, event, featureKey).
 * Returns the number of events accepted (after validation). Uses the SERVICE-ROLE
 * client — the only writer to these tables. Throws on infra error; the public
 * route's never-500 wrapper turns that into `{ ok: true, accepted: 0 }`.
 *
 * The rollup increment is a SINGLE atomic `INSERT … ON CONFLICT DO UPDATE SET
 * count = count + delta` via the `increment_widget_event_daily` RPC — one
 * round-trip for all buckets, with NO lost-update window (concurrent POSTs for the
 * same bucket serialise on the row lock). The raw `widget_events` table remains the
 * exact, replayable source of truth.
 */
export async function recordEvents(
  service: SupabaseClient,
  siteId: string,
  events: WidgetEventInput[]
): Promise<number> {
  const accepted = accept(events);
  if (accepted.length === 0) return 0;

  // 1. Append raw rows (exact, replayable history).
  const rawRows = accepted.map((e) => ({
    site_id: siteId,
    event: e.event,
    feature_key: e.featureKey || null,
    occurred_at: new Date(
      e.ts !== undefined && Number.isFinite(e.ts) ? e.ts : Date.now()
    ).toISOString(),
  }));
  const { error: insErr } = await service.from("widget_events").insert(rawRows);
  if (insErr) throw insErr;

  // 2. Aggregate deltas per (day, event, feature_key) within this batch.
  const deltas = new Map<
    string,
    { day: string; event: string; feature_key: string; delta: number }
  >();
  for (const e of accepted) {
    const day = dayOf(e.ts);
    const featureKey = e.event === "feature_activated" ? e.featureKey : "";
    const key = `${day}|${e.event}|${featureKey}`;
    const cur = deltas.get(key);
    if (cur) cur.delta += 1;
    else deltas.set(key, { day, event: e.event, feature_key: featureKey, delta: 1 });
  }

  // 3. ONE atomic bulk increment for ALL buckets via the Postgres RPC. This
  //    replaces the old per-bucket SELECT→UPSERT read-modify-write loop, which was
  //    O(buckets) round-trips AND racy (concurrent POSTs could both read N and both
  //    write N+1, losing an event). The RPC's INSERT … ON CONFLICT DO UPDATE
  //    SET count = count + excluded.count is a single, lost-update-safe statement.
  const { error: incErr } = await service.rpc("increment_widget_event_daily", {
    p_site_id: siteId,
    p_rows: [...deltas.values()],
  });
  if (incErr) throw incErr;

  return accepted.length;
}

/**
 * Reads `widget_event_daily` for the last `sinceDays` days (inclusive of today)
 * and shapes it via `summarizeDaily`. RLS scopes the read to the caller's own
 * sites. Throws on infra error (the authed route surfaces it).
 */
export async function getWidgetAnalytics(
  client: SupabaseClient,
  siteId: string,
  sinceDays: number
): Promise<WidgetAnalytics> {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - (Math.max(1, sinceDays) - 1));
  const sinceDay = since.toISOString().slice(0, 10);

  const { data, error } = await client
    .from("widget_event_daily")
    .select("day,event,feature_key,count")
    .eq("site_id", siteId)
    .gte("day", sinceDay);
  if (error) throw error;

  return summarizeDaily((data ?? []) as DailyRow[]);
}

/**
 * PURE shaping core. Given daily rollup rows, compute the Analytics view model:
 *  - opens / featureActivations: summed counts per event type,
 *  - usageByFeature: feature_activated grouped by feature_key, DESCENDING by
 *    count then ASCENDING by featureKey (stable tie-break),
 *  - mostUsed: the top of usageByFeature, or null when there are no activations,
 *  - opensOverTime: per-day open counts, ASCENDING by day.
 * No I/O — fully unit-tested.
 */
export function summarizeDaily(rows: DailyRow[]): WidgetAnalytics {
  let opens = 0;
  let featureActivations = 0;
  const byFeature = new Map<string, number>();
  const opensByDay = new Map<string, number>();

  for (const r of rows) {
    const count = Number.isFinite(r.count) ? r.count : 0;
    if (r.event === "open") {
      opens += count;
      opensByDay.set(r.day, (opensByDay.get(r.day) ?? 0) + count);
    } else if (r.event === "feature_activated") {
      featureActivations += count;
      const fk = r.feature_key || "";
      if (fk) byFeature.set(fk, (byFeature.get(fk) ?? 0) + count);
    }
  }

  const usageByFeature = [...byFeature.entries()]
    .map(([featureKey, count]) => ({ featureKey, count }))
    .sort((a, b) => b.count - a.count || a.featureKey.localeCompare(b.featureKey));

  const mostUsed = usageByFeature.length > 0 ? usageByFeature[0] : null;

  const opensOverTime = [...opensByDay.entries()]
    .map(([day, count]) => ({ day, count }))
    .sort((a, b) => a.day.localeCompare(b.day));

  return { opens, featureActivations, mostUsed, opensOverTime, usageByFeature };
}
