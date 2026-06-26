/**
 * AddAgent.tsx — 4-step add-agent wizard (client component).
 *
 * Ports the wizard from docs/makoya_v7.html lines 487–509.
 * Verbatim copy is preserved for: step labels, honest copy about the scan,
 * "Not yet conformant — estimated", and the "install to unlock" locked row.
 *
 * Flow:
 *   Step 1 (form)   → user enters domain → POST /api/sites → siteId + token
 *   Step 2 (scan)   → interactive scanning sequence (cosmetic progress over a
 *                      REAL scan) → reveal top issue + locked remainder
 *   Step 3 (plan)   → (placeholder: "Continue — get the widget" skips here)
 *   Step 4 (install) → redirect /dashboard/<siteId>/install
 *
 * PostHog: fires `agent_added` (on site create success) and `free_scan_viewed`
 * (on scan result). Both are best-effort — failure is silently skipped.
 *
 * ── Interactive scanning sequence (step 2) ──────────────────────────────────
 * While /api/public-scan runs (real Playwright + axe-core, typically 10–30 s),
 * we show a cosmetic phase checklist. 7 phases tick off at PHASE_MS intervals
 * (≈ 1.8 s each, total ≈ 12.6 s), holding at "Scoring…" until the real result
 * arrives. On result: all phases check-off, then the score gauge + issues panel
 * reveal with a fade-up animation and the ring strokes in.
 *
 * prefers-reduced-motion (non-negotiable for an a11y product):
 *   Honoured at BOTH layers for defence-in-depth:
 *   1. CSS layer — dashboard.css: `animation:none!important;transition:none!important`
 *      suppresses all keyframe animations and CSS transitions automatically.
 *   2. React layer — reduceMotionRef gates startPhaseTimer (no interval),
 *      ScanningAnimation is replaced with plain text, animateIn=false on the
 *      ring, and finalizeScan skips the 600 ms reveal delay.
 *   Reduced-motion users see: "Scanning example.com…" → instant result reveal.
 *
 * Accessibility:
 *   - role="status" aria-live="polite" on the scanning container; an sr-only
 *     span carries the current phase text so it's announced on each advance.
 *   - All decorative icons are aria-hidden. Text carries the meaning.
 *   - Progress bar is aria-hidden (purely decorative).
 *   - Real buttons, no keyboard traps.
 *
 * CSS animations (keyframes defined in dashboard.css):
 *   mky-phase-in  — new active phase slides in from left
 *   mky-spin      — spinner icon rotation
 *   mky-shimmer   — progress bar shimmer sweep
 *   mky-reveal    — result panel fade + slide-up
 *
 * Honest copy preserved verbatim:
 *  - "We scanned your homepage"
 *  - "Not yet conformant — estimated"
 *  - "install to unlock the full audit"
 *  - "See full audit with Mike"
 * No compliance/"guaranteed accessible" claims anywhere.
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";

// ── Scan phase constants ────────────────────────────────────────────────────

/**
 * Cosmetic checklist phases shown while the real scan runs.
 * These do NOT represent real sub-step progress — they pace the wait time
 * and give visible feedback. The issues returned are always the real result.
 */
const SCAN_PHASES = [
  "Loading the page…",
  "Checking colour contrast…",
  "Inspecting images for alt text…",
  "Testing keyboard access…",
  "Reviewing form labels…",
  "Checking headings & structure…",
  "Scoring…",
] as const;

/** Milliseconds between automatic phase advances. 7 phases × 1800 ms ≈ 12.6 s. */
const PHASE_MS = 1800;

// ── Types ───────────────────────────────────────────────────────────────────

interface ScanTopIssue {
  id: string;
  impact: "critical" | "serious" | "moderate" | "minor";
  help: string;
  whatItMeans?: string;
}

interface ScanResult {
  score: number | null;
  totals: {
    critical?: number;
    serious?: number;
    moderate?: number;
    minor?: number;
    total?: number;
  };
  topIssues: ScanTopIssue[];
  finalUrl: string;
}

type Step = 1 | 2;

/**
 * scanning → real scan in-flight; phase checklist animating.
 * done     → real scan returned (success or failure); result visible.
 */
type ScanUIState = "idle" | "scanning" | "done";

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Maps scan impact → Pill class + icon */
function impactPill(impact: string) {
  if (impact === "critical" || impact === "serious") {
    return { cls: "pill high", icon: "ti ti-alert-octagon", label: "High" };
  }
  if (impact === "moderate") {
    return { cls: "pill med", icon: "ti ti-alert-triangle", label: "Medium" };
  }
  return { cls: "pill low", icon: "ti ti-info-circle", label: "Low" };
}

