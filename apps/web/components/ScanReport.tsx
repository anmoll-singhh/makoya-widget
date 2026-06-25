"use client";
/**
 * components/ScanReport.tsx
 *
 * Accessibility report card — renders the live scan result for a given site.
 *
 * DATA / STATE: unchanged from the original implementation.
 *  - Mounts and immediately POSTs /api/scan with the siteId to trigger/fetch
 *    the latest scan. An `on` flag prevents state updates after unmount.
 *  - Three UI states: "loading" → "ready" | "error".
 *  - requestFullReport() is a fire-and-forget POST to /api/consultation; the
 *    `requested` flag flips the CTA to a confirmation message.
 *
 * PRESENTATION: Redline design system tokens + shared foundation components.
 *  - Loading state  → <ScanLoading label="…" />
 *  - Score          → <ScoreMark score={…} verdict={…} size="hero" />
 *  - Severity bar   → <SeverityBar totals={…} />
 *  - Severity chips → row of <SeverityChip severity={…} count={…} />
 *  - Issues list    → <IssueCard issue={mappedIssue} /> for each item
 *    PlainIssue field mapping:
 *      title → help   (IssueCard uses `help` for the short headline)
 *      all other fields (id, impact, whatItMeans, whoItAffects, howToFix,
 *      disabilityGroups, measuredEvidence) match IssueCard.Issue directly.
 *
 * Token mapping applied throughout:
 *  bg-neutral-50/white    → bg-[var(--paper)] / bg-[var(--surface)]
 *  border-neutral-200     → border-[var(--border)]
 *  text-neutral-900/600   → text-[var(--ink-900)] / text-[var(--ink-600)]
 *  text-neutral-400       → text-[var(--ink-400)]
 *  brand-*                → signal-* (text-signal-600, bg-signal-50, etc.)
 *  transition-base        → transition-colors
 *  glow-brand/text-gradient → removed
 */

import { useEffect, useState } from "react";
import { ScoreMark } from "@/components/makoya/ScoreMark";
import { SeverityBar } from "@/components/makoya/SeverityBar";
import { SeverityChip } from "@/components/makoya/SeverityChip";
import { IssueCard } from "@/components/makoya/IssueCard";
import { ScanLoading } from "@/components/makoya/ScanLoading";
import type { Issue } from "@/components/makoya/IssueCard";
import type { Severity } from "@/lib/design/severity";

// ─── Data types (unchanged from original) ─────────────────────────────────────

interface PlainIssue {
  id: string;
  impact: string | null;
  title: string;
  whatItMeans: string;
  whoItAffects: string;
  disabilityGroups?: string[];
  howToFix?: string;
  measuredEvidence?: string;
}

interface ScanResult {
  scanId: string;
  score: number;
  totals: { critical: number; serious: number; moderate: number; minor: number; total: number };
  createdAt: string;
  plainTop3: PlainIssue[];
}

// ─── Score → verdict helper (same logic as original scoreTone headline) ────────

function scoreVerdict(score: number): string {
  if (score >= 80) return "Strong — let's make it airtight.";
  if (score >= 60) return "You're close — but customers are still slipping away.";
  return "Your site is quietly turning customers away.";
}

// ─── Runtime guard for impact values ──────────────────────────────────────────
// Prevents IssueCard from receiving an unexpected string if the scanner API
// ever returns a value outside the four known severities. Unknown values become
// null; IssueCard renders an "Unknown" chip for null impact gracefully.
const VALID_SEVERITIES = new Set(["critical", "serious", "moderate", "minor"]);

// ─── PlainIssue → IssueCard.Issue mapper ──────────────────────────────────────
// The only name difference is `title` (PlainIssue) → `help` (IssueCard.Issue).
// All other fields align 1-to-1; wcag and element are not present in PlainIssue
// so they are omitted (IssueCard renders those sections only when provided).

