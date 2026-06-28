/**
 * components/landing/Reveal.tsx — the shared scroll-reveal wrapper for the
 * marketing landing (the "expressive marketing motion" half of the Redline spec).
 *
 * Every landing section composes one of these so motion is consistent and, above
 * all, ACCESSIBLE: `useReducedMotion()` short-circuits to a plain, fully-visible
 * render with no animation (hard requirement for an accessibility brand). Motion
 * plays ONCE on scroll-in (`viewport={{ once: true }}`) — nothing loops.
 *
 *  - <Reveal>        one element fading/rising in once it scrolls into view.
 *  - <RevealStagger> a parent that staggers its <Reveal> children in sequence.
 *
 * Both are thin wrappers over the shared motion tokens in lib/design/motion so
 * the easing/duration match the rest of the system.
 */
"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { revealVariant, revealItem, staggerParent } from "@/lib/design/motion";
import { cn } from "@/lib/utils";

const VIEWPORT = { once: true, margin: "-80px" } as const;

export function Reveal({
  children,
  className,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  /** Render element — defaults to a div; pass "li"/"section" where semantics need it. */
  as?: "div" | "section" | "li";
}) {
  const reduce = useReducedMotion();
  const Comp = motion[as];

  // Reduced motion → render at the resting state, no animation.
  if (reduce) {
    const Plain = as;
    return <Plain className={className}>{children}</Plain>;
  }

  return (
    <Comp
      className={className}
      variants={revealVariant}
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT}
    >
      {children}
    </Comp>
  );
}

export function RevealStagger({
  children,
  className,
  stagger = 0.1,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
}) {
  const reduce = useReducedMotion();

  if (reduce) {
    return <div className={cn(className)}>{children}</div>;
  }

  return (
    <motion.div
      className={cn(className)}
      variants={staggerParent(stagger)}
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT}
    >
      {children}
    </motion.div>
  );
}

/**
 * RevealItem — a single staggered child. MUST be a direct child of
 * <RevealStagger> so the parent's `staggerChildren` cascade reaches it (the
 * previous landing grids wrapped plain <div>s, which never received the cascade —
 * so nothing actually staggered). This is a real `motion` element carrying the
 * `revealItem` variant, so each card rises + settles in sequence.
 *
 * Reduced motion: short-circuits to a plain element at the resting state.
 */
export function RevealItem({
  children,
  className,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "li";
}) {
  const reduce = useReducedMotion();

  if (reduce) {
    const Plain = as;
    return <Plain className={className}>{children}</Plain>;
  }

  const Comp = motion[as];
  return (
    <Comp className={className} variants={revealItem}>
      {children}
    </Comp>
  );
}
