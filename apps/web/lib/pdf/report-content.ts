/**
 * lib/pdf/report-content.ts — the PURE, testable model behind the PDF report.
 *
 * Why this is split out from the React-PDF document: the honesty guardrail (and
 * the content logic — totals, clamping, verdict) must be unit-tested without
 * rendering a PDF. This file produces plain strings/structures; `ReportDocument`
 * only lays them out. Same pattern as lib/email/report-email.ts.
 *
 * HONEST-HYBRID COPY RULES (non-negotiable, see CLAUDE.md compliance guardrails):
 *  - Never say "WCAG compliant", "ADA compliant", "fully compliant",
 *    "guaranteed", or "lawsuit-proof". The FTC fined accessiBe $1M for exactly
 *    those automated-compliance claims.
 *  - State real findings plainly; offer to fix them at the source and monitor.
 */

import { hostOf } from "@/lib/utils/url";

export type ReportSeverity = "critical" | "serious" | "moderate" | "minor";

export interface ReportPdfIssue {
  id: string;
  impact: ReportSeverity | null;
  /** Plain-English title (the `help` field from /api/public-scan). */
  help: string;
  whatItMeans: string;
  whoItAffects: string;
}

export interface ReportPdfTotals {
  critical: number;
  serious: number;
  moderate: number;
  minor: number;
  total?: number;
}

export interface ReportPdfInput {
  url: string;
  score: number;
  totals: ReportPdfTotals;
  topIssues: ReportPdfIssue[];
  isPartialScan?: boolean;
  /** Injectable for deterministic tests; defaults to now. */
  generatedAt?: Date;
}

export interface ReportContentIssue {
  id: string;
  impact: ReportSeverity | null;
  impactLabel: string;
  title: string;
  whatItMeans: string;
  whoItAffects: string;
}

export interface SeverityRow {
  key: ReportSeverity;
  label: string;
  count: number;
}

export interface ReportContent {
  host: string;
  url: string;
  score: number;
  scoreVerdict: string;
  dateLabel: string;
  totals: Required<ReportPdfTotals>;
  severityRows: SeverityRow[];
  issues: ReportContentIssue[];
  intro: string;
  partialNote: string | null;
  disclaimer: string;
  nextSteps: string[];
  footer: string;
}

const SEVERITY_LABEL: Record<ReportSeverity, string> = {
  critical: "Critical",
  serious: "Serious",
  moderate: "Moderate",
  minor: "Minor",
};

const SEVERITY_ORDER: ReportSeverity[] = ["critical", "serious", "moderate", "minor"];

// Defensive caps so a hostile/oversized client payload can't blow up the PDF.
const MAX_ISSUES = 50;
const MAX_FIELD = 600;

function clampScore(raw: number): number {
  if (!Number.isFinite(raw)) return 0;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

function n(x: number): number {
  return Number.isFinite(x) ? Math.max(0, Math.trunc(x)) : 0;
}

function clip(s: unknown): string {
  return typeof s === "string" ? s.slice(0, MAX_FIELD) : "";
}

/** Coerce an untrusted value to a known severity, else null (never trust JSON). */
function coerceImpact(v: unknown): ReportSeverity | null {
  return typeof v === "string" && (SEVERITY_ORDER as string[]).includes(v)
    ? (v as ReportSeverity)
    : null;
}

function verdictFor(score: number): string {
  if (score >= 80) return "A solid start — a few things to tidy up.";
  if (score >= 60) return "Real gaps are turning some visitors away.";
  return "Several visitors likely can't use parts of this page.";
}

export function buildReportContent(input: ReportPdfInput): ReportContent {
  const host = hostOf(input.url);
  const score = clampScore(input.score);

  const critical = n(input.totals.critical);
  const serious = n(input.totals.serious);
  const moderate = n(input.totals.moderate);
  const minor = n(input.totals.minor);
  const total =
    typeof input.totals.total === "number" && Number.isFinite(input.totals.total)
      ? n(input.totals.total)
      : critical + serious + moderate + minor;

  const totals = { critical, serious, moderate, minor, total };

  const severityRows: SeverityRow[] = SEVERITY_ORDER.map((key) => ({
    key,
    label: SEVERITY_LABEL[key],
    count: totals[key],
  }));

  const issues: ReportContentIssue[] = (input.topIssues ?? [])
    .slice(0, MAX_ISSUES)
    .map((i) => {
      const impact = coerceImpact(i.impact);
      return {
        id: clip(i.id),
        impact,
        impactLabel: impact ? SEVERITY_LABEL[impact] : "",
        title: clip(i.help),
        whatItMeans: clip(i.whatItMeans),
        whoItAffects: clip(i.whoItAffects),
      };
    });

  const intro =
    total > 0
      ? `We loaded ${host} in a real browser and checked it against common WCAG 2.x success criteria. Below is your score and the issues most likely to be turning visitors away — in plain English.`
      : `We loaded ${host} in a real browser and checked it against common WCAG 2.x success criteria. We didn't flag any of the issues in this automated pass — a good sign, though it's not the whole picture (see the note below).`;

  const partialNote = input.isPartialScan
    ? "This page was large, so this pass covered the core WCAG A/AA checks. A full report can cover more."
    : null;

  // Honest, non-compliance disclaimer. Mirrors the framing of the report email.
  const disclaimer =
    "This is an automated scan of common accessibility checks on a single page. " +
    "It surfaces real problems, but automated tools catch only a portion of all " +
    'barriers — so this report does not certify that a site is "compliant," and ' +
    "no honest tool can. Full assurance needs people testing with assistive " +
    "technology. What we can do is show you exactly what's wrong, help you fix it " +
    "at the source, and keep watching so it stays fixed.";

  const nextSteps =
    total > 0
      ? [
          "Start with the Critical and Serious items above — they block the most people.",
          "Fix issues at the source in your site's code or CMS, not with an overlay.",
          "Re-scan after changes to confirm the fix, then monitor so regressions get caught.",
          "Want help? Reply to your report email and we'll walk through the fixes with you.",
        ]
      : [
          "Automated checks look clean — schedule periodic re-scans so future changes don't regress.",
          "Consider a manual review with assistive technology for the barriers automation can't see.",
          "Add the Makoya preferences widget to give visitors useful display controls.",
        ];

  return {
    host,
    url: clip(input.url),
    score,
    scoreVerdict: verdictFor(score),
    dateLabel: (input.generatedAt ?? new Date()).toISOString().slice(0, 10),
    totals,
    severityRows,
    issues,
    intro,
    partialNote,
    disclaimer,
    nextSteps,
    footer: "Makoya — honest accessibility. We find and help fix real issues; we never sell a compliance badge.",
  };
}
