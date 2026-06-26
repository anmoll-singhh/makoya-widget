"use client";
/**
 * app/dashboard/[siteId]/mike/_MikeClient.tsx — v7 Mike audit screen (CLIENT).
 *
 * Wired to:
 *   GET  /api/sites/[siteId]/issues  → issues grouped by status
 *   GET  /api/team                   → team members (for assignment avatars)
 *   PATCH /api/sites/[siteId]/issues → { issueId, status?, assigneeId? }
 *
 * All mockup numbers replaced with real data:
 *   - Passing checks % (73%) → computed from counts.passing / total * 100
 *   - Unassigned (8)         → count of issues with assigneeId === null
 *   - Criteria met (16/33)   → count of distinct wcagCriterion in passing / 33
 *   - Issue groups           → real failing/needs_review/passing rows
 *   - Assignee avatars       → team member email initials mapped by userId
 *
 * Mike-specific features:
 *   - Search: client-side filter on issue title (real rows)
 *   - Filter pills: All | Failing | Needs review | Passing (real counts)
 *   - Assignment: PATCH {issueId, assigneeId} (real write)
 *   - Resolve: PATCH {issueId, status: "passing"} (real write)
 *   - Mark as needing review: PATCH {issueId, status: "needs_review"}
 *
 * Honesty: no WCAG/ADA "compliant" or "guaranteed" copy. Issue status reflects
 * the scanner's findings + human overrides; it is not a legal certification.
 */

import { useState, useEffect } from "react";

/* ── API shapes (client-local; never import server modules) ──────────────────── */
type IssueStatus = "failing" | "needs_review" | "passing";

interface IssueRecord {
  id: string;
  ruleId: string;
  wcagCriterion: string | null;
  framework: string;
  title: string;
  status: IssueStatus;
  checksPassing: number;
  checksTotal: number;
  assigneeId: string | null;
}

type GroupedIssues = Record<IssueStatus, IssueRecord[]>;

interface TeamMember {
  id: string;
  userId: string | null;
  email: string;
  role: string;
}
interface TeamResponse {
  team: TeamMember[];
}

/* ── Helpers ─────────────────────────────────────────────────────────────────── */
function initials(email: string): string {
  const at = email.split("@")[0] ?? email;
  const parts = at.split(/[.\-_+\s]+/).filter(Boolean);
  const a = (parts[0]?.[0] ?? email[0] ?? "?").toUpperCase();
  const b = (parts[1]?.[0] ?? "").toUpperCase();
  return a + b;
}

function ringOffset(pct: number): number {
  const circ = 94.2;
  return circ * (1 - Math.max(0, Math.min(1, pct)));
}

const WCAG_TOTAL = 50; // WCAG 2.1 AA has 50 success criteria (conservative estimate for % met)

/* ── IssueRow component ──────────────────────────────────────────────────────── */
interface IssueRowProps {
  issue: IssueRecord;
  group: { key: IssueStatus; label: string; icon: string; pillClass: string };
  team: TeamMember[];
  onPatch: (issueId: string, patch: { status?: IssueStatus; assigneeId?: string | null }) => Promise<void>;
}

