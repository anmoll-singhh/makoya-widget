/**
 * Motion tokens for Makoya design system.
 *
 * Exports shared Framer Motion easing, durations, and animation variants consumed
 * by animated signature components (reveal entrance, stagger groups, ink-stroke drawing).
 * All timing and curves are extracted here to maintain consistency across animations
 * and enable rapid refinement in a single place.
 *
 * - EASE_INK: cubic-bezier for signature/annotation marks (sharp entrance into soft exit).
 * - DUR: duration constants (app: quick UI moments, mark: single strokes, section: full reveals).
 * - revealVariant: opacity + translate reveal used in whileInView marketing sections.
 * - staggerParent: returns variants that manage staggerChildren timing for child animations.
 * - inkStroke: pathLength + opacity draw effect for SVG annotation marks (no loop).
 */

import type { Variants } from "framer-motion";

export const EASE_INK = [0.22, 1, 0.36, 1] as const;

export const DUR = {
  app: 0.18,
  mark: 0.32,
  section: 0.6,
} as const;

export const revealVariant = {
  hidden: {
    opacity: 0,
    y: 8,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: DUR.section,
      ease: EASE_INK,
    },
  },
} satisfies Variants;

export function staggerParent(stagger: number = 0.04) {
  return {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: stagger,
      },
    },
  } satisfies Variants;
}

export const inkStroke = {
  hidden: {
    pathLength: 0,
    opacity: 0,
  },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: {
      duration: DUR.mark,
      ease: EASE_INK,
      repeat: undefined,
    },
  },
} satisfies Variants;

/* ────────────────────────────────────────────────────────────────────────────
 * App-wide entrance variants (block 26 — mobile-motion-hardening).
 *
 * These power the dashboard / admin / public screen entrances and the staggered
 * card grids. Same EASE_INK + DUR tokens so motion feels like one system.
 * Every consumer must short-circuit with useReducedMotion() to a resting render.
 * ──────────────────────────────────────────────────────────────────────────── */

/** Whole-screen entrance: a touch more travel than revealVariant, plays on mount. */
export const pageEnter = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DUR.section, ease: EASE_INK },
  },
} satisfies Variants;

/** Card / KPI tile rise — child of a staggerParent. Bigger pop than reveal. */
export const cardRise = {
  hidden: { opacity: 0, y: 18, scale: 0.985 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: EASE_INK },
  },
} satisfies Variants;

/** Scale-in for modals / popovers / success marks. */
export const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: DUR.mark, ease: EASE_INK },
  },
} satisfies Variants;

/** Springy bounce for delight moments (success badge, the "Caught in 4K" modal). */
export const popSpring = {
  hidden: { opacity: 0, scale: 0.8, y: 8 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 420, damping: 24 },
  },
} satisfies Variants;
