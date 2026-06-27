/**
 * components/motion/CountUp.tsx — animated number roll-up.
 *
 * Used for hero scores / KPI tiles so figures "count up" into place on mount
 * instead of popping in. Built on Framer Motion's `animate()` + a motion value.
 *
 * Accessibility:
 *  - useReducedMotion() → render the final value immediately, no roll.
 *  - The DOM text always ends on the exact target value (no rounding drift),
 *    so screen readers / copy-paste get the real number.
 */
"use client";

import * as React from "react";
import { animate, useReducedMotion } from "framer-motion";

export function CountUp({
  value,
  durationMs = 900,
  decimals = 0,
  className,
  suffix = "",
  prefix = "",
}: {
  value: number;
  durationMs?: number;
  decimals?: number;
  className?: string;
  suffix?: string;
  prefix?: string;
}) {
  const reduce = useReducedMotion();
  const ref = React.useRef<HTMLSpanElement>(null);
  const fmt = React.useCallback(
    (n: number) => `${prefix}${n.toFixed(decimals)}${suffix}`,
    [decimals, prefix, suffix]
  );

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduce || !Number.isFinite(value)) {
      el.textContent = fmt(Number.isFinite(value) ? value : 0);
      return;
    }
    const controls = animate(0, value, {
      duration: durationMs / 1000,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => {
        el.textContent = fmt(latest);
      },
    });
    return () => controls.stop();
  }, [value, durationMs, reduce, fmt]);

  // SSR / first paint shows the final value so there's never a flash of "0"
  // for no-JS or reduced-motion users.
  return (
    <span ref={ref} className={className}>
      {fmt(Number.isFinite(value) ? value : 0)}
    </span>
  );
}
