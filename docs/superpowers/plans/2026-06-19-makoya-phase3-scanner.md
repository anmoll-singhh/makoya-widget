# Makoya Phase 3: Scanner Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use `- [ ]`.

**Goal:** Auto-scan a client's site, show the top-3 issues in plain English with a score, and gate the full itemized report behind a "Get full report / Book a call" consultation request that surfaces to the operator.

**Architecture:** The axe-core + Playwright engine is already ported into `apps/web` (Task 1, done: `lib/scanner`, `lib/browser`, `lib/utils`, `types`, verified by a real scan). This phase adds: a curated plain-language layer, a scans/consultation data layer, an internal scan route that runs+stores (auto, cache-by-recency) plus a cron rescan, and a client report UI that triggers the scan on load and renders it.

**Tech Stack:** Next 15 (Node runtime routes), React 19, Supabase, the ported scanner engine.

## Global Constraints

- `apps/web` port 3000; Node 20+; Next 15.
- Scan routes: `export const runtime = "nodejs"; export const maxDuration = 60;`.
- Service-role client (`getAdminSupabase`) only server-side (cron, storing scans). Owner report access via RLS (`getServerSupabase`).
- A site's scan URL is `https://${site.domain}` (prepend scheme; domain stored without scheme).
- Plain-language is a curated map with a safe generic fallback — no LLM, no network.
- Top-3 issues = highest severity first (critical → serious → moderate → minor).
- Full report gated: shown only after a consultation request is created for that scan.
- No "WCAG/ADA compliant"/"lawsuit-proof" copy. Frame as "accessibility issues / improvements", and the consultation CTA as help, not legal guarantee.
- `scans` and `consultation_requests` tables already exist (Phase 1 schema). `consultation_requests` is admin-only (service-role) at the RLS layer, but the owner CREATES one via a server route using their session — the INSERT is performed with the service-role client inside the route after verifying ownership.
- Commit per task; `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` trailer.

---

### Task 2: Plain-language mapping (TDD)

**Files:** Create `apps/web/lib/scanner/plain-language.ts`, `apps/web/lib/scanner/plain-language.test.ts`

**Interfaces:**
- Produces:
  - `interface PlainIssue { id: string; impact: SeverityLevel | null; title: string; whatItMeans: string; whoItAffects: string }`
  - `toPlainIssue(issue: AccessibilityIssue): PlainIssue`
  - `topPlainIssues(report: AccessibilityReport, n?: number): PlainIssue[]` — severity-sorted, default n=3.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { toPlainIssue, topPlainIssues } from "./plain-language";
import type { AccessibilityReport, AccessibilityIssue } from "@/types";

const mk = (id: string, impact: any): AccessibilityIssue =>
  ({ id, impact, description: "d", help: "h", tags: [], helpUrl: "u", nodes: [] });

describe("plain-language", () => {
  it("maps a known rule id to a curated plain explanation", () => {
    const p = toPlainIssue(mk("image-alt", "critical"));
    expect(p.title.toLowerCase()).toContain("image");
    expect(p.whatItMeans.length).toBeGreaterThan(10);
    expect(p.whoItAffects.length).toBeGreaterThan(5);
  });
  it("falls back gracefully for an unknown rule id", () => {
    const p = toPlainIssue(mk("some-unknown-rule", "minor"));
    expect(p.title.length).toBeGreaterThan(0);
    expect(p.whatItMeans.length).toBeGreaterThan(0);
  });
  it("topPlainIssues returns highest-severity first, capped at n", () => {
    const report = {
      issues: {
        critical: [mk("image-alt", "critical")],
        serious: [mk("color-contrast", "serious")],
        moderate: [mk("region", "moderate")],
        minor: [mk("x", "minor")],
      },
    } as unknown as AccessibilityReport;
    const top = topPlainIssues(report, 3);
    expect(top.map((t) => t.id)).toEqual(["image-alt", "color-contrast", "region"]);
  });
});
```

- [ ] **Step 2: Run, verify RED** — `cd apps/web && npx vitest run lib/scanner/plain-language.test.ts` → fails (module missing).

- [ ] **Step 3: Implement `plain-language.ts`**

```ts
import type { AccessibilityReport, AccessibilityIssue, SeverityLevel } from "@/types";

