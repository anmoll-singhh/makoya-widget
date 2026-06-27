/**
 * CaughtIn4kModal.tsx — the playful "Caught in 4K" dialog for the SQL-injection gag.
 *
 * Shown ONLY when the client-side honeypot (injection-honeypot.ts) decides the
 * submitted credentials look like an injection/probe. It is pure theatre — see the
 * honeypot file for the honesty note: real protection is Supabase/PostgREST
 * parameterised queries, not this modal.
 *
 * Accessibility is the product, so even the gag is a properly-built dialog:
 *  - role="dialog" + aria-modal, labelled by the title and described by the body.
 *  - Focus moves into the dialog on open and is TRAPPED (Tab/Shift+Tab cycle).
 *  - Esc closes; clicking the backdrop closes.
 *  - Focus RETURNS to whatever was focused before it opened (the submit button).
 *  - Motion uses the shared `popSpring` variant and is disabled under
 *    `prefers-reduced-motion` (useReducedMotion) — entrance becomes an instant,
 *    non-animated render.
 */
"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Camera } from "lucide-react";
import { popSpring } from "@/lib/design/motion";

/** Elements we consider focusable for the Tab trap. */
const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

export function CaughtIn4kModal({
  open,
  onClose,
}: {
  open: boolean;
  /** Called on Esc, backdrop click, or the dismiss button. */
  onClose: () => void;
}) {
  const reduce = useReducedMotion() ?? false;
  const dialogRef = React.useRef<HTMLDivElement>(null);
  // Remember who had focus so we can hand it back when the gag is dismissed.
  const restoreRef = React.useRef<HTMLElement | null>(null);

  // Focus management: capture the opener, move focus in, restore on close.
  React.useEffect(() => {
    if (!open) return;
    restoreRef.current = (document.activeElement as HTMLElement) ?? null;
    // Focus the dialog container so screen readers announce the label/desc.
    const id = window.requestAnimationFrame(() => dialogRef.current?.focus());
    return () => {
      window.cancelAnimationFrame(id);
      restoreRef.current?.focus?.();
    };
  }, [open]);

  // Keyboard: Esc to close, Tab to cycle focus inside the dialog.
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab") return;
    const root = dialogRef.current;
    if (!root) return;
    const items = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (el) => el.offsetParent !== null
    );
    if (items.length === 0) {
      e.preventDefault();
      root.focus();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement as HTMLElement | null;
    if (e.shiftKey && (active === first || active === root)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="c4k-overlay"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0 }}
          transition={{ duration: 0.16 }}
          onMouseDown={(e) => {
            // Only close when the backdrop itself is pressed, not the card.
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="c4k-title"
            aria-describedby="c4k-desc"
            tabIndex={-1}
            className="c4k-card"
            onKeyDown={onKeyDown}
            variants={popSpring}
            initial={reduce ? false : "hidden"}
            animate="visible"
            exit={reduce ? undefined : { opacity: 0, scale: 0.9, y: 8 }}
          >
            <div className="c4k-icon" aria-hidden="true">
              <Camera size={30} strokeWidth={2.2} />
            </div>
            <h2 id="c4k-title" className="c4k-title">
              📷 Caught in 4K
            </h2>
            <p id="c4k-desc" className="c4k-desc">
              SQL injection in this economy, really?? Nice try. Our backend uses parameterised
              queries, so that payload was never going anywhere — but we admire the effort. Come
              back with a real password. 😉
            </p>
            <button type="button" className="c4k-btn" onClick={onClose}>
              Okay, you caught me
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