// ── Score ring ──────────────────────────────────────────────────────────────

/**
 * SVG score ring — matches the mockup's embedded SVG (lines 503–504).
 *
 * When animateIn=true (and the user allows motion) the stroke draws in from
 * 0 via a CSS transition rather than jumping to the final value. The 80 ms
 * setTimeout lets the DOM paint once before the transition starts, avoiding
 * a synchronous "jump to end" on first mount.
 *
 * The CSS prefers-reduced-motion override (`transition:none!important`) in
 * dashboard.css suppresses the transition automatically at the browser layer;
 * the animateIn=false path (set by the caller) is a second gate so no initial
 * state of 98 is ever committed for reduced-motion users.
 */
function ScoreRing({
  score,
  animateIn = false,
}: {
  score: number | null;
  animateIn?: boolean;
}) {
  const n = score ?? 0;
  const finalOffset = Math.round(98 * (1 - n / 100));

  // Start at full offset (empty ring) and animate to the real value.
  const [offset, setOffset] = useState(animateIn ? 98 : finalOffset);

  useEffect(() => {
    if (!animateIn || score === null) return;
    const t = setTimeout(() => setOffset(finalOffset), 80);
    return () => clearTimeout(t);
  }, [animateIn, score, finalOffset]);

  const strokeColor =
    n >= 80 ? "#3C6B53" : n >= 50 ? "#8A5A00" : "#C0392B";

  return (
    <svg
      width="118"
      height="118"
      viewBox="0 0 36 36"
      role="img"
      aria-label={`Estimated score: ${score ?? "unknown"} out of 100`}
      style={{ margin: "0 auto 12px" }}
    >
      <circle
        cx="18"
        cy="18"
        r="15.6"
        fill="none"
        stroke="#E2E5EA"
        strokeWidth="3.2"
      />
      <circle
        cx="18"
        cy="18"
        r="15.6"
        fill="none"
        stroke={strokeColor}
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeDasharray="98"
        strokeDashoffset={offset}
        transform="rotate(-90 18 18)"
        style={{
          transition: animateIn
            ? "stroke-dashoffset 0.9s cubic-bezier(.4,0,.2,1)"
            : undefined,
        }}
      />
      <text
        x="18"
        y="17.5"
        textAnchor="middle"
        fontSize="9"
        fontWeight="700"
        fill="#0D1B4D"
        fontFamily="Satoshi"
      >
        {score ?? "—"}
      </text>
      <text x="18" y="23" textAnchor="middle" fontSize="3.4" fill="#6B7280">
        / 100
      </text>
    </svg>
  );
}

// ── Scanning animation ──────────────────────────────────────────────────────

/**
 * ScanningAnimation — cosmetic phase checklist shown while the real scan runs.
 *
 * Accessibility notes:
 * - The parent wrapper carries role="status" aria-live="polite"; an sr-only
 *   span mirrors the current phase label so screen readers announce each
 *   advance without re-reading the whole visual list.
 * - All icons are aria-hidden. The phase label text carries the meaning.
 * - The progress bar is aria-hidden (purely decorative).
 * - This component is never rendered for reduced-motion users; the parent
 *   shows plain text instead.
 */
