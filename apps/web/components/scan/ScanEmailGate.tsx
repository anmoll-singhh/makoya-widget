/**
 * components/scan/ScanEmailGate.tsx — Lead-capture email gate below scan results.
 *
 * PURPOSE & POSITION IN THE FUNNEL
 * ---------------------------------
 * This is the conversion moment on the /scan surface. After the visitor sees
 * their partial results (score + top issues) they hit this card, which:
 *   1. Captures their email (POST /api/scan-ingest — stores a lead row server-side
 *      via service role so it's never exposed to the browser).
 *   2. Calls `onCaptured(email)` to unlock the full result UI in the parent.
 *   3. Immediately triggers a client-side PDF download via /api/report-pdf (the
 *      same email re-verified server-side — bypassing this gate yields nothing).
 *
 * DESIGN SYSTEM: REDLINE
 * ----------------------
 * The card is deliberately a strong dark band — `bg-[var(--ink-900)]` — to act
 * as a visual full-stop after the issue cards and push the visitor to act.
 * ALL text on this dark surface is `var(--paper)` or `var(--paper)]/80`, never
 * ink-400, so every element clears WCAG AA (≥4.5:1). The email input sits in an
 * explicit white tray (`bg-white text-[var(--ink-900)]`) so it reads clearly
 * against the dark band.
 *
 * The success state intentionally exits the dark band and becomes a calm light-
 * green panel (`bg-[var(--color-sev-passed)]/10`) — the colour shift signals
 * completion without shouting.
 *
 * HONESTY GUARDRAIL
 * -----------------
 * The microcopy uses the word "compliant" ONLY inside a negation: we explicitly
 * say we never claim a site is "compliant". We do NOT say the widget makes sites
 * compliant — that claim has produced ADA lawsuits. Keep it this way.
 *
 * SUBMIT FLOW (preserve exactly — changes here break the funnel):
 *   submit → POST /api/scan-ingest → onCaptured → triggerPdfDownload (/api/report-pdf)
 * The pdf download is a convenience path; /api/report-pdf re-checks the email,
 * so callers cannot skip the ingest step and get a report for a stolen email.
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ScanResult } from "@/lib/scan/types";
import { triggerPdfDownload } from "@/lib/scan/pdf";

// ─── Props ────────────────────────────────────────────────────────────────────

interface ScanEmailGateProps {
  /** The full scan result object from /api/public-scan. Used both to derive the
   *  high-risk copy branch and as the payload for the PDF generator. */
  result: ScanResult;
  /** Called with the visitor's email the moment /api/scan-ingest succeeds.
   *  The parent uses this to unlock the full issue list / detailed view. */
  onCaptured: (email: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ScanEmailGate({ result, onCaptured }: ScanEmailGateProps) {
  // Form state
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // Guards against double-tap on the re-download button
  const [reDownloading, setReDownloading] = useState(false);

  // Derived: does this site have issues serious enough to warrant stronger copy?
  // critical > 0 OR serious > 2 → high-risk branch.
  const highRisk =
    result.totals.critical > 0 || result.totals.serious > 2;

  // ── Submit ─────────────────────────────────────────────────────────────────
  //
  // IMPORTANT: this flow is intentionally sequential and must be preserved:
  //   1. Validate / guard
  //   2. POST /api/scan-ingest  → captures lead (service-role, server-only)
  //   3. onCaptured(email)      → unlocks parent UI
  //   4. triggerPdfDownload     → convenience auto-download (/api/report-pdf)
  //
  // If step 4 fails we still show success (the email was captured, the report
  // was emailed) and surface a recoverable error + re-download button.

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || busy) return;

    setBusy(true);
    setErr(null);

    try {
      // ── Step 2: store the lead ────────────────────────────────────────────
      const res = await fetch("/api/scan-ingest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          url: result.finalUrl,
          email: trimmed,
          score: result.score,
          totals: result.totals,
        }),
      });

      if (!res.ok) {
        setErr("We couldn't process that just now. Please try again.");
        return; // finally block will setBusy(false)
      }

      // ── Step 3: unlock parent UI ──────────────────────────────────────────
      onCaptured(trimmed);
      setDone(true);

      // ── Step 4: attempt auto-download ─────────────────────────────────────
      // triggerPdfDownload never throws — it returns false on failure.
      const downloaded = await triggerPdfDownload({
        url: result.finalUrl,
        email: trimmed,
        result,
      });

      if (!downloaded) {
        setErr(
          "Your report was emailed, but the PDF download didn't start. Use the button below."
        );
      }
    } catch {
      // Network error before we even got a response
      setErr("We couldn't process that just now. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  // ── Re-download ────────────────────────────────────────────────────────────
  // Called from the success state when the initial auto-download failed or the
  // user wants a second copy. Guards against concurrent clicks.

  async function reDownload() {
    if (reDownloading) return;
    setReDownloading(true);
    setErr(null);
    try {
      const ok = await triggerPdfDownload({
        url: result.finalUrl,
        email: email.trim(),
        result,
      });
      if (!ok) {
        setErr(
          "The PDF download didn't start. Your emailed copy is available in your inbox."
        );
      }
    } finally {
      setReDownloading(false);
    }
  }

  // ── Success state ──────────────────────────────────────────────────────────
  // Light green panel — deliberate contrast with the dark band so the visitor
  // feels the state change. Text is ink-900 on a near-white green tint; all
  // elements clear AA (≥4.5:1).

  if (done) {
    return (
      <div
        className={cn(
          "bg-[var(--color-sev-passed)]/10 border border-[var(--color-sev-passed)]/30",
          "rounded-2xl p-6 text-[var(--ink-900)]"
        )}
        role="status"
        aria-live="polite"
      >
        {/* Check icon — coloured with passed-green, sized for scannability */}
        <div className="flex items-start gap-4">
          <span
            aria-hidden="true"
            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-sev-passed)]/20"
          >
            <svg
              viewBox="0 0 20 20"
              fill="none"
              className="h-4 w-4"
              aria-hidden="true"
              focusable="false"
            >
              <path
                d="M4 10.5L8.5 15L16 6"
                stroke="var(--color-sev-passed)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>

          <div className="flex-1 space-y-1">
            <p className="font-semibold text-[var(--ink-900)]">
              Your PDF is downloading — and it&apos;s in your inbox too.
            </p>
            <p className="text-sm text-[var(--ink-600)]">
              Check your email for a copy you can share with your developer or
              agency. Use the button below if the download didn&apos;t start.
            </p>
          </div>
        </div>

        {/* Re-download CTA */}
        <div className="mt-4 pl-12">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={reDownload}
            disabled={reDownloading}
            aria-busy={reDownloading}
            className="border-[var(--color-sev-passed)]/40 text-[var(--ink-900)] hover:bg-[var(--color-sev-passed)]/10"
          >
            {reDownloading ? "Preparing…" : "Download PDF again"}
          </Button>
        </div>

        {/* Recoverable error — only shown if re-download also fails */}
        {err && (
          <p
            role="alert"
            className="mt-3 pl-12 text-sm text-[var(--color-sev-critical)]"
          >
            {err}
          </p>
        )}
      </div>
    );
  }

  // ── Gate state (default) ───────────────────────────────────────────────────
  // Dark band. Every text element uses var(--paper) or var(--paper)]/80 on
  // var(--ink-900) ≈ #1A1815 — contrast ratios:
  //   var(--paper) #FBFAF8 on #1A1815 ≈ 17.3:1 (AAA, headings)
  //   var(--paper)/80 (~rgba(251,250,248,0.8)) ≈ 13.5:1 (AA, body) ✓
  //   var(--paper)/60 (~rgba(251,250,248,0.6)) ≈ 9.8:1 (AA, microcopy) ✓
  // Never use ink-400 (#9A958C) on this dark band — it reads ~2.7:1 (fail).

  // Copy branches on risk level
  const description = highRisk
    ? "We found critical issues blocking some visitors. Enter your email and we'll download your full PDF report and email you a copy with exactly how to fix each one."
    : "Enter your email to download your full PDF report — the complete breakdown of every issue and how to fix it. We'll email you a copy too.";

  return (
    <section
      aria-label="Get your full accessibility report"
      className="rounded-2xl bg-[var(--ink-900)] p-8 md:p-10"
    >
      {/* Heading — font-display (Newsreader) per Redline spec */}
      <h2 className="font-display text-2xl text-[var(--paper)]">
        Get your full report (PDF)
      </h2>

      {/* Description — branches on highRisk */}
      <p className="mt-2 text-base leading-relaxed text-[var(--paper)]/80">
        {description}
      </p>

      {/* Email capture form */}
      <form
        onSubmit={submit}
        noValidate
        className="mt-6 flex flex-col gap-3 sm:flex-row"
        aria-label="Email report form"
      >
        {/*
         * Input tray: explicit white background + dark text so the field is
         * legible on the dark band without relying on the host page's input
         * colours. `bg-white text-[var(--ink-900)]` ensures AAA contrast
         * (≥21:1) for typed text and ~4.7:1 for the placeholder.
         */}
        <div className="flex-1">
          <label htmlFor="scan-gate-email" className="sr-only">
            Your email address
          </label>
          <Input
            id="scan-gate-email"
            type="email"
            required
            aria-label="Your email address"
            placeholder="you@business.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy}
            aria-busy={busy}
            aria-describedby={err ? "scan-gate-err" : undefined}
            // Override shadcn Input defaults: white tray on dark band
            className={cn(
              "h-10 w-full bg-white text-[var(--ink-900)]",
              "placeholder:text-[var(--ink-400)]",
              "border-white/20 focus-visible:border-[var(--ring)] focus-visible:ring-[var(--ring)]/50",
              "disabled:opacity-60"
            )}
          />
        </div>

        <Button
          type="submit"
          disabled={busy}
          aria-busy={busy}
          size="lg"
          // Solid signal-600 on dark band — readable and on-brand
          className={cn(
            "h-10 shrink-0 bg-[var(--color-signal-600)] text-white",
            "hover:bg-[var(--color-signal-700)]",
            "focus-visible:ring-white/40",
            "disabled:opacity-60"
          )}
        >
          {busy ? "Preparing…" : "Email & download report"}
        </Button>
      </form>

      {/* Inline error — light red that clears AA on the dark band.
          #FCA5A5 (rose-300) on #1A1815 ≈ 7.2:1 ✓ */}
      {err && (
        <p
          id="scan-gate-err"
          role="alert"
          className="mt-3 text-sm text-rose-300"
        >
          {err}
        </p>
      )}

      {/*
       * Microcopy / honest disclaimer
       * The word "compliant" appears only inside a quoted negation:
       * '…never claim a site is "compliant"…' — this is NOT a compliance
       * claim; it's an explicit rejection of one. Do not reword this to
       * add a positive claim. See CLAUDE.md compliance guardrails.
       */}
      <p className="mt-4 text-xs leading-relaxed text-[var(--paper)]/60">
        Honest scan — we report real issues and never claim a site is
        &ldquo;compliant&rdquo;. We use your email only to send this report and
        follow up.
      </p>
    </section>
  );
}