function mapIssue(p: PlainIssue): Issue {
  return {
    id: p.id,
    impact: VALID_SEVERITIES.has(p.impact as string) ? (p.impact as Severity) : null,
    help: p.title,
    whatItMeans: p.whatItMeans,
    whoItAffects: p.whoItAffects,
    howToFix: p.howToFix,
    disabilityGroups: p.disabilityGroups,
    measuredEvidence: p.measuredEvidence,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ScanReport({ siteId }: { siteId: string }) {
  // ── State (unchanged) ───────────────────────────────────────────────────────
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [data, setData] = useState<ScanResult | null>(null);
  const [requested, setRequested] = useState(false);
  const [requesting, setRequesting] = useState(false);

  // ── Fetch (unchanged) ───────────────────────────────────────────────────────
  useEffect(() => {
    let on = true;
    (async () => {
      try {
        const res = await fetch("/api/scan", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ siteId }),
        });
        if (!res.ok) throw new Error();
        const json = await res.json();
        if (on) {
          setData(json);
          setState("ready");
        }
      } catch {
        if (on) setState("error");
      }
    })();
    return () => {
      on = false;
    };
  }, [siteId]);

  // ── CTA handler (unchanged) ─────────────────────────────────────────────────
  async function requestFullReport() {
    setRequesting(true);
    await fetch("/api/consultation", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ siteId, type: "full_report" }),
    }).catch(() => null);
    setRequesting(false);
    setRequested(true);
  }

  // ── Loading state ───────────────────────────────────────────────────────────
  if (state === "loading")
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <ScanLoading label="We're loading your site like a real visitor and finding every barrier in the way. Takes about 20 seconds." />
      </div>
    );

  // ── Error state ─────────────────────────────────────────────────────────────
  if (state === "error" || !data)
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <p className="text-sm text-[var(--ink-600)]">
          We couldn&apos;t reach this site just now — we&apos;ll keep trying automatically. Make sure the domain
          is public and reachable.
        </p>
      </div>
    );

  // ── Ready state ─────────────────────────────────────────────────────────────
  const verdict = scoreVerdict(data.score);
  const remaining = Math.max(0, data.totals.total - data.plainTop3.length);

  const severityOrder = ["critical", "serious", "moderate", "minor"] as const;

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">

      {/* ── Score header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-8 border-b border-[var(--border)] p-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-md">
          <p className="text-xs font-semibold uppercase tracking-wide text-signal-600">
            Accessibility report
          </p>
          <h2 className="font-sans mt-2 text-2xl font-bold tracking-tight text-[var(--ink-900)]">
            {verdict}
          </h2>
          <p className="mt-2 text-[15px] leading-relaxed text-[var(--ink-600)]">
            We found{" "}
            <span className="font-semibold text-[var(--ink-900)]">{data.totals.total} issues</span>{" "}
            that make your site harder — or impossible — to use. Each one is a visitor who may have
            left without buying.
          </p>
        </div>

        {/* ScoreMark — hero size with verdict one-liner */}
        <div className="shrink-0 flex justify-center sm:justify-end">
          <ScoreMark score={data.score} verdict={verdict} size="hero" />
        </div>
      </div>

      {/* ── Severity bar + chips ──────────────────────────────────────────────── */}
      <div className="px-8 pt-6 space-y-3">
        <SeverityBar
          totals={{
            critical: data.totals.critical,
            serious: data.totals.serious,
            moderate: data.totals.moderate,
            minor: data.totals.minor,
          }}
          heightClass="h-2"
        />
        <div className="flex flex-wrap gap-2">
          {severityOrder.map((sev) => (
            <SeverityChip key={sev} severity={sev} count={data.totals[sev]} />
          ))}
        </div>
      </div>

      {/* ── Top issues ───────────────────────────────────────────────────────── */}
      <div className="space-y-3 p-8 pt-6">
        <p className="text-sm font-semibold text-[var(--ink-900)]">
          The 3 costing you the most right now
        </p>
        <ul className="space-y-2">
          {data.plainTop3.map((p) => (
            <li key={p.id}>
              <IssueCard issue={mapIssue(p)} />
            </li>
          ))}
        </ul>
      </div>

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <div className="p-8 pt-0">
        {!requested ? (
          <div className="relative overflow-hidden rounded-2xl bg-neutral-950 p-6 text-white sm:p-8">
            <div className="relative">
              <h3 className="font-sans text-xl font-bold tracking-tight sm:text-2xl">
                See all {data.totals.total} issues — and exactly how to fix each one.
              </h3>
              <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-neutral-300">
                {remaining > 0 ? (
                  <>
                    There {remaining === 1 ? "is" : "are"}{" "}
                    <span className="font-semibold text-white">{remaining} more</span>{" "}
                    waiting in your full report. Book a free 15-minute call with a senior accessibility
                    expert — we&apos;ll walk you through the fastest path to a site everyone can use.
                  </>
                ) : (
                  <>
                    Book a free 15-minute call with a senior accessibility expert — we&apos;ll show you
                    the fastest path to fixing these and winning those visitors back.
                  </>
                )}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-4">
                <button
                  onClick={requestFullReport}
                  disabled={requesting}
                  className="transition-colors inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-[15px] font-bold text-neutral-950 shadow-lg hover:bg-neutral-100 disabled:opacity-60"
                >
                  {requesting ? "Sending…" : "Get my full report + free call"}
                  {!requesting && <span aria-hidden>→</span>}
                </button>
                <span className="text-xs text-neutral-400">No pressure. No jargon. Just results.</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-[var(--color-sev-passed)]/30 bg-[var(--color-sev-passed-bg)] p-6">
            <p className="font-sans text-lg font-bold text-[var(--color-sev-passed)]">
              You&apos;re in — we&apos;ll be in touch shortly. ✓
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--ink-900)]">
              Your full report and a senior expert are on the way. We&apos;ll map out every fix so you
              stop losing customers to barriers you can&apos;t see.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
