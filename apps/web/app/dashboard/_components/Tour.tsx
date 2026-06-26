/**
 * Tour.tsx — first-login product walkthrough.
 *
 * Shows a 5-step modal tour the first time a user visits the dashboard.
 * Dismissed (skip or finish) state is persisted to localStorage so it
 * never re-appears for returning users.
 *
 * Accessibility contract (this IS an a11y product — it must lead by example):
 *  - role="dialog" aria-modal="true" aria-labelledby on the card.
 *  - Focus moves INTO the dialog on open (via imperative focus call after mount).
 *  - Focus returns to the previously-focused element on close.
 *  - Full focus-trap: Tab wraps at last → first; Shift+Tab wraps at first → last.
 *  - Esc key = Skip (calls dismiss).
 *  - All controls are real <button> elements with meaningful labels.
 *  - Backdrop is aria-hidden so screen readers only see the dialog.
 *  - Dot indicators are aria-hidden (decorative).
 *  - Respects prefers-reduced-motion: dashboard.css globally disables
 *    transitions/animations when the user prefers reduced motion.
 *
 * Gating:
 *  - Reads localStorage "makoya_tour_v1" inside a useEffect (SSR-safe).
 *  - Any dismiss path (skip / finish) writes the flag so the tour is
 *    permanently hidden for that browser.
 */

"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const TOUR_KEY = "makoya_tour_v1";

interface Step {
  icon: string;      // Tabler icon class
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    icon: "ti ti-sparkles",
    title: "Welcome to Makoya",
    body: "This is your Makoya dashboard. Here's a 30-second tour of what you can do.",
  },
  {
    icon: "ti ti-stack-2",
    title: "Agents",
    body: "Each agent is a website Makoya monitors. Switch between them with the selector in the top-left of the sidebar.",
  },
  {
    icon: "ti ti-robot",
    title: "Mike — your audit",
    body: "Mike is your audit. See every accessibility issue, grouped by status, and resolve them at your own pace.",
  },
  {
    icon: "ti ti-browser",
    title: "Widget",
    body: "Install the accessibility widget and customize what visitors can turn on — text size, contrast, readable font, and more.",
  },
  {
    icon: "ti ti-shield-check",
    title: "Compliance & insights",
    body: "Generate an accessibility statement, keep a proof-of-effort record, and track analytics & monthly reports.",
  },
];

const LABEL_ID = "tour-dialog-title";

