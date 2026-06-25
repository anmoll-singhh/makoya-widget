/**
 * SeverityChip.tsx
 *
 * A small pill-shaped chip that represents an accessibility severity level.
 * Used in issue lists, report summaries, and the admin CRM to give scanners
 * an instant at-a-glance reading of how serious a finding is.
 *
 * Design decisions:
 * ─────────────────
 * • Color via CSS custom properties (--color-sev-* and --color-sev-*-bg) so the
 *   chip inherits whichever theme is active without hard-coding hex values here.
 * • Ink-weight hierarchy: critical and serious get a filled circle marker (●)
 *   to signal "take action"; moderate gets a hollow marker (○); minor gets a
 *   tiny dash (–) in grayscale — conveys presence without urgency.
 * • The count (when provided) is rendered in tabular-nums so numbers align
 *   across multiple chips in a list column.
 * • Uses `cn` for conditional class composition (Tailwind-merge safe).
 */

import { SEVERITY_META, type Severity } from "@/lib/design/severity";
import { cn } from "@/lib/utils";

/** Filled-circle marker for high-ink severities (critical, serious). */
const FilledMarker = () => (
  <span aria-hidden="true" className="text-[0.6em] leading-none">●</span>
);

/** Hollow-circle marker for moderate severity. */
const HollowMarker = () => (
  <span aria-hidden="true" className="text-[0.6em] leading-none">○</span>
);

/** Dash marker for minor severity — visually de-emphasised. */
const MinorMarker = () => (
  <span aria-hidden="true" className="text-[0.6em] leading-none opacity-60">–</span>
);

function getMarker(severity: Severity) {
  if (severity === "critical" || severity === "serious") return <FilledMarker />;
  if (severity === "moderate") return <HollowMarker />;
  return <MinorMarker />;
}

export interface SeverityChipProps {
  /** The severity level this chip represents. */
  severity: Severity;
  /** Optional count of issues at this severity — rendered with tabular-nums. */
  count?: number;
  /** Additional class names forwarded to the outer element. */
  className?: string;
}

/**
 * Renders a pill chip for the given severity.
 *
 * @example
 * <SeverityChip severity="critical" count={3} />
 * <SeverityChip severity="minor" />
 */
export function SeverityChip({ severity, count, className }: SeverityChipProps) {
  const meta = SEVERITY_META[severity];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        // minor gets a desaturated grayscale treatment to reduce visual weight
        severity === "minor" && "opacity-70 grayscale",
        className
      )}
      style={{
        color: `var(${meta.token})`,
        background: `var(${meta.bgToken})`,
      }}
    >
      {getMarker(severity)}
      <span>{meta.label}</span>
      {count !== undefined && (
        <span className="font-tabular-nums ml-0.5 tabular-nums">{count}</span>
      )}
    </span>
  );
}
