/**
 * lib/issues.ts — persistent, trackable accessibility issues (the v3.1
 * Audit/Issues screen) data layer.
 *
 * Scans are immutable snapshots; the `issues` table is the LIFECYCLE view on top
 * of them. Each scan ingest upserts one row per failing rule (identity =
 * (site_id, rule_id)) and resolves rules that the latest scan no longer finds —
 * that diff is what powers the "issues resolved" signal. Owners then read their
 * issues grouped by status and can move an issue's status / assignee.
 *
 * Write/read split mirrors the other v3.1 lanes (heartbeat, analytics):
 *  - `upsertIssuesFromScan` is called from scan ingest with the SERVICE-ROLE
 *    client (the table has NO insert/general-write policy — only the service key
 *    writes the failing/resolved rows). It THROWS on infra error so the caller
 *    decides how to degrade.
 *  - `listIssues` / `updateIssue` take the cookie-bound client so RLS scopes
 *    every read/update to the owner's own sites. They THROW on infra error,
 *    matching lib/sites.ts discipline.
 *
 * The scan-row `issues` JSONB is grouped into four severity buckets
 * (`{ critical, serious, moderate, minor }`), each an array of
 * `AccessibilityIssue` (see apps/web/types/index.ts and
 * apps/web/lib/scanner/report-builder.ts). We flatten that here.
 *
 * Columns are snake_case in Postgres; `rowToIssue` converts to camelCase.
 *
 * Honesty: nothing here asserts any WCAG/ADA "compliance" or "guarantee" — these
 * are issue-tracking records (which rules are failing and their lifecycle).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

/** The three lifecycle states an issue can be in. */
export type IssueStatus = "failing" | "needs_review" | "passing";