function ScanningAnimation({
  domain,
  phaseIndex,
}: {
  domain: string;
  phaseIndex: number;
}) {
  const clampedIdx = Math.min(phaseIndex, SCAN_PHASES.length - 1);
  const currentPhase = SCAN_PHASES[clampedIdx];

  // Progress bar fills uniformly; max at 100 only when all phases are done.
  const progressPct = Math.round(
    (Math.min(phaseIndex, SCAN_PHASES.length) / SCAN_PHASES.length) * 100
  );

  return (
    <div style={{ padding: "8px 0 16px" }}>
      {/* Domain label */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 14,
        }}
      >
        <i
          className="ti ti-world"
          aria-hidden="true"
          style={{ fontSize: 18, color: "var(--primary-hover)" }}
        />
        <b style={{ color: "var(--deep)", fontSize: 14 }}>{domain}</b>
      </div>

      <p style={{ fontSize: 13.5, color: "var(--t2)", marginBottom: 18 }}>
        Analysing your homepage for accessibility issues…
      </p>

      {/* Animated progress bar — purely decorative; aria-hidden */}
      <div
        aria-hidden="true"
        style={{
          position: "relative",
          height: 5,
          background: "var(--border)",
          borderRadius: 6,
          overflow: "hidden",
          marginBottom: 24,
        }}
      >
        {/* Fill track */}
        <div
          style={{
            height: "100%",
            width: `${progressPct}%`,
            background: "linear-gradient(90deg, #3A74FF, #1E63FF)",
            borderRadius: 6,
            transition: "width 0.55s ease",
          }}
        />
        {/* Shimmer sweep overlay */}
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            width: "40%",
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)",
            animation: "mky-shimmer 1.6s ease-in-out infinite",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* Phase checklist */}
      <div
        style={{ display: "flex", flexDirection: "column", gap: 10 }}
        aria-hidden="true"
      >
        {SCAN_PHASES.map((phase, i) => {
          const isDone = i < phaseIndex;
          const isActive =
            i === phaseIndex && phaseIndex < SCAN_PHASES.length;
          const isPending = !isDone && !isActive;

          return (
            <div
              key={phase}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 13.5,
                fontWeight: isDone || isActive ? 600 : 500,
                color: isDone
                  ? "var(--green-ink)"
                  : isActive
                  ? "var(--deep)"
                  : "var(--t3)",
                opacity: isPending ? 0.55 : 1,
                animation: isActive
                  ? "mky-phase-in 0.35s ease both"
                  : undefined,
              }}
            >
              {/* Phase status icon */}
              <span
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  background: isDone
                    ? "var(--green-soft)"
                    : isActive
                    ? "var(--primary-soft)"
                    : "transparent",
                  border:
                    isDone || isActive
                      ? "none"
                      : "1.5px solid var(--border-ui)",
                  color: isDone
                    ? "var(--green-ink)"
                    : isActive
                    ? "var(--primary-hover)"
                    : "var(--t3)",
                }}
              >
                {isDone ? (
                  <i className="ti ti-check" style={{ fontSize: 12 }} />
                ) : isActive ? (
                  <i
                    className="ti ti-loader-2"
                    style={{
                      fontSize: 12,
                      animation: "mky-spin 1s linear infinite",
                    }}
                  />
                ) : (
                  <i
                    className="ti ti-point-filled"
                    style={{ fontSize: 6 }}
                  />
                )}
              </span>
              <span>{phase}</span>
            </div>
          );
        })}
      </div>

      {/*
       * Visually-hidden live region — the only text AT reads aloud.
       * aria-atomic="true" ensures the full phrase is read, not just the diff.
       */}
      <span
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
      >
        {`Scanning ${domain}: ${currentPhase}`}
      </span>
    </div>
  );
}

// ── Step indicator ──────────────────────────────────────────────────────────

