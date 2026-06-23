/**
 * /api/public-scan — the PUBLIC, unauthenticated WCAG scan endpoint.
 *
 * This powers the top of the sales funnel: a visitor pastes a URL on /scan, we
 * run a real axe-core scan and hand back a score + the worst issues in plain
 * English. No email is required to see the result — the email gate (which
 * creates a lead via /api/scan-ingest) comes AFTER, once they've seen value.
 *
 * Why this is separate from /api/scan (the authed route):
 *  - /api/scan is for signed-in owners scanning THEIR OWN registered sites; it
 *    persists the scan via `runAndStoreScan` and is cached per-site.
 *  - This route is for arbitrary public URLs typed by anonymous visitors. We
 *    deliberately DO NOT store the scan (no row, no scanId) — public scans are
 *    ephemeral. We only ever persist a `lead` later, and only with consent
 *    (the visitor entering their email on the next step).
 *
 * Security posture (public + unauthenticated → treat every input as hostile):
 *  1. SSRF: `isPublicHttpUrl` (string/AST gate) AND `validateScanUrl`
 *     (normalisation + canonical AppError) both run before the browser opens a
 *     single connection. Either rejecting → 400. We never let the engine touch a
 *     localhost / private / link-local / `.local` / non-http(s) target.
 *  2. Rate limit: crude per-instance IP throttle (same pattern as scan-ingest).
 *  3. Error opacity: we NEVER echo the engine error text back to the caller —
 *     it embeds the target URL and would turn the scanner into an SSRF/port-scan
 *     oracle (timeout vs connection-refused reveals what's reachable). We return
 *     a generic message + a safe machine `code`, exactly like /api/scan does.
 *
 * Honest copy: this endpoint reports real issues and a score. It NEVER claims
 * the site is "WCAG compliant", "ADA compliant", or "guaranteed" anything.
 */

import { NextResponse } from "next/server";
import { runScan } from "@/lib/scanner";
import { buildReport } from "@/lib/scanner/report-builder";
import { topPlainIssues } from "@/lib/scanner/plain-language";
import { validateScanUrl, sanitiseUrl } from "@/lib/utils/url";
import { isPublicHttpUrl } from "@/lib/scan-utils/public-url";
import { track, captureError } from "@/lib/observability";
import { isAppError } from "@/lib/utils/error";
import type { AccessibilityIssue, AccessibilityReport } from "@/types";

// ── WCAG evidence derivation ────────────────────────────────────────────────
// We derive the WCAG criterion an issue maps to FROM THE ISSUE'S OWN axe tags
// (e.g. "wcag143" → 1.4.3 (AA)). This is honest — it reports the criterion the
// engine actually flagged, never an invented one. Issues that only carry
// "best-practice" (no numbered criterion) are reported as best practice with
// NO fabricated criterion number.
//
// If a future v2 engine attaches a richer `wcag` object directly to the issue,
// we prefer that and fall back to tag-derivation only when it's absent.

type IssueWcag = {
  criterion: string | null;
  name: string | null;
  level: "A" | "AA" | "AAA" | "best-practice";
  url: string | null;
};

/** Human-readable names for the WCAG success criteria we most commonly flag. */
const WCAG_NAMES: Record<string, string> = {
  "1.1.1": "Non-text Content",
  "1.2.1": "Audio-only and Video-only (Prerecorded)",
  "1.2.2": "Captions (Prerecorded)",
  "1.3.1": "Info and Relationships",
  "1.3.4": "Orientation",
  "1.3.5": "Identify Input Purpose",
  "1.4.1": "Use of Color",
  "1.4.2": "Audio Control",
  "1.4.3": "Contrast (Minimum)",
  "1.4.4": "Resize Text",
  "1.4.6": "Contrast (Enhanced)",
  "1.4.10": "Reflow",
  "1.4.12": "Text Spacing",
  "2.1.1": "Keyboard",
  "2.1.2": "No Keyboard Trap",
  "2.4.1": "Bypass Blocks",
  "2.4.2": "Page Titled",
  "2.4.4": "Link Purpose (In Context)",
  "2.4.6": "Headings and Labels",
  "2.4.7": "Focus Visible",
  "2.4.11": "Focus Not Obscured (Minimum)",
  "2.5.3": "Label in Name",
  "2.5.7": "Dragging Movements",
  "2.5.8": "Target Size (Minimum)",
  "3.1.1": "Language of Page",
  "3.1.2": "Language of Parts",
  "3.3.2": "Labels or Instructions",
  "4.1.2": "Name, Role, Value",
};

/** Convert a packed axe criterion tag ("wcag143") to a dotted criterion ("1.4.3"). */
function dottedCriterion(packed: string): string {
  // The first digit is the principle, the rest are guideline + criterion.
  if (packed.length <= 1) return packed;
  return `${packed[0]}.${packed.slice(1).split("").join(".")}`;
}

