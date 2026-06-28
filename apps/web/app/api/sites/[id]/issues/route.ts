/**
 * /api/sites/[id]/issues — AUTHED, owner-only access to a site's tracked
 * accessibility issues (the v3.1 Audit/Issues screen).
 *
 *  - GET   → issues grouped by status ({ failing, needs_review, passing }).
 *            Each issue now includes rich plain-language detail fields:
 *            `whatItMeans`, `whoItAffects`, `disabilityGroups`, `howToFix`,
 *            `measuredEvidence`, `codeSnippet`. These are sourced from the latest
 *            stored scan's JSONB (which carries fields set by the plain-language
 *            mapper at scan time). If the latest scan doesn't contain the rule
 *            (e.g. the issue was resolved before the latest scan), we fall back
 *            to the curated MAP in lib/scanner/plain-language.ts.
 *  - PATCH → set an issue's status and/or assignee.
 *
 * Auth + ownership mirror /api/sites/[id]/analytics: 401 with no session; 404
 * when the site doesn't exist or isn't the caller's (RLS already scopes the read,
 * the ownership check just turns a not-found into a clean 404 and avoids
 * confirming foreign site ids). The PATCH body is validated with Zod via
 * `parseBody`, which DROPS field-level detail → a generic 400. The targeted issue
 * is confirmed to belong to THIS site (and, via RLS, the caller) before any write;
 * a foreign/missing issue is a clean 404. DB errors never reach the client — they
 * route through the `captureError` observability seam as a generic 500.
 *
 * Side effect: when a PATCH actually TRANSITIONS an issue into `passing` (the
 * previous status, read alongside the ownership check via `getIssueMeta`, was NOT
 * already `passing`), the route appends a `remediation_log` + `activity_log` entry
 * via the SERVICE-ROLE client (those tables are service-role-write). This logging
 * is BEST-EFFORT and fully swallowed: a logging failure must never change the
 * PATCH's success/error contract, because the issue update has already committed.
 */
import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getSite } from "@/lib/sites";
import { listIssues, updateIssue, getIssueMeta, shouldLogResolve } from "@/lib/issues";
import type { IssueRecord } from "@/lib/issues";
import { getLatestScan } from "@/lib/scans";
import { toPlainIssue } from "@/lib/scanner/plain-language";
import type { AccessibilityIssue } from "@/types";
import { logRemediation } from "@/lib/remediation";
import { logActivity } from "@/lib/activity";
import { parseBody } from "@/lib/validation/api";
import { issuePatchBodySchema } from "@/lib/validation/issues";
import { captureError } from "@/lib/observability";

/** The rich per-issue shape returned by GET — extends the tracker record with
 *  plain-language explanation fields sourced from the latest scan or the curated
 *  rule MAP. codeSnippet is the first offending node's html if the scanner
 *  captured it; absent gracefully when unavailable. */
interface EnrichedIssueRecord extends IssueRecord {
  whatItMeans: string | null;
  whoItAffects: string | null;
  disabilityGroups: string[];
  howToFix: string | null;
  measuredEvidence: string | null;
  /** First offending DOM node html from the scanner, or null if unavailable. */
  codeSnippet: string | null;
}

const SEVERITY_BUCKETS = ["critical", "serious", "moderate", "minor"] as const;

/**
 * Enrich one IssueRecord with plain-language detail.
 * Primary source: the AccessibilityIssue stored in the latest scan (which has
 * `whyItMatters`, `whoItAffects`, `howToFix`, `disabilityGroups`, and
 * `measuredEvidence` set by the plain-language mapper at scan-ingest time).
 * Fallback: the curated MAP in lib/scanner/plain-language.ts (no scan needed).
 * The code snippet comes from `nodes[0].html` on the stored scan issue.
 */
