"use client";
import { useEffect, useState } from "react";

/**
 * WCAG evidence for an issue. Optional + rendered defensively: pre-v2 scans
 * (and the current /api/scan response) may omit it entirely, in which case the
 * badge is simply not shown. `criterion`/`name` are null for best-practice
 * findings — we render a neutral "Best practice" chip, never a fabricated
 * criterion number.
 */
interface IssueWcag {
  criterion?: string | null;
  name?: string | null;
  level?: "A" | "AA" | "AAA" | "best-practice" | null;
  url?: string | null;
  others?: string[];
}

interface PlainIssue {
  id: string;
  impact: string | null;
  title: string;
  whatItMeans: string;
  whoItAffects: string;
  /** v2 evidence fields — all optional, hidden when absent. */
  wcag?: IssueWcag | null;
  whyItMatters?: string | null;
  instanceCount?: number | null;
  pointsContributed?: number | null;
}

/** One row of the evidence-based score breakdown (v2). */
interface ScoreLineItem {
  ruleId: string;
  severity?: string | null;
  instanceCount?: number | null;
  pointsContributed?: number | null;
  wcagCriterion?: string | null;
  level?: string | null;
}
interface ScoreBreakdown {
  score?: number;
  rawPenalty?: number;
  appliedPenalty?: number;
  lineItems?: ScoreLineItem[];
  scoringModelVersion?: string;
}

interface ScanResult {
  scanId: string;
  score: number;
  totals: { critical: number; serious: number; moderate: number; minor: number; total: number };
  createdAt: string;
  plainTop3: PlainIssue[];
  /** v2 scoring transparency — optional, hidden when absent. */
  scoreBreakdown?: ScoreBreakdown | null;
}

const SEV = {
  critical: { dot: "bg-red-500", pill: "bg-red-50 text-red-700 ring-red-100", bar: "bg-red-500" },
  serious: { dot: "bg-orange-500", pill: "bg-orange-50 text-orange-700 ring-orange-100", bar: "bg-orange-500" },
  moderate: { dot: "bg-amber-500", pill: "bg-amber-50 text-amber-700 ring-amber-100", bar: "bg-amber-500" },
  minor: { dot: "bg-neutral-400", pill: "bg-neutral-100 text-neutral-600 ring-neutral-200", bar: "bg-neutral-400" },
} as const;
const sev = (k: string | null) => SEV[(k as keyof typeof SEV) in SEV ? (k as keyof typeof SEV) : "minor"];

function scoreTone(score: number) {
  if (score >= 80) return { ring: "ring-emerald-200", text: "text-emerald-600", bg: "bg-emerald-50", bar: "bg-emerald-500", headline: "Strong — let's make it airtight." };
  if (score >= 60) return { ring: "ring-amber-200", text: "text-amber-600", bg: "bg-amber-50", bar: "bg-amber-500", headline: "You're close — but customers are still slipping away." };
  return { ring: "ring-red-200", text: "text-red-600", bg: "bg-red-50", bar: "bg-red-500", headline: "Your site is quietly turning customers away." };
}

/** Whole, non-negative integer or null (never trust JSON shape). */
function asCount(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.trunc(v) : null;
}
/** Points removed → "−7 pts" label, or null when not a positive number. */
function pointsLabel(v: unknown): string | null {
  if (typeof v !== "number" || !Number.isFinite(v) || v <= 0) return null;
  return `−${Math.round(v)} pts`;
}

/**
 * Accessible WCAG evidence chip for the dashboard report.
 *  - Mapped criterion → "WCAG 1.4.3 (AA)", linking to wcag.url when present.
 *  - Best-practice / unmapped → neutral "Best practice" chip, no fake number.
 * The level is shown as text (not colour-only).
 */
function WcagBadge({ wcag }: { wcag: IssueWcag }) {
  const hasCriterion = typeof wcag.criterion === "string" && wcag.criterion.trim().length > 0;
  const levelText =
    wcag.level && wcag.level !== "best-practice" ? ` (${wcag.level})` : "";
  const label = hasCriterion ? `WCAG ${wcag.criterion}${levelText}` : "Best practice";
  const title = hasCriterion && wcag.name ? `${label} — ${wcag.name}` : label;
  const cls =
    "inline-flex shrink-0 items-center rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-700 ring-1 ring-brand-100";

  if (hasCriterion && wcag.url) {
    return (
      <a
        href={wcag.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`${cls} underline-offset-2 hover:underline focus-visible:underline`}
        title={title}
      >
        {label}
        <span className="sr-only"> — opens WCAG documentation in a new tab</span>
      </a>
    );
  }
  return (
    <span className={cls} title={title}>
      {label}
    </span>
  );
}