export interface PlainIssue {
  id: string;
  impact: SeverityLevel | null;
  title: string;
  whatItMeans: string;
  whoItAffects: string;
}

type Entry = { title: string; whatItMeans: string; whoItAffects: string };

/** Curated, plain-English explanations for the most common rules (axe + custom). */
const MAP: Record<string, Entry> = {
  "image-alt": {
    title: "Images are missing text descriptions",
    whatItMeans: "Some images don't have alternative text, so their meaning is lost when the image can't be seen.",
    whoItAffects: "Blind and low-vision visitors using screen readers.",
  },
  "color-contrast": {
    title: "Text is hard to read against its background",
    whatItMeans: "Some text doesn't stand out enough from its background colour to be comfortably readable.",
    whoItAffects: "People with low vision, colour blindness, or anyone in bright light.",
  },
  "label": {
    title: "Form fields aren't clearly labelled",
    whatItMeans: "Some input boxes have no label telling the visitor (or their screen reader) what to type.",
    whoItAffects: "Screen-reader users and people with cognitive differences.",
  },
  "link-name": {
    title: "Some links have no readable text",
    whatItMeans: "A link has no text a screen reader can announce, so its destination is unknown.",
    whoItAffects: "Blind and low-vision visitors.",
  },
  "button-name": {
    title: "Some buttons have no readable name",
    whatItMeans: "A button has no text or label, so it's announced as just 'button' with no purpose.",
    whoItAffects: "Screen-reader users.",
  },
  "icon-button-no-label": {
    title: "Icon-only buttons have no label",
    whatItMeans: "Buttons that show only an icon have no hidden text, so their purpose isn't announced.",
    whoItAffects: "Screen-reader users.",
  },
  "html-has-lang": {
    title: "The page doesn't declare its language",
    whatItMeans: "The page doesn't say which language it's written in, so screen readers may mispronounce it.",
    whoItAffects: "Screen-reader users, especially on multilingual sites.",
  },
  "document-title": {
    title: "The page has no title",
    whatItMeans: "The browser tab and screen reader have no title to identify this page.",
    whoItAffects: "Screen-reader users and anyone with many tabs open.",
  },
  "heading-order": {
    title: "Headings are out of order",
    whatItMeans: "Headings skip levels, which breaks the outline people use to navigate.",
    whoItAffects: "Screen-reader users who jump between headings.",
  },
  "region": {
    title: "Page content isn't organised into landmarks",
    whatItMeans: "Parts of the page aren't inside navigation landmarks, making it harder to jump around.",
    whoItAffects: "Screen-reader users navigating by region.",
  },
  "landmark-one-main": {
    title: "The page has no main content area",
    whatItMeans: "There's no 'main' landmark marking the primary content, so users can't skip straight to it.",
    whoItAffects: "Screen-reader and keyboard users.",
  },
  "list": {
    title: "Lists aren't marked up correctly",
    whatItMeans: "Content that looks like a list isn't coded as one, so its structure is lost to assistive tech.",
    whoItAffects: "Screen-reader users.",
  },
  "generic-link-text": {
    title: "Links use vague text like 'click here'",
    whatItMeans: "Some links don't describe where they go, which is confusing out of context.",
    whoItAffects: "Screen-reader users scanning a list of links, and everyone skimming.",
  },
  "new-window-no-warning": {
    title: "Links open new tabs without warning",
    whatItMeans: "Some links open a new window or tab without telling the visitor first.",
    whoItAffects: "Screen-reader users and people who lose track of context.",
  },
  "media-autoplay": {
    title: "Media plays automatically",
    whatItMeans: "Audio or video starts on its own, which can be disorienting and hard to stop.",
    whoItAffects: "Screen-reader users and people with attention or anxiety conditions.",
  },
  "focus-ring-hidden": {
    title: "The keyboard focus outline is hidden",
    whatItMeans: "The highlight that shows where you are when using a keyboard has been removed.",
    whoItAffects: "Keyboard-only users and people who can't use a mouse.",
  },
  "document-link-no-type": {
    title: "Document links don't say the file type",
    whatItMeans: "Links to files like PDFs don't mention the format, so visitors don't know what they'll download.",
    whoItAffects: "Screen-reader users and people on limited connections.",
  },
};

