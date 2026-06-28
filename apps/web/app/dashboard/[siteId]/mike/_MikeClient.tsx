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
 *   - Status filter pills: All | Failing | Needs review | Passing (real counts)
 *   - WCAG version filter: All | 2.0 | 2.1 | 2.2 (computed from wcagCriterion)
 *   - Assignment: PATCH {issueId, assigneeId} (real write)
 *   - Resolve: PATCH {issueId, status: "passing"} (real write)
 *   - Mark as needing review: PATCH {issueId, status: "needs_review"}
 *   - Rich detail: each issue row is expandable (accessible disclosure:
 *     button with aria-expanded controlling a region) to reveal:
 *     · WCAG version badge (2.0 / 2.1 / 2.2) next to the criterion ref
 *     · what it means / who it affects (plain-language, jargon-free)
 *     · disability groups (structured audience tags, rendered as chips)
 *     · how to fix (concrete, action-oriented, often with inline code examples)
 *     · code snippet: CSS selector path + offending DOM node html from the
 *       scanner (derived from stored measuredEvidence/nodes; omitted gracefully
 *       when unavailable — we never fabricate code)
 *     · measured evidence (e.g. "Contrast 2.3:1 — needs 4.5:1")
 *     All content mirrors the public ScanResults / IssueCard structure.
 *
 * WCAG version classification (pure, client-side):
 *   getWcagVersion("1.4.3")  → "2.0"
 *   getWcagVersion("1.4.10") → "2.1"  (Reflow, added in WCAG 2.1)
 *   getWcagVersion("2.5.8")  → "2.2"  (Target Size Minimum, added in 2.2)
 *   getWcagVersion(null)     → null
 *
 * Honesty: no WCAG/ADA "compliant" or "guaranteed" copy. Issue status reflects
 * the scanner's findings + human overrides; it is not a legal certification.
 */

import { useState, useEffect } from "react";

/* ── WCAG version classifier (pure, no I/O, safe in client components) ───────── */
type WcagVersion = "2.0" | "2.1" | "2.2";

/** Criteria introduced in WCAG 2.2 (source: W3C WCAG 2.2 spec). */
const WCAG_22 = new Set([
  "2.4.11","2.4.12","2.4.13",
  "2.5.7","2.5.8",
  "3.2.6",
  "3.3.7","3.3.8","3.3.9",
]);

/** Criteria introduced in WCAG 2.1 (source: W3C WCAG 2.1 spec). */
const WCAG_21 = new Set([
  "1.3.4","1.3.5","1.3.6",
  "1.4.10","1.4.11","1.4.12","1.4.13",
  "2.1.4",
  "2.2.6",
  "2.5.1","2.5.2","2.5.3","2.5.4",
  "4.1.3",
]);

/** Maps a WCAG SC number to its version, or null for non-criterion input. */
function getWcagVersion(criterion: string | null | undefined): WcagVersion | null {
  if (!criterion || !/^\d+\.\d+\.\d+$/.test(criterion)) return null;
  if (WCAG_22.has(criterion)) return "2.2";
  if (WCAG_21.has(criterion)) return "2.1";
  return "2.0";
}

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
  /* Rich plain-language detail — populated by the GET issues API from the
     latest scan's JSONB or the curated rule MAP. null when unavailable. */
  whatItMeans: string | null;
  whoItAffects: string | null;
  disabilityGroups: string[];
  howToFix: string | null;
  measuredEvidence: string | null;
  /** First offending DOM node html from the scanner, or null if unavailable. */
  codeSnippet: string | null;
  /** CSS selector path for the first offending node (joined target array),
   *  or null when the scanner did not capture node evidence. */
  codeSelector: string | null;
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

// NOTE: WCAG_TOTAL is NOT hardcoded — it is derived at render time from the distinct
// wcagCriterion values present across all issues (failing + needs_review + passing),
// i.e. the criteria the scanner actually checked. See `trackedCriteria` below.

/** Short human labels for the structured disability-group keys the scanner emits.
 *  Mirrors IssueCard.tsx / plain-language.ts so badges render consistently. */
const DISABILITY_LABELS: Record<string, string> = {
  blind: "Blind",
  "low-vision": "Low vision",
  "color-blind": "Colour blindness",
  "deaf-hard-of-hearing": "Deaf / HoH",
  motor: "Motor",
  cognitive: "Cognitive",
  vestibular: "Motion sensitivity",
  speech: "Speech",
};