/** camelCase view of an `issues` row. */
export interface IssueRecord {
  id: string;
  siteId: string;
  scanId: string | null;
  ruleId: string;
  wcagCriterion: string | null;
  framework: string;
  title: string;
  status: IssueStatus;
  checksPassing: number;
  checksTotal: number;
  assigneeId: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

/**
 * The minimum shape we read off a scan's grouped `issues` JSONB. We deliberately
 * keep this loose (the full type is `AccessibilityIssue`) so a pre-v2 stored scan
 * missing `wcag`/`instanceCount` still maps cleanly.
 */
interface ScanIssueLike {
  id: string;
  impact?: string | null;
  help?: string | null;
  description?: string | null;
  wcag?: { criterion?: string | null } | null;
  instanceCount?: number | null;
}

/** The grouped scan-row `issues` shape (four severity buckets of issues). */
export type GroupedScanIssues = {
  critical?: ScanIssueLike[];
  serious?: ScanIssueLike[];
  moderate?: ScanIssueLike[];
  minor?: ScanIssueLike[];
};

const SEVERITY_BUCKETS = ["critical", "serious", "moderate", "minor"] as const;

/**
 * PURE: map a scanner impact/severity to an issue lifecycle status.
 *  - critical / serious → "failing" (must-fix)
 *  - moderate / minor   → "needs_review"
 *  - unknown / null     → "needs_review" (never silently "passing")
 * Case-insensitive so "CRITICAL" and "critical" behave the same.
 */
export function severityToStatus(impact: string | null | undefined): IssueStatus {
  switch ((impact ?? "").toLowerCase()) {
    case "critical":
    case "serious":
      return "failing";
    case "moderate":
    case "minor":
      return "needs_review";
    default:
      return "needs_review";
  }
}

/**
 * PURE: which compliance framework a criterion belongs to. Today there is a
 * single source (WCAG), but keeping the seam means future ADA/AODA/EAA mapping
 * can slot in without changing call sites.
 */
export function frameworkForCriterion(_criterion: string | null): string {
  return "wcag";
}

/** snake_case `issues` row → camelCase `IssueRecord`. Tolerates null counts. */
export function rowToIssue(row: any): IssueRecord {
  return {
    id: row.id,
    siteId: row.site_id,
    scanId: row.scan_id ?? null,
    ruleId: row.rule_id,
    wcagCriterion: row.wcag_criterion ?? null,
    framework: row.framework,
    title: row.title,
    status: row.status as IssueStatus,
    checksPassing:
      typeof row.checks_passing === "number" ? row.checks_passing : Number(row.checks_passing ?? 0),
    checksTotal:
      typeof row.checks_total === "number" ? row.checks_total : Number(row.checks_total ?? 0),
    assigneeId: row.assignee_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    resolvedAt: row.resolved_at ?? null,
  };
}

/**
 * Flattens the grouped scan `issues` into per-rule upsert rows. The severity is
 * read from each issue's own `impact`, falling back to its bucket name (a
 * bucketed-but-null-impact issue still gets the right status).
 */
function flattenScanIssues(
  siteId: string,
  scanId: string,
  grouped: GroupedScanIssues,
  nowIso: string
): Array<Record<string, unknown>> {
  const rows: Array<Record<string, unknown>> = [];
  const seen = new Set<string>();
  for (const bucket of SEVERITY_BUCKETS) {
    const list = grouped[bucket] ?? [];
    for (const issue of list) {
      if (!issue || !issue.id || seen.has(issue.id)) continue; // dedupe per rule
      seen.add(issue.id);
      const criterion = issue.wcag?.criterion ?? null;
      const instances =
        typeof issue.instanceCount === "number" && Number.isFinite(issue.instanceCount)
          ? issue.instanceCount
          : 0;
      rows.push({
        site_id: siteId,
        scan_id: scanId,
        rule_id: issue.id,
        wcag_criterion: criterion,
        framework: frameworkForCriterion(criterion),
        title: issue.help || issue.description || issue.id,
        status: severityToStatus(issue.impact ?? bucket),
        // All counted instances are currently failing → none passing yet.
        checks_passing: 0,
        checks_total: instances,
        resolved_at: null, // re-found this scan → clear any prior resolution
        updated_at: nowIso, // upsert-on-update won't fire the column default
      });
    }
  }
  return rows;
}

/**
 * Upserts the failing rules from one scan, then resolves rules the scan no longer
 * finds. MUST be called with the SERVICE-ROLE client (the table is write-locked
 * to the service key). Returns `{ upserted, resolved }`. Throws on infra error.
 */
export async function upsertIssuesFromScan(
  service: SupabaseClient,
  siteId: string,
  scanId: string,
  scanIssues: GroupedScanIssues
): Promise<{ upserted: number; resolved: number }> {
  const nowIso = new Date().toISOString();
  const rows = flattenScanIssues(siteId, scanId, scanIssues, nowIso);

  // 1. Upsert the currently-failing rules on (site_id, rule_id).
  if (rows.length > 0) {
    const { error } = await service
      .from("issues")
      .upsert(rows as never, { onConflict: "site_id,rule_id" });
    if (error) throw error;
  }

  // 2. Resolve open issues this scan no longer reports. Read current non-passing
  //    rules, diff against the found set in JS (avoids PostgREST `in`-quoting of
  //    text rule ids), then mark the stale ones passing.
  const foundRuleIds = new Set(rows.map((r) => r.rule_id as string));
  const { data: openRows, error: openErr } = await service
    .from("issues")
    .select("id, rule_id")
    .eq("site_id", siteId)
    .neq("status", "passing");
  if (openErr) throw openErr;

  const staleIds = (openRows ?? [])
    .filter((r: any) => !foundRuleIds.has(r.rule_id))
    .map((r: any) => r.id);

  let resolved = 0;
  if (staleIds.length > 0) {
    const { error: resErr } = await service
      .from("issues")
      .update({ status: "passing", resolved_at: nowIso, updated_at: nowIso })
      .in("id", staleIds);
    if (resErr) throw resErr;
    resolved = staleIds.length;
  }

  return { upserted: rows.length, resolved };
}

/**
 * Reads the owner's issues for one site, grouped by status. RLS scopes the read
 * to the caller's own sites. Throws on infra error (the authed route surfaces a
 * generic 500).
 */
export async function listIssues(
  client: SupabaseClient,
  siteId: string
): Promise<Record<IssueStatus, IssueRecord[]>> {
  const { data, error } = await client.from("issues").select("*").eq("site_id", siteId);
  if (error) throw error;

  const grouped: Record<IssueStatus, IssueRecord[]> = {
    failing: [],
    needs_review: [],
    passing: [],
  };
  for (const row of data ?? []) {
    const rec = rowToIssue(row);
    grouped[rec.status].push(rec);
  }
  return grouped;
}

/**
 * Updates only `status` and/or `assignee_id` on one issue. With the cookie-bound
 * client the owner-update RLS policy enforces tenancy (a row the caller doesn't
 * own simply matches nothing). Throws on infra error.
 */
export async function updateIssue(
  client: SupabaseClient,
  issueId: string,
  patch: { status?: IssueStatus; assigneeId?: string | null }
): Promise<void> {
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.status !== undefined) update.status = patch.status;
  if (patch.assigneeId !== undefined) update.assignee_id = patch.assigneeId;

  const { error } = await client.from("issues").update(update as never).eq("id", issueId);
  if (error) throw error;
}
