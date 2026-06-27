/**
 * components/motion/LoadingButton.tsx — the showcase "creative loading" button.
 *
 * Founder directive: "when we click on signin button rather than simple 3 dots
 * we do something creative". So instead of a generic spinner, the button content
 * crossfades to a brand-themed *scan* animation — a ring that draws itself, a
 * radar sweep, and an orbiting pulse (on-brand for an accessibility *scanner*) —
 * then morphs into a draw-on checkmark on success.
 *
 * Style-agnostic: it renders a real <button> and forwards `className`, so it
 * drops into BOTH the hand-CSS world (.login-btn, .btn) and shadcn buttons.
 *
 * Accessibility (hard requirement for an a11y product):
 *  - Always a real <button>; keyboard + disabled semantics preserved.
 *  - `aria-busy` while loading; an aria-live region announces busy/success text.
 *  - `useReducedMotion()` → NO morph/spin; just a static label swap + dot/check.
 */
"use client";

import * as React from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { EASE_INK } from "@/lib/design/motion";

type LoadingButtonProps = React.ComponentProps<"button"> & {
  /** When true, shows the scan animation and blocks clicks. */
  loading?: boolean;
  /** When true (and not loading), shows the draw-on checkmark. */
  success?: boolean;
  /** Screen-reader (and reduced-motion visible) text while loading. */
  busyLabel?: string;
  /** Screen-reader (and reduced-motion visible) text on success. */
  successLabel?: string;
};

/** The brand "scan" loader: a drawing ring + radar sweep + orbiting pulse. */
function ScanLoader({ reduce }: { reduce: boolean }) {
  if (reduce) {
    // Reduced motion: a calm, static brand dot. No spin, no draw.
    return (
      <span
        aria-hidden="true"
        style={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          border: "2.5px solid currentColor",
          opacity: 0.55,
          display: "inline-block",
        }}
      />
    );
  }
  return (
    <span aria-hidden="true" style={{ display: "inline-flex", width: 22, height: 22 }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <defs>
          <linearGradient id="mk-scan-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#1E63FF" />
            <stop offset="1" stopColor="#1FA86B" />
          </linearGradient>
        </defs>
        {/* faint track */}
        <circle
          cx="12"
          cy="12"
          r="9"
          stroke="currentColor"
          strokeOpacity="0.25"
          strokeWidth="2.5"
        />
        {/* rotating scanner arc */}
        <motion.g
          style={{ originX: "12px", originY: "12px" }}
          animate={{ rotate: 360 }}
          transition={{ duration: 0.9, ease: "linear", repeat: Infinity }}
        >
          <path
            d="M12 3 A9 9 0 0 1 21 12"
            stroke="url(#mk-scan-g)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {/* orbiting pulse at the arc tip */}
          <motion.circle
            cx="21"
            cy="12"
            r="2"
            fill="url(#mk-scan-g)"
            animate={{ scale: [1, 1.5, 1], opacity: [1, 0.4, 1] }}
            transition={{ duration: 0.9, ease: EASE_INK, repeat: Infinity }}
            style={{ originX: "21px", originY: "12px" }}
          />
        </motion.g>
      </svg>
    </span>
  );
}

/** The draw-on success checkmark. */
function SuccessMark({ reduce }: { reduce: boolean }) {
  return (
    <span aria-hidden="true" style={{ display: "inline-flex", width: 22, height: 22 }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <motion.path
          d="M5 12.5 L10 17.5 L19 6.5"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={reduce ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: EASE_INK }}
        />
      </svg>
    </span>
  );
}

export function LoadingButton({
  loading = false,
  success = false,
  busyLabel = "Working…",
  successLabel = "Done",
  children,
  disabled,
  className,
  ...props
}: LoadingButtonProps) {
  const reduce = useReducedMotion() ?? false;
  const state: "idle" | "loading" | "success" = loading ? "loading" : success ? "success" : "idle";

  return (
    <button
      className={className}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      data-state={state}
      {...props}
    >
      {/* Visually-presented, animated content. */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={state}
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
          transition={{ duration: 0.2, ease: EASE_INK }}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, justifyContent: "center" }}
        >
          {state === "loading" ? (
            <>
              <ScanLoader reduce={reduce} />
              {reduce && <span>{busyLabel}</span>}
            </>
          ) : state === "success" ? (
            <>
              <SuccessMark reduce={reduce} />
              {reduce && <span>{successLabel}</span>}
            </>
          ) : (
            children
          )}
        </motion.span>
      </AnimatePresence>

      {/* Polite live region so AT users hear state changes without seeing motion. */}
      <span
        role="status"
        aria-live="polite"
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: "hidden",
          clip: "rect(0 0 0 0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      >
        {state === "loading" ? busyLabel : state === "success" ? successLabel : ""}
      </span>
    </button>
  );
}