const SEVERITY_ORDER: SeverityLevel[] = ["critical", "serious", "moderate", "minor"];

export function toPlainIssue(issue: AccessibilityIssue): PlainIssue {
  const entry = MAP[issue.id];
  if (entry) return { id: issue.id, impact: issue.impact, ...entry };
  // Safe generic fallback built from axe's own fields.
  const title = humanizeId(issue.id);
  return {
    id: issue.id,
    impact: issue.impact,
    title,
    whatItMeans: issue.help || issue.description || "This element doesn't meet a common accessibility guideline.",
    whoItAffects: "Visitors using assistive technology such as screen readers or keyboard navigation.",
  };
}

export function topPlainIssues(report: AccessibilityReport, n = 3): PlainIssue[] {
  const ordered: AccessibilityIssue[] = [];
  for (const sev of SEVERITY_ORDER) ordered.push(...report.issues[sev]);
  return ordered.slice(0, n).map(toPlainIssue);
}

/** "some-unknown-rule" -> "Some unknown rule" */
function humanizeId(id: string): string {
  const s = id.replace(/[-_]+/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}
```

- [ ] **Step 4: Run, verify GREEN** — same command → 3 passing.

- [ ] **Step 5: Commit** — `feat(scanner): curated plain-language mapping for issues`

---

### Task 3: Scans + consultation data layer (TDD mappers)

**Files:** Create `apps/web/lib/scans.ts`, `apps/web/lib/scans-mappers.ts`, `apps/web/lib/scans-mappers.test.ts`

**Interfaces:**
- Produces:
  - `interface ScanRecord { id: string; siteId: string; url: string; score: number; totals: IssueTotals; issues: AccessibilityReport["issues"]; createdAt: string }`
  - `scanRowToRecord(row): ScanRecord`
  - `saveScan(client, siteId, url, report): Promise<ScanRecord>`
  - `getLatestScan(client, siteId): Promise<ScanRecord | null>`
  - `createConsultationRequest(client, args: { siteId: string; scanId: string | null; type: "full_report" | "book_call"; note?: string }): Promise<void>`

- [ ] **Step 1: Failing test (`scans-mappers.test.ts`)**

```ts
import { describe, it, expect } from "vitest";
import { scanRowToRecord } from "./scans-mappers";

describe("scanRowToRecord", () => {
  it("maps a db row to a ScanRecord", () => {
    const row = {
      id: "sc1", site_id: "s1", url: "https://x.com", score: 80,
      totals: { critical: 0, serious: 1, moderate: 2, minor: 0, total: 3 },
      issues: { critical: [], serious: [], moderate: [], minor: [] },
      created_at: "2026-06-19T00:00:00Z",
    };
    expect(scanRowToRecord(row)).toEqual({
      id: "sc1", siteId: "s1", url: "https://x.com", score: 80,
      totals: row.totals, issues: row.issues, createdAt: "2026-06-19T00:00:00Z",
    });
  });
});
```

- [ ] **Step 2: RED** — `npx vitest run lib/scans-mappers.test.ts`

- [ ] **Step 3: Implement `scans-mappers.ts`**

```ts
import type { AccessibilityReport, IssueTotals } from "@/types";

export interface ScanRecord {
  id: string;
  siteId: string;
  url: string;
  score: number;
  totals: IssueTotals;
  issues: AccessibilityReport["issues"];
  createdAt: string;
}

export function scanRowToRecord(row: any): ScanRecord {
  return {
    id: row.id,
    siteId: row.site_id,
    url: row.url,
    score: row.score,
    totals: row.totals,
    issues: row.issues,
    createdAt: row.created_at,
  };
}
```

- [ ] **Step 4: GREEN**

- [ ] **Step 5: Implement `scans.ts`**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AccessibilityReport } from "@/types";
import { scanRowToRecord, type ScanRecord } from "./scans-mappers";

export type { ScanRecord };

export async function saveScan(
  client: SupabaseClient, siteId: string, url: string, report: AccessibilityReport
): Promise<ScanRecord> {
  const { data, error } = await client
    .from("scans")
    .insert({ site_id: siteId, url, score: report.score, totals: report.totals, issues: report.issues })
    .select("*")
    .single();
  if (error) throw error;
  return scanRowToRecord(data);
}

export async function getLatestScan(client: SupabaseClient, siteId: string): Promise<ScanRecord | null> {
  const { data, error } = await client
    .from("scans").select("*").eq("site_id", siteId)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return data ? scanRowToRecord(data) : null;
}

export async function createConsultationRequest(
  client: SupabaseClient,
  args: { siteId: string; scanId: string | null; type: "full_report" | "book_call"; note?: string }
): Promise<void> {
  const { error } = await client.from("consultation_requests").insert({
    site_id: args.siteId, scan_id: args.scanId, type: args.type, note: args.note ?? null,
  });
  if (error) throw error;
}
```

- [ ] **Step 6: Typecheck** — `npm run typecheck` clean.

- [ ] **Step 7: Commit** — `feat(scanner): scans + consultation data layer (tested mappers)`

---

### Task 4: Scan route (auto, recency-cached) + cron rescan

**Files:** Create `apps/web/lib/scan-runner.ts`, `apps/web/app/api/scan/route.ts`, `apps/web/app/api/cron/rescan/route.ts`, `apps/web/app/api/consultation/route.ts`

**Interfaces:**
- Consumes: `runScan` (`@/lib/scanner`), `buildReport` (`@/lib/scanner/report-builder`), `getServerSupabase`, `getAdminSupabase`, `getSite` (`@/lib/sites`), `saveScan`/`getLatestScan`/`createConsultationRequest` (`@/lib/scans`), `topPlainIssues` (`@/lib/scanner/plain-language`).
- Produces:
  - `runAndStoreScan(adminClient, siteId, domain): Promise<ScanRecord>` (`lib/scan-runner.ts`).
  - `POST /api/scan` body `{ siteId }`: owner-auth; returns `{ scanId, score, totals, plainTop3, createdAt }` (runs a fresh scan only if none exists or latest is > 7 days old, else returns the cached latest). Long-running → `runtime nodejs`, `maxDuration 60`.
  - `POST /api/consultation` body `{ siteId, type }`: owner-auth; creates a consultation request against the latest scan; returns `{ ok: true }`.
  - `GET /api/cron/rescan`: header-guarded (`x-cron-secret` === `process.env.CRON_SECRET`); rescans every site whose latest scan is missing/stale.

- [ ] **Step 1: `lib/scan-runner.ts`**

```ts
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { runScan } from "@/lib/scanner";
import { buildReport } from "@/lib/scanner/report-builder";
import { saveScan, type ScanRecord } from "@/lib/scans";

/** Runs a single-page scan for a site's domain and stores the result. */
export async function runAndStoreScan(
  client: SupabaseClient, siteId: string, domain: string
): Promise<ScanRecord> {
  const url = /^https?:\/\//i.test(domain) ? domain : `https://${domain}`;
  const raw = await runScan({ url, wcagLevel: "AA", timeoutMs: 30_000, scanInternalLinks: false });
  const report = buildReport(raw, url);
  return saveScan(client, siteId, url, report);
}
```

- [ ] **Step 2: `app/api/scan/route.ts`**

```ts
import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getSite } from "@/lib/sites";
import { getLatestScan } from "@/lib/scans";
import { runAndStoreScan } from "@/lib/scan-runner";
import { topPlainIssues } from "@/lib/scanner/plain-language";
import type { AccessibilityReport } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const STALE_MS = 7 * 24 * 60 * 60 * 1000;

