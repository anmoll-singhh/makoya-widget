"use client";
/**
 * app/dashboard/[siteId]/analytics/_AnalyticsClient.tsx — v7 Analytics screen (CLIENT).
 *
 * Wired to GET /api/sites/[siteId]/analytics?days=30.
 *
 * HARD RULES (plan § C8 + global constraints):
 *   - "3,418" widget opens        → data.opens
 *   - "1,902" feature activations → data.featureActivations
 *   - "512 activations" most used → data.mostUsed.count
 *   - "Bigger text" most used     → data.mostUsed.featureKey (via FEATURE_META)
 *   - Bar chart heights           → derived from data.opensOverTime[].count (real)
 *   - Feature usage cards         → data.usageByFeature[] (real; empty state honest)
 *
 * v7 CSS classes used: .pagehead .between .grid3 .mcard .grn .big .d .card .ch
 *   .cpad .barchart .col .bar2 .fcard .ic
 */

import { useState, useEffect } from "react";

/* ── API shape (mirrors lib/analytics.ts WidgetAnalytics) ─────────────────────── */
interface WidgetAnalytics {
  opens: number;
  featureActivations: number;
  mostUsed: { featureKey: string; count: number } | null;
  opensOverTime: { day: string; count: number }[];
  usageByFeature: { featureKey: string; count: number }[];
}

/* ── Feature metadata ─────────────────────────────────────────────────────────── */
const FEATURE_META: Record<string, { label: string; icon: string }> = {
  textSize:        { label: "Bigger text",                icon: "ti-zoom-in" },
  lineSpacing:     { label: "Line & letter spacing",      icon: "ti-line-height" },
  contrast:        { label: "Contrast modes",             icon: "ti-contrast" },
  stopMotion:      { label: "Stop animations",            icon: "ti-player-pause" },
  readingRuler:    { label: "Reading ruler",              icon: "ti-ruler-2" },
  highlightLinks:  { label: "Highlight links",            icon: "ti-link" },
  bigCursor:       { label: "Big cursor",                 icon: "ti-pointer" },
  readableFont:    { label: "Readable & dyslexic fonts",  icon: "ti-letter-case" },
  hideImages:      { label: "Hide images",                icon: "ti-photo-off" },
  saturation:      { label: "Saturation",                 icon: "ti-color-swatch" },
  readingMask:     { label: "Reading mask",               icon: "ti-layout-navbar" },
  highlightTitles: { label: "Highlight titles",           icon: "ti-heading" },
  textAlign:       { label: "Text align",                 icon: "ti-align-left" },
  muteSounds:      { label: "Mute sounds",                icon: "ti-volume-off" },
  readAloud:       { label: "Read page aloud",            icon: "ti-volume" },
};
function featureMeta(key: string): { label: string; icon: string } {
  return FEATURE_META[key] ?? { label: key, icon: "ti-circle" };
}

/* ── Helpers ─────────────────────────────────────────────────────────────────── */
function num(n: number | null | undefined): string {
  return typeof n === "number" && Number.isFinite(n) ? n.toLocaleString() : "—";
}

/* ── Props ─────────────────────────────────────────────────────────────────────── */
interface Props {
  siteId: string;
}

