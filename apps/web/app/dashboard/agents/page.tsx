/**
 * app/dashboard/agents/page.tsx  (RSC)
 *
 * Portfolio screen — lists all agents (sites) for the authenticated owner with
 * real KPI cards and a table. Ports mockup lines 473–486 from makoya_v7.html.
 *
 * Data: fetched from GET /api/sites (which calls listAgents + portfolioKpis
 * server-side). This page is itself an RSC so it calls the lib functions directly
 * instead of adding a self-referential fetch — fewer round-trips.
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { listAgents, portfolioKpis } from "@/lib/portfolio";
import { AgentsTable } from "./AgentsTable";

export default async function AgentsPage() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard/agents");
  }

  // Fetch live portfolio data — errors propagate to Next.js error.tsx boundary
  const agents = await listAgents(supabase, user.id);
  const kpis = portfolioKpis(agents);

  return (
    <div className="wrap">
      {/* Page header + "New agent" CTA — verbatim copy from mockup lines 473–474 */}
      <div className="pagehead">
        Portfolio <b>Agents</b>
      </div>
      <div
        className="between"
        style={{ margin: "-8px 0 18px" }}
      >
        <p
          className="muted"
          style={{ fontSize: 13.5, maxWidth: 560 }}
        >
          Each agent is a website Makoya monitors. Add an agent to scan a site
          and deploy the widget.
        </p>
        <Link href="/dashboard/agents/new" className="btn pri">
          <i className="ti ti-plus" aria-hidden="true" /> New agent
        </Link>
      </div>

      <AgentsTable agents={agents} kpis={kpis} />
    </div>
  );
}
