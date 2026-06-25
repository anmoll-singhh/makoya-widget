/**
 * components/makoya/AnnotationMargin.tsx
 *
 * <AnnotationMargin> — the structural fingerprint of the "Redline" design.
 *
 * Why this exists:
 * ─────────────────
 * The Redline aesthetic unifies hero, report, and app surfaces via a manuscript /
 * code-review feel: a thin left annotation gutter (hairline rule) paired with a
 * main content column. This is a pure layout primitive — no motion, no data
 * fetching — so it can be composed freely anywhere in the UI.
 *
 * Layout:
 * ───────
 * CSS grid with two named columns:
 *   [margin]  — a narrow gutter (e.g. 2rem / 32px). Holds optional line-number
 *               spans and severity-colored tick marks. Purely decorative.
 *   [content] — the main column that receives `children`.
 *
 * The gutter is separated from content by a hairline `border-l` rule using
 * the design token `--border`. The gutter element carries `role="presentation"`
 * and `aria-hidden="true"` so screen readers skip it entirely.
 *
 * Ticks (`marks` prop):
 * ─────────────────────
 * Each mark is `{ at: number; severity?: Severity }` where `at` is the zero-based
 * line index. The tick is positioned by inline `top` (via `--line-h` calc or a
 * fixed px offset) and colored by `SEVERITY_META[severity].token`. When severity
 * is omitted the tick uses the `--border` neutral color (Vellum grey).
 *
 * Line numbers (`lineCount` prop):
 * ─────────────────────────────────
 * When given, renders exactly `lineCount` small aria-hidden spans in the gutter,
 * spaced evenly. Matches the manuscript / code-editor feel.
 *
 * Non-goals:
 * ──────────
 * - No motion (Framer / GSAP / CSS transitions) — callers own animation.
 * - No data fetching. Pure presentational primitive.
 * - Does not rewrite the DOM of `children`.
 */

import React from "react";
import { cn } from "@/lib/utils";
import { SEVERITY_META, type Severity } from "@/lib/design/severity";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AnnotationMark {
  /** Zero-based line index at which to place this tick in the gutter. */
  at: number;
  /** Optional severity; omit for a neutral (--border) tick. */
  severity?: Severity;
}

export interface AnnotationMarginProps {
  /** Optional total line count. When given, renders line-number spans in the gutter. */
  lineCount?: number;
  /**
   * Severity-colored tick marks to place in the gutter, one per entry.
   * Each tick is purely decorative (aria-hidden).
   */
  marks?: AnnotationMark[];
  /** Main content rendered in the right column. */
  children: React.ReactNode;
  /** Additional class names forwarded to the root grid wrapper. */
  className?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

/** Width of the annotation gutter column. Matches 2rem grid-track. */
const GUTTER_WIDTH = "2rem";

/** Height of one "line" in the gutter for tick / line-number placement. */
const LINE_HEIGHT_REM = 1.5;

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Layout primitive: thin left annotation gutter + main content column.
 *
 * @example
 * ```tsx
 * <AnnotationMargin
 *   lineCount={10}
 *   marks={[{ at: 2, severity: "critical" }, { at: 7, severity: "minor" }]}
 * >
 *   <ReportBody />
 * </AnnotationMargin>
 * ```
 */
export function AnnotationMargin({
  lineCount,
  marks = [],
  children,
  className,
}: AnnotationMarginProps) {
  return (
    <div
      className={cn("grid w-full", className)}
      style={{
        gridTemplateColumns: `[margin] ${GUTTER_WIDTH} [content] 1fr`,
      }}
    >
      {/* ── Gutter (decorative) ── */}
      <div
        role="presentation"
        aria-hidden="true"
        className="relative border-r"
        style={{ borderColor: "var(--border)" }}
      >
        {/* Line numbers */}
        {lineCount !== undefined &&
          Array.from({ length: lineCount }, (_, i) => (
            <span
              key={i}
              data-testid="annotation-line"
              aria-hidden="true"
              className="absolute right-2 select-none text-[0.625rem] leading-none"
              style={{
                top: `${i * LINE_HEIGHT_REM}rem`,
                color: "var(--border)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {i + 1}
            </span>
          ))}

        {/* Severity tick marks */}
        {marks.map((mark, idx) => {
          const color = mark.severity
            ? `var(${SEVERITY_META[mark.severity].token})`
            : "var(--border)";

          return (
            <span
              key={idx}
              data-testid="annotation-tick"
              aria-hidden="true"
              className="absolute right-0 block"
              style={{
                top: `${mark.at * LINE_HEIGHT_REM}rem`,
                width: "0.375rem",
                height: "0.375rem",
                borderRadius: "9999px",
                backgroundColor: color,
                transform: "translateX(50%)",
              }}
            />
          );
        })}
      </div>

      {/* ── Content column ── */}
      <div className="min-w-0">{children}</div>
    </div>
  );
}
