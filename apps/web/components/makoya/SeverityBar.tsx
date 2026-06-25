/**
 * SeverityBar.tsx
 *
 * A single stacked horizontal bar that shows the distribution of accessibility
 * issues across the four severity levels, worst-first (critical → serious →
 * moderate → minor).
 *
 * Design decisions:
 * ─────────────────
 * • Segments are rendered in severity order (worst-first) with `flex-grow`
 *   proportional to their count, so the bar visually encodes urgency at a
 *   glance — a wide red segment dominates; a thin yellow one reads as "minor".
 * • Zero-count severities are omitted entirely (no invisible 0-width segments)
 *   to keep the bar crisp and avoid confusing empty DOM nodes.
 * • Each segment uses the CSS custom property for its severity colour
 *   (--sev-* as background) so it integrates with the design token system.
 * • The wrapper carries an `aria-label` that spells out all four counts,
 *   making the bar understandable to screen-reader users who can't see colours.
 *
 * Accessibility:
 * ──────────────
 * The outer <div> has role="img" + aria-label so assistive tech treats the bar
 * as a single labelled graphic rather than a sequence of meaningless divs.
 * Individual segments are purely decorative (aria-hidden).
 */

import { SEVERITY_META, type Severity } from "@/lib/design/severity";
import { cn } from "@/lib/utils";

export interface SeverityBarTotals {
  critical: number;
  serious: number;
  moderate: number;
  minor: number;
}

export interface SeverityBarProps {
  /** The count of issues at each severity level. */
  totals: SeverityBarTotals;
  /** Height class — defaults to a comfortable 8px bar. */
  heightClass?: string;
  /** Additional class names forwarded to the outer element. */
  className?: string;
}

/** The canonical rendering order: worst severity first. */
const SEVERITY_ORDER: Severity[] = ["critical", "serious", "moderate", "minor"];

/**
 * Renders a proportional stacked horizontal bar for issue severity distribution.
 *
 * @example
 * <SeverityBar totals={{ critical: 2, serious: 5, moderate: 0, minor: 10 }} />
 */
export function SeverityBar({
  totals,
  heightClass = "h-2",
  className,
}: SeverityBarProps) {
  // Build the accessible label string: "1 critical, 2 serious, 0 moderate, 4 minor"
  const ariaLabel = SEVERITY_ORDER.map(
    (sev) => `${totals[sev]} ${SEVERITY_META[sev].label.toLowerCase()}`
  ).join(", ");

  // Only render segments that have at least 1 issue.
  const segments = SEVERITY_ORDER.filter((sev) => totals[sev] > 0);

  return (
    <div
      role="img"
      aria-label={ariaLabel}
      className={cn("flex w-full overflow-hidden rounded-full", heightClass, className)}
    >
      {segments.map((sev) => {
        const meta = SEVERITY_META[sev];
        return (
          <div
            key={sev}
            aria-hidden="true"
            className="shrink-0"
            style={{
              flexGrow: totals[sev],
              background: `var(${meta.token})`,
            }}
          />
        );
      })}
    </div>
  );
}
