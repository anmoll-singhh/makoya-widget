/**
 * lib/audit/audit-content.ts — the PURE, testable model behind the Full Audit
 * report (the honest, accessScan-parity per-rule breakdown).
 *
 * Split out from any React/PDF view so the honesty guardrail and the shaping
 * logic (outcome mapping, WCAG resolution, best-practice split, sorting,
 * defensive clamping) are unit-tested without rendering anything. Same pattern
 * as lib/pdf/report-content.ts.
 *
 * ── HONESTY RULES (non-negotiable — see CLAUDE.md + report-content.ts) ────────
 * accessScan headlines "Accessible / Congratulations, your webpage is
 * accessible" — the exact automated-compliance claim the FTC fined accessiBe
 * $1M for. This report must NEVER do that. Enforced structurally, not just
 * lexically (a green ✓ + "passes" implies a claim with no banned word):
 *   - The headline states the MEASURED score + what was checked. No
 *     "accessible / compliant / certified / conformant / guaranteed / meets WCAG".
 *   - A rule with no failures is "No problems detected by automated checks",
 *     NEVER "passes WCAG" / "meets" / "conformant" — an axe pass is not a
 *     criterion met (e.g. contrast-over-image is undecidable).
 *   - A rule that did not apply is "Not relevant to this page" (grey) — NEVER a
 *     green 100. This is the reviewer's P0: inapplicable rules must not read as
 *     passes.
 *   - Undecidable elements surface as "Needs review" and NEVER count as passes.
 *   - The honest disclaimer renders with the report.
 * `audit-content.caps.test.ts` asserts all of the above.
 *
 * DEFENSIVE: the input `rules` come from a stored JSONB blob. Even though it is
 * service-written, we treat it as untrusted at render time — coerce the outcome
 * to a known value, clamp string lengths, and cap node samples — exactly like
 * buildReportContent does.
 */

import { hostOf } from "@/lib/utils/url";
import { resolveWcag } from "@/lib/scanner/wcag-criteria";
import type { AuditOutcome, RuleAuditResult } from "@/lib/scanner/types";

// ── Input ────────────────────────────────────────────────────────────────────

export interface AuditReportInput {
  url: string;
  /** Overall score from the SAME scan (scans.score). Not a per-rule number. */
  score: number;
  /** ISO timestamp of the scan. */
  scannedAt: string;
  rules: RuleAuditResult[];
  /** Injectable for deterministic tests; defaults to `scannedAt` then now. */
  generatedAt?: Date;
}

// ── Output model ───────────────────────────────────────────────────────────────

/** A single element snapshot shown under a rule. */
export interface AuditSample {
  target: string;
  html: string;
}

export interface AuditRuleRow {
  id: string;
  /** Plain-English rule description (what the check is about). */
  title: string;
  outcome: AuditOutcome;
  /** Honest outcome label — never "passes/meets WCAG". */
  outcomeLabel: string;
  /** TRUE node count for the outcome (failures / passed / to-review; 0 if n/a). */
  count: number;
  /** Whether the rule applied to this page (false only for not-applicable). */
  relevant: boolean;
  /** Severity label for failures ("Critical".."Minor"), else null. */
  severityLabel: string | null;
  /** "1.4.3 Contrast (Minimum)" or null when the rule maps to no criterion. */
  wcagCriterion: string | null;
  /** "A" | "AA" | "Best practice". */
  levelLabel: string;
  /** Heading above the code snapshots, matched to the outcome. */
  sampleHeading: string | null;
  sample: AuditSample[];
}

export interface AuditSummary {
  totalRules: number;
  failed: number;
  passed: number;
  review: number;
  notApplicable: number;
  /** Sum of failing instances across all failed rules. */
  failingInstances: number;
}

export interface AuditReportContent {
  host: string;
  url: string;
  score: number;
  /** Honest verdict — describes the score, never claims "accessible". */
  scoreVerdict: string;
  dateLabel: string;
  summary: AuditSummary;
  /** Rules that map to a WCAG criterion (count toward the score), fail-first. */
  scoredRules: AuditRuleRow[];
  /** Best-practice rules — shown separately, "not included in the score". */
  bestPracticeRules: AuditRuleRow[];
  intro: string;
  disclaimer: string;
  footer: string;
}

// ── Constants + helpers ────────────────────────────────────────────────────────

const MAX_RULES = 400; // axe has ~100 rules; cap defends against a bloated blob.
const MAX_SAMPLES_PER_RULE = 10;
const MAX_FIELD = 600;
const MAX_HTML = 600;

const OUTCOMES: readonly AuditOutcome[] = ["fail", "pass", "review", "not-applicable"];

const SEVERITY_LABEL: Record<string, string> = {
  critical: "Critical",
  serious: "Serious",
  moderate: "Moderate",
  minor: "Minor",
};

/** Outcome → honest label. Deliberately avoids "passes/meets/compliant". */
const OUTCOME_LABEL: Record<AuditOutcome, string> = {
  fail: "Issues found",
  pass: "No problems detected by automated checks",
  review: "Needs manual review",
  "not-applicable": "Not relevant to this page",
};

/** Outcome → heading above its code snapshots (null when there are none). */
const SAMPLE_HEADING: Record<AuditOutcome, string | null> = {
  fail: "Code snapshots of elements to fix",
  pass: "Code snapshots of elements with no automated issue",
  review: "Code snapshots of elements to review manually",
  "not-applicable": null,
};

/** Sort key so failures surface first, then review, then pass, then n/a. */
const OUTCOME_ORDER: Record<AuditOutcome, number> = {
  fail: 0,
  review: 1,
  pass: 2,
  "not-applicable": 3,
};

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  serious: 1,
  moderate: 2,
  minor: 3,
};

