/**
 * app/dashboard/[siteId]/_components/ScoreTrendChart.tsx
 *
 * A lightweight, dependency-free inline-SVG line chart of a site's per-scan
 * accessibility score over time (the Overview sparkline). Fed by the raw `scans`
 * history via getScoreTrend → /api/sites/[id]/scan-trend, so it shows real
 * movement as soon as a site has been scanned twice — unlike the MONTHLY rollup,
 * which only fills in after a service-role recompute job runs.
 *
 * Honesty: when fewer than two scored points exist there is no trend to draw, so
 * it renders an explicit, non-misleading empty state rather than a flat or fake
 * line. The chart is a pure presentational component (no fetching) so it is
 * trivially render-testable in jsdom.
 *
 * Accessibility: the <svg> itself is aria-hidden (decorative); the data is also
 * exposed as an accessible text summary so screen-reader users get the headline
 * (latest score + direction) without parsing the path.
 */

export interface ScoreTrendPoint {
  scannedAt: string;
  score: number;
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function ScoreTrendChart({ points }: { points: ScoreTrendPoint[] }) {
  const valid = (points ?? []).filter(
    (p) => typeof p.score === "number" && Number.isFinite(p.score)
  );

  // Honest empty state — never fake a trend from a single (or no) data point.
  if (valid.length < 2) {
    return (
      <div className="muted tiny" role="status" style={{ padding: "30px 0" }}>
        Not enough scan history to chart a trend yet — run another scan to see your score over time.
      </div>
    );
  }

  const w = 620;
  const h = 168;
  const max = 100;
  const step = (w - 20) / (valid.length - 1);
  const coords = valid.map((p, i) => {
    const x = 10 + i * step;
    const clamped = Math.max(0, Math.min(max, p.score));
    const y = h - (clamped / max) * (h - 20) - 10;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const areaPath =
    `M${coords[0].split(",")[0]},${h} ` +
    coords.map((c) => `L${c}`).join(" ") +
    ` L${coords[coords.length - 1].split(",")[0]},${h} Z`;
  const last = coords[coords.length - 1].split(",");

  const first = valid[0];
  const latest = valid[valid.length - 1];
  const delta = latest.score - first.score;
  const summary =
    `Accessibility score over the last ${valid.length} scans: ` +
    `latest ${latest.score} out of 100, ` +
    (delta > 0
      ? `up ${delta} since ${shortDate(first.scannedAt)}.`
      : delta < 0
        ? `down ${Math.abs(delta)} since ${shortDate(first.scannedAt)}.`
        : `unchanged since ${shortDate(first.scannedAt)}.`);

  return (
    <div style={{ display: "flex", gap: 6 }}>
      {/* Accessible text equivalent of the decorative chart. */}
      <span className="sr-only">{summary}</span>
      <div
        aria-hidden="true"
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
          role="img"
          aria-label={summary}
        >
          <defs>
            <linearGradient id="ov-scan-ar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#1E63FF" stopOpacity=".16" />
              <stop offset="1" stopColor="#1E63FF" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#ov-scan-ar)" />
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
          aria-hidden="true"
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 11.5,
            color: "var(--t2)",
            marginTop: 6,
            fontWeight: 600,
          }}
        >
          {valid.map((p, i) => (
            <span key={`${p.scannedAt}-${i}`}>{shortDate(p.scannedAt)}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
