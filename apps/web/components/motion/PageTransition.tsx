/**
 * components/motion/PageTransition.tsx — per-screen entrance wrapper.
 *
 * Drop around a screen's content so it rises/fades in on mount (founder: "all
 * the screens have a load animation"). Optional `stagger` makes direct children
 * cascade in — pair with <RevealItem> for the cascade.
 *
 * Accessibility: useReducedMotion() short-circuits to a plain, fully-visible
 * render (no transform, no fade) — required for an accessibility product.
 */
"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { pageEnter, cardRise, staggerParent } from "@/lib/design/motion";

export function PageTransition({
  children,
  className,
  stagger,
}: {
  children: ReactNode;
  className?: string;
  /** If set, direct <RevealItem> children cascade in by this many seconds. */
  stagger?: number;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      variants={stagger != null ? staggerParent(stagger) : pageEnter}
      initial="hidden"
      animate="visible"
    >
      {children}
    </motion.div>
  );
}

/** A single item in a staggered <PageTransition stagger={...}>. */
export function RevealItem({
  children,
  className,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "li" | "tr";
}) {
  const reduce = useReducedMotion();
  if (reduce) {
    const Plain = as;
    return <Plain className={className}>{children}</Plain>;
  }
  const Comp = motion[as];
  return (
    <Comp className={className} variants={cardRise}>
      {children}
    </Comp>
  );
}
