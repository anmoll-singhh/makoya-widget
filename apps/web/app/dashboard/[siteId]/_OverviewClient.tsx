"use client";
/**
 * app/dashboard/[siteId]/_OverviewClient.tsx — v7 Overview screen (CLIENT).
 *
 * Wired to GET /api/sites/[siteId]/overview. All mockup numbers replaced with
 * real API data:
 *   - Score (86)          → data.score
 *   - Score delta (↑12pts)→ data.scoreDelta
 *   - Open issues (24)    → data.openIssues
 *   - Widget opens (2,431)→ data.widgetOpens  [re-labelled accurately]
 *   - Issues resolved (–) → data.issuesResolvedThisMonth
 *   - Needs human (–)     → data.needsHuman
 *   - Journey progress    → derived from data.status
 *   - Score trend chart   → data.trend (SVG polyline)
 *   - Activity feed       → data.activity
 *   - Framework coverage  → data.coverage
 *
 * PERF — no client fetch waterfall:
 *   The server `page.tsx` now fetches the overview view-model with `getOverview`
 *   and passes it down as `initialData`. When present we render real content on
 *   the FIRST paint (no spinner, no round-trip). The client-side `fetch` only
 *   runs as a fallback when `initialData` is absent (e.g. the server fetch was
 *   skipped/failed) so the screen still works standalone.
 *
 * READABILITY (founder directive):
 *   The hero sits on a LIGHT aurora gradient (`.hero-bg`), so the previous white
 *   `rgba(255,255,255,.6)` hero text was effectively invisible. All hero text is
 *   now solid, high-contrast navy/ink (var(--deep)/--t1/--t2) — most of it simply
 *   inherits the already-correct dashboard.css classes (.jt/.gn/.glab/…) instead
 *   of being overridden white inline. Small captions are bumped up in size.
 *
 * MOTION (accessible):
 *   - Score + KPI numbers count up via <CountUp>.
 *   - The score ring fills via <GaugeRing> (animated strokeDashoffset).
 *   - KPI tiles + rows cascade in via <Reveal>/<RevealItem>.
 *   Every one of these collapses to a static final state under
 *   `prefers-reduced-motion: reduce` (see _components/motion.tsx).
 *
 * Honesty rules (from CLAUDE.md):
 *  - No "compliant" / "guaranteed accessible" copy.
 *  - Journey shown honestly: not_installed → only Connect step shown as open.
 *  - Never shows fake numbers or mocked states.
 *
 * v7 CSS classes (all in app/dashboard/dashboard.css, imported by the layout):
 *   .pagehead, .hero, .hero-bg, .hero-grid, .gcard, .gwrap, .grid4, .kpi,
 *   .card, .pad, .dch, .row2, .row3, .it, .ic, .pill, .note, .fw, .skel, etc.
 */

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { CountUp, GaugeRing, Reveal, RevealItem } from "../_components/motion";

/* ── API shape (mirrors lib/overview.ts return; kept client-local) ───────────── */
interface CoverageEntry {
  framework: string;
  pct: number;
}
interface ActivityEntry {
  id: string;
  actor: string;
  type: string;
  summary: string;
  wcagRef: string | null;
  createdAt: string;
}
export interface OverviewData {
  score: number | null;
  scoreDelta: number | null;
  status: string;
  streakDays: number;
  openIssues: number;
  needsHuman: number;
  issuesResolvedThisMonth: number;
  widgetOpens: number;
  coverage: CoverageEntry[];
  trend: { period: string; score: number | null }[];
  activity: ActivityEntry[];
}

/* ── Helpers ─────────────────────────────────────────────────────────────────── */
function relTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diff = Date.now() - t;
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "yesterday";
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  return `${mo}mo ago`;
}
/** Derive journey step state from install/monitoring status. */
function journeyState(status: string): { connect: boolean; scan: boolean; improve: "now" | boolean } {
  if (status === "not_installed") {
    return { connect: false, scan: false, improve: false };
  }
  // monitoring, active, action_needed → widget is installed, scanning is happening
  return { connect: true, scan: true, improve: "now" };
}

