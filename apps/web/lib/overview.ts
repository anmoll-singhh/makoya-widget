/**
 * lib/overview.ts — the v3.1 Overview screen assembler.
 *
 * The Overview is a read-only roll-up of signals that already have their own
 * lanes: issues (lib/issues), widget usage (lib/analytics), liveness
 * (lib/heartbeat), the recent-activity feed (lib/activity), and the monthly
 * history (lib/reports). This module deliberately owns NO storage of its own —
 * `getOverview` is a thin orchestrator that fans out to those data layers and
 * shapes their results with PURE helpers (`summarizeCoverage`, `streakDays`,
 * `trendDelta`) so every piece of logic is unit-tested without a database.
 *
 * Error discipline mirrors the consumed modules: any Supabase `error` they raise
 * is an INFRA failure and propagates → the authed route surfaces a generic 500.
 *
 * Honesty: "coverage" here is the share of tracked checks currently passing — a
 * descriptive metric, NOT a WCAG/ADA "compliance" or "guarantee" claim. None of
 * that copy lives here.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { listIssues, type IssueRecord, type IssueStatus } from "./issues";
import { getWidgetAnalytics } from "./analytics";
import { getHeartbeat, deriveInstallStatus, type InstallStatus } from "./heartbeat";
import { listActivity, type ActivityEntry } from "./activity";
import { listMonthlyReports, periodOf, monthRange, countRemediatedInRange } from "./reports";
import { getLatestScan } from "./scans";

export interface CoverageEntry {
  framework: string;
  pct: number;
}

export interface OverviewData {
  score: number | null;
  scoreDelta: number | null;
  status: InstallStatus;
  streakDays: number;
  openIssues: number;
  needsHuman: number;
  issuesResolvedThisMonth: number;
  widgetOpens: number;
  coverage: CoverageEntry[];
  trend: { period: string; score: number | null }[];
  activity: ActivityEntry[];
}

/** "Last seen within this many days" gate for an install to count toward a
 *  monitoring streak. Beyond it the widget is treated as quiet/removed. */
const STREAK_FRESH_MS = 2 * 24 * 60 * 60_000;
const DAY_MS = 24 * 60 * 60_000;
const ANALYTICS_WINDOW_DAYS = 30;
const ACTIVITY_LIMIT = 8;

/**
 * PURE: per-framework coverage percentage from the status-grouped issues.
 * For each framework, pct = passing / (passing + failing + needs_review) * 100,
 * rounded to a whole number (0 when the framework has no tracked checks).
 * Frameworks are returned in a STABLE alphabetical order so the UI never
 * reshuffles between renders. No I/O — fully unit-tested.
 */
export function summarizeCoverage(
  issues: Record<IssueStatus, IssueRecord[]>
): CoverageEntry[] {
  const tally = new Map<string, { passing: number; total: number }>();
  const bump = (rec: IssueRecord, isPassing: boolean) => {
    const cur = tally.get(rec.framework) ?? { passing: 0, total: 0 };
    cur.total += 1;
    if (isPassing) cur.passing += 1;
    tally.set(rec.framework, cur);
  };
  for (const rec of issues.passing) bump(rec, true);
  for (const rec of issues.failing) bump(rec, false);
  for (const rec of issues.needs_review) bump(rec, false);

  return [...tally.entries()]
    .map(([framework, { passing, total }]) => ({
      framework,
      pct: total > 0 ? Math.round((passing / total) * 100) : 0,
    }))
    .sort((a, b) => a.framework.localeCompare(b.framework));
}

/**
 * PURE: how many whole days the widget has been monitoring, end-to-end.
 * Returns 0 when the site was never installed (missing first/last seen) or when
 * the last heartbeat is stale (older than 2 days — the widget has gone quiet, so
 * the streak is broken). Otherwise the floored whole days from first_seen to
 * now. `nowMs` is injectable for deterministic tests. No I/O — fully unit-tested.
 */
export function streakDays(
  firstSeenIso: string | null,
  lastSeenIso: string | null,
  nowMs: number = Date.now()
): number {
  if (!firstSeenIso || !lastSeenIso) return 0;
  const lastSeen = Date.parse(lastSeenIso);
  if (!Number.isFinite(lastSeen) || nowMs - lastSeen > STREAK_FRESH_MS) return 0;
  const firstSeen = Date.parse(firstSeenIso);
  if (!Number.isFinite(firstSeen)) return 0;
  const days = Math.floor((nowMs - firstSeen) / DAY_MS);
  return days > 0 ? days : 0;
}

/**
 * PURE: the change in the compliance score = the latest point's score minus the
 * most recent NON-NULL score before it. Returns null when there are fewer than
 * two points, when the latest point's score is null, or when there is no earlier
 * non-null score to compare against. `trend` is expected in chronological order
 * (oldest → newest). No I/O — fully unit-tested.
 */
export function trendDelta(trend: { period: string; score: number | null }[]): number | null {
  if (trend.length < 2) return null;
  const latest = trend[trend.length - 1].score;
  if (latest == null) return null;
  for (let i = trend.length - 2; i >= 0; i--) {
    const prev = trend[i].score;
    if (prev != null) return latest - prev;
  }
  return null;
}

/**
 * Assembles the Overview view-model for one site. Thin orchestration only — it
 * fans out to the consumed data layers (read-only, RLS-scoped via the cookie
 * client) and delegates ALL shaping to the PURE helpers above. Any infra error
 * from a consumed module propagates so the authed route can surface a generic
 * 500.
 */
export async function getOverview(
  client: SupabaseClient,
  siteId: string
): Promise<OverviewData> {
  const nowIso = new Date().toISOString();
  const { startIso, endIso } = monthRange(periodOf(nowIso));

  const [issues, analytics, heartbeat, activity, monthly, latestScan, resolvedThisMonth] =
    await Promise.all([
      listIssues(client, siteId),
      getWidgetAnalytics(client, siteId, ANALYTICS_WINDOW_DAYS),
      getHeartbeat(client, siteId),
      listActivity(client, siteId, ACTIVITY_LIMIT),
      listMonthlyReports(client, siteId),
      getLatestScan(client, siteId),
      countRemediatedInRange(client, siteId, startIso, endIso),
    ]);

  // Trend in chronological order (listMonthlyReports is newest-first).
  const trend = [...monthly]
    .reverse()
    .map((m) => ({ period: m.period, score: m.score }));

  // Headline score: the latest monthly score when known, else the latest scan's.
  const latestMonthlyScore = monthly.length > 0 ? monthly[0].score : null;
  const score = latestMonthlyScore != null ? latestMonthlyScore : latestScan?.score ?? null;

  const openIssues = issues.failing.length + issues.needs_review.length;
  const needsHuman = issues.needs_review.length;

  const status = deriveInstallStatus({
    lastSeenAt: heartbeat?.lastSeenAt ?? null,
    latestScore: score,
  });

  return {
    score,
    scoreDelta: trendDelta(trend),
    status,
    streakDays: streakDays(heartbeat?.firstSeenAt ?? null, heartbeat?.lastSeenAt ?? null),
    openIssues,
    needsHuman,
    issuesResolvedThisMonth: resolvedThisMonth,
    widgetOpens: analytics.opens,
    coverage: summarizeCoverage(issues),
    trend,
    activity,
  };
}