export async function POST(req: Request) {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }
  const siteId = body?.siteId;
  if (!siteId) return NextResponse.json({ error: "siteId required" }, { status: 400 });

  const site = await getSite(supabase, siteId);
  if (!site || site.ownerId !== user.id) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  // Recency cache: reuse a recent scan, else run a fresh one (stored via service role).
  let scan = await getLatestScan(supabase, siteId);
  const fresh = scan && Date.now() - new Date(scan.createdAt).getTime() < STALE_MS;
  if (!fresh) {
    try {
      scan = await runAndStoreScan(getAdminSupabase(), siteId, site.domain);
    } catch (e: any) {
      return NextResponse.json({ error: e?.message ?? "scan failed", code: e?.code }, { status: 502 });
    }
  }
  const report = { issues: scan!.issues } as AccessibilityReport;
  return NextResponse.json({
    scanId: scan!.id,
    score: scan!.score,
    totals: scan!.totals,
    createdAt: scan!.createdAt,
    plainTop3: topPlainIssues(report, 3),
  });
}
```

- [ ] **Step 3: `app/api/consultation/route.ts`**

```ts
import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getSite } from "@/lib/sites";
import { getLatestScan, createConsultationRequest } from "@/lib/scans";

export async function POST(req: Request) {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }
  const siteId = body?.siteId;
  const type = body?.type === "book_call" ? "book_call" : "full_report";
  if (!siteId) return NextResponse.json({ error: "siteId required" }, { status: 400 });

  const site = await getSite(supabase, siteId);
  if (!site || site.ownerId !== user.id) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const latest = await getLatestScan(supabase, siteId);
  // RLS makes consultation_requests service-role only; insert with admin client AFTER ownership check.
  await createConsultationRequest(getAdminSupabase(), { siteId, scanId: latest?.id ?? null, type });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: `app/api/cron/rescan/route.ts`**

