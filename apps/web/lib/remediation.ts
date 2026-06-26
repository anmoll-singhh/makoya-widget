/**
 * lib/remediation.ts — the v3.1 remediation-log data layer.
 *
 * `remediation_log` records each fix applied to a site, tagged with the WCAG
 * criterion it addresses. It feeds the Reports "remediation" tab, the "issues
 * resolved this month" metric, and the proof-of-effort pack. Rows are written by
 * the SYSTEM via the SERVICE ROLE — the table has RLS on with a SELECT-only owner
 * policy and NO write policy (same pattern as `leads` / `activity_log`). Owners
 * READ their own site's log through the authed route; RLS makes cross-tenant
 * reads impossible.
 *
 * Error discipline mirrors lib/sites.ts / lib/activity.ts: a Supabase `error` is
 * an INFRA failure → THROW. `logRemediation` lets infra errors propagate; reads
 * throw so the authed route surfaces a generic 500.
 *
 * Columns are snake_case in Postgres; `rowToRemediation` converts to camelCase.
 *
 * Honesty: this records work done. It asserts no WCAG/ADA "compliance" or
 * "guarantee" — none of that copy lives here.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export interface RemediationEntry {
  id: string;
  siteId: string;
  issueId: string | null;
  wcagCriterion: string | null;
  action: string;
  fixedBy: string | null;
  fixedAt: string;
}

/** snake_case remediation row → camelCase entry. Tolerates null issue_id,
 *  wcag_criterion and fixed_by. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rowToRemediation(row: any): RemediationEntry {
  return {
    id: row.id,
    siteId: row.site_id,
    issueId: row.issue_id ?? null,
    wcagCriterion: row.wcag_criterion ?? null,
    action: row.action,
    fixedBy: row.fixed_by ?? null,
    fixedAt: row.fixed_at,
  };
}

/**
 * Appends one remediation entry. MUST be called with the SERVICE-ROLE client
 * (the table is write-locked to the service key). `issueId`, `wcagCriterion` and
 * `fixedBy` are optional. Throws on infra error — the caller decides whether to
 * swallow.
 */
export async function logRemediation(
  service: SupabaseClient,
  input: {
    siteId: string;
    issueId?: string | null;
    wcagCriterion?: string | null;
    action: string;
    fixedBy?: string | null;
  }
): Promise<void> {
  const { error } = await service.from("remediation_log").insert({
    site_id: input.siteId,
    issue_id: input.issueId ?? null,
    wcag_criterion: input.wcagCriterion ?? null,
    action: input.action,
    fixed_by: input.fixedBy ?? null,
  });
  if (error) throw error;
}

/**
 * Reads a site's remediation log, newest first by `fixed_at`. RLS scopes the
 * read to the caller's own sites. Throws on infra error (the authed route
 * surfaces a generic 500).
 */
export async function listRemediation(
  client: SupabaseClient,
  siteId: string
): Promise<RemediationEntry[]> {
  const { data, error } = await client
    .from("remediation_log")
    .select("*")
    .eq("site_id", siteId)
    .order("fixed_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToRemediation);
}

/**
 * Counts remediation rows for a site with `fixed_at >= sinceIso` — powers the
 * "issues resolved this month" metric. Uses a head/count query (no rows
 * returned). Throws on infra error.
 */
export async function countRemediatedSince(
  client: SupabaseClient,
  siteId: string,
  sinceIso: string
): Promise<number> {
  const { count, error } = await client
    .from("remediation_log")
    .select("*", { count: "exact", head: true })
    .eq("site_id", siteId)
    .gte("fixed_at", sinceIso);
  if (error) throw error;
  return count ?? 0;
}
