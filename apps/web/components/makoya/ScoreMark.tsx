/**
 * ScoreMark.tsx
 *
 * The signature score display component — the still, centrepiece mono number
 * that represents a site's accessibility score (0–100).
 *
 * CRITICAL brand rule: NO count-up animation.
 * Count-ups are "measurement theater" — they make a tool feel flashy but they
 * obscure the actual result and delay the user's ability to read it. The score
 * is rendered as a literal number in the DOM immediately. The ONLY motion
 * allowed is the ring that draws once then holds. This is intentional and
 * must NOT be changed to an animated counter.
 *
 * Design decisions:
 * ─────────────────
 * • Score in Geist Mono with `tabular-nums` — ensures stable layout regardless
 *   of digit combinations (0–100).
 * • Color bound to `scoreBand(score).token` (a CSS custom property) so the
 *   entire score — number, ring, tick — reflects the same severity palette
 *   as the issue list and chip components.
 * • One small Vellum-amber tick mark (aria-hidden) beside the score. Decorative
 *   brand element using `var(--color-vellum-500)` — the canonical @theme token.
 * • Ring: SVG `<motion.circle>` with `inkStroke` variants (pathLength 0 → 1,
 *   plays once, no loop). When `prefers-reduced-motion` is active the ring
 *   renders at pathLength 1 with NO animation — static but still visible.
 * • `size` prop: "hero" (default) for full scan result page (~96px score),
 *   "app" for compact contexts like dashboard cards (~48px score).
 */

"use client";

import { motion, useReducedMotion } from "framer-motion";
import { scoreBand } from "@/lib/design/severity";
import { inkStroke } from "@/lib/design/motion";
import { cn } from "@/lib/utils";

export interface ScoreMarkProps {
  /** Accessibility score 0–100. Rendered immediately; NO count-up. */
  score: number;
  /** Optional one-liner verdict below the score (e.g. "Good — a few issues"). */
  verdict?: string;
  /** Size variant. "hero" = large page centrepiece; "app" = compact card size. */
  size?: "hero" | "app";
  /** Additional class names forwarded to the outer wrapper. */
  className?: string;
}

/**
 * The still, huge Geist-Mono score display.
 *
 * @example
 * // Full scan result hero
 * <ScoreMark score={87} verdict="Good — a few real issues to fix" size="hero" />
 *
 * // Compact dashboard card
 * <ScoreMark score={42} size="app" />
 */
export function ScoreMark({ score, verdict, size = "hero", className }: ScoreMarkProps) {
  const band = scoreBand(score);
  const prefersReducedMotion = useReducedMotion();

  // Ring dimensions by size variant
  const isHero = size === "hero";
  const outerSize = isHero ? 160 : 80;
  const radius = isHero ? 70 : 33;
  const strokeWidth = isHero ? 5 : 3;
  const cx = outerSize / 2;
  const cy = outerSize / 2;
  const circumference = 2 * Math.PI * radius;

  // Score text scale
  const scoreFontClass = isHero
    ? "text-[96px] leading-none"
    : "text-[48px] leading-none";

  // Ring animation: draw once and hold, OR static if reduced-motion
  const ringVariants = prefersReducedMotion
    ? {
        // Static — ring already at full draw; no animation plays
        visible: { pathLength: 1, opacity: 1 },
      }
    : inkStroke;

  const ringInitial = prefersReducedMotion ? "visible" : "hidden";
  const ringAnimate = "visible";

  return (
    <div
      className={cn(
        "relative inline-flex flex-col items-center gap-2",
        className
      )}
    >
      {/* Ring + score cluster */}
      <div className="relative inline-flex items-center justify-center">
        {/* SVG ring — draws once (pathLength 0→1) then holds */}
        <svg
          aria-hidden="true"
          width={outerSize}
          height={outerSize}
          viewBox={`0 0 ${outerSize} ${outerSize}`}
          className="absolute inset-0"
          style={{ transform: "rotate(-90deg)" }} // start draw from top
        >
          {/* Track ring (subtle background) */}
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            opacity={0.08}
            style={{ color: `var(${band.token})` }}
          />
          {/* Animated score ring */}
          <motion.circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={`var(${band.token})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            variants={ringVariants}
            initial={ringInitial}
            animate={ringAnimate}
            style={{ pathLength: prefersReducedMotion ? 1 : undefined }}
          />
        </svg>

        {/* Score number — IMMEDIATE, no count-up animation */}
        <div className="relative z-10 flex items-baseline gap-1">
          <span
            className={cn(
              "font-mono tabular-nums font-bold tracking-tight",
              scoreFontClass
            )}
            style={{ color: `var(${band.token})` }}
          >
            {score}
          </span>
          {/* Vellum amber tick — decorative brand element */}
          <span
            aria-hidden="true"
            className={cn(
              "font-mono font-bold",
              isHero ? "text-[32px]" : "text-[16px]"
            )}
            style={{ color: "var(--color-vellum-500)" }}
          >
            ✓
          </span>
        </div>
      </div>

      {/* Optional verdict one-liner */}
      {verdict && (
        <p
          className={cn(
            "text-center font-sans",
            isHero ? "text-base text-muted-foreground" : "text-sm text-muted-foreground"
          )}
        >
          {verdict}
        </p>
      )}
    </div>
  );
}
