/**
 * KpiCard — metrics tile from the dashboard overview.
 *
 * Mirrors the .kpi markup in docs/makoya_v7.html lines 429-432.
 * Uses v7 dimensional icon tile (.kicon) with sheen via CSS ::before.
 */

import type { ReactNode } from "react";

interface KpiCardProps {
  /** Tabler icon class, e.g. "ti ti-accessible" */
  icon: string;
  /** CSS color for the icon tile background */
  iconBg: string;
  /** Label above the number */
  label: string;
  /** Primary number, displayed via Satoshi font */
  value: string | number;
  /** Small suffix after value, e.g. "/ 100" or "%" */
  unit?: string;
  /** Delta text e.g. "↑ 12 pts" */
  delta?: string;
  /** "up" (green) | "down" (red) — default "up" */
  deltaDir?: "up" | "down";
  /** Optional sparkline SVG node */
  spark?: ReactNode;
}

export function KpiCard({ icon, iconBg, label, value, unit, delta, deltaDir = "up", spark }: KpiCardProps) {
  return (
    <div className="kpi">
      <div className="kt">
        <div className="kicon" style={{ background: iconBg }}>
          <i className={icon} aria-hidden="true" />
        </div>
        <div className="klab">{label}</div>
      </div>
      <div className="kb">
        <div>
          <div className="knum">
            {value}
            {unit && <span>{unit}</span>}
          </div>
          {delta && (
            <div className={`kdel ${deltaDir}`}>{delta}</div>
          )}
        </div>
        {spark && <div aria-hidden="true">{spark}</div>}
      </div>
    </div>
  );
}
