"use client";
/**
 * app/dashboard/[siteId]/mike/_MikeClient.tsx — v7 Mike audit screen (CLIENT).
 *
 * Wired to:
 *   GET   /api/sites/[siteId]/issues → issues grouped by status
 *   PATCH /api/sites/[siteId]/issues → { issueId, status }
 *
 * This is a CLIENT-FACING screen (the site owner, not an internal triager). It is
 * built to answer two questions at a glance, for every issue:
 *   1. WHICH rule is being violated — the WCAG criterion, its version (2.0/2.1/2.2)
 *      AND its principle (Perceivable / Operable / Understandable / Robust), shown
 *      as labelled tags on the row, plus a one-line plain-English "why" that is
 *      visible WITHOUT expanding.
 *   2. WHO it affects — the disability profiles impacted (blind, low-vision, motor,
 *      cognitive, …) shown as icon+label chips in the dedicated "Affects" column.
 *
 * Deliberately NOT here (this is a client dashboard, not a team tracker): there is
 * no assignee / "Assign" control. Owners resolve or flag issues; they don't route
 * them to teammates. The old Owner/Assign column is replaced by "Affects".
 *
 * Real data, no mock numbers:
 *   - Passing checks %    → counts.passing / total * 100
 *   - Profiles affected   → distinct disability groups across open issues
 *   - Criteria met (X/N)  → distinct passing criteria / distinct tracked criteria
 *   - Issue rows + detail → real failing/needs_review/passing rows + scan JSONB
 *
 * Expandable detail (accessible disclosure) reveals the full explanation: measured
 * evidence → what it means → who it affects (chips) → how to fix → offending code.
 *
 * Honesty: no WCAG/ADA "compliant" or "guaranteed" copy. Issue status reflects the
 * scanner's findings + human overrides; it is not a legal certification.
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

/* ── WCAG principle classifier (the four POUR principles) ─────────────────────── */
type WcagPrinciple = "Perceivable" | "Operable" | "Understandable" | "Robust";

/** The first number of a WCAG SC maps to its principle (1.x.x = Perceivable …). */
function getWcagPrinciple(criterion: string | null | undefined): WcagPrinciple | null {
  if (!criterion || !/^\d+\.\d+\.\d+$/.test(criterion)) return null;
  switch (criterion.split(".")[0]) {
    case "1": return "Perceivable";
    case "2": return "Operable";
    case "3": return "Understandable";
    case "4": return "Robust";
    default: return null;
  }
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

/* ── Disability profiles: icon + label per structured group key ───────────────── */
/** Mirrors the scanner's disability-group keys (plain-language.ts) and gives each
 *  one a profile icon so the "Affects" column shows WHO each issue impacts. */
const PROFILE_META: Record<string, { icon: string; label: string }> = {
  blind: { icon: "ti-eye-off", label: "Blind" },
  "low-vision": { icon: "ti-eyeglass", label: "Low vision" },
  "color-blind": { icon: "ti-palette", label: "Colour blindness" },
  "deaf-hard-of-hearing": { icon: "ti-ear", label: "Deaf / HoH" },
  motor: { icon: "ti-hand-finger", label: "Motor" },
  cognitive: { icon: "ti-brain", label: "Cognitive" },
  vestibular: { icon: "ti-rotate-360", label: "Motion sensitivity" },
  speech: { icon: "ti-microphone-2", label: "Speech" },
};

function profileLabel(group: string): string {
  return PROFILE_META[group]?.label ?? group;
}

/* ── Helpers ─────────────────────────────────────────────────────────────────── */
function ringOffset(pct: number): number {
  const circ = 94.2;
  return circ * (1 - Math.max(0, Math.min(1, pct)));
}

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

/* ── Affected-profiles cell ──────────────────────────────────────────────────── */
/** Renders icon+label chips for the disability profiles an issue affects. The
 *  whole cell carries an aria-label naming every group so screen-reader users
 *  hear the full audience; the per-chip icons are decorative. */
function AffectsCell({ groups }: { groups: string[] }) {
  if (!groups || groups.length === 0) {
    return <span className="tiny muted">—</span>;
  }
  const shown = groups.slice(0, 2);
  const extra = groups.length - shown.length;
  const fullLabel = groups.map(profileLabel).join(", ");

  return (
    <div
      style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}
      aria-label={`Affects ${fullLabel}`}
    >
      {shown.map((g) => {
        const meta = PROFILE_META[g];
        return (
          <span
            key={g}
            title={profileLabel(g)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "2px 8px",
              borderRadius: 99,
              background: "var(--bg)",
              border: "1px solid var(--border)",
              fontSize: 11,
              fontWeight: 600,
              color: "var(--t2)",
              whiteSpace: "nowrap",
            }}
          >
            <i
              className={`ti ${meta?.icon ?? "ti-user"}`}
              aria-hidden="true"
              style={{ fontSize: 13, color: "var(--t3)" }}
            />
            {profileLabel(g)}
          </span>
        );
      })}
      {extra > 0 && (
        <span className="tiny muted" title={fullLabel} style={{ fontWeight: 600 }}>
          +{extra}
        </span>
      )}
    </div>
  );
}