/** Version badge colours: subtle, distinct, non-alarming. */
const WCAG_VERSION_STYLE: Record<WcagVersion, { bg: string; color: string }> = {
  "2.0": { bg: "var(--bg)", color: "var(--t2)" },
  "2.1": { bg: "var(--primary-soft)", color: "var(--primary-hover)" },
  "2.2": { bg: "var(--green-soft)", color: "var(--green-ink)" },
};

/* ── Section label for the detail panel ─────────────────────────────────────── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10.5,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: ".05em",
        color: "var(--t3)",
        marginBottom: 4,
      }}
    >
      {children}
    </div>
  );
}

/* ── IssueRow component ──────────────────────────────────────────────────────── */
interface IssueRowProps {
  issue: IssueRecord;
  group: { key: IssueStatus; label: string; icon: string; pillClass: string };
  team: TeamMember[];
  onPatch: (
    issueId: string,
    patch: { status?: IssueStatus; assigneeId?: string | null }
  ) => Promise<void>;
}

function IssueRow({ issue, group, team, onPatch }: IssueRowProps) {
  const [busy, setBusy] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const assignee = team.find((m) => m.userId === issue.assigneeId || m.id === issue.assigneeId);
  const wcagVersion = getWcagVersion(issue.wcagCriterion);

  // Whether this issue has any rich detail worth expanding to reveal.
  const hasDetail = !!(
    issue.whatItMeans ||
    issue.whoItAffects ||
    issue.howToFix ||
    issue.codeSnippet ||
    issue.measuredEvidence
  );

  const detailId = `mike-detail-${issue.id}`;

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

  return (
    <>
      {/* Main grid row — border-bottom removed when detail is expanded to avoid
          a double-line between the row and the detail panel. */}
      <div
        className="trow"
        style={{
          gridTemplateColumns: "1fr 200px 160px",
          borderBottom: expanded && hasDetail ? "none" : undefined,
        }}
      >
        {/* Issue title + WCAG ref + version badge + expand toggle */}
        <div>
          {hasDetail ? (
            <button
              type="button"
              id={`mike-row-btn-${issue.id}`}
              aria-expanded={expanded}
              aria-controls={detailId}
              onClick={() => setExpanded((e) => !e)}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "inherit",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span style={{ fontWeight: 700, color: "var(--deep)", fontSize: "inherit" }}>
                {issue.title}
              </span>
              <i
                className={`ti ti-chevron-${expanded ? "up" : "down"}`}
                aria-hidden="true"
                style={{ fontSize: 13, color: "var(--t3)", flexShrink: 0 }}
              />
            </button>
          ) : (
            <div style={{ fontWeight: 700, color: "var(--deep)" }}>{issue.title}</div>
          )}
          <div className="tiny muted" style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            {issue.wcagCriterion && (
              <span>WCAG {issue.wcagCriterion}</span>
            )}
            {/* WCAG version badge — e.g. "2.1" shown inline after the criterion ref */}
            {wcagVersion && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "1px 6px",
                  borderRadius: 99,
                  lineHeight: 1.7,
                  ...(WCAG_VERSION_STYLE[wcagVersion]),
                }}
                title={`Introduced in WCAG ${wcagVersion}`}
              >
                {wcagVersion}
              </span>
            )}
            {issue.wcagCriterion && <span>·</span>}
            <span>
              {issue.checksTotal > 0
                ? `${issue.checksPassing} of ${issue.checksTotal} checks passing`
                : "Tracked rule"}
            </span>
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
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontFamily: "inherit",
                padding: 0,
              }}
            >
              Assign
            </button>
          )}

          {assignOpen && (
            <div
              role="listbox"
              aria-label="Assign issue"
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setAssignOpen(false);
                }
              }}
              // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
              tabIndex={-1}
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
              <div
                style={{
                  padding: "9px 14px",
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: "var(--t3)",
                  textTransform: "uppercase",
                  letterSpacing: ".04em",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                Assign to
              </div>
              {team.length === 0 && (
                <div style={{ padding: "10px 14px", fontSize: 13, color: "var(--t2)" }}>
                  No team members yet.
                </div>
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

      {/* Expandable detail panel — controlled by aria-expanded on the title button.
          Shows the same rich explanation structure as the public ScanResults IssueCard:
          measured evidence → what it means → who it affects → how to fix → code snippet.
          Content is REAL: sourced from the latest scan's JSONB or the curated MAP.
          No WCAG/ADA "compliant" or "guaranteed" language. */}
      {hasDetail && expanded && (
        <div
          id={detailId}
          role="region"
          aria-labelledby={`mike-row-btn-${issue.id}`}
          style={{
            background: "var(--bg)",
            borderTop: "1px solid var(--border)",
            borderBottom: "1px solid var(--border)",
            padding: "14px 20px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {/* Measured evidence — the fact-backed proof line; shown first */}
          {issue.measuredEvidence && (
            <div>
              <SectionLabel>Measured</SectionLabel>
              <code
                style={{
                  display: "inline-block",
                  fontSize: 12,
                  fontFamily: "monospace",
                  background: "var(--border)",
                  color: "var(--t2)",
                  borderRadius: 6,
                  padding: "2px 9px",
                  lineHeight: 1.7,
                }}
              >
                {issue.measuredEvidence}
              </code>
            </div>
          )}

          {/* What it means */}
          {issue.whatItMeans && (
            <div>
              <SectionLabel>What it means</SectionLabel>
              <div style={{ fontSize: 13, color: "var(--t1)", lineHeight: 1.55 }}>
                {issue.whatItMeans}
              </div>
            </div>
          )}

          {/* Who it affects + disability group chips */}
          {issue.whoItAffects && (
            <div>
              <SectionLabel>Who it affects</SectionLabel>
              <div style={{ fontSize: 13, color: "var(--t1)", lineHeight: 1.55 }}>
                {issue.whoItAffects}
              </div>
              {issue.disabilityGroups.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 7 }}>
                  {issue.disabilityGroups.map((g) => (
                    <span
                      key={g}
                      className="pill gray"
                      style={{ fontSize: 11 }}
                    >
                      {DISABILITY_LABELS[g] ?? g}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* How to fix — concrete, action-oriented guidance (often includes inline
              code examples showing the corrected element) */}
          {issue.howToFix && (
            <div>
              <SectionLabel>How to fix</SectionLabel>
              <div style={{ fontSize: 13, color: "var(--t1)", lineHeight: 1.55 }}>
                {issue.howToFix}
              </div>
            </div>
          )}

          {/* Code snippet — CSS selector + offending DOM html; derived from the
              scanner's stored node evidence; omitted gracefully when unavailable.
              We NEVER fabricate code — only real measured values are shown. */}
          {(issue.codeSelector || issue.codeSnippet) && (
            <div>
              <SectionLabel>Offending element</SectionLabel>
              {issue.codeSelector && (
                <div
                  style={{
                    fontSize: 11,
                    fontFamily: "monospace",
                    color: "var(--t3)",
                    marginBottom: 4,
                    wordBreak: "break-all",
                  }}
                >
                  {issue.codeSelector}
                </div>
              )}
              {issue.codeSnippet && (
                <pre
                  style={{
                    fontFamily: "monospace",
                    fontSize: 11.5,
                    background: "var(--border)",
                    borderRadius: 8,
                    padding: "8px 12px",
                    overflowX: "auto",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                    color: "var(--t1)",
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  {issue.codeSnippet}
                </pre>
              )}
            </div>
          )}
        </div>
      )}
    </>
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
  const [wcagVersionFilter, setWcagVersionFilter] = useState<"all" | WcagVersion>("all");
  const [search, setSearch] = useState("");

  /* Fetch issues + team in parallel */
  useEffect(() => {
    let live = true;
    setLoading(true);
    setError(false);

    Promise.all([
      fetch(`/api/sites/${siteId}/issues`, { credentials: "same-origin" }).then((r) =>
        r.ok ? (r.json() as Promise<GroupedIssues>) : Promise.reject(r.status)
      ),
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
      const allIssues = [...grouped.failing, ...grouped.needs_review, ...grouped.passing];
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
        <div aria-hidden="true">
          {/* KPI-row skeleton */}
          <div className="grid3" style={{ marginBottom: 18 }}>
            {[0, 1, 2].map((i) => (
              <div className="kpi" key={i}>
                <div className="skel" style={{ width: 110, height: 14, marginBottom: 14 }} />
                <div className="skel" style={{ width: 80, height: 28 }} />
              </div>
            ))}
          </div>
          {/* Issue-list skeleton */}
          <div className="card pad">
            <div className="skel" style={{ width: 180, height: 18, marginBottom: 16 }} />
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 0",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <div
                  className="skel"
                  style={{ width: 34, height: 34, borderRadius: 9, flex: "none" }}
                />
                <div style={{ flex: 1 }}>
                  <div className="skel" style={{ width: "60%", height: 14, marginBottom: 6 }} />
                  <div className="skel" style={{ width: "35%", height: 11 }} />
                </div>
                <div
                  className="skel"
                  style={{ width: 70, height: 22, borderRadius: 999, flex: "none" }}
                />
              </div>
            ))}
          </div>
        </div>
        <span className="sr-only" role="status" aria-live="polite">
          Loading issues…
        </span>
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
  const unassigned = [...issues.failing, ...issues.needs_review].filter(
    (i) => !i.assigneeId
  ).length;
  const criteriaMet = new Set(
    issues.passing.filter((i) => i.wcagCriterion).map((i) => i.wcagCriterion)
  ).size;
  // Count of DISTINCT wcagCriterion values present across ALL issues (the criteria the
  // scanner actually checked). Used as the denominator so "X of N" is honest, not an
  // overstated fixed number like /50 or /33.
  const trackedCriteria = new Set(
    [...issues.failing, ...issues.needs_review, ...issues.passing]
      .filter((i) => i.wcagCriterion)
      .map((i) => i.wcagCriterion)
  ).size;

  /* Filter + search: apply status filter, WCAG version filter, and search together */
  const groups: {
    key: IssueStatus;
    label: string;
    icon: string;
    pillClass: string;
    items: IssueRecord[];
  }[] = [
    { key: "failing",      label: "Failing",      icon: "ti-x",     pillClass: "high",  items: issues.failing },
    { key: "needs_review", label: "Needs review",  icon: "ti-flag",  pillClass: "med",   items: issues.needs_review },
    { key: "passing",      label: "Passing",       icon: "ti-check", pillClass: "green", items: issues.passing },
  ];

  const visibleGroups = groups
    .filter((g) => filter === "all" || filter === g.key)
    .map((g) => ({
      ...g,
      items: g.items.filter((i) => {
        const matchesSearch =
          search.trim().length === 0 ||
          i.title.toLowerCase().includes(search.toLowerCase()) ||
          (i.wcagCriterion ?? "").includes(search);
        const matchesVersion =
          wcagVersionFilter === "all" ||
          getWcagVersion(i.wcagCriterion) === wcagVersionFilter;
        return matchesSearch && matchesVersion;
      }),
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
            {trackedCriteria === 0 ? (
              <span style={{ fontSize: 13, color: "var(--t3)" }}>No criteria checked yet</span>
            ) : (
              <>
                {criteriaMet}
                <span style={{ fontSize: 13, color: "var(--t3)" }}>
                  {" "}
                  of {trackedCriteria} tracked criteria
                </span>
              </>
            )}
          </div>
        </div>

        <div style={{ marginLeft: "auto", fontSize: 12.5, color: "var(--t2)" }}>
          Monitoring <b style={{ color: "var(--deep)" }}>{domain}</b>
        </div>
      </div>

      {/* Status filter chips */}
      <div
        style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}
        role="group"
        aria-label="Filter by status"
      >
        <button
          type="button"
          className="pill"
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
          className="pill high"
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
          className="pill med"
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
          className="pill green"
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

      {/* WCAG version filter chips — lets owners focus on a specific standard's issues */}
      <div
        style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14, alignItems: "center" }}
        role="group"
        aria-label="Filter by WCAG version"
      >
        <span
          style={{ fontSize: 11, fontWeight: 700, color: "var(--t3)", textTransform: "uppercase", letterSpacing: ".04em", marginRight: 2 }}
        >
          WCAG
        </span>
        {(["all", "2.0", "2.1", "2.2"] as const).map((v) => {
          const active = wcagVersionFilter === v;
          const style = v !== "all" ? WCAG_VERSION_STYLE[v as WcagVersion] : { bg: "#fff", color: "var(--t1)" };
          return (
            <button
              key={v}
              type="button"
              onClick={() => setWcagVersionFilter(active ? "all" : v)}
              aria-pressed={active}
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                padding: "3px 10px",
                borderRadius: 99,
                border: `1px solid ${active ? "transparent" : "var(--border)"}`,
                background: active ? (v === "all" ? "var(--deep)" : style.bg) : "#fff",
                color: active ? (v === "all" ? "#fff" : style.color) : "var(--t2)",
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all .12s",
              }}
            >
              {v === "all" ? "All versions" : `WCAG ${v}`}
            </button>
          );
        })}
      </div>

      {/* Search + actions row */}
      <div className="between" style={{ marginBottom: 14 }}>
        <div
          className="search"
          style={{
            maxWidth: 280,
            margin: 0,
            boxShadow: "none",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <i
            className="ti ti-search"
            aria-hidden="true"
            style={{ fontSize: 15, color: "var(--t3)", flexShrink: 0 }}
          />
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
            No tracked issues yet — they appear here after the first accessibility scan. Run a scan
            from the{" "}
            <a
              href={`/dashboard/${siteId}`}
              style={{ color: "var(--primary-hover)", fontWeight: 700 }}
            >
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
        <div className="tcard tbl-scroll">
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