function clip(s: unknown, max = MAX_FIELD): string {
  return typeof s === "string" ? s.slice(0, max) : "";
}

function clampScore(raw: number): number {
  if (!Number.isFinite(raw)) return 0;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

function coerceOutcome(v: unknown): AuditOutcome {
  return typeof v === "string" && (OUTCOMES as readonly string[]).includes(v)
    ? (v as AuditOutcome)
    : "not-applicable";
}

function coerceCount(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.trunc(v)) : 0;
}

/**
 * Honest verdict for the headline. Mirrors the framing of lib/pdf/report-content
 * (`verdictFor`) — describes the state, never asserts conformance.
 */
function verdictFor(score: number): string {
  if (score >= 80) return "A solid base — a few checks still need attention.";
  if (score >= 60) return "Real gaps that are turning some visitors away.";
  return "Several checks are failing and likely blocking visitors.";
}

function toSamples(sample: RuleAuditResult["sample"]): AuditSample[] {
  if (!Array.isArray(sample)) return [];
  return sample.slice(0, MAX_SAMPLES_PER_RULE).map((s) => {
    const o = (s ?? {}) as { target?: unknown; html?: unknown };
    const target = Array.isArray(o.target) ? o.target.map((t) => String(t)).join(" ") : "";
    return { target: clip(target, 300), html: clip(o.html, MAX_HTML) };
  });
}

/** Map one stored rule result → a display row, resolving WCAG + honest labels. */
function toRow(r: RuleAuditResult): AuditRuleRow {
  const outcome = coerceOutcome(r.outcome);
  const tags = Array.isArray(r.tags) ? r.tags.filter((t): t is string => typeof t === "string") : [];
  const wcag = resolveWcag(tags);
  const severityLabel =
    outcome === "fail" && typeof r.impact === "string" ? SEVERITY_LABEL[r.impact] ?? null : null;

  const levelLabel = wcag.level === "best-practice" ? "Best practice" : wcag.level;
  const wcagCriterion = wcag.criterion ? `${wcag.criterion} ${wcag.name ?? ""}`.trim() : null;

  return {
    id: clip(r.id, 120),
    title: clip(r.description || r.help, MAX_FIELD),
    outcome,
    outcomeLabel: OUTCOME_LABEL[outcome],
    count: outcome === "not-applicable" ? 0 : coerceCount(r.count),
    relevant: outcome !== "not-applicable",
    severityLabel,
    wcagCriterion,
    levelLabel,
    sampleHeading: SAMPLE_HEADING[outcome],
    sample: toSamples(r.sample),
  };
}

/** Deterministic sort: outcome (fail-first) → severity → criterion → id. */
function sortRows(a: AuditRuleRow, b: AuditRuleRow): number {
  const o = OUTCOME_ORDER[a.outcome] - OUTCOME_ORDER[b.outcome];
  if (o !== 0) return o;
  // Within failures, most-severe first.
  const sa = a.severityLabel ? SEVERITY_ORDER[a.severityLabel.toLowerCase()] ?? 9 : 9;
  const sb = b.severityLabel ? SEVERITY_ORDER[b.severityLabel.toLowerCase()] ?? 9 : 9;
  if (sa !== sb) return sa - sb;
  return a.id.localeCompare(b.id);
}

// ── Public builder ─────────────────────────────────────────────────────────────

export function buildAuditReport(input: AuditReportInput): AuditReportContent {
  const host = hostOf(input.url);
  const score = clampScore(input.score);

  const rows = (Array.isArray(input.rules) ? input.rules : [])
    .slice(0, MAX_RULES)
    .map(toRow);

  // Best-practice split, exactly like accessScan's "not included in the score".
  const scoredRules = rows.filter((r) => r.levelLabel !== "Best practice").sort(sortRows);
  const bestPracticeRules = rows
    .filter((r) => r.levelLabel === "Best practice")
    .sort(sortRows);

  const summary: AuditSummary = {
    totalRules: rows.length,
    failed: rows.filter((r) => r.outcome === "fail").length,
    passed: rows.filter((r) => r.outcome === "pass").length,
    review: rows.filter((r) => r.outcome === "review").length,
    notApplicable: rows.filter((r) => r.outcome === "not-applicable").length,
    failingInstances: rows
      .filter((r) => r.outcome === "fail")
      .reduce((sum, r) => sum + r.count, 0),
  };

  const when = input.generatedAt ?? (input.scannedAt ? new Date(input.scannedAt) : new Date());
  const dateLabel = Number.isNaN(when.getTime())
    ? new Date().toISOString().slice(0, 10)
    : when.toISOString().slice(0, 10);

  const intro =
    `We loaded ${host} in a real browser and ran every check in our WCAG 2.x ` +
    `ruleset. Below is each check, whether it applied to this page, and the exact ` +
    `elements involved — in plain English. This lists what automated testing can ` +
    `see; it is not a certification.`;

  // Same honesty framing as the scan report's disclaimer.
  const disclaimer =
    "This is an automated audit of a single page. Automated tools catch only a " +
    "portion of all accessibility barriers, so a check with no detected problem is " +
    'not proof that a requirement is met, and this report does not certify that a ' +
    "site is compliant — no honest tool can. Full assurance needs people testing " +
    "with assistive technology. What we can do is show exactly what was found, help " +
    "fix it at the source, and keep watching so it stays fixed.";

  return {
    host,
    url: clip(input.url, 300),
    score,
    scoreVerdict: verdictFor(score),
    dateLabel,
    summary,
    scoredRules,
    bestPracticeRules,
    intro,
    disclaimer,
    footer:
      "Makoya — honest accessibility. We find and help fix real issues; we never sell a compliance badge.",
  };
}