/** W3C "Understanding" URL for a dotted criterion, when we can build one. */
function understandingUrl(dotted: string, name: string | null): string | null {
  if (!name) return null;
  const slug = name
    .toLowerCase()
    .replace(/[()]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `https://www.w3.org/WAI/WCAG21/Understanding/${slug}.html`;
}

/**
 * Derive WCAG evidence from an issue's axe tags. Returns null only when there
 * are no recognisable WCAG/best-practice tags at all (so the UI can hide it).
 */
function wcagFromTags(tags: string[]): IssueWcag | null {
  if (!Array.isArray(tags)) return null;

  // Numbered criterion tags look like "wcag143" (3+ trailing digits).
  let criterion: string | null = null;
  for (const t of tags) {
    const m = /^wcag(\d{3,})$/.exec(t);
    if (m) {
      criterion = dottedCriterion(m[1]);
      break;
    }
  }

  // Conformance level from the marker tags (most strict wins).
  let level: IssueWcag["level"] | null = null;
  if (tags.some((t) => t === "wcag2aaa" || t === "wcag21aaa")) level = "AAA";
  else if (tags.some((t) => t === "wcag2aa" || t === "wcag21aa")) level = "AA";
  else if (tags.some((t) => t === "wcag2a" || t === "wcag21a")) level = "A";

  if (!criterion) {
    // No numbered criterion: honest best-practice finding (no fabricated number).
    if (level || tags.includes("best-practice")) {
      return { criterion: null, name: null, level: level ?? "best-practice", url: null };
    }
    return null;
  }

  const name = WCAG_NAMES[criterion] ?? null;
  return {
    criterion,
    name,
    level: level ?? "best-practice",
    url: understandingUrl(criterion, name),
  };
}

/**
 * Resolve WCAG evidence for a plain issue: prefer a richer `wcag` object if a
 * future engine attached one to the source issue, else derive from its tags.
 */
function resolveWcag(source: AccessibilityIssue | undefined): IssueWcag | null {
  if (!source) return null;
  const attached = (source as { wcag?: Partial<IssueWcag> }).wcag;
  if (attached && (attached.criterion || attached.level)) {
    return {
      criterion: attached.criterion ?? null,
      name: attached.name ?? null,
      level: attached.level ?? "best-practice",
      url: attached.url ?? null,
    };
  }
  return wcagFromTags(source.tags ?? []);
}

/** Flatten a report's severity-grouped issues into an id → issue lookup. */
function issuesById(report: AccessibilityReport): Map<string, AccessibilityIssue> {
  const map = new Map<string, AccessibilityIssue>();
  for (const sev of ["critical", "serious", "moderate", "minor"] as const) {
    for (const issue of report.issues[sev]) {
      if (!map.has(issue.id)) map.set(issue.id, issue);
    }
  }
  return map;
}

// The real scan needs the Node runtime (Chromium) and the full Vercel budget.
export const runtime = "nodejs";
export const maxDuration = 60;

// ── crude per-instance rate limit ──────────────────────────────────────────
// Mirrors /api/scan-ingest. Good enough to stop accidental floods in the demo;
// replace with a durable cross-instance limiter (Upstash) when hardening. The
// limit is tighter here than scan-ingest because each call spins up a browser.
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 5;
const hits = new Map<string, { n: number; t: number }>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const cur = hits.get(key);
  if (!cur || now - cur.t > RATE_WINDOW_MS) {
    hits.set(key, { n: 1, t: now });
    return false;
  }
  cur.n++;
  return cur.n > RATE_MAX;
}

export async function POST(req: Request): Promise<NextResponse> {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many scans from this connection. Please wait a minute and try again." },
      { status: 429 }
    );
  }

  let body: { url?: unknown };
  try {
    body = (await req.json()) as { url?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // ── SSRF gate (layer 1): cheap string/AST predicate, never throws ──────────
  if (!isPublicHttpUrl(body?.url)) {
    return NextResponse.json(
      { error: "Enter a public website address (e.g. example.com).", code: "INVALID_URL" },
      { status: 400 }
    );
  }

  // ── SSRF gate (layer 2) + normalisation ────────────────────────────────────
  // validateScanUrl also normalises (adds https://, strips creds) and is the
  // shared choke-point used by the authed scan path, so both agree on policy.
  let url: string;
  try {
    url = sanitiseUrl(validateScanUrl(body.url as string));
  } catch (e) {
    const code = isAppError(e) ? e.code : "INVALID_URL";
    return NextResponse.json(
      { error: "That address can't be scanned. Try a public website like example.com.", code },
      { status: 400 }
    );
  }

  track("scan_started", { source: "public" });

  // ── Run the real scan (NOT stored — public scans are ephemeral) ────────────
  try {
    const raw = await runScan({
      url,
      wcagLevel: "AA",
      timeoutMs: 30_000,
      scanInternalLinks: false,
    });
    const report = buildReport(raw, url);

    track("scan_completed", { source: "public", score: report.score, total: report.totals.total });

    // Lookup so we can attach each top issue's WCAG evidence (derived from the
    // source issue's own axe tags) without changing the plain-language module.
    const byId = issuesById(report);

    return NextResponse.json({
      score: report.score,
      totals: report.totals,
      finalUrl: report.url,
      isPartialScan: report.isPartialScan ?? false,
      // Top 5 worst issues, already plain-English and severity-ordered.
      topIssues: topPlainIssues(report, 5).map((i) => {
        const wcag = resolveWcag(byId.get(i.id));
        return {
          id: i.id,
          impact: i.impact,
          help: i.title,
          whatItMeans: i.whatItMeans,
          whoItAffects: i.whoItAffects,
          ...(wcag ? { wcag } : {}),
        };
      }),
    });
  } catch (e) {
    // Generic message ONLY. Echoing the engine error would leak the target URL
    // and act as an SSRF/port-scan oracle. The machine code is safe to surface
    // (e.g. SCAN_TIMEOUT, PAGE_LOAD_FAILED) so the UI can tailor its hint.
    captureError(e, { route: "public-scan" });
    const code = isAppError(e) ? e.code : "INTERNAL_SERVER_ERROR";
    return NextResponse.json(
      { error: "We couldn't scan that site right now. Check the address and try again.", code },
      { status: 502 }
    );
  }
}