/* ── Main ─────────────────────────────────────────────────────────────────────── */
export function AnalyticsClient({ siteId }: Props) {
  const [data, setData] = useState<WidgetAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError(false);
    fetch(`/api/sites/${siteId}/analytics?days=30`, { credentials: "same-origin" })
      .then((r) => (r.ok ? (r.json() as Promise<WidgetAnalytics>) : Promise.reject(r.status)))
      .then((d) => {
        if (live) { setData(d); setLoading(false); }
      })
      .catch(() => {
        if (live) { setError(true); setLoading(false); }
      });
    return () => { live = false; };
  }, [siteId]);

  if (loading) {
    return (
      <>
        <div className="pagehead">
          Analytics <b>Analytics</b>
        </div>
        <div role="status" aria-live="polite" style={{ padding: "40px 0", color: "var(--t3)", textAlign: "center" }}>
          Loading analytics…
        </div>
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <div className="pagehead">
          Analytics <b>Analytics</b>
        </div>
        <div className="note warn" role="alert" style={{ marginTop: 24 }}>
          <i className="ti ti-alert-triangle" aria-hidden="true" />
          <div>Couldn&apos;t load analytics — please try again shortly.</div>
        </div>
      </>
    );
  }

  const hasAnyData = data.opens > 0 || data.featureActivations > 0;
  const maxOpen = Math.max(1, ...data.opensOverTime.map((o) => o.count));
  const mostUsed = data.mostUsed ? featureMeta(data.mostUsed.featureKey) : null;

  return (
    <>
      {/* Page header */}
      <div className="pagehead">
        Analytics <b>Analytics</b>
      </div>

      {/* Intro + date range */}
      <div className="between" style={{ marginBottom: 18 }}>
        <p className="muted" style={{ maxWidth: "62ch", margin: 0 }}>
          How visitors use the accessibility widget on this agent.
        </p>
        <button className="btn ghost" type="button">
          <i className="ti ti-calendar" aria-hidden="true" /> Last 30 days
        </button>
      </div>

      {/* No-data honest empty state */}
      {!hasAnyData && (
        <div className="note info" style={{ marginBottom: 18 }} role="status">
          <i className="ti ti-info-circle" aria-hidden="true" />
          <div>
            No widget events recorded yet. Data appears here once the widget is installed and visitors open it.
          </div>
        </div>
      )}

      {/* KPI cards — REAL values from API */}
      <div className="grid3" style={{ marginBottom: 18 }}>
        <div className="mcard grn">
          <div className="l">
            <i className="ti ti-eye" aria-hidden="true" /> Widget opens
          </div>
          <div className="big">{num(data.opens)}</div>
          {data.opens === 0 && (
            <div className="d muted">No opens yet in this window</div>
          )}
        </div>
        <div className="mcard">
          <div className="l">
            <i className="ti ti-click" aria-hidden="true" /> Feature activations
          </div>
          <div className="big">{num(data.featureActivations)}</div>
          <div className="d muted">
            Across {data.usageByFeature.length} tool{data.usageByFeature.length === 1 ? "" : "s"}
          </div>
        </div>
        <div className="mcard">
          <div className="l">
            <i className="ti ti-star" aria-hidden="true" /> Most used
          </div>
          {mostUsed ? (
            <>
              <div className="big" style={{ fontSize: 24 }}>{mostUsed.label}</div>
              <div className="d muted">{num(data.mostUsed!.count)} activations</div>
            </>
          ) : (
            <div className="big" style={{ fontSize: 18, paddingTop: 8, color: "var(--t3)" }}>
              No data yet
            </div>
          )}
        </div>
      </div>

      {/* Bar chart: opens over time */}
      <section className="card" style={{ marginBottom: 18 }}>
        <div className="ch">
          <h3>Widget opens over time</h3>
          <span className="cnt">Last 30 days</span>
        </div>
        <div className="cpad">
          {data.opensOverTime.length === 0 ? (
            <div className="muted tiny" style={{ padding: "26px 0" }}>
              No opens recorded in this window yet.
            </div>
          ) : (
            <div
              className="barchart"
              role="img"
              aria-label={`Widget opens per day over the last 30 days. Peak: ${maxOpen.toLocaleString()} opens.`}
            >
              {data.opensOverTime.map((o) => {
                const heightPct = Math.max(4, (o.count / maxOpen) * 100);
                return (
                  <div className="col" key={o.day} title={`${o.day}: ${o.count.toLocaleString()} opens`}>
                    <div
                      className="bar2"
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Usage by feature */}
      <section className="card">
        <div className="ch">
          <h3>Usage by feature</h3>
          <span className="cnt">
            {data.usageByFeature.length > 0
              ? `${data.usageByFeature.length} tool${data.usageByFeature.length === 1 ? "" : "s"}`
              : "No activations yet"}
          </span>
        </div>
        <div className="cpad">
          {data.usageByFeature.length === 0 ? (
            <div className="muted tiny" style={{ padding: "12px 0" }}>
              No feature activations recorded yet. They appear here once visitors use the widget&apos;s tools.
            </div>
          ) : (
            <div className="grid3">
              {data.usageByFeature.map((f) => {
                const meta = featureMeta(f.featureKey);
                return (
                  <div className="fcard" key={f.featureKey}>
                    <div className="ic">
                      <i className={`ti ${meta.icon}`} aria-hidden="true" />
                    </div>
                    <div>
                      <div className="n">{num(f.count)}</div>
                      <div className="tiny muted">{meta.label}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
