/**
 * Pill — inline status/severity badge.
 *
 * Tones mirror the mockup's CSS classes:
 *   high | med | low | green | gray  (filled, from v5)
 *   b-red | b-amber | b-blue | b-green  (border-style, from v6)
 *
 * Usage:
 *   <Pill tone="high"><i className="ti ti-alert-octagon" aria-hidden /> High</Pill>
 *   <Pill tone="b-red" icon="ti ti-alert-octagon">High</Pill>
 */

import type { ReactNode } from "react";

type PillTone = "high" | "med" | "low" | "green" | "gray" | "b-red" | "b-amber" | "b-blue" | "b-green";

interface PillProps {
  tone: PillTone;
  /** Optional Tabler icon class, e.g. "ti ti-alert-octagon" */
  icon?: string;
  children: ReactNode;
}

export function Pill({ tone, icon, children }: PillProps) {
  return (
    <span className={`pill ${tone}`}>
      {icon && <i className={icon} aria-hidden="true" />}
      {children}
    </span>
  );
}
