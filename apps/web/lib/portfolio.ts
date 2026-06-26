/**
 * lib/portfolio.ts — per-owner agent portfolio roll-up.
 *
 * "Agents" is the v7 term for a site that a Makoya customer has registered and
 * is monitoring. The portfolio roll-up combines the per-site data from
 * `lib/sites.ts` (domain, plan, owner) with the per-site runtime signals from
 * `lib/overview.ts` (score, open issues, install status) into a single flat
 * `AgentSummary` that drives the `/dashboard/agents` portfolio table and KPI cards.
 *
 * Design choices:
 *  - We use `Promise.all` over all sites to parallelise the per-site overview
 *    reads instead of sequential fan-out (avoids the wall-clock N+1, although each
 *    `getOverview` is itself a multi-query fan-out). Correctness first; a future
 *    optimisation could batch the inner reads.
 *  - If `getOverview` throws for ONE site we catch it and return a DEGRADED
 *    summary (status:action_needed, score:null, installed:false) rather than
 *    failing the whole portfolio. A broken overview must never blank the list.
 *  - `name` is derived from `domain` because the `sites` table has no `name`
 *    column. No migration is needed.
 *
 * Status derivation rule (documented for auditors):
 *   InstallStatus 'active'        → AgentStatus 'active'        (installed:true)
 *   InstallStatus 'monitoring'    → AgentStatus 'monitoring'    (installed:true)
 *   InstallStatus 'action_needed' → AgentStatus 'action_needed' (installed:true)
 *   InstallStatus 'not_installed' → AgentStatus 'action_needed' (installed:false)
 *
 * Honesty: nothing here asserts WCAG/ADA "compliance" — these are monitoring
 * and install signals only.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { listSites } from "./sites";
import { getOverview } from "./overview";

/**
 * Per-agent summary powering the portfolio table and KPI cards.
 * `name` is always the domain (derived display name — no DB name column).
 * `status` is a 3-value subset of InstallStatus (not_installed folds to action_needed).
 */
export interface AgentSummary {
  id: string;
  name: string;
  domain: string;
  plan: string;
  status: "active" | "monitoring" | "action_needed";
  score: number | null;
  openIssues: number;
  lastAuditAt: string | null;
  installed: boolean;
}

/**
 * Builds the per-agent summary list for one owner. Parallel fan-out over sites;
 * per-site failures degrade gracefully instead of aborting the whole list.
 */
export async function listAgents(
  client: SupabaseClient,
  ownerId: string
): Promise<AgentSummary[]> {
  const sites = await listSites(client, ownerId);

  return Promise.all(
    sites.map(async (site): Promise<AgentSummary> => {
      try {
        const overview = await getOverview(client, site.id);

        // Status derivation: not_installed collapses into action_needed because an
        // unprotected site is the most urgent state for the owner to act on.
        const installed = overview.status !== "not_installed";
        const status: AgentSummary["status"] =
          overview.status === "active"
            ? "active"
            : overview.status === "monitoring"
            ? "monitoring"
            : "action_needed";

        // lastAuditAt: take the most recent trend period ("YYYY-MM") when present.
        // Trend is stored newest-last by getOverview (it reverses listMonthlyReports).
        const lastAuditAt =
          overview.trend.length > 0
            ? overview.trend[overview.trend.length - 1].period
            : null;

        return {
          id: site.id,
          name: site.domain, // no name column — domain is the display label
          domain: site.domain,
          plan: site.plan,
          status,
          score: overview.score,
          openIssues: overview.openIssues,
          lastAuditAt,
          installed,
        };
      } catch {
        // Per-site overview failure → degrade to a safe summary rather than
        // bubbling up and blanking the entire portfolio list.
        return {
          id: site.id,
          name: site.domain,
          domain: site.domain,
          plan: site.plan,
          status: "action_needed",
          score: null,
          openIssues: 0,
          lastAuditAt: null,
          installed: false,
        };
      }
    })
  );
}

/**
 * Pure KPI aggregation over an agent list.
 *   total         — number of agents
 *   avgScore      — mean of non-null scores, rounded; null when all scores are null
 *   openIssues    — sum of per-agent openIssues
 *   needAttention — count of agents with status === 'action_needed'
 */
export function portfolioKpis(agents: AgentSummary[]): {
  total: number;
  avgScore: number | null;
  openIssues: number;
  needAttention: number;
} {
  const total = agents.length;

  const scores = agents
    .map((a) => a.score)
    .filter((s): s is number => s !== null);
  const avgScore =
    scores.length > 0
      ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
      : null;

  const openIssues = agents.reduce((sum, a) => sum + a.openIssues, 0);
  const needAttention = agents.filter((a) => a.status === "action_needed").length;

  return { total, avgScore, openIssues, needAttention };
}
