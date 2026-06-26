/**
 * lib/activity.ts — the v3.1 Overview "recent activity" feed data layer.
 *
 * `activity_log` is an APPEND-ONLY stream of human-readable events for a site
 * (scans finishing, issues found/resolved, widget milestones, specialist notes).
 * It is written by the SYSTEM via the SERVICE ROLE — the table has RLS on with a
 * SELECT-only owner policy and NO write policy, exactly like `leads` /
 * `widget_heartbeats`. Owners READ their own site's feed through the authed
 * route; cross-tenant reads are impossible (RLS).
 *
 * Error discipline mirrors lib/sites.ts / lib/heartbeat.ts: a Supabase `error`
 * is an INFRA failure → THROW (the caller decides how to degrade). `logActivity`
 * lets infra errors propagate so callers stay honest; reads throw on infra error
 * so the authed route can surface a generic 500.
 *
 * Columns are snake_case in Postgres; `rowToActivity` converts to camelCase.
 *
 * Honesty: nothing here asserts any WCAG/ADA "compliance" — these are descriptive
 * activity records only.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

/** Who/what produced an activity entry. Free-text in the DB; this union is the
 *  set the app writes. `rowToActivity` defaults an unknown/missing actor to
 *  'system' so a stray DB value can never break the feed. */
export type ActivityActor = "system" | "mike" | "user" | "specialist";

export interface ActivityEntry {
  id: string;
  siteId: string;
  actor: ActivityActor;
  /** Open-ended event type, e.g. scan_completed | issue_found | issue_resolved. */
  type: string;
  summary: string;
  wcagRef: string | null;
  createdAt: string;
}

/**
 * PURE limit clamp. Returns `n` floored into [min, max], or `def` when `n` is
 * not a finite number. Extracted so the clamping rule is unit-tested without I/O
 * and reused by `listActivity`.
 */
export function clampLimit(n: number, min: number, max: number, def: number): number {
  if (typeof n !== "number" || !Number.isFinite(n)) return def;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

/** snake_case activity row → camelCase entry. Tolerates a null wcag_ref and
 *  defaults a missing actor to 'system'. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rowToActivity(row: any): ActivityEntry {
  return {
    id: row.id,
    siteId: row.site_id,
    actor: (row.actor ?? "system") as ActivityActor,
    type: row.type,
    summary: row.summary,
    wcagRef: row.wcag_ref ?? null,
    createdAt: row.created_at,
  };
}

/**
 * Appends one activity entry. MUST be called with the SERVICE-ROLE client (the
 * table is write-locked to the service key). `actor` defaults to 'system' and
 * `wcagRef` to null. Throws on infra error — the caller decides whether to
 * swallow (activity is best-effort and must never break the originating action).
 */
export async function logActivity(
  service: SupabaseClient,
  input: {
    siteId: string;
    actor?: ActivityActor;
    type: string;
    summary: string;
    wcagRef?: string | null;
  }
): Promise<void> {
  const { error } = await service.from("activity_log").insert({
    site_id: input.siteId,
    actor: input.actor ?? "system",
    type: input.type,
    summary: input.summary,
    wcag_ref: input.wcagRef ?? null,
  });
  if (error) throw error;
}

const DEFAULT_LIMIT = 20;
const MIN_LIMIT = 1;
const MAX_LIMIT = 100;

/**
 * Reads the most recent activity for one site, newest first. `limit` is clamped
 * to [1, 100] (default 20). RLS scopes the read to the caller's own sites.
 * Throws on infra error (the authed route surfaces a generic 500).
 */
export async function listActivity(
  client: SupabaseClient,
  siteId: string,
  limit = DEFAULT_LIMIT
): Promise<ActivityEntry[]> {
  const max = clampLimit(limit, MIN_LIMIT, MAX_LIMIT, DEFAULT_LIMIT);
  const { data, error } = await client
    .from("activity_log")
    .select("*")
    .eq("site_id", siteId)
    .order("created_at", { ascending: false })
    .limit(max);
  if (error) throw error;
  return (data ?? []).map(rowToActivity);
}