/* ── IssueRow component ──────────────────────────────────────────────────────── */
interface IssueRowProps {
  issue: IssueRecord;
  group: { key: IssueStatus; label: string; icon: string; pillClass: string };
  onPatch: (issueId: string, patch: { status: IssueStatus }) => Promise<void>;
}

function IssueRow({ issue, group, onPatch }: IssueRowProps) {
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const wcagVersion = getWcagVersion(issue.wcagCriterion);
  const principle = getWcagPrinciple(issue.wcagCriterion);

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

  return (
    <>
      {/* Main grid row — border-bottom removed when detail is expanded to avoid
          a double-line between the row and the detail panel. */}
      <div
        className="trow"
        style={{
          gridTemplateColumns: "1fr 210px 150px",
          borderBottom: expanded && hasDetail ? "none" : undefined,
        }}
      >
        {/* Issue title + rule (criterion + version + principle) + inline why */}
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

          {/* Rule line: WCAG criterion + version badge + principle tag + checks.
              This makes "which specific rule is violated" explicit on the row. */}
          <div
            className="tiny muted"
            style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 3 }}
          >
            {issue.wcagCriterion ? (
              <span style={{ fontWeight: 700, color: "var(--t2)" }}>WCAG {issue.wcagCriterion}</span>
            ) : (
              <span style={{ fontWeight: 700, color: "var(--t2)" }}>Tracked rule</span>
            )}
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
            {principle && (
              <span
                className="pill gray"
                style={{ fontSize: 10, fontWeight: 700 }}
                title={`WCAG principle: ${principle}`}
              >
                {principle}
              </span>
            )}
            <span aria-hidden="true">·</span>
            <span>
              {issue.checksTotal > 0
                ? `${issue.checksPassing} of ${issue.checksTotal} checks passing`
                : "Tracked rule"}
            </span>
          </div>

          {/* Inline "why" — visible WITHOUT expanding so the owner sees the reason
              this rule is flagged at a glance (full detail still on expand). */}
          {issue.whatItMeans && (
            <div
              style={{
                fontSize: 12.5,
                color: "var(--t2)",
                lineHeight: 1.45,
                marginTop: 4,
                maxWidth: 560,
              }}
            >
              {issue.whatItMeans}
            </div>
          )}
        </div>

        {/* Affects column — the disability profiles this issue impacts */}
        <div>
          <AffectsCell groups={issue.disabilityGroups} />
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

          {/* Who it affects + disability profile chips */}
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
                      style={{ fontSize: 11, display: "inline-flex", alignItems: "center", gap: 4 }}
                    >
                      <i
                        className={`ti ${PROFILE_META[g]?.icon ?? "ti-user"}`}
                        aria-hidden="true"
                        style={{ fontSize: 12 }}
                      />
                      {profileLabel(g)}
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<"all" | IssueStatus>("all");
  const [wcagVersionFilter, setWcagVersionFilter] = useState<"all" | WcagVersion>("all");
  const [search, setSearch] = useState("");

  /* Fetch issues */
  useEffect(() => {
    let live = true;
    setLoading(true);
    setError(false);

    fetch(`/api/sites/${siteId}/issues`, { credentials: "same-origin" })
      .then((r) => (r.ok ? (r.json() as Promise<GroupedIssues>) : Promise.reject(r.status)))
      .then((issueData) => {
        if (!live) return;
        setIssues(issueData);
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
  async function handlePatch(issueId: string, patch: { status: IssueStatus }) {
    if (!issues) return;

    // Snapshot for potential revert
    const snapshot = issues;

    // Apply optimistic update
    function applyPatch(grouped: GroupedIssues): GroupedIssues {
      const allIssues = [...grouped.failing, ...grouped.needs_review, ...grouped.passing];
      const target = allIssues.find((i) => i.id === issueId);
      if (!target) return grouped;

      const updated = { ...target, status: patch.status };
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
  // Distinct disability profiles impacted by the OPEN (failing + needs_review)
  // issues — the headline "who is currently affected" number.
  const profilesAffected = new Set(
    [...issues.failing, ...issues.needs_review].flatMap((i) => i.disabilityGroups)
  ).size;
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
            Profiles affected
          </div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "var(--deep)",
              fontFamily: "Satoshi",
            }}
          >
            {profilesAffected}
            <span style={{ fontSize: 13, color: "var(--t3)" }}> of 8 disability groups</span>
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
          <div className="thead" style={{ gridTemplateColumns: "1fr 210px 150px" }}>
            <div>Issue &amp; rule</div>
            <div>Affects</div>
            <div>Status</div>
          </div>

          {visibleGroups.map((g) =>
            g.items.length === 0 ? null : (
              <div key={g.key}>
                <div className="grp">
                  {g.label} · {g.items.length}
                </div>
                {g.items.map((issue) => (
                  <IssueRow key={issue.id} issue={issue} group={g} onPatch={handlePatch} />
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
