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

export const revealVariant: Variants = {
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
};

export function staggerParent(stagger: number = 0.04): Variants {
  return {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: stagger,
      },
    },
  };
}

export const inkStroke: Variants = {
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
    },
  },
};
