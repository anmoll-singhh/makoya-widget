/**
 * components/scan/ScanResults.tsx
 *
 * The presentational results block rendered once a public scan completes.
 * Responsibility is display only — it accepts a fully-resolved `ScanResult`
 * from the parent orchestrator and renders it without fetching or mutating
 * anything itself.
 *
 * Three visual sections, top-to-bottom:
 *  1. Results header — URL caption + PDF download trigger on the right.
 *  2. Score panel    — ScoreMark (hero size), total count, SeverityBar,
 *                      four SeverityChips, and an optional partial-scan note.
 *  3. Top issues     — h2 + caption + a space-y-3 stack of IssueCards.
 *
 * The PDF download is intentionally gated behind email capture: visitors
 * who haven't entered their email are nudged to the email form below rather
 * than receiving the report anonymously. The server re-validates the gate
 * (POST /api/report-pdf checks the email before producing any bytes), so
 * this is a UX convenience, not the security boundary.
 *
 * Design system ("Redline" — light theme, warm document paper):
 *  • CSS custom properties: --paper, --surface, --surface-2, --border,
 *    --ink-900/600/400, --color-vellum-500, --color-signal-*.
 *  • Font classes: font-display (Newsreader serif) for headings,
 *    font-sans for body, font-mono + tabular-nums for numbers.
 *  • Foundation components from @/components/makoya — never re-implemented.
 *
 * Accessibility guardrails:
 *  • Real <h2> for the issues heading (screen readers can navigate by landmark).
 *  • Button text is descriptive and changes with state (not "Click here").
 *  • The partial-scan note and nudge hint are plain text — no aria-live needed
 *    because the parent orchestrator owns the live-region that announces scan
 *    completion.
 *  • No "compliant" / "guaranteed" language — Makoya provides accessibility
 *    *tools*, not legal compliance certification.
 */

"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ScoreMark } from "@/components/makoya/ScoreMark";
import { SeverityBar } from "@/components/makoya/SeverityBar";
import { SeverityChip } from "@/components/makoya/SeverityChip";
import { IssueCard } from "@/components/makoya/IssueCard";
import { Button } from "@/components/ui/button";
import { triggerPdfDownload } from "@/lib/scan/pdf";
import type { ScanResult, Severity } from "@/lib/scan/types";

// ─── Verdict derivation ────────────────────────────────────────────────────────

/**
 * Maps a numeric score to an honest, plain-English one-liner.
 * No compliance claims — the language describes visitor experience, not legal status.
 *
 * Thresholds:
 *  ≥80  — generally usable with a handful of rough edges
 *  60–79 — real gaps that will turn some visitors away
 *  <60  — significant barriers that likely block parts of the page
 */
function deriveVerdict(score: number): string {
  if (score >= 80) return "A solid start — a few things to tidy up.";
  if (score >= 60) return "Real gaps are turning some visitors away.";
  return "Several visitors likely can't use parts of this page.";
}

// ─── Severity rendering order ──────────────────────────────────────────────────

/** Canonical worst-first order for the chip row. */
const SEVERITY_ORDER: Severity[] = ["critical", "serious", "moderate", "minor"];

// ─── DownloadReportButton ─────────────────────────────────────────────────────

/**
 * The PDF download button rendered in the results header.
 *
 * Gate logic:
 *  • No email captured yet → nudge the visitor to the email form below
 *    (calls `onNeedEmail` so the parent can focus/scroll the email field)
 *    and show a small inline hint. Does NOT attempt the download.
 *  • Email present → call triggerPdfDownload; handle loading + error states.
 *
 * The server (POST /api/report-pdf) re-validates that the email exists before
 * producing bytes, so spoofing capturedEmail client-side achieves nothing.
 *
 * Label changes by state to keep the button consistently readable:
 *  idle + no email  → "Download PDF report"
 *  idle + has email → "Download PDF"   (shorter; email already known)
 *  busy             → "Preparing…"
 */