function StepBar({ current }: { current: Step }) {
  const steps = ["Add agent", "Free scan", "Choose plan", "Install"];
  return (
    <div className="steps">
      {steps.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const now = n === current;
        return (
          <div key={label} style={{ display: "contents" }}>
            <div
              className={`step${done ? " done" : now ? " now" : ""}`}
              aria-current={now ? "step" : undefined}
            >
              <span className="num">
                {done ? (
                  <i className="ti ti-check" aria-hidden="true" />
                ) : (
                  n
                )}
              </span>
              {label}
            </div>
            {i < steps.length - 1 && (
              <div className={`sep${done ? " done" : ""}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export function AddAgent() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [domain, setDomain] = useState("");
  const [name, setName] = useState("");
  const [siteId, setSiteId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Scanning animation state ─────────────────────────────────────────────

  const [scanUIState, setScanUIState] = useState<ScanUIState>("idle");
  const [scanPhaseIndex, setScanPhaseIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  /**
   * Gates the result reveal animation. Set true when the real scan lands.
   * Combined with !reduceMotion to drive animateIn on ScoreRing and the
   * mky-reveal class on the result panel.
   */
  const [revealResult, setRevealResult] = useState(false);

  /**
   * Stable ref to the reduce-motion preference. Used inside callbacks and
   * timeouts that execute after re-renders — a plain state read would capture
   * a stale closure from the time the callback was defined.
   */
  const reduceMotionRef = useRef<boolean>(false);

  /** Holds the running setInterval handle for the cosmetic phase ticker. */
  const phaseIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Detect (and track) prefers-reduced-motion ────────────────────────────

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    reduceMotionRef.current = mq.matches;
    setReduceMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => {
      reduceMotionRef.current = e.matches;
      setReduceMotion(e.matches);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // ── Cleanup interval on unmount ──────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (phaseIntervalRef.current) clearInterval(phaseIntervalRef.current);
    };
  }, []);

  // ── Phase timer ──────────────────────────────────────────────────────────

  function stopPhaseTimer() {
    if (phaseIntervalRef.current) {
      clearInterval(phaseIntervalRef.current);
      phaseIntervalRef.current = null;
    }
  }

  /**
   * Starts the cosmetic phase ticker.
   * - Advances scanPhaseIndex every PHASE_MS ms.
   * - Holds at the last phase ("Scoring…") until finalizeScan is called.
   * - No-ops for reduced-motion users (they see plain text instead).
   */
  function startPhaseTimer() {
    stopPhaseTimer();
    if (reduceMotionRef.current) return;
    phaseIntervalRef.current = setInterval(() => {
      setScanPhaseIndex((prev) => {
        // Hold at "Scoring…" (index 6) until the real result arrives.
        if (prev >= SCAN_PHASES.length - 1) return prev;
        return prev + 1;
      });
    }, PHASE_MS);
  }

  // ── Step 1: Create site ─────────────────────────────────────────────────

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name || undefined, domain }),
      });
      const data = (await res.json()) as {
        siteId?: string;
        token?: string;
        error?: string;
      };

      if (!res.ok) {
        setError(data.error ?? "Failed to create agent. Please try again.");
        return;
      }

      if (!data.siteId) {
        setError("Unexpected error. Please try again.");
        return;
      }

      const newSiteId = data.siteId;
      setSiteId(newSiteId);

      // Fire PostHog: agent_added
      try {
        posthog.capture("agent_added", { siteId: newSiteId, domain });
      } catch {
        // Analytics must never break the flow.
      }

      // Transition to step 2 + scanning animation BEFORE the scan runs,
      // so the phase checklist appears immediately while /api/public-scan
      // is in-flight. React 18 batches all these updates into one render.
      setScanPhaseIndex(0);
      setRevealResult(false);
      setScanResult(null);
      setScanUIState("scanning");
      setStep(2);
      startPhaseTimer();

      // Fire the real scan; intentionally not awaited — finalizeScan handles
      // the transition to "done" when the response lands.
      void runScan(domain, newSiteId);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Free scan ───────────────────────────────────────────────────────────

  async function runScan(rawDomain: string, createdSiteId: string) {
    const url =
      rawDomain.startsWith("http://") || rawDomain.startsWith("https://")
        ? rawDomain
        : `https://${rawDomain}`;

    try {
      const res = await fetch("/api/public-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!res.ok) {
        finalizeScan(null, createdSiteId, rawDomain);
      } else {
        const data = (await res.json()) as ScanResult;
        finalizeScan(data, createdSiteId, rawDomain);
      }
    } catch {
      // Network error — proceed with null result (honest empty state).
      finalizeScan(null, createdSiteId, rawDomain);
    }
  }

  /**
   * Called when the real scan returns (success or network failure).
   *
   * 1. Stops the phase ticker.
   * 2. Jumps phase index to SCAN_PHASES.length so all phases show ✓.
   * 3. Sets the real scan result.
   * 4. After a brief pause (so the all-done state is visible), reveals
   *    the result panel. For reduced-motion users the pause is 0 ms.
   *
   * Uses reduceMotionRef (not state) because this runs inside an async
   * function that may execute well after the component last re-rendered.
   */
  function finalizeScan(
    data: ScanResult | null,
    createdSiteId: string,
    rawDomain: string
  ) {
    stopPhaseTimer();
    // Jump to all-phases-done visually.
    setScanPhaseIndex(SCAN_PHASES.length);
    setScanResult(data);

    if (data) {
      try {
        posthog.capture("free_scan_viewed", {
          siteId: createdSiteId,
          domain: rawDomain,
          score: data.score,
        });
      } catch {
        // Analytics must never break the flow.
      }
    }

    // Brief pause so the user sees all phases checked before the result
    // appears. Reduced-motion users skip straight to the result.
    const delay = reduceMotionRef.current ? 0 : 600;
    setTimeout(() => {
      setScanUIState("done");
      setRevealResult(true);
    }, delay);
  }

  // ── Step 2: Continue to install ─────────────────────────────────────────

  function handleContinue() {
    if (siteId) router.push(`/dashboard/${siteId}/install`);
  }

  function handleMike() {
    if (siteId) router.push(`/dashboard/${siteId}/mike`);
  }

  // ── Render ───────────────────────────────────────────────────────────────

  // Count severities from real scan totals
  const totals = scanResult?.totals ?? {};
  const highCount = (totals.critical ?? 0) + (totals.serious ?? 0);
  const medCount = totals.moderate ?? 0;
  const lowCount = totals.minor ?? 0;
  const totalIssues = totals.total ?? highCount + medCount + lowCount;
  const topIssue = scanResult?.topIssues?.[0] ?? null;

  return (
    <>
      {/* Page header — verbatim from mockup lines 487–488 */}
      <div className="pagehead">
        New agent <b>Add an agent</b>
      </div>
      <p
        className="muted"
        style={{ margin: "-8px 0 18px", fontSize: 13.5, maxWidth: 560 }}
      >
        Point a new agent at your website. We scan the homepage free, then you
        choose how to protect it.
      </p>

      <section className="card cpad" style={{ maxWidth: 920 }}>
        <StepBar current={step} />

        {/* ── Step 1: Form ─────────────────────────────────────────────── */}
        {step === 1 && (
          <form onSubmit={handleCreate}>
            <label className="fl" htmlFor="agent-domain">
              Website domain
            </label>
            <input
              id="agent-domain"
              className="inp"
              type="text"
              placeholder="example.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              required
              disabled={submitting}
              autoComplete="url"
            />

            <label
              className="fl"
              htmlFor="agent-name"
              style={{ marginTop: 14 }}
            >
              Agent name{" "}
              <span style={{ fontWeight: 400, color: "var(--t3)" }}>
                (optional)
              </span>
            </label>
            <input
              id="agent-name"
              className="inp"
              type="text"
              placeholder="My Company Website"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={submitting}
            />

            {error && (
              <div
                className="note warn"
                style={{ marginTop: 14 }}
                role="alert"
              >
                <i className="ti ti-alert-triangle" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <div style={{ marginTop: 20 }}>
              <button
                type="submit"
                className="btn pri"
                disabled={submitting || !domain.trim()}
              >
                {submitting ? (
                  <>
                    <i className="ti ti-loader-2" aria-hidden="true" />
                    {" Scanning…"}
                  </>
                ) : (
                  <>
                    <i className="ti ti-arrow-right" aria-hidden="true" />
                    {" Add agent & scan"}
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* ── Step 2a: Scanning animation ──────────────────────────────── */}
        {/*
         * role="status" aria-live="polite": the container is a live region.
         * The inner sr-only span carries the text AT announces on each phase
         * change; the visual checklist list is aria-hidden to avoid verbosity.
         * Reduced-motion users see plain text only; no interval fires.
         */}
        {step === 2 && scanUIState === "scanning" && (
          <div role="status" aria-live="polite">
            {reduceMotion ? (
              /* Reduced-motion path — no animation, immediate text feedback. */
              <div
                style={{
                  padding: "40px 0",
                  textAlign: "center",
                  color: "var(--deep)",
                }}
              >
                <p style={{ fontSize: 15, fontWeight: 600 }}>
                  Scanning{" "}
                  <span style={{ color: "var(--primary-hover)" }}>
                    {domain}
                  </span>
                  …
                </p>
                <p
                  style={{
                    marginTop: 8,
                    fontSize: 13,
                    color: "var(--t2)",
                    fontWeight: 500,
                  }}
                >
                  This usually takes 10–30 seconds.
                </p>
              </div>
            ) : (
              <ScanningAnimation
                domain={domain}
                phaseIndex={scanPhaseIndex}
              />
            )}
          </div>
        )}

        {/* ── Step 2b: Scan result ──────────────────────────────────────── */}
        {step === 2 && scanUIState === "done" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.1fr .9fr",
              gap: 30,
              alignItems: "center",
              /*
               * mky-reveal: fade + slide-up on first render.
               * Skipped for reduced-motion users — both the CSS
               * prefers-reduced-motion override and the !reduceMotion
               * check here suppress it independently.
               */
              animation:
                revealResult && !reduceMotion
                  ? "mky-reveal 0.5s ease both"
                  : undefined,
            }}
          >
            {/* Left: issues summary */}
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <i
                  className="ti ti-world"
                  aria-hidden="true"
                  style={{ fontSize: 18, color: "var(--primary-hover)" }}
                />
                <b style={{ color: "var(--deep)" }}>{domain}</b>
              </div>

              {scanResult ? (
                <>
                  <h2 style={{ fontSize: 19 }}>We scanned your homepage</h2>
                  <p
                    className="muted"
                    style={{ fontSize: 13.5, margin: "6px 0 14px" }}
                  >
                    Found{" "}
                    <b style={{ color: "var(--t1)" }}>
                      {totalIssues}{" "}
                      {totalIssues === 1 ? "issue" : "issues"}
                    </b>{" "}
                    across WCAG criteria on this page alone. A full-site
                    audit by Mike usually finds more.
                  </p>

                  {/* Severity pills */}
                  <div
                    style={{ display: "flex", gap: 8, marginBottom: 14 }}
                  >
                    {highCount > 0 && (
                      <span className="pill high">
                        <i
                          className="ti ti-alert-octagon"
                          aria-hidden="true"
                        />
                        {highCount} High
                      </span>
                    )}
                    {medCount > 0 && (
                      <span className="pill med">
                        <i
                          className="ti ti-alert-triangle"
                          aria-hidden="true"
                        />
                        {medCount} Medium
                      </span>
                    )}
                    {lowCount > 0 && (
                      <span className="pill low">
                        <i
                          className="ti ti-info-circle"
                          aria-hidden="true"
                        />
                        {lowCount} Low
                      </span>
                    )}
                    {totalIssues === 0 && (
                      <span className="pill green">
                        <i className="ti ti-check" aria-hidden="true" />
                        No issues found
                      </span>
                    )}
                  </div>

                  {/* Top issue + locked remainder */}
                  <div
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      overflow: "hidden",
                    }}
                  >
                    {topIssue ? (
                      <div
                        className="between"
                        style={{
                          padding: "12px 14px",
                          borderBottom: "1px solid var(--border)",
                        }}
                      >
                        <span style={{ fontSize: 13.5 }}>
                          {topIssue.help}
                        </span>
                        <span className={impactPill(topIssue.impact).cls}>
                          <i
                            className={impactPill(topIssue.impact).icon}
                            aria-hidden="true"
                          />
                          {impactPill(topIssue.impact).label}
                        </span>
                      </div>
                    ) : (
                      <div
                        style={{
                          padding: "12px 14px",
                          borderBottom: "1px solid var(--border)",
                        }}
                      >
                        <span
                          style={{ fontSize: 13.5, color: "var(--t2)" }}
                        >
                          No issues detected on this page.
                        </span>
                      </div>
                    )}
                    <div
                      style={{
                        padding: "12px 14px",
                        background: "var(--bg)",
                      }}
                    >
                      <span className="tiny muted">
                        <i className="ti ti-lock" aria-hidden="true" />{" "}
                        {Math.max(0, totalIssues - 1)} more — install to
                        unlock the full audit
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                /* Scan failed / timed out — honest empty state */
                <>
                  <h2 style={{ fontSize: 19 }}>Agent created</h2>
                  <p
                    className="muted"
                    style={{ fontSize: 13.5, margin: "6px 0 14px" }}
                  >
                    We couldn't complete the homepage scan right now. Install
                    the widget and Mike will run a full audit once the site is
                    connected.
                  </p>
                </>
              )}
            </div>

            {/* Right: score ring + CTAs */}
            <div style={{ textAlign: "center" }}>
              {/*
               * animateIn drives the stroke-dashoffset transition in ScoreRing.
               * Gated by !reduceMotion so the ring never animates for users who
               * opt out of motion — it renders directly at the final dashoffset.
               */}
              <ScoreRing
                score={scanResult?.score ?? null}
                animateIn={revealResult && !reduceMotion}
              />

              {scanResult ? (
                <div style={{ marginBottom: 14 }}>
                  <span className="pill med">
                    <i
                      className="ti ti-alert-triangle"
                      aria-hidden="true"
                    />
                    Not yet conformant — estimated
                  </span>
                </div>
              ) : (
                <div style={{ marginBottom: 14 }}>
                  <span className="pill gray">Scan pending</span>
                </div>
              )}

              {/* Primary CTA — verbatim from mockup */}
              <button
                className="btn pri"
                style={{ width: "100%", justifyContent: "center" }}
                onClick={handleContinue}
              >
                <i className="ti ti-arrow-right" aria-hidden="true" />
                {" Continue — get the widget"}
              </button>

              {/* Secondary CTA — verbatim from mockup */}
              <button
                className="btn ghost"
                style={{
                  width: "100%",
                  justifyContent: "center",
                  marginTop: 8,
                }}
                onClick={handleMike}
              >
                See full audit with Mike
              </button>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
