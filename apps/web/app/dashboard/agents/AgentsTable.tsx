/**
 * AgentsTable.tsx — client component rendering the portfolio table
 * and KPI metric cards.
 *
 * Faithfully ports mockup lines 473–486 from docs/makoya_v7.html.
 * All data is real (passed from the RSC page); no hard-coded numbers.
 *
 * Status → Pill mapping:
 *   active        → green  "Active"
 *   monitoring    → low    "Monitoring"
 *   action_needed → high   "Action needed"
 *
 * Score bar color:
 *   ≥ 80: green-ink
 *   ≥ 50: warn
 *   < 50:  danger
 */

"use client";

import Link from "next/link";
import type { AgentSummary } from "@/lib/portfolio";

interface AgentsTableProps {
  agents: AgentSummary[];
  kpis: {
    total: number;
    avgScore: number | null;
    openIssues: number;
    needAttention: number;
  };
}

function scoreColor(score: number | null): string {
  if (score === null) return "var(--border-ui)";
  if (score >= 80) return "var(--green-ink)";
  if (score >= 50) return "var(--warn)";
  return "var(--danger)";
}

function StatusPill({ status }: { status: AgentSummary["status"] }) {
  if (status === "active") {
    return (
      <span className="pill green">
        <i className="ti ti-check" aria-hidden="true" /> Active
      </span>
    );
  }
  if (status === "monitoring") {
    return (
      <span className="pill low">
        <i className="ti ti-activity" aria-hidden="true" /> Monitoring
      </span>
    );
  }
  return (
    <span className="pill high">
      <i className="ti ti-alert-octagon" aria-hidden="true" /> Action needed
    </span>
  );
}

export function AgentsTable({ agents, kpis }: AgentsTableProps) {
  return (
    <>
      {/* KPI cards */}
      <div className="grid4" style={{ marginBottom: 18 }}>
        <div className="mcard">
          <div className="l">
            <i className="ti ti-stack-2" aria-hidden="true" /> Total agents
          </div>
          <div className="big">{kpis.total}</div>
        </div>
        <div className="mcard">
          <div className="l">
            <i className="ti ti-gauge" aria-hidden="true" /> Avg score
          </div>
          <div className="big">
            {kpis.avgScore !== null ? (
              <>
                {kpis.avgScore}
                <span style={{ fontSize: 14, color: "var(--t3)" }}>/100</span>
              </>
            ) : (
              <span style={{ fontSize: 14, color: "var(--t3)" }}>—</span>
            )}
          </div>
        </div>
        <div className="mcard">
          <div className="l">
            <i className="ti ti-alert-triangle" aria-hidden="true" /> Open issues
          </div>
          <div className="big">{kpis.openIssues}</div>
        </div>
        <div className="mcard">
          <div className="l">
            <i className="ti ti-urgent" aria-hidden="true" /> Need attention
          </div>
          <div
            className="big"
            style={kpis.needAttention > 0 ? { color: "var(--danger)" } : undefined}
          >
            {kpis.needAttention}
          </div>
        </div>
      </div>

      {/* Agents table */}
      {agents.length === 0 ? (
        <div
          className="card cpad"
          style={{ textAlign: "center", padding: "40px 20px", color: "var(--t2)" }}
        >
          <i
            className="ti ti-robot"
            aria-hidden="true"
            style={{ fontSize: 32, display: "block", marginBottom: 10, color: "var(--t3)" }}
          />
          <p style={{ fontWeight: 700, color: "var(--deep)", marginBottom: 6 }}>
            No agents yet
          </p>
          <p style={{ fontSize: 13, maxWidth: 360, margin: "0 auto" }}>
            Add your first agent to scan a website and deploy the accessibility
            widget.
          </p>
        </div>
      ) : (
        <div className="tcard">
          <div
            className="thead"
            style={{
              gridTemplateColumns: "1.4fr 150px 110px 160px 130px 80px",
            }}
          >
            <div>Agent</div>
            <div>Status</div>
            <div>Plan</div>
            <div>Score</div>
            <div>Last audit</div>
            <div />
          </div>
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="trow"
              style={{ gridTemplateColumns: "1.4fr 150px 110px 160px 130px 80px" }}
            >
              {/* Agent name + domain */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  className="fav"
                  style={{ background: "var(--primary)" }}
                  aria-hidden="true"
                >
                  <i className="ti ti-globe" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: "var(--deep)" }}>
                    {agent.domain}
                  </div>
                  <div className="tiny muted">{agent.plan}</div>
                </div>
              </div>

              {/* Status */}
              <div>
                <StatusPill status={agent.status} />
              </div>

              {/* Plan */}
              <div className="tiny" style={{ fontWeight: 700 }}>
                {agent.plan === "pro"
                  ? "Growth"
                  : agent.plan === "managed"
                  ? "Scale"
                  : agent.plan === "free"
                  ? "Free"
                  : agent.plan}
              </div>

              {/* Score bar */}
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                {agent.score !== null ? (
                  <>
                    <div
                      className="bar"
                      role="img"
                      aria-label={`Score ${agent.score} of 100`}
                    >
                      <span
                        style={{
                          width: `${agent.score}%`,
                          background: scoreColor(agent.score),
                        }}
                      />
                    </div>
                    <b>{agent.score}</b>
                  </>
                ) : (
                  <span className="tiny muted">
                    {agent.installed ? "No data yet" : "Not installed"}
                  </span>
                )}
              </div>

              {/* Last audit */}
              <div className="tiny muted">
                {agent.installed
                  ? agent.lastAuditAt
                    ? agent.lastAuditAt
                    : "No audit yet"
                  : "Not installed"}
              </div>

              {/* Manage link */}
              <div>
                <Link
                  href={`/dashboard/${agent.id}`}
                  className="viewall"
                >
                  Manage
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