/* ── Score Trend Chart ────────────────────────────────────────────────────────── */
function TrendChart({ trend }: { trend: { period: string; score: number | null }[] }) {
  const points = trend.filter((t) => t.score != null) as { period: string; score: number }[];
  if (points.length < 2) {
    return (
      <div className="muted tiny" style={{ padding: "30px 0" }}>
        Not enough history to chart a trend yet.
      </div>
    );
  }
  const w = 620;
  const h = 168;
  const max = 100;
  const step = (w - 20) / (points.length - 1);
  const coords = points.map((p, i) => {
    const x = 10 + i * step;
    const y = h - (p.score / max) * (h - 20) - 10;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const areaPath =
    `M${coords[0].split(",")[0]},${h} ` +
    coords.map((c) => `L${c}`).join(" ") +
    ` L${coords[coords.length - 1].split(",")[0]},${h} Z`;
  const last = coords[coords.length - 1].split(",");

  return (
    <div style={{ display: "flex", gap: 6 }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          fontSize: 11.5,
          color: "var(--t2)",
          height: `${h}px`,
          padding: "4px 0",
          textAlign: "right",
          fontWeight: 600,
        }}
      >
        <span>100</span>
        <span>75</span>
        <span>50</span>
        <span>25</span>
        <span>0</span>
      </div>
      <div style={{ flex: 1 }}>
        <svg
          viewBox={`0 0 ${w} ${h}`}
          style={{ width: "100%", height: `${h}px`, display: "block" }}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="ov-ar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#1E63FF" stopOpacity=".16" />
              <stop offset="1" stopColor="#1E63FF" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#ov-ar)" />
          <polyline
            fill="none"
            stroke="#1E63FF"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={coords.join(" ")}
          />
          <circle
            cx={last[0]}
            cy={last[1]}
            r="5.5"
            fill="#1E63FF"
            stroke="#fff"
            strokeWidth="2.5"
          />
        </svg>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 11.5,
            color: "var(--t2)",
            marginTop: 6,
            fontWeight: 600,
          }}
        >
          {points.map((p) => (
            <span key={p.period}>{p.period.slice(5)}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Loading skeleton — shaped like the real Overview content ─────────────────── */
function OverviewSkeleton() {
  return (
    <>
      {/* Live region OUTSIDE aria-hidden so screen readers announce it. */}
      <span className="sr-only" role="status" aria-live="polite">
        Loading your overview…
      </span>
      <div aria-hidden="true">
        {/* Hero placeholder */}
        <div className="hero" style={{ minHeight: 220 }}>
          <div className="hero-bg" aria-hidden="true" />
          <div className="hero-grid" style={{ position: "relative" }}>
            <div className="gcard" style={{ flexDirection: "column", alignItems: "flex-start", gap: 12 }}>
              <div className="skel" style={{ width: 160, height: 16 }} />
              <div className="skel" style={{ width: 240, height: 28 }} />
              <div className="skel" style={{ width: "80%", height: 14 }} />
              <div className="skel" style={{ width: "100%", height: 60, marginTop: 8 }} />
            </div>
            <div className="gcard" style={{ justifyContent: "center" }}>
              <div className="skel" style={{ width: 158, height: 158, borderRadius: "50%" }} />
            </div>
          </div>
        </div>
        {/* KPI placeholders */}
        <div className="grid4" style={{ marginBottom: 20 }}>
          {[0, 1, 2, 3].map((i) => (
            <div className="kpi" key={i}>
              <div className="kt">
                <div className="skel" style={{ width: 42, height: 42, borderRadius: 13 }} />
                <div className="skel" style={{ width: 110, height: 14 }} />
              </div>
              <div className="skel" style={{ width: 90, height: 30, marginTop: 6 }} />
            </div>
          ))}
        </div>
        {/* Rows placeholders */}
        <div className="row2">
          <div className="card pad">
            <div className="skel" style={{ width: 200, height: 18, marginBottom: 16 }} />
            <div className="skel" style={{ width: "100%", height: 168 }} />
          </div>
          <div className="card pad">
            <div className="skel" style={{ width: 160, height: 18, marginBottom: 16 }} />
            <div className="skel" style={{ width: "100%", height: 110 }} />
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Props ───────────────────────────────────────────────────────────────────── */
interface Props {
  siteId: string;
  domain: string;
  /** Server-fetched view-model — when present, renders without a client waterfall. */
  initialData?: OverviewData | null;
}

/* ── Main Component ──────────────────────────────────────────────────────────── */
export function OverviewClient({ siteId, domain, initialData }: Props) {
  const [data, setData] = useState<OverviewData | null>(initialData ?? null);
  const [loading, setLoading] = useState(initialData == null);
  const [error, setError] = useState(false);
  // Guard so initialData is seeded exactly once on mount. initialData is a new
  // object ref on every RSC re-render (router.refresh()), so it is intentionally
  // excluded from the effect deps — including it would reset displayed data on
  // every refresh even though the underlying values haven't changed.
  const seededRef = useRef(false);

  useEffect(() => {
    // First mount: if the server supplied initialData, use it and skip the fetch.
    if (!seededRef.current) {
      seededRef.current = true;
      if (initialData != null) {
        setData(initialData);
        setLoading(false);
        return;
      }
    }
    // Client-fetch fallback: runs when initialData was absent, or when siteId
    // changes (navigation to a different agent).
    let live = true;
    setLoading(true);
    setError(false);
    fetch(`/api/sites/${siteId}/overview`, { credentials: "same-origin" })
      .then((r) => (r.ok ? (r.json() as Promise<OverviewData>) : Promise.reject(r.status)))
      .then((d) => {
        if (live) {
          setData(d);
          setLoading(false);
        }
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
  // initialData intentionally omitted — seeded via ref guard above.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId]);

  if (loading) {
    return <OverviewSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="note warn" role="alert" style={{ marginTop: 24 }}>
        <i className="ti ti-alert-triangle" aria-hidden="true" />
        <div>Couldn&apos;t load your overview — please try again shortly.</div>
      </div>
    );
  }

  const score = data.score;
  const delta = data.scoreDelta;
  const journey = journeyState(data.status);

  return (
    <>
      {/* Page header */}
      <div className="pagehead">
        Good day <b>Dashboard</b>
      </div>

      {/* Hero section */}
      <section className="hero">
        <div className="hero-bg" aria-hidden="true">
          <svg viewBox="0 0 1000 300" preserveAspectRatio="none">
            <g fill="none" stroke="#0D1B4D" strokeWidth="2">
              <path d="M-50 210 C 250 90,520 250,1050 70" opacity=".10" />
              <path d="M-50 250 C 300 150,600 280,1050 130" opacity=".08" />
              <path d="M-50 160 C 280 60,560 200,1050 30" opacity=".07" />
            </g>
          </svg>
        </div>
        <div className="hero-grid">
          {/* Left: domain + journey */}
          <div className="gcard" style={{ flexDirection: "column", alignItems: "flex-start", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, color: "var(--t2)", fontSize: 13, fontWeight: 700, marginBottom: 2 }}>
              <i className="ti ti-world" aria-hidden="true" style={{ fontSize: 15, color: "var(--primary-hover)" }} />
              {domain}
            </div>
            <h1 style={{ fontFamily: "'Satoshi'", fontSize: 25, fontWeight: 700, color: "var(--deep)", letterSpacing: "-.02em", lineHeight: 1.2 }}>
              {score == null
                ? "No score yet"
                : score >= 90
                ? "You're AA-ready"
                : `${Math.max(0, 90 - score)} points from AA`}
            </h1>
            <div style={{ color: "var(--t2)", fontSize: 14, lineHeight: 1.5, marginBottom: 8 }}>
              Monitoring accessibility across {domain}.
              {data.needsHuman > 0 && ` ${data.needsHuman} issue${data.needsHuman === 1 ? "" : "s"} need human review.`}
            </div>

            {/* Compliance journey */}
            <div className="jlabel" style={{ marginBottom: 10 }}>
              Your compliance journey
            </div>
            <div className="journey" role="list" style={{ display: "flex", alignItems: "center", gap: 0 }}>
              {/* Connect */}
              <div
                className={`jnode ${journey.connect ? "done" : "now"}`}
                role="listitem"
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}
              >
                <div className="jc" aria-hidden="true">
                  {journey.connect ? <i className="ti ti-check" /> : "1"}
                </div>
                <div className="jt">Connect</div>
                <div className="js">{journey.connect ? "Complete" : "In progress"}</div>
              </div>
              <div className={`jline ${journey.connect ? "done" : ""}`} aria-hidden="true" />

              {/* Scan */}
              <div
                className={`jnode ${journey.scan ? "done" : ""}`}
                role="listitem"
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}
              >
                <div className="jc" aria-hidden="true">
                  {journey.scan ? <i className="ti ti-check" /> : "2"}
                </div>
                <div className="jt">Scan</div>
                <div className="js">{journey.scan ? "Complete" : "Upcoming"}</div>
              </div>
              <div className={`jline ${journey.scan ? "done" : ""}`} aria-hidden="true" />

              {/* Improve */}
              <div
                className={`jnode ${journey.improve === true ? "done" : journey.improve === "now" ? "now" : ""}`}
                role="listitem"
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}
              >
                <div className="jc" aria-hidden="true">
                  {journey.improve === true ? <i className="ti ti-check" /> : "3"}
                </div>
                <div className="jt">Improve</div>
                <div className="js">{journey.improve === "now" ? "In progress" : "Upcoming"}</div>
              </div>
              <div className="jline" aria-hidden="true" />

              {/* Sustain */}
              <div className="jnode" role="listitem" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div className="jc" aria-hidden="true">4</div>
                <div className="jt">Sustain</div>
                <div className="js">Upcoming</div>
              </div>
            </div>
          </div>

          {/* Right: score gauge */}
          <div className="gcard" style={{ justifyContent: "center" }}>
            <div className="hg">
              <GaugeRing
                value={score}
                size={158}
                gradientId="ov-g"
                trackColor="rgba(13,27,77,.12)"
                ariaLabel={`Accessibility score: ${score ?? "not yet available"} out of 100`}
              >
                <div className="gn" style={{ fontFamily: "'Satoshi'", fontSize: 40, fontWeight: 700, color: "var(--deep)", lineHeight: 1 }}>
                  {score == null ? "—" : <CountUp value={score} />}
                </div>
                <div className="gu" style={{ fontSize: 13, color: "var(--t2)", fontWeight: 600 }}>/ 100</div>
              </GaugeRing>
              <div className="glab" style={{ color: "var(--deep)", fontWeight: 700, fontSize: 14.5, marginTop: 12, textAlign: "center" }}>
                Accessibility score
              </div>
              {delta != null && (
                <div className="gd" style={{ color: delta >= 0 ? "var(--green-ink)" : "var(--danger)", fontSize: 13, fontWeight: 700, marginTop: 3, textAlign: "center" }}>
                  {delta >= 0 ? "↑" : "↓"} {Math.abs(delta)} pts vs last month
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* KPI tiles — 4 real metrics from /overview, cascade in */}
      <Reveal className="grid4" style={{ marginBottom: 20 }}>
        {/* Accessibility score */}
        <RevealItem className="kpi">
          <div className="kt">
            <div className="kicon" style={{ background: "var(--primary)" }}>
              <i className="ti ti-accessible" aria-hidden="true" />
            </div>
            <div className="klab">Accessibility score</div>
          </div>
          <div className="kb">
            <div>
              <div className="knum">
                {score == null ? "—" : <CountUp value={score} />} <span>/ 100</span>
              </div>
              {delta != null && (
                <div className={`kdel ${delta >= 0 ? "up" : "down"}`}>
                  {delta >= 0 ? "↑" : "↓"} {Math.abs(delta)} pts
                </div>
              )}
            </div>
          </div>
        </RevealItem>

        {/* Open issues */}
        <RevealItem className="kpi">
          <div className="kt">
            <div className="kicon" style={{ background: "var(--deep)" }}>
              <i className="ti ti-alert-circle" aria-hidden="true" />
            </div>
            <div className="klab">Open issues</div>
          </div>
          <div className="kb">
            <div>
              <div className="knum"><CountUp value={data.openIssues} /></div>
              {data.needsHuman > 0 && (
                <div className="kdel down">{data.needsHuman} need human review</div>
              )}
            </div>
          </div>
        </RevealItem>

        {/* Issues resolved this month */}
        <RevealItem className="kpi">
          <div className="kt">
            <div className="kicon" style={{ background: "var(--primary)" }}>
              <i className="ti ti-circle-check" aria-hidden="true" />
            </div>
            <div className="klab">Resolved this month</div>
          </div>
          <div className="kb">
            <div>
              <div className="knum"><CountUp value={data.issuesResolvedThisMonth} /></div>
              <div className="kdel up">issues fixed</div>
            </div>
          </div>
        </RevealItem>

        {/* Widget opens */}
        <RevealItem className="kpi">
          <div className="kt">
            <div className="kicon" style={{ background: "#1FA86B" }}>
              <i className="ti ti-click" aria-hidden="true" />
            </div>
            <div className="klab">Widget opens</div>
          </div>
          <div className="kb">
            <div>
              <div className="knum"><CountUp value={data.widgetOpens} /></div>
              <div className="kdel up">last 30 days</div>
            </div>
          </div>
        </RevealItem>
      </Reveal>

      {/* Row 2: trend chart + next best action.
          Columns come from the responsive `.row2` class (collapses to 1col on
          mobile) — never inline grid-template, which a media query can't undo. */}
      <Reveal className="row2" style={{ marginBottom: 20 }}>
        <RevealItem as="section" className="card pad">
          <div className="dch">
            <h3>Accessibility score trend</h3>
          </div>
          <TrendChart trend={data.trend} />
          <div className="between" style={{ marginTop: 12 }}>
            <div style={{ display: "flex", gap: 18, fontSize: 12.5, color: "var(--t2)", fontWeight: 600 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--primary)" }} />
                Score
              </span>
            </div>
            <Link className="viewall" href={`/dashboard/${siteId}/reports`}>
              View full analytics →
            </Link>
          </div>
        </RevealItem>

        <RevealItem as="section" className="card pad">
          <div className="dch">
            <h3>
              <i
                className="ti ti-sparkles"
                aria-hidden="true"
                style={{ color: "var(--primary-hover)", fontSize: 16, verticalAlign: -2 }}
              />
              {" "}Next best action
            </h3>
            <Link className="viewall" href={`/dashboard/${siteId}/mike`}>
              View all
            </Link>
          </div>
          <div className="nba" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {data.openIssues === 0 && data.needsHuman === 0 ? (
              <div className="note good">
                <i className="ti ti-circle-check" aria-hidden="true" />
                <div>No open issues — your accessibility looks great right now.</div>
              </div>
            ) : (
              <>
                {data.needsHuman > 0 && (
                  <div className="nbi hi" style={{ border: "1px solid #f9c9c9", borderRadius: 12, padding: "13px 14px", background: "var(--danger-soft)" }}>
                    <span className="pp hi" style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 700, color: "var(--danger)", marginBottom: 6 }}>
                      <i className="ti ti-alert-octagon" aria-hidden="true" />
                      High priority
                    </span>
                    <div className="nt">
                      <b>Review {data.needsHuman} issue{data.needsHuman === 1 ? "" : "s"} needing human judgment</b>
                      <div style={{ fontSize: 12.5, color: "var(--t2)", marginTop: 3 }}>
                        Alt text, link purpose, and custom widget roles can&apos;t be auto-fixed.
                      </div>
                    </div>
                    <Link
                      className="nbtn btn pri"
                      href={`/dashboard/${siteId}/mike`}
                      style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 10, fontSize: 12.5, padding: "7px 12px" }}
                    >
                      Review with Mike
                    </Link>
                  </div>
                )}
                {data.openIssues > 0 && (
                  <div className="nbi rec" style={{ border: "1px solid var(--primary-soft)", borderRadius: 12, padding: "13px 14px", background: "var(--primary-soft)" }}>
                    <span className="pp rec" style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 700, color: "var(--primary-hover)", marginBottom: 6 }}>
                      <i className="ti ti-bulb" aria-hidden="true" />
                      Open issues
                    </span>
                    <div className="nt">
                      <b>Fix {data.openIssues} open accessibility issue{data.openIssues === 1 ? "" : "s"}</b>
                      <div style={{ fontSize: 12.5, color: "var(--t2)", marginTop: 3 }}>
                        Tracked against WCAG 2.1 AA criteria. Resolving these improves your score.
                      </div>
                    </div>
                    <Link
                      className="nbtn btn"
                      href={`/dashboard/${siteId}/mike`}
                      style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 10, fontSize: 12.5, padding: "7px 12px" }}
                    >
                      View issues
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
        </RevealItem>
      </Reveal>

      {/* Row 3: activity feed + framework coverage.
          `.grid2` gives two equal columns that collapse to one on mobile. */}
      <Reveal className="grid2">

        {/* Activity feed */}
        <RevealItem as="section" className="card pad feed">
          <div className="dch">
            <h3>Activity feed</h3>
          </div>
          {data.activity.length === 0 ? (
            <div className="muted tiny" style={{ padding: "16px 0" }}>
              No activity recorded yet — it appears here after your first scan.
            </div>
          ) : (
            data.activity.slice(0, 5).map((a) => {
              const isResolve = /resolv/i.test(a.type);
              const isFound = /found|issue/i.test(a.type) && !isResolve;
              const isInstall = /install|widget/i.test(a.type);
              const ic = isResolve
                ? { bg: "var(--green-soft)", c: "var(--green-ink)", i: "ti-check" }
                : isFound
                ? { bg: "var(--warn-soft)", c: "var(--warn)", i: "ti-alert-triangle" }
                : isInstall
                ? { bg: "var(--primary-soft)", c: "var(--primary-hover)", i: "ti-info-circle" }
                : { bg: "var(--bg)", c: "var(--t3)", i: "ti-activity" };
              return (
                <div className="it" key={a.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "11px 0", borderBottom: "1px solid var(--border)" }}>
                  <div
                    className="ic"
                    style={{ width: 32, height: 32, borderRadius: 9, background: ic.bg, color: ic.c, display: "grid", placeItems: "center", flexShrink: 0, fontSize: 15 }}
                  >
                    <i className={`ti ${ic.i}`} aria-hidden="true" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="ft" style={{ fontWeight: 700, fontSize: 13.5, color: "var(--deep)" }}>
                      {a.summary}
                    </div>
                    {a.wcagRef && (
                      <div className="fs" style={{ fontSize: 12, color: "var(--t2)", marginTop: 1 }}>
                        WCAG {a.wcagRef}
                      </div>
                    )}
                  </div>
                  <span className="tm" style={{ fontSize: 12, color: "var(--t3)", whiteSpace: "nowrap", flexShrink: 0 }}>
                    {relTime(a.createdAt)}
                  </span>
                </div>
              );
            })
          )}
        </RevealItem>

        {/* Framework coverage */}
        <RevealItem as="section" className="card pad">
          <div className="dch">
            <h3>Framework progress</h3>
            <Link className="viewall" href={`/dashboard/${siteId}/reports`}>
              View report
            </Link>
          </div>
          {data.coverage.length === 0 ? (
            <div className="muted tiny" style={{ padding: "16px 0" }}>
              Coverage data appears after your first full scan.
            </div>
          ) : (
            <>
              {data.coverage.map((c) => (
                <div className="fw" key={c.framework}>
                  <span className="lab">{c.framework.toUpperCase()}</span>
                  <div
                    className="track"
                    role="img"
                    aria-label={`${c.framework.toUpperCase()} tracked at ${c.pct} percent`}
                  >
                    <span
                      style={{
                        width: `${c.pct}%`,
                        background: c.pct >= 75 ? "var(--primary)" : "var(--green-fill)",
                      }}
                    />
                  </div>
                  <span className="val" style={{ width: 40, textAlign: "right", fontSize: 13, fontWeight: 700, color: "var(--deep)" }}>
                    {c.pct}%
                  </span>
                </div>
              ))}
              <div
                className="between"
                style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid var(--border)" }}
              >
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--t2)" }}>
                  Overall coverage
                </span>
                <span
                  style={{
                    fontSize: 13.5,
                    fontWeight: 700,
                    color: "var(--green-ink)",
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                  }}
                >
                  {score != null && score >= 75 ? "Good" : score != null && score >= 50 ? "Fair" : "Needs work"}
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background:
                        score != null && score >= 75
                          ? "var(--green-ink)"
                          : score != null && score >= 50
                          ? "var(--warn)"
                          : "var(--danger)",
                    }}
                  />
                </span>
              </div>
            </>
          )}
          <div className="note info" style={{ marginTop: 14, fontSize: 12.5 }}>
            <i className="ti ti-info-circle" aria-hidden="true" />
            <div>
              Coverage is the share of tracked checks currently passing — an estimate from automated checks, not a compliance guarantee.
            </div>
          </div>
        </RevealItem>
      </Reveal>
    </>
  );
}
