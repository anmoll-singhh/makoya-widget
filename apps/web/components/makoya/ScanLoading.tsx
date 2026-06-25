/**
 * components/makoya/ScanLoading.tsx
 *
 * <ScanLoading> — the methodical margin-fill line-tick loader.
 *
 * BRAND-CRITICAL aesthetic:
 * ─────────────────────────
 * This is a CHECKLIST BEING WORKED THROUGH, top-to-bottom — NOT a sweeping
 * scan-line. Sweeps are "measurement theater" / fake-magic: they imply speed
 * through visual flourish rather than transparency. The tick column is the
 * opposite: calm, methodical, honest. Each tick fills in sequence, like a
 * real checklist getting checked off.
 *
 * Layout:
 * ───────
 * A single vertical column of hairline tick marks, spaced evenly. Ticks fill
 * from top to bottom (opacity 0.15 → 1, with a short scale-x grow). The column
 * is left-aligned and narrow — it intentionally occupies the left gutter space,
 * mirroring the <AnnotationMargin> feel without requiring that component.
 *
 * Props:
 * ──────
 * - `label?`: Status text shown below the tick column. Screen readers announce
 *   it via `aria-live="polite"` on the root.
 * - `progress?` (0–1): When provided, exactly `Math.round(count * progress)`
 *   ticks are rendered in the "filled" state. When omitted, a one-shot staggered
 *   fill animation plays (non-looping, calm — a gentle idle is acceptable but
 *   the default is one-shot). Reduced-motion overrides: static partial fill, no
 *   animation.
 *
 * Motion:
 * ───────
 * Uses `EASE_INK` and `staggerParent` from `@/lib/design/motion`. Each tick
 * animates via a Framer Motion `motion.span` with the stagger parent driving
 * timing. The stagger is gentle (0.06 s per tick) — methodical, not anxious.
 * `useReducedMotion()` true → initial="visible" immediately, no transition.
 *
 * Accessibility:
 * ──────────────
 * Root has `role="status"` + `aria-live="polite"`. All tick marks are
 * `aria-hidden="true"` — they are purely decorative. Only `label` is
 * exposed to screen readers.
 *
 * Tokens:
 * ───────
 * No hardcoded hex. Uses `var(--border)` for unfilled ticks and
 * `var(--foreground)` (with reduced opacity when fully filled) for filled ticks.
 * Both are standard shadcn/Tailwind CSS custom properties.
 */

"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { EASE_INK, staggerParent } from "@/lib/design/motion";

// ─── Constants ───────────────────────────────────────────────────────────────

/** Total number of tick marks in the column. */
const TICK_COUNT = 20;

/** Width of each hairline tick. */
const TICK_W = "0.125rem"; // 2px hairline

/** Height of each tick mark. */
const TICK_H = "0.875rem"; // 14px — tall enough to feel like a line-tick

/** Gap between ticks. */
const TICK_GAP = "0.375rem"; // 6px

/** Stagger delay between successive tick fills (seconds). Calm pace. */
const TICK_STAGGER = 0.06;

// ─── Variants ────────────────────────────────────────────────────────────────

/** A single tick: unfilled → filled (scale-x grow + opacity). */
const tickVariant = {
  hidden: {
    scaleX: 0.3,
    opacity: 0,
  },
  visible: {
    scaleX: 1,
    opacity: 1,
    transition: {
      duration: 0.28,
      ease: EASE_INK,
    },
  },
} as const;

// ─── Props ───────────────────────────────────────────────────────────────────

export interface ScanLoadingProps {
  /**
   * Status label shown below the tick column.
   * Screen readers announce it via the `aria-live="polite"` root.
   */
  label?: string;
  /**
   * Optional deterministic progress (0–1).
   * When provided, `Math.round(TICK_COUNT * progress)` ticks are rendered
   * filled (no animation, or an immediate static fill). When omitted,
   * a one-shot stagger animation fills all ticks in sequence.
   */
  progress?: number;
  /** Additional class names forwarded to the root wrapper. */
  className?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Methodical margin-fill line-tick loader.
 *
 * @example
 * // Indeterminate — one-shot stagger fill
 * <ScanLoading label="Scanning your site…" />
 *
 * // Determinate — 60% filled
 * <ScanLoading label="Checking colour contrast…" progress={0.6} />
 */
export function ScanLoading({ label, progress, className }: ScanLoadingProps) {
  const prefersReducedMotion = useReducedMotion();

  // Determine how many ticks are "filled" in the controlled (progress) mode.
  // In indeterminate mode, ALL ticks animate via the stagger parent — the
  // filled/unfilled distinction is driven by the animation state, not by data.
  const isDeterminate = progress !== undefined;
  const filledCount = isDeterminate ? Math.round(TICK_COUNT * Math.max(0, Math.min(1, progress))) : TICK_COUNT;

  // Stagger parent controls the cascade. When reduced-motion or determinate,
  // we short-circuit to "visible" immediately so ticks render at rest.
  const skipAnimation = prefersReducedMotion || isDeterminate;

  const parentVariants = staggerParent(TICK_STAGGER);

  // The initial/animate pair drives the whole column
  const initial = skipAnimation ? "visible" : "hidden";
  const animate = "visible";

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex flex-col items-start", className)}
    >
      {/* Tick column — the methodical checklist fill */}
      <motion.div
        aria-hidden="true"
        className="flex flex-col"
        style={{ gap: TICK_GAP }}
        variants={parentVariants}
        initial={initial}
        animate={animate}
      >
        {Array.from({ length: TICK_COUNT }, (_, i) => {
          // In determinate mode, ticks up to filledCount are filled; rest are not.
          // In indeterminate mode, all ticks animate (filled state is post-animation).
          const isFilled = isDeterminate ? i < filledCount : true;

          return (
            <motion.span
              key={i}
              data-testid="scan-tick"
              data-filled={isFilled ? "true" : "false"}
              aria-hidden="true"
              variants={skipAnimation ? undefined : tickVariant}
              style={{
                display: "block",
                width: TICK_W,
                height: TICK_H,
                transformOrigin: "left center",
                borderRadius: "9999px",
                // Filled: foreground at 0.8 opacity (strong but not harsh).
                // Unfilled: border token at 0.35 opacity (very quiet placeholder).
                backgroundColor: isFilled
                  ? "var(--foreground)"
                  : "var(--border)",
                opacity: isDeterminate
                  ? isFilled
                    ? 0.8
                    : 0.2
                  : undefined, // let animation handle opacity in indeterminate mode
              }}
            />
          );
        })}
      </motion.div>

      {/* Label — the only content exposed to assistive tech */}
      {label && (
        <p
          className={cn(
            "mt-3 font-mono text-[0.6875rem] leading-none tracking-wide",
          )}
          style={{ color: "var(--muted-foreground, var(--foreground))" }}
        >
          {label}
        </p>
      )}
    </div>
  );
}