function DownloadReportButton({
  result,
  capturedEmail,
  onNeedEmail,
}: {
  result: ScanResult;
  capturedEmail: string | null;
  onNeedEmail: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [nudge, setNudge] = useState(false);

  async function handleClick() {
    // Reset any prior error state on each attempt.
    setErr(null);

    // If the visitor hasn't given their email, nudge them to the form.
    if (!capturedEmail) {
      setNudge(true);
      onNeedEmail();
      return;
    }

    // Clear stale nudge if they now have an email.
    setNudge(false);
    setBusy(true);
    try {
      const ok = await triggerPdfDownload({
        url: result.finalUrl,
        email: capturedEmail,
        result,
      });
      if (!ok) {
        setErr("Couldn't build the PDF. Try again.");
      }
    } catch {
      setErr("Couldn't build the PDF. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const label = busy
    ? "Preparing…"
    : capturedEmail
      ? "Download PDF"
      : "Download PDF report";

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={busy}
        aria-busy={busy}
      >
        {label}
      </Button>

      {/* Nudge hint — shown only when visitor clicked without giving email */}
      {nudge && !capturedEmail && (
        <p
          className={cn(
            "text-xs font-sans text-right",
            "text-[var(--ink-400)]"
          )}
        >
          Enter your email below to unlock the PDF.
        </p>
      )}

      {/* Error text — shown when the PDF endpoint returns a failure */}
      {err && (
        <p
          className={cn(
            "text-xs font-sans text-right",
            "text-destructive"
          )}
          role="alert"
        >
          {err}
        </p>
      )}
    </div>
  );
}

// ─── ScanResults ──────────────────────────────────────────────────────────────

/**
 * The full results block — score, severity breakdown, and top issues.
 *
 * @param result         The resolved ScanResult from POST /api/public-scan.
 * @param capturedEmail  The visitor's email if already given; null otherwise.
 * @param onNeedEmail    Called when the visitor tries to download without an email —
 *                       the parent should focus/scroll the email capture form.
 */
export function ScanResults({
  result,
  capturedEmail,
  onNeedEmail,
}: {
  result: ScanResult;
  capturedEmail: string | null;
  onNeedEmail: () => void;
}) {
  const verdict = deriveVerdict(result.score);
  const total = result.totals.total;
  const issueWord = total === 1 ? "issue" : "issues";

  return (
    <div className="flex flex-col gap-8 font-sans">
      {/* ── 1. Results header ──────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        {/* URL caption — truncates long URLs with CSS so the DOM stays clean */}
        <p
          className={cn(
            "text-xs font-sans leading-relaxed",
            "text-[var(--ink-600)]",
            // Constrain width so very long URLs don't push the button off-screen
            "min-w-0 max-w-[60%] truncate"
          )}
          title={result.finalUrl}
        >
          Results for{" "}
          <span className="font-medium">{result.finalUrl}</span>
        </p>

        {/* PDF download — gated on capturedEmail */}
        <DownloadReportButton
          result={result}
          capturedEmail={capturedEmail}
          onNeedEmail={onNeedEmail}
        />
      </div>

      {/* ── 2. Score panel ─────────────────────────────────────────────────── */}
      <section
        aria-label="Accessibility score overview"
        className={cn(
          "rounded-xl border border-[var(--border)]",
          "bg-[var(--surface)] p-6 md:p-8",
          "flex flex-col gap-6"
        )}
      >
        {/*
         * Score + verdict: centred on small screens, left-aligned on md+.
         * ScoreMark renders the SVG ring + the Geist Mono number immediately —
         * no count-up; the verdict is passed as a prop so ScoreMark owns its
         * layout (ring + verdict stay as a single coherent unit).
         */}
        <div className="flex flex-col items-center md:flex-row md:items-center gap-6">
          <ScoreMark
            score={result.score}
            size="hero"
            verdict={verdict}
          />

          {/* Issue count + severity breakdown */}
          <div className="flex flex-col gap-4 flex-1 w-full">
            {/* Total issue count — plain prose; no "compliant" language */}
            <p
              className={cn(
                "font-sans text-base",
                "text-[var(--ink-900)]"
              )}
            >
              We found{" "}
              <span className="font-mono tabular-nums font-semibold">
                {total}
              </span>{" "}
              {issueWord} on this page.
            </p>

            {/* Proportional stacked bar — worst-first (critical → minor) */}
            <SeverityBar
              totals={result.totals}
              heightClass="h-2.5"
              className="w-full"
            />

            {/* Chip row — one chip per severity level */}
            <div className="flex flex-wrap gap-2">
              {SEVERITY_ORDER.map((sev) => (
                <SeverityChip
                  key={sev}
                  severity={sev}
                  count={result.totals[sev]}
                />
              ))}
            </div>
          </div>
        </div>

        {/*
         * Partial-scan note — shown only when the scanner capped its pass due
         * to page size. Honest framing: doesn't imply less accuracy, just that
         * the full WCAG rule set runs in the premium report.
         */}
        {result.isPartialScan && (
          <p
            className={cn(
              "text-xs font-sans leading-relaxed border-t border-[var(--border)] pt-4",
              "text-[var(--ink-400)]"
            )}
          >
            This page was large, so we scanned the core WCAG A/AA rules. The
            full report covers everything.
          </p>
        )}
      </section>

      {/* ── 3. Top issues ──────────────────────────────────────────────────── */}
      {result.topIssues.length > 0 && (
        <section aria-label="Top accessibility issues">
          {/* Section heading + caption */}
          <div className="mb-4">
            <h2
              className={cn(
                "font-display text-2xl leading-snug",
                "text-[var(--ink-900)]"
              )}
            >
              Top things to fix
            </h2>
            <p
              className={cn(
                "mt-1 text-sm font-sans",
                "text-[var(--ink-600)]"
              )}
            >
              The issues most likely to affect your visitors, worst first.
            </p>
          </div>

          {/*
           * Issue stack — IssueCard is an expandable accordion card.
           * `issue` is directly assignable to IssueCard's `Issue` type because
           * TopIssue is a structural subset of Issue (same fields, same nullability).
           * space-y-3 gives readable breathing room without making the list feel
           * like a bloated marketing page.
           */}
          <div className="space-y-3">
            {result.topIssues.map((issue) => (
              <IssueCard key={issue.id} issue={issue} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