function enrichIssue(
  rec: IssueRecord,
  scanMap: Map<string, AccessibilityIssue>,
): EnrichedIssueRecord {
  const stored = scanMap.get(rec.ruleId);

  let whatItMeans: string | null = stored?.whyItMatters ?? null;
  let whoItAffects: string | null = stored?.whoItAffects ?? null;
  let disabilityGroups: string[] = (stored?.disabilityGroups ?? []) as string[];
  let howToFix: string | null = stored?.howToFix ?? null;
  const measuredEvidence: string | null = stored?.measuredEvidence ?? null;
  const codeSnippet: string | null = stored?.nodes?.[0]?.html ?? null;

  // Fallback to the curated MAP when the stored scan didn't carry plain-language
  // fields (pre-v2 scans) or the rule isn't in the latest scan (resolved issues).
  if (!whatItMeans) {
    const plain = toPlainIssue({
      id: rec.ruleId,
      description: rec.title,
      help: rec.title,
      impact: null,
      tags: [],
      helpUrl: "",
      nodes: [],
    } as AccessibilityIssue);
    whatItMeans = plain.whatItMeans;
    whoItAffects = plain.whoItAffects;
    disabilityGroups = plain.disabilityGroups as string[];
    howToFix = plain.howToFix ?? null;
  }

  return {
    ...rec,
    whatItMeans,
    whoItAffects,
    disabilityGroups,
    howToFix,
    measuredEvidence,
    codeSnippet,
  };
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const site = await getSite(supabase, id);
  if (!site || site.ownerId !== user.id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  try {
    // Fetch the tracker issues and the latest scan in parallel. The scan is best-effort:
    // a scan-fetch failure should never degrade the issues response — we fall back to
    // MAP-derived plain-language in that case (via enrichIssue's fallback branch).
    const [grouped, scan] = await Promise.all([
      listIssues(supabase, id),
      getLatestScan(supabase, id).catch(() => null),
    ]);

    // Build a ruleId → stored AccessibilityIssue map from the latest scan's JSONB.
    // The JSONB buckets are typed as AccessibilityReport["issues"]; each entry may
    // carry whyItMatters/whoItAffects/howToFix/disabilityGroups from scan ingest.
    const scanMap = new Map<string, AccessibilityIssue>();
    if (scan?.issues) {
      for (const bucket of SEVERITY_BUCKETS) {
        for (const si of scan.issues[bucket] ?? []) {
          if (si?.id) scanMap.set(si.id, si as AccessibilityIssue);
        }
      }
    }

    return NextResponse.json({
      failing: grouped.failing.map((r) => enrichIssue(r, scanMap)),
      needs_review: grouped.needs_review.map((r) => enrichIssue(r, scanMap)),
      passing: grouped.passing.map((r) => enrichIssue(r, scanMap)),
    });
  } catch (e) {
    captureError(e, { route: "sites/[id]/issues#GET" });
    return NextResponse.json({ error: "failed to load issues" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const site = await getSite(supabase, id);
  if (!site || site.ownerId !== user.id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const parsed = parseBody(issuePatchBodySchema, json);
  if (!parsed.ok) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  try {
    // Confirm the issue belongs to THIS site AND capture its PREVIOUS status in
    // one read (RLS already scopes to the caller's own sites — a foreign/missing
    // issue reads as null → 404). The previous status gates the resolve log below.
    const meta = await getIssueMeta(supabase, parsed.data.issueId);
    if (!meta || meta.siteId !== id) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    await updateIssue(supabase, parsed.data.issueId, {
      status: parsed.data.status,
      assigneeId: parsed.data.assigneeId,
    });

    // Best-effort: when an owner actually TRANSITIONS an issue into `passing`,
    // record it in the remediation + activity logs (these feed the monthly
    // "issues resolved" metric and the Overview activity feed). Those tables are
    // service-role-write, so we use the admin client. A logging failure must
    // NEVER turn a successful issue update into a 500 — the update already
    // committed — so we SWALLOW any error through the observability seam.
    if (shouldLogResolve(meta.status, parsed.data.status)) {
      try {
        const admin = getAdminSupabase();
        await logRemediation(admin, {
          siteId: id,
          issueId: parsed.data.issueId,
          action: "Marked resolved by owner",
        });
        await logActivity(admin, {
          siteId: id,
          type: "issue_resolved",
          summary: "Issue resolved",
        });
      } catch (logErr) {
        captureError(logErr, { route: "sites/[id]/issues#PATCH:resolve-log" });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    captureError(e, { route: "sites/[id]/issues#PATCH" });
    return NextResponse.json({ error: "failed to update issue" }, { status: 500 });
  }
}
