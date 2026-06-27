/**
 * components/admin/MotionTable.tsx — semantic, prop-forwarding motion table.
 *
 * Why this exists (Lane C — admin, block 26 mobile-motion-hardening):
 *   The admin CRM lists are real ARIA tables (`role="table"` → `role="row"` →
 *   `role="cell"`). The founder wants a staggered row/card cascade on load, but
 *   the shared <RevealItem> (components/motion/PageTransition.tsx) does NOT
 *   forward arbitrary DOM props — so wrapping a row in it would either drop the
 *   `role="row"` or inject a non-row <div> between the table and its rows, which
 *   breaks the table model for screen readers. Accessibility is the product, so
 *   that trade is not acceptable.
 *
 *   Instead these two thin wrappers ARE the semantic elements: <MotionTable> is
 *   the `role="table"` element (and a Framer stagger parent), <MotionRow> is the
 *   `role="row"` element (a stagger child). Cells stay as plain children, so the
 *   table > row > cell tree is preserved exactly while the rows cascade in.
 *
 * Accessibility:
 *   - useReducedMotion() short-circuits BOTH to plain <div>s (no transform / no
 *     fade) — required for an accessibility product. Every DOM prop (role,
 *     aria-*, className, style, data-*) is forwarded in both branches.
 *   - The header row (a plain <div role="row"> with no variants) is unaffected
 *     by the stagger, so column headers appear immediately while data cascades.
 */
"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { staggerParent, cardRise } from "@/lib/design/motion";

/**
 * Plain <div> props, minus the handlers Framer Motion redefines with different
 * signatures (drag + DOM animation events). Omitting them lets the same props
 * object spread cleanly into BOTH a plain <div> and a <motion.div>. We never
 * pass these handlers to a table/row anyway.
 */
type DivProps = Omit<
  React.ComponentProps<"div">,
  | "onDrag"
  | "onDragStart"
  | "onDragEnd"
  | "onDragEnter"
  | "onDragLeave"
  | "onDragOver"
  | "onDrop"
  | "onAnimationStart"
  | "onAnimationEnd"
  | "onAnimationIteration"
>;

/**
 * The `role="table"` container. Acts as a Framer stagger parent so each
 * <MotionRow> child rises in sequence. Forwards className/role/aria/style.
 */
export function MotionTable({
  children,
  stagger = 0.05,
  ...rest
}: DivProps & { stagger?: number }) {
  const reduce = useReducedMotion();
  if (reduce) return <div {...rest}>{children}</div>;
  return (
    <motion.div
      {...rest}
      variants={staggerParent(stagger)}
      initial="hidden"
      animate="visible"
    >
      {children}
    </motion.div>
  );
}

/**
 * A single `role="row"` element. Rises + fades as a stagger child of
 * <MotionTable>. Forwards every DOM prop so it stays a real table row.
 */
export function MotionRow({ children, ...rest }: DivProps) {
  const reduce = useReducedMotion();
  if (reduce) return <div {...rest}>{children}</div>;
  return (
    <motion.div {...rest} variants={cardRise}>
      {children}
    </motion.div>
  );
}
