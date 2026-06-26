/**
 * lib/reports.ts — per-site MONTHLY rollup data layer (the v3.1 Reports table +
 * the Overview compliance-trend).
 *
 * `monthly_reports` is keyed by (site_id, period) where `period` is a UTC
 * 'YYYY-MM' string. Each row summarises one calendar month: the latest scan
 * score in that window, how many issues that scan found, and how many fixes were
 * logged inside the window. Rows are produced by a recompute job through the
 * SERVICE ROLE — the table has RLS on with a SELECT-only owner policy and NO
 * write policy (same shape as `leads` / `activity_log` / `remediation_log`), so
 * only the service key writes them. Owners READ their own rows through the authed
 * route; RLS makes cross-tenant reads impossible.
 *
 * Error discipline mirrors lib/sites.ts / lib/analytics.ts: a Supabase `error`
 * is an INFRA failure → THROW (the caller decides how to degrade).
 *
 * All date math is PURE and UTC-only (`periodOf`, `monthRange`) so it is
 * exhaustively unit-tested without a database and can never drift with the
 * server's local timezone.
 *
 * Honesty: this records measured history (scores + work done). It asserts no
 * WCAG/ADA "compliance" or "guarantee" — none of that copy lives here.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export interface MonthlyReport {
  siteId: string;
  period: string;
  score: number | null;
  issuesFound: number;
  issuesResolved: number;
  pdfUrl: string | null;
  computedAt: string;
}

/**
 * PURE: the UTC calendar month ('YYYY-MM') an ISO timestamp falls in. Uses the
 * UTC ISO string so a late-in-the-month instant never slips into a neighbouring
 * month because of the server's local timezone.
 */
export function periodOf(iso: string): string {
  return new Date(iso).toISOString().slice(0, 7);
}

/**
 * PURE: the half-open UTC range [startIso, endIso) covering one 'YYYY-MM' period
 * — the first instant of the month up to (but excluding) the first instant of
 * the next month. December correctly rolls the year forward. Half-open so a row
 * exactly on the next month's boundary belongs to the next period, never both.
 */
export function monthRange(period: string): { startIso: string; endIso: string } {
  const [yearStr, monthStr] = period.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr); // 1..12
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  // Date.UTC normalises month 12 (index) into January of the next year.
  const end = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

/** snake_case `monthly_reports` row → camelCase `MonthlyReport`. Tolerates a
 *  null score / pdf_url and missing counts. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rowToMonthlyReport(row: any): MonthlyReport {
  return {
    siteId: row.site_id,
    period: row.period,
    score: row.score ?? null,
    issuesFound:
      typeof row.issues_found === "number" ? row.issues_found : Number(row.issues_found ?? 0),
    issuesResolved:
      typeof row.issues_resolved === "number"
        ? row.issues_resolved
        : Number(row.issues_resolved ?? 0),
    pdfUrl: row.pdf_url ?? null,
    computedAt: row.computed_at,
  };
}

/**
 * Counts remediation rows whose `fixed_at` falls in the half-open window
 * [startIso, endIso). The window-bounded sibling of
 * `lib/remediation.countRemediatedSince` — kept here so the monthly recompute
 * can attribute fixes to a specific calendar month without editing
 * remediation.ts. Uses a head/count query (no rows returned). Throws on infra
 * error.
 */
export async function countRemediatedInRange(
  client: SupabaseClient,
  siteId: string,
  startIso: string,
  endIso: string
): Promise<number> {
  const { count, error } = await client
    .from("remediation_log")
    .select("*", { count: "exact", head: true })
    .eq("site_id", siteId)
    .gte("fixed_at", startIso)
    .lt("fixed_at", endIso);
  if (error) throw error;
  return count ?? 0;
}

/**
 * Recomputes one site's monthly rollup for `period` and UPSERTs it. MUST be
 * called with the SERVICE-ROLE client (the table is write-locked to the service
 * key). Within `monthRange(period)`:
 *  - `score`           = the latest scan's score in the window (null if no scan),
 *  - `issuesFound`     = that latest scan's `totals.total` (0 when unavailable),
 *  - `issuesResolved`  = remediation rows logged inside the window.
 * Returns the freshly upserted row. Throws on infra error.
 */
export async function recomputeMonthly(
  service: SupabaseClient,
  siteId: string,
  period: string
): Promise<MonthlyReport> {
  const { startIso, endIso } = monthRange(period);

  // Latest scan in the window (score + totals for the found-count).
  const { data: scanRow, error: scanErr } = await service
    .from("scans")
    .select("score, totals, created_at")
    .eq("site_id", siteId)
    .gte("created_at", startIso)
    .lt("created_at", endIso)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (scanErr) throw scanErr;

  const score: number | null =
    scanRow && typeof scanRow.score === "number" ? scanRow.score : null;
  const totalsTotal = scanRow?.totals?.total;
  const issuesFound =
    typeof totalsTotal === "number" && Number.isFinite(totalsTotal) ? totalsTotal : 0;

  const issuesResolved = await countRemediatedInRange(service, siteId, startIso, endIso);

  const upsertRow = {
    site_id: siteId,
    period,
    score,
    issues_found: issuesFound,
    issues_resolved: issuesResolved,
    computed_at: new Date().toISOString(),
  };

  const { data, error } = await service
    .from("monthly_reports")
    .upsert(upsertRow as never, { onConflict: "site_id,period" })
    .select("*")
    .single();
  if (error) throw error;
  return rowToMonthlyReport(data);
}

/**
 * Reads a site's monthly rollups, NEWEST period first. RLS scopes the read to
 * the caller's own sites. Throws on infra error (the authed route surfaces a
 * generic 500).
 */
export async function listMonthlyReports(
  client: SupabaseClient,
  siteId: string
): Promise<MonthlyReport[]> {
  const { data, error } = await client
    .from("monthly_reports")
    .select("*")
    .eq("site_id", siteId)
    .order("period", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToMonthlyReport);
}
