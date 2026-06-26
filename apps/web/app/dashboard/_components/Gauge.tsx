/**
 * Gauge — the accessibility score ring.
 *
 * SVG circle with a gradient stroke (#1E63FF → #1FA86B), centred number,
 * and ARIA role="img" with a descriptive label. Mirrors .gwrap markup from
 * docs/makoya_v7.html lines 421-425.
 *
 * "use client" is required for useId() — React 18 hook for stable,
 * per-instance unique IDs so multiple gauges on one page don't collide
 * on the SVG linearGradient id.
 */

"use client";

import { useId } from "react";

interface GaugeProps {
  /** Score 0–100 */
  value: number;
  /** Diameter in px (default 158, matches mockup .gwrap) */
  size?: number;
  /** Optional label below the ring */
  label?: string;
  /** Optional delta string, e.g. "↑ 12 pts vs last 7 days" */
  delta?: string;
}

export function Gauge({ value, size = 158, label, delta }: GaugeProps) {
  // useId produces a stable, per-instance unique string (e.g. ":r0:") so that
  // multiple Gauges on the same page each get their own SVG linearGradient id
  // and don't collide or steal each other's gradient paint.
  const uid = useId();
  const gradientId = `mk-gauge-g-${uid.replace(/:/g, "")}`;

  // Geometry: the mockup uses r=15.6, circumference ≈ 98 (2π·15.6 ≈ 98.02).
  // stroke-dashoffset for a given value:  98 * (1 - value/100)
  const r = 15.6;
  const circ = 2 * Math.PI * r; // ≈98.02
  const offset = circ * (1 - value / 100);

  return (
    <div className="hg" style={{ flex: "none" }}>
      <div
        className="gwrap"
        style={{ width: size, height: size, margin: "0 auto" }}
        role="img"
        aria-label={`Accessibility score: ${value} out of 100`}
      >
        <svg
          width={size}
          height={size}
          viewBox="0 0 36 36"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#1E63FF" />
              <stop offset="1" stopColor="#1FA86B" />
            </linearGradient>
          </defs>
          {/* Track */}
          <circle
            cx="18"
            cy="18"
            r={r}
            fill="none"
            stroke="#D9E4F2"
            strokeWidth="3"
          />
          {/* Progress arc */}
          <circle
            cx="18"
            cy="18"
            r={r}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circ.toFixed(2)}
            strokeDashoffset={offset.toFixed(2)}
            transform="rotate(-90 18 18)"
          />
        </svg>
        <div className="gc">
          <div className="gn">{value}</div>
          <div className="gu">/ 100</div>
        </div>
      </div>
      {label && (
        <div className="glab" style={{ fontFamily: "'Satoshi'", fontWeight: 700, fontSize: 15, color: "var(--deep)", marginTop: 12 }}>
          {label}
        </div>
      )}
      {delta && (
        <div className="gd" style={{ fontSize: 12.5, color: "var(--green-ink)", fontWeight: 700, marginTop: 3 }}>
          {delta}
        </div>
      )}
    </div>
  );
}