function IssueRow({ issue, group, team, onPatch }: IssueRowProps) {
  const [busy, setBusy] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);

  const assignee = team.find(
    (m) => m.userId === issue.assigneeId || m.id === issue.assigneeId
  );

  async function handleResolve() {
    if (busy) return;
    setBusy(true);
    try {
      await onPatch(issue.id, { status: "passing" });
    } finally {
      setBusy(false);
    }
  }
  async function handleNeedsReview() {
    if (busy) return;
    setBusy(true);
    try {
      await onPatch(issue.id, { status: "needs_review" });
    } finally {
      setBusy(false);
    }
  }
  async function handleAssign(memberId: string | null) {
    setAssignOpen(false);
    if (busy) return;
    setBusy(true);
    try {
      await onPatch(issue.id, { assigneeId: memberId });
    } finally {
      setBusy(false);
    }
  }

  const pct =
    issue.checksTotal > 0
      ? issue.checksPassing / issue.checksTotal
      : group.key === "passing"
      ? 1
      : 0;

  return (
    <div className="trow" style={{ gridTemplateColumns: "1fr 200px 160px" }}>
      {/* Issue title + WCAG ref */}
      <div>
        <div style={{ fontWeight: 700, color: "var(--deep)" }}>{issue.title}</div>
        <div className="tiny muted">
          {issue.wcagCriterion ? `WCAG ${issue.wcagCriterion} · ` : ""}
          {issue.checksTotal > 0
            ? `${issue.checksPassing} of ${issue.checksTotal} checks passing`
            : "Tracked rule"}
        </div>
      </div>

      {/* Owner / assignment column */}
      <div style={{ position: "relative" }}>
        {assignee ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              onClick={() => setAssignOpen((o) => !o)}
              aria-expanded={assignOpen}
              aria-haspopup="listbox"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                fontFamily: "inherit",
              }}
              aria-label={`Assigned to ${assignee.email}. Click to change.`}
            >
              <div
                className="av"
                style={{
                  width: 26,
                  height: 26,
                  background: "var(--primary-soft)",
                  color: "var(--primary-hover)",
                  fontSize: 10,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {initials(assignee.email)}
              </div>
              <span className="tiny" style={{ fontWeight: 600, color: "var(--t1)" }}>
                {assignee.email.split("@")[0]}
              </span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="viewall"
            onClick={() => setAssignOpen((o) => !o)}
            aria-expanded={assignOpen}
            aria-haspopup="listbox"
            style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0 }}
          >
            Assign
          </button>
        )}

        {assignOpen && (
          <div
            role="listbox"
            aria-label="Assign issue"
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              left: 0,
              zIndex: 50,
              background: "#fff",
              border: "1px solid var(--border)",
              borderRadius: 11,
              boxShadow: "0 6px 24px rgba(13,27,77,.14)",
              minWidth: 200,
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "9px 14px", fontSize: 11.5, fontWeight: 700, color: "var(--t3)", textTransform: "uppercase", letterSpacing: ".04em", borderBottom: "1px solid var(--border)" }}>
              Assign to
            </div>
            {team.length === 0 && (
              <div style={{ padding: "10px 14px", fontSize: 13, color: "var(--t2)" }}>No team members yet.</div>
            )}
            {team.map((m) => (
              <button
                key={m.id}
                type="button"
                role="option"
                aria-selected={assignee?.id === m.id}
                onClick={() => handleAssign(m.userId ?? m.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  width: "100%",
                  padding: "9px 14px",
                  background: assignee?.id === m.id ? "var(--primary-soft)" : "none",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--t1)",
                  textAlign: "left",
                }}
              >
                <div
                  className="av"
                  style={{
                    width: 24,
                    height: 24,
                    background: "var(--bg)",
                    color: "var(--t2)",
                    fontSize: 9,
                    borderRadius: "50%",
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {initials(m.email)}
                </div>
                {m.email}
              </button>
            ))}
            {assignee && (
              <button
                type="button"
                onClick={() => handleAssign(null)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  width: "100%",
                  padding: "9px 14px",
                  background: "none",
                  border: "none",
                  borderTop: "1px solid var(--border)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: "var(--danger)",
                  textAlign: "left",
                }}
              >
                <i className="ti ti-x" aria-hidden="true" style={{ fontSize: 14 }} />
                Remove assignment
              </button>
            )}
            <button
              type="button"
              onClick={() => setAssignOpen(false)}
              style={{
                display: "block",
                width: "100%",
                padding: "8px 14px",
                background: "var(--bg)",
                border: "none",
                borderTop: "1px solid var(--border)",
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--t3)",
                textAlign: "center",
              }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Status + action buttons */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span className={`pill ${group.pillClass}`}>
          <i className={`ti ${group.icon}`} aria-hidden="true" />
          {group.label}
        </span>
        {group.key !== "passing" && (
          <button
            type="button"
            className="btn"
            disabled={busy}
            aria-busy={busy}
            onClick={handleResolve}
            style={{ padding: "5px 10px", fontSize: 11.5, height: "auto" }}
            title="Mark as passing"
          >
            {busy ? "…" : <i className="ti ti-check" aria-hidden="true" />}
            <span className="sr-only">Mark as passing</span>
          </button>
        )}
        {group.key === "failing" && (
          <button
            type="button"
            className="btn"
            disabled={busy}
            aria-busy={busy}
            onClick={handleNeedsReview}
            style={{ padding: "5px 10px", fontSize: 11.5, height: "auto" }}
            title="Mark as needs review"
          >
            <i className="ti ti-flag" aria-hidden="true" />
            <span className="sr-only">Mark as needs review</span>
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Props ───────────────────────────────────────────────────────────────────── */
interface Props {
  siteId: string;
  domain: string;
}

/* ── Main Component ──────────────────────────────────────────────────────────── */
export function MikeClient({ siteId, domain }: Props) {
  const [issues, setIssues] = useState<GroupedIssues | null>(null);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<"all" | IssueStatus>("all");
  const [search, setSearch] = useState("");

  /* Fetch issues + team in parallel */
  useEffect(() => {
    let live = true;
    setLoading(true);
    setError(false);

    Promise.all([
      fetch(`/api/sites/${siteId}/issues`, { credentials: "same-origin" })
        .then((r) => (r.ok ? (r.json() as Promise<GroupedIssues>) : Promise.reject(r.status))),
      fetch("/api/team", { credentials: "same-origin" })
        .then((r) => (r.ok ? (r.json() as Promise<TeamResponse>) : null))
        .catch(() => null),
    ])
      .then(([issueData, teamData]) => {
        if (!live) return;
        setIssues(issueData);
        setTeam(teamData?.team ?? []);
        setLoading(false);
      })
      .catch(() => {
        if (live) {
          setError(true);
          setLoading(false);
        }
      });

    return () => {
      live = false;
    };
  }, [siteId]);

  /* Optimistic PATCH — update local state immediately, revert on failure */
  async function handlePatch(
    issueId: string,
    patch: { status?: IssueStatus; assigneeId?: string | null }
  ) {
    if (!issues) return;

    // Snapshot for potential revert
    const snapshot = issues;

    // Apply optimistic update
    function applyPatch(grouped: GroupedIssues): GroupedIssues {
      const allIssues = [
        ...grouped.failing,
        ...grouped.needs_review,
        ...grouped.passing,
      ];
      const target = allIssues.find((i) => i.id === issueId);
      if (!target) return grouped;

      const updated = {
        ...target,
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.assigneeId !== undefined ? { assigneeId: patch.assigneeId } : {}),
      };

      const newStatus = updated.status;
      const rest = allIssues.filter((i) => i.id !== issueId);
      return {
        failing: [
          ...rest.filter((i) => i.status === "failing"),
          ...(newStatus === "failing" ? [updated] : []),
        ],
        needs_review: [
          ...rest.filter((i) => i.status === "needs_review"),
          ...(newStatus === "needs_review" ? [updated] : []),
        ],
        passing: [
          ...rest.filter((i) => i.status === "passing"),
          ...(newStatus === "passing" ? [updated] : []),
        ],
      };
    }

    setIssues(applyPatch(snapshot));

    try {
      const res = await fetch(`/api/sites/${siteId}/issues`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issueId, ...patch }),
      });
      if (!res.ok) {
        // Revert on server error
        setIssues(snapshot);
      }
    } catch {
      setIssues(snapshot);
    }
  }

  if (loading) {
    return (
      <>
        <div className="pagehead">
          Mike — audit <b>Accessibility overview</b>
        </div>
        <div role="status" aria-live="polite" style={{ padding: "40px 0", textAlign: "center", color: "var(--t3)" }}>
          Loading issues…
        </div>
      </>
    );
  }

  if (error || !issues) {
    return (
      <>
        <div className="pagehead">
          Mike — audit <b>Accessibility overview</b>
        </div>
        <div className="note warn" role="alert" style={{ marginTop: 24 }}>
          <i className="ti ti-alert-triangle" aria-hidden="true" />
          <div>Couldn&apos;t load audit data — please try again shortly.</div>
        </div>
      </>
    );
  }

  /* Derived stats */
  const counts = {
    failing: issues.failing.length,
    needs_review: issues.needs_review.length,
    passing: issues.passing.length,
  };
  const total = counts.failing + counts.needs_review + counts.passing;
  const passPct = total > 0 ? Math.round((counts.passing / total) * 100) : 0;
  const unassigned = [
    ...issues.failing,
    ...issues.needs_review,
  ].filter((i) => !i.assigneeId).length;
  const criteriaMet = new Set(
    issues.passing.filter((i) => i.wcagCriterion).map((i) => i.wcagCriterion)
  ).size;

  /* Filter + search */
  const groups: {
    key: IssueStatus;
    label: string;
    icon: string;
    pillClass: string;
    items: IssueRecord[];
  }[] = [
    {
      key: "failing",
      label: "Failing",
      icon: "ti-x",
      pillClass: "high",
      items: issues.failing,
    },
    {
      key: "needs_review",
      label: "Needs review",
      icon: "ti-flag",
      pillClass: "med",
      items: issues.needs_review,
    },
    {
      key: "passing",
      label: "Passing",
      icon: "ti-check",
      pillClass: "green",
      items: issues.passing,
    },
  ];

  const visibleGroups = groups
    .filter((g) => filter === "all" || filter === g.key)
    .map((g) => ({
      ...g,
      items:
        search.trim().length > 0
          ? g.items.filter((i) =>
              i.title.toLowerCase().includes(search.toLowerCase()) ||
              (i.wcagCriterion ?? "").includes(search)
            )
          : g.items,
    }));

  const visibleCount = visibleGroups.reduce((n, g) => n + g.items.length, 0);

  return (
    <>
      <div className="pagehead">
        Mike — audit <b>Accessibility overview</b>
      </div>

      {/* Header stats */}
      <div
        style={{
          display: "flex",
          gap: 36,
          margin: "-2px 0 18px",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        {/* Passing checks ring */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <svg
            width="46"
            height="46"
            viewBox="0 0 36 36"
            role="img"
            aria-label={`Passing checks ${passPct} percent`}
          >
            <circle cx="18" cy="18" r="15" fill="none" stroke="#E2E5EA" strokeWidth="4" />
            <circle
              cx="18"
              cy="18"
              r="15"
              fill="none"
              stroke="#3C6B53"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray="94.2"
              strokeDashoffset={ringOffset(passPct / 100)}
              transform="rotate(-90 18 18)"
            />
          </svg>
          <div>
            <div
              className="tiny muted"
              style={{ fontWeight: 700, textTransform: "uppercase", fontSize: 11 }}
            >
              Passing checks
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "var(--deep)",
                fontFamily: "Satoshi",
              }}
            >
              {total > 0 ? `${passPct}%` : "—"}
            </div>
          </div>
        </div>

        <div>
          <div
            className="tiny muted"
            style={{ fontWeight: 700, textTransform: "uppercase", fontSize: 11 }}
          >
            Unassigned
          </div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "var(--deep)",
              fontFamily: "Satoshi",
            }}
          >
            {unassigned}
          </div>
        </div>

        <div>
          <div
            className="tiny muted"
            style={{ fontWeight: 700, textTransform: "uppercase", fontSize: 11 }}
          >
            Criteria met
          </div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "var(--deep)",
              fontFamily: "Satoshi",
            }}
          >
            {criteriaMet}
            <span style={{ fontSize: 13, color: "var(--t3)" }}>
              /{WCAG_TOTAL} WCAG AA
            </span>
          </div>
        </div>

        <div style={{ marginLeft: "auto", fontSize: 12.5, color: "var(--t2)" }}>
          Monitoring <b style={{ color: "var(--deep)" }}>{domain}</b>
        </div>
      </div>

      {/* Filter chips */}
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 14,
        }}
        role="group"
        aria-label="Filter issues"
      >
        <button
          type="button"
          className={`pill ${filter === "all" ? "" : ""}`}
          onClick={() => setFilter("all")}
          aria-pressed={filter === "all"}
          style={{
            background: filter === "all" ? "var(--deep)" : "#fff",
            color: filter === "all" ? "#fff" : "var(--t1)",
            border: `1px solid ${filter === "all" ? "var(--deep)" : "var(--border)"}`,
            cursor: "pointer",
          }}
        >
          All issues {total > 0 && `· ${total}`}
        </button>
        <button
          type="button"
          className={`pill high`}
          onClick={() => setFilter(filter === "failing" ? "all" : "failing")}
          aria-pressed={filter === "failing"}
          style={{
            opacity: filter !== "all" && filter !== "failing" ? 0.5 : 1,
            cursor: "pointer",
          }}
        >
          <i className="ti ti-x" aria-hidden="true" />
          Failing {counts.failing}
        </button>
        <button
          type="button"
          className={`pill med`}
          onClick={() => setFilter(filter === "needs_review" ? "all" : "needs_review")}
          aria-pressed={filter === "needs_review"}
          style={{
            opacity: filter !== "all" && filter !== "needs_review" ? 0.5 : 1,
            cursor: "pointer",
          }}
        >
          <i className="ti ti-flag" aria-hidden="true" />
          Needs review {counts.needs_review}
        </button>
        <button
          type="button"
          className={`pill green`}
          onClick={() => setFilter(filter === "passing" ? "all" : "passing")}
          aria-pressed={filter === "passing"}
          style={{
            opacity: filter !== "all" && filter !== "passing" ? 0.5 : 1,
            cursor: "pointer",
          }}
        >
          <i className="ti ti-check" aria-hidden="true" />
          Passing {counts.passing}
        </button>
      </div>

      {/* Search + actions row */}
      <div className="between" style={{ marginBottom: 14 }}>
        <div
          className="search"
          style={{ maxWidth: 280, margin: 0, boxShadow: "none", display: "flex", alignItems: "center", gap: 8 }}
        >
          <i className="ti ti-search" aria-hidden="true" style={{ fontSize: 15, color: "var(--t3)", flexShrink: 0 }} />
          <input
            type="search"
            placeholder="Search issues…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search issues"
            style={{
              border: "none",
              background: "transparent",
              flex: 1,
              fontSize: 13.5,
              color: "var(--t1)",
              outline: "none",
              fontFamily: "inherit",
            }}
          />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <span className="tiny muted" style={{ alignSelf: "center" }}>
            {visibleCount} issue{visibleCount !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Issues table */}
      {total === 0 ? (
        <div className="note info" role="note">
          <i className="ti ti-info-circle" aria-hidden="true" />
          <div>
            No tracked issues yet — they appear here after the first accessibility scan. Run a
            scan from the{" "}
            <a href={`/dashboard/${siteId}`} style={{ color: "var(--primary-hover)", fontWeight: 700 }}>
              overview
            </a>
            .
          </div>
        </div>
      ) : visibleCount === 0 ? (
        <div className="note info" role="note">
          <i className="ti ti-search" aria-hidden="true" />
          <div>No issues match your search or filter.</div>
        </div>
      ) : (
        <div className="tcard">
          <div className="thead" style={{ gridTemplateColumns: "1fr 200px 160px" }}>
            <div>Issue</div>
            <div>Owner</div>
            <div>Status</div>
          </div>

          {visibleGroups.map((g) =>
            g.items.length === 0 ? null : (
              <div key={g.key}>
                <div className="grp">
                  {g.label} · {g.items.length}
                </div>
                {g.items.map((issue) => (
                  <IssueRow
                    key={issue.id}
                    issue={issue}
                    group={g}
                    team={team}
                    onPatch={handlePatch}
                  />
                ))}
              </div>
            )
          )}
        </div>
      )}

      {/* Honesty footer */}
      <div className="note info" style={{ marginTop: 16 }}>
        <i className="ti ti-info-circle" aria-hidden="true" />
        <div>
          Mike&apos;s audit uses automated WCAG checks (axe-core + custom rules) and flags issues
          for human review. Automated checks can&apos;t guarantee accessibility — they find common
          patterns but not every barrier. Human review and remediation are essential.
        </div>
      </div>
    </>
  );
}