export function ScanReport({ siteId }: { siteId: string }) {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [data, setData] = useState<ScanResult | null>(null);
  const [requested, setRequested] = useState(false);
  const [requesting, setRequesting] = useState(false);

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

  if (state === "loading")
    return (
      <div className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="h-2.5 w-2.5 animate-ping rounded-full bg-brand-500" />
          <p className="font-display text-lg font-semibold text-neutral-900">Scanning your site…</p>
        </div>
        <p className="mt-2 text-sm text-neutral-500">
          We&apos;re loading your site like a real visitor and finding every barrier in the way. Takes about
          20 seconds.
        </p>
        <div className="mt-5 space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-neutral-100" />
          ))}
        </div>
      </div>
    );

  if (state === "error" || !data)
    return (
      <div className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
        <p className="text-sm text-neutral-500">
          We couldn&apos;t reach this site just now — we&apos;ll keep trying automatically. Make sure the domain
          is public and reachable.
        </p>
      </div>
    );

  const tone = scoreTone(data.score);
  const remaining = Math.max(0, data.totals.total - data.plainTop3.length);
  const chips = [
    ["critical", data.totals.critical],
    ["serious", data.totals.serious],
    ["moderate", data.totals.moderate],
    ["minor", data.totals.minor],
  ] as const;

  return (
    <div className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
      {/* Score header */}
      <div className="flex flex-col gap-6 border-b border-neutral-100 p-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-md">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Accessibility report</p>
          <h2 className="font-display mt-2 text-2xl font-bold tracking-tight text-neutral-900">{tone.headline}</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-neutral-600">
            We found <span className="font-semibold text-neutral-900">{data.totals.total} issues</span> that make
            your site harder — or impossible — to use. Each one is a visitor who may have left without buying.
          </p>
        </div>
        <div className={`shrink-0 rounded-2xl ${tone.bg} p-5 text-center ring-1 ${tone.ring}`}>
          <div className={`font-display text-5xl font-extrabold ${tone.text}`}>{data.score}</div>
          <div className="mt-0.5 text-xs font-medium text-neutral-500">out of 100</div>
          <div className="mt-3 h-1.5 w-28 overflow-hidden rounded-full bg-white/70">
            <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${data.score}%` }} />
          </div>
        </div>
      </div>

      {/* Severity chips */}
      <div className="flex flex-wrap gap-2 px-8 pt-6">
        {chips.map(([k, n]) => (
          <span
            key={k}
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${sev(k).pill}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${sev(k).dot}`} />
            {n} {k}
          </span>
        ))}
      </div>

      {/* Top issues */}
      <div className="space-y-3 p-8 pt-5">
        <p className="text-sm font-semibold text-neutral-900">The 3 costing you the most right now</p>
        <ul className="space-y-3">
          {data.plainTop3.map((p) => {
            const instances = asCount(p.instanceCount);
            const points = pointsLabel(p.pointsContributed);
            return (
              <li key={p.id} className="rounded-2xl border border-neutral-200 bg-neutral-50/60 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${sev(p.impact).dot}`} />
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${sev(p.impact).pill}`}
                  >
                    {p.impact ?? "minor"}
                  </span>
                  {p.wcag && <WcagBadge wcag={p.wcag} />}
                  <span className="font-semibold text-neutral-900">{p.title}</span>
                </div>

                {/* Evidence row: true instance count + points removed (both v2, optional). */}
                {(instances || points) && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                    {instances && (
                      <span className="inline-flex items-center rounded-md bg-neutral-200/70 px-2 py-0.5 text-neutral-700">
                        {instances} {instances === 1 ? "instance" : "instances"}
                      </span>
                    )}
                    {points && (
                      <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-0.5 text-red-700 ring-1 ring-red-100">
                        {points}
                      </span>
                    )}
                  </div>
                )}

                <p className="mt-2 text-sm leading-relaxed text-neutral-600">{p.whatItMeans}</p>
                {p.whyItMatters && (
                  <p className="mt-1.5 text-sm leading-relaxed text-neutral-600">
                    <span className="font-semibold text-neutral-700">Why it matters: </span>
                    {p.whyItMatters}
                  </p>
                )}
                <p className="mt-1 text-xs font-medium text-neutral-400">You&apos;re losing: {p.whoItAffects}</p>
              </li>
            );
          })}
        </ul>
      </div>

      {/* How this score was calculated — evidence-based breakdown (v2, optional). */}
      <ScoreBreakdownSection breakdown={data.scoreBreakdown} score={data.score} />

      {/* CTA */}
      <div className="p-8 pt-0">
        {!requested ? (
          <div className="glow-brand relative overflow-hidden rounded-2xl bg-neutral-950 p-6 text-white sm:p-8">
            <div className="bg-grid pointer-events-none absolute inset-0 opacity-60" />
            <div className="relative">
              <h3 className="font-display text-xl font-bold tracking-tight sm:text-2xl">
                See all {data.totals.total} issues — and exactly how to fix each one.
              </h3>
              <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-neutral-300">
                {remaining > 0 ? (
                  <>
                    There {remaining === 1 ? "is" : "are"} <span className="font-semibold text-white">{remaining} more</span>{" "}
                    waiting in your full report. Book a free 15-minute call with a senior accessibility expert —
                    we&apos;ll walk you through the fastest path to a site everyone can use.
                  </>
                ) : (
                  <>Book a free 15-minute call with a senior accessibility expert — we&apos;ll show you the fastest path to fixing these and winning those visitors back.</>
                )}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-4">
                <button
                  onClick={requestFullReport}
                  disabled={requesting}
                  className="transition-base inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-[15px] font-bold text-neutral-950 shadow-lg hover:bg-neutral-100 disabled:opacity-60"
                >
                  {requesting ? "Sending…" : "Get my full report + free call"}
                  {!requesting && <span aria-hidden>→</span>}
                </button>
                <span className="text-xs text-neutral-400">No pressure. No jargon. Just results.</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
            <p className="font-display text-lg font-bold text-emerald-800">You&apos;re in — we&apos;ll be in touch shortly. ✓</p>
            <p className="mt-1.5 text-sm leading-relaxed text-emerald-700">
              Your full report and a senior expert are on the way. We&apos;ll map out every fix so you stop losing
              customers to barriers you can&apos;t see.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * "How this score was calculated" — a compact, collapsible panel that makes
 * every deduction traceable to a real, counted finding. Driven entirely by
 * scoreBreakdown.lineItems (top contributors by points). Renders nothing when
 * the breakdown is absent (pre-v2 data), so older reports degrade gracefully.
 */
function ScoreBreakdownSection({
  breakdown,
  score,
}: {
  breakdown?: ScoreBreakdown | null;
  score: number;
}) {
  const [open, setOpen] = useState(false);

  const items = (breakdown?.lineItems ?? [])
    .filter((li) => li && typeof li.ruleId === "string")
    .slice()
    .sort((a, b) => (Number(b.pointsContributed) || 0) - (Number(a.pointsContributed) || 0))
    .slice(0, 8);

  if (items.length === 0) return null;

  const version = breakdown?.scoringModelVersion;

  return (
    <div className="border-t border-neutral-100 px-8 py-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="transition-base flex w-full items-center justify-between gap-3 text-left"
      >
        <span>
          <span className="block text-sm font-semibold text-neutral-900">How this score was calculated</span>
          <span className="mt-0.5 block text-xs text-neutral-500">
            Every point removed maps to a real, counted finding — not a guess.
          </span>
        </span>
        <span
          aria-hidden
          className={`shrink-0 text-neutral-400 transition-transform ${open ? "rotate-180" : ""}`}
        >
          ▾
        </span>
      </button>

      {open && (
        <div className="mt-4">
          <p className="text-xs text-neutral-500">
            Starting from 100, we subtract points for each issue based on its severity and how many
            times it appears. These are the biggest contributors.
          </p>
          <table className="mt-3 w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                <th scope="col" className="py-2 pr-2 font-semibold">Finding</th>
                <th scope="col" className="py-2 pr-2 font-semibold">WCAG</th>
                <th scope="col" className="py-2 pr-2 text-right font-semibold">Instances</th>
                <th scope="col" className="py-2 text-right font-semibold">Points</th>
              </tr>
            </thead>
            <tbody>
              {items.map((li, i) => {
                const instances = asCount(li.instanceCount);
                const points = pointsLabel(li.pointsContributed);
                const wcagText = li.wcagCriterion
                  ? `${li.wcagCriterion}${li.level && li.level !== "best-practice" ? ` (${li.level})` : ""}`
                  : li.level === "best-practice"
                    ? "Best practice"
                    : "—";
                return (
                  <tr key={`${li.ruleId}-${i}`} className="border-b border-neutral-100 last:border-0">
                    <td className="py-2 pr-2 align-top">
                      <span className="font-medium text-neutral-800">{li.ruleId}</span>
                      {li.severity && (
                        <span className="ml-2 text-[11px] font-medium text-neutral-400">{li.severity}</span>
                      )}
                    </td>
                    <td className="py-2 pr-2 align-top text-neutral-600">{wcagText}</td>
                    <td className="py-2 pr-2 text-right align-top tabular-nums text-neutral-600">
                      {instances ?? "—"}
                    </td>
                    <td className="py-2 text-right align-top tabular-nums font-semibold text-red-700">
                      {points ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-3 text-[11px] text-neutral-400">
            Score: {score}/100{version ? ` · scoring model ${version}` : ""}. This is an automated
            measure of common checks — it surfaces real issues but isn&apos;t a compliance
            certification.
          </p>
        </div>
      )}
    </div>
  );
}