```ts
import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { runAndStoreScan } from "@/lib/scan-runner";

export const runtime = "nodejs";
export const maxDuration = 60;

const STALE_MS = 7 * 24 * 60 * 60 * 1000;

export async function GET(req: Request) {
  if (req.headers.get("x-cron-secret") !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const admin = getAdminSupabase();
  const { data: sites } = await admin.from("sites").select("id, domain");
  let scanned = 0;
  for (const s of sites ?? []) {
    const { data: latest } = await admin
      .from("scans").select("created_at").eq("site_id", s.id)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    const stale = !latest || Date.now() - new Date(latest.created_at).getTime() > STALE_MS;
    if (!stale) continue;
    try { await runAndStoreScan(admin, s.id, s.domain); scanned++; } catch { /* skip failures */ }
  }
  return NextResponse.json({ ok: true, scanned });
}
```

- [ ] **Step 5: Add `CRON_SECRET` to `.env.example`** (one line: `CRON_SECRET=choose-a-long-random-string`).

- [ ] **Step 6: Typecheck + build** — `cd apps/web && npm run typecheck && npm run build`; expect routes `/api/scan`, `/api/consultation`, `/api/cron/rescan`. Run the build in the FOREGROUND and wait for "Compiled successfully" (do not background and exit).

- [ ] **Step 7: Commit** — `feat(scanner): scan route (auto+cached), cron rescan, consultation request`

---

### Task 5: Client report UI (auto-loads scan, gated full report)

**Files:** Create `apps/web/components/ScanReport.tsx`; Modify `apps/web/app/dashboard/sites/[id]/page.tsx` (add the report section under the customizer).

**Interfaces:**
- Consumes: `POST /api/scan`, `POST /api/consultation`.
- Produces: a client component that on mount POSTs `/api/scan` `{ siteId }`, shows an "Analyzing your site…" state, then renders the score + top-3 plain issues + a "Get the full report / Book a call" CTA. After the CTA POSTs `/api/consultation`, it shows a confirmation and reveals the remaining issue count (the "full report" unlock).

- [ ] **Step 1: `components/ScanReport.tsx`**