export function Tour() {
  // Start hidden; useEffect will reveal if the flag is unset (SSR-safe).
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  const dialogRef = useRef<HTMLDivElement>(null);
  // We capture the focused element at open-time so we can restore focus on close.
  const returnFocusRef = useRef<HTMLElement | null>(null);

  // ── Gate check (SSR-safe) ──────────────────────────────────────────────────
  useEffect(() => {
    try {
      if (!localStorage.getItem(TOUR_KEY)) {
        setVisible(true);
      }
    } catch {
      // localStorage blocked (private browsing, etc.) — silently skip the tour.
    }
  }, []);

  // ── Focus management: move focus into dialog when it becomes visible ───────
  useEffect(() => {
    if (!visible) return;
    // Capture current focus to restore later.
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    // Defer so the dialog is painted before we call .focus().
    const raf = requestAnimationFrame(() => {
      dialogRef.current?.focus();
    });
    return () => cancelAnimationFrame(raf);
  }, [visible]);

  // ── Dismiss: write flag + restore focus ───────────────────────────────────
  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(TOUR_KEY, "done");
    } catch {
      // Ignore write failures — at worst the tour re-appears next session.
    }
    setVisible(false);
    const raf = requestAnimationFrame(() => {
      returnFocusRef.current?.focus();
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  // ── Keyboard: Esc = dismiss; Tab = focus trap ──────────────────────────────
  useEffect(() => {
    if (!visible) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        dismiss();
        return;
      }

      if (e.key === "Tab") {
        const dialog = dialogRef.current;
        if (!dialog) return;

        const focusable = Array.from(
          dialog.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href]:not([disabled]), input:not([disabled]), ' +
            'select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          // Shift+Tab at first element → wrap to last
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          // Tab at last element → wrap to first
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [visible, dismiss]);

  if (!visible) return null;

  const current = STEPS[step];
  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;

  return (
    <>
      {/* ── Backdrop ────────────────────────────────────────────────────────
          aria-hidden so screen readers don't land here. Click-outside = skip.
      ─────────────────────────────────────────────────────────────────────── */}
      <div
        aria-hidden="true"
        onClick={dismiss}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(13, 27, 77, 0.48)",
          zIndex: 900,
        }}
      />

      {/* ── Dialog centering shell ──────────────────────────────────────────
          pointerEvents:none so clicks in the empty space around the card
          fall through to the backdrop handler above (dismiss on click-away).
      ─────────────────────────────────────────────────────────────────────── */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 901,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
          pointerEvents: "none",
        }}
      >
        {/* ── Card / Dialog ─────────────────────────────────────────────── */}
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={LABEL_ID}
          tabIndex={-1}
          style={{
            pointerEvents: "auto",
            width: "100%",
            maxWidth: 476,
            background: "var(--surface)",
            borderRadius: 20,
            border: "1px solid var(--border)",
            boxShadow: "var(--sh-pop)",
            outline: "none",
            overflow: "hidden",
          }}
        >
          {/* ── Content area ────────────────────────────────────────────── */}
          <div style={{ padding: "32px 32px 20px" }}>

            {/* Icon tile */}
            <div
              aria-hidden="true"
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: "var(--primary-soft)",
                display: "grid",
                placeItems: "center",
                marginBottom: 20,
                boxShadow: "0 4px 12px rgba(30,99,255,0.14)",
              }}
            >
              <i
                className={current.icon}
                style={{ fontSize: 26, color: "var(--primary-hover)" }}
              />
            </div>

            {/* Step counter */}
            <div
              aria-live="polite"
              aria-atomic="true"
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "var(--t3)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              Step {step + 1} of {STEPS.length}
            </div>

            {/* Title */}
            <h2
              id={LABEL_ID}
              style={{
                fontFamily: "'Satoshi', system-ui, sans-serif",
                fontSize: 21,
                fontWeight: 700,
                color: "var(--deep)",
                letterSpacing: "-0.02em",
                lineHeight: 1.25,
                marginBottom: 10,
              }}
            >
              {current.title}
            </h2>

            {/* Body */}
            <p
              style={{
                fontSize: 14.5,
                color: "var(--t2)",
                lineHeight: 1.65,
                fontWeight: 500,
                margin: 0,
              }}
            >
              {current.body}
            </p>
          </div>

          {/* ── Dot progress indicator ────────────────────────────────────── */}
          <div
            aria-hidden="true"
            style={{
              display: "flex",
              gap: 6,
              padding: "12px 32px 20px",
              alignItems: "center",
            }}
          >
            {STEPS.map((_, i) => (
              <span
                key={i}
                style={{
                  height: 6,
                  width: i === step ? 22 : 6,
                  borderRadius: 999,
                  background: i === step ? "var(--primary)" : "var(--border)",
                  transition: "width 0.22s ease, background 0.22s ease",
                  display: "block",
                }}
              />
            ))}
          </div>

          {/* ── Footer actions ────────────────────────────────────────────── */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "14px 24px 24px",
              borderTop: "1px solid var(--border)",
            }}
          >
            {/* Skip — always visible on the left */}
            <button
              type="button"
              className="btn ghost"
              onClick={dismiss}
              aria-label="Skip tour and don't show again"
              style={{ fontSize: 13.5, padding: "9px 13px" }}
            >
              Skip
            </button>

            {/* Push Back + Next to the right */}
            <div style={{ flex: 1 }} />

            {/* Back — hidden on first step */}
            {!isFirst && (
              <button
                type="button"
                className="btn"
                onClick={() => setStep((s) => s - 1)}
                style={{ fontSize: 13.5, padding: "9px 14px" }}
              >
                Back
              </button>
            )}

            {/* Next / Get started */}
            <button
              type="button"
              className="btn pri"
              onClick={() => {
                if (isLast) {
                  dismiss();
                } else {
                  setStep((s) => s + 1);
                }
              }}
              style={{ fontSize: 13.5 }}
            >
              {isLast ? (
                "Get started"
              ) : (
                <>
                  Next
                  <i
                    className="ti ti-arrow-right"
                    aria-hidden="true"
                    style={{ fontSize: 16 }}
                  />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