```tsx
"use client";
import { useEffect, useState } from "react";

interface PlainIssue { id: string; impact: string | null; title: string; whatItMeans: string; whoItAffects: string }
interface ScanResult { scanId: string; score: number; totals: { critical: number; serious: number; moderate: number; minor: number; total: number }; createdAt: string; plainTop3: PlainIssue[] }

const SEV_COLOR: Record<string, string> = {
  critical: "text-red-600", serious: "text-orange-600", moderate: "text-yellow-600", minor: "text-neutral-500",
};

export function ScanReport({ siteId }: { siteId: string }) {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [data, setData] = useState<ScanResult | null>(null);
  const [requested, setRequested] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    let on = true;
    (async () => {
      try {
        const res = await fetch("/api/scan", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ siteId }) });
        if (!res.ok) throw new Error();
        const json = await res.json();
        if (on) { setData(json); setState("ready"); }
      } catch { if (on) setState("error"); }
    })();
    return () => { on = false; };
  }, [siteId]);

  async function requestFullReport() {
    setRequesting(true);
    await fetch("/api/consultation", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ siteId, type: "full_report" }) });
    setRequesting(false); setRequested(true);
  }

  if (state === "loading") return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <p className="text-sm text-neutral-500">Analyzing your site for accessibility issues…</p>
      <div className="mt-3 h-2 w-40 animate-pulse rounded bg-neutral-200" />
    </div>
  );
  if (state === "error" || !data) return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <p className="text-sm text-neutral-500">We couldn't analyze this site right now. We'll try again automatically.</p>
    </div>
  );

  const remaining = Math.max(0, data.totals.total - data.plainTop3.length);
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Accessibility report</h2>
        <div className="text-right">
          <div className="text-3xl font-bold">{data.score}<span className="text-base font-normal text-neutral-400">/100</span></div>
          <div className="text-xs text-neutral-500">{data.totals.total} issues found</div>
        </div>
      </div>

      <ul className="mt-5 space-y-4">
        {data.plainTop3.map((p) => (
          <li key={p.id} className="border-l-2 border-neutral-200 pl-4">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold uppercase ${SEV_COLOR[p.impact ?? "minor"] ?? "text-neutral-500"}`}>{p.impact ?? "minor"}</span>
              <span className="font-medium">{p.title}</span>
            </div>
            <p className="mt-1 text-sm text-neutral-600">{p.whatItMeans}</p>
            <p className="mt-0.5 text-xs text-neutral-400">Affects: {p.whoItAffects}</p>
          </li>
        ))}
      </ul>

      <div className="mt-6 rounded-xl bg-neutral-50 p-4 ring-1 ring-neutral-200">
        {!requested ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-neutral-600">
              {remaining > 0 ? `${remaining} more issue${remaining === 1 ? "" : "s"} found.` : "Want help fixing these?"} Get the full report and a walkthrough with our team.
            </p>
            <button onClick={requestFullReport} disabled={requesting}
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
              {requesting ? "Sending…" : "Get full report / Book a call"}
            </button>
          </div>
        ) : (
          <p className="text-sm text-green-700">Thanks — we've received your request and will reach out with the full report and next steps.</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add the report to the site page**

In `apps/web/app/dashboard/sites/[id]/page.tsx`, import `ScanReport` and render it below the `<ConfigEditor>` (inside the same root `div`, after the editor):
```tsx
import { ScanReport } from "@/components/ScanReport";
// …after <ConfigEditor .../>:
      <ScanReport siteId={site.id} />
```

- [ ] **Step 3: Typecheck + build** — foreground, wait for "Compiled successfully"; `/dashboard/sites/[id]` still builds.

- [ ] **Step 4: Commit** — `feat(scanner): client report UI with top-3 plain issues + consultation CTA`

---

## Self-Review

**Coverage:** plain-language ✔ (T2); scans/consultation data ✔ (T3); auto-scan with recency cache + cron + consultation ✔ (T4); client report with gated full report ✔ (T5); engine already ported+verified (T1). Auto-scan-on-load satisfies "no button, see result automatically". Cron handles refresh.

**Placeholders:** none — real code throughout.

**Type consistency:** `ScanRecord`, `PlainIssue`, `topPlainIssues`, `runAndStoreScan`, `saveScan`/`getLatestScan`/`createConsultationRequest` names are consistent T2→T5. Uses existing `getSite`/`getServerSupabase`/`getAdminSupabase`. `issues`/`totals` shapes match the engine's `AccessibilityReport` and the `scans` columns.
