/**
 * /api/sites/[id]/issues — AUTHED, owner-only access to a site's tracked
 * accessibility issues (the v3.1 Audit/Issues screen).
 *
 *  - GET   → issues grouped by status ({ failing, needs_review, passing }).
 *            Each issue includes rich plain-language detail fields:
 *            `whatItMeans`, `whoItAffects`, `disabilityGroups`, `howToFix`,
 *            `measuredEvidence`, `codeSnippet` (first offending node html),
 *            `codeSelector` (first offending node CSS selector path).
 *            These are sourced from the latest stored scan's JSONB (which carries
 *            fields set by the plain-language mapper at scan time), falling back
 *            to the curated MAP in lib/scanner/plain-language.ts for pre-v2 scans
 *            or resolved issues no longer in the latest scan.
 *  - PATCH → set an issue's status and/or assignee.
 *
 * Auth + ownership: 401 with no session; 404 when the site doesn't exist or
 * isn't the caller's (RLS already scopes the read). The PATCH body is validated
 * with Zod via `parseBody` → generic 400 on failure. The targeted issue is
 * confirmed to belong to THIS site before any write; a foreign/missing issue is
 * a clean 404. DB errors never reach the client — they route through the
 * `captureError` observability seam as a generic 500.
 *
 * Side effect: when a PATCH actually TRANSITIONS an issue into `passing`, the
 * route appends a `remediation_log` + `activity_log` entry via the SERVICE-ROLE
 * client (those tables are service-role-write). This logging is BEST-EFFORT and
 * fully swallowed: a logging failure must never change the PATCH success/error
 * contract, because the issue update has already committed.
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
 *  rule MAP.
 *  - codeSnippet: first offending DOM node html if the scanner captured it.
 *  - codeSelector: joined CSS selector path (nodes[0].target) for the same node,
 *    enabling the Mike UI to show "selector → html" for easy grepping.
 *  Both fields are null when the scanner did not capture node evidence. */
interface EnrichedIssueRecord extends IssueRecord {
  whatItMeans: string | null;
  whoItAffects: string | null;
  disabilityGroups: string[];
  howToFix: string | null;
  measuredEvidence: string | null;
  /** First offending DOM node outer-html, or null if unavailable. */
  codeSnippet: string | null;
  /** CSS selector path (nodes[0].target joined with " > ") for the first
   *  offending node, or null when the scanner did not capture it. */
  codeSelector: string | null;
}

const SEVERITY_BUCKETS = ["critical", "serious", "moderate", "minor"] as const;

/**
 * Enrich one IssueRecord with plain-language detail.
 * Primary source: the AccessibilityIssue stored in the latest scan (which has
 * `whyItMatters`, `whoItAffects`, `howToFix`, `disabilityGroups`, and
 * `measuredEvidence` set by the plain-language mapper at scan-ingest time).
 * Fallback: the curated MAP in lib/scanner/plain-language.ts (no scan needed).
 * The code snippet comes from `nodes[0].html` and selector from `nodes[0].target`.
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
  // Selector: join the target array to a readable CSS path (e.g. "html > body > main > button")
  const rawTarget = stored?.nodes?.[0]?.target;
  const codeSelector: string | null =
    Array.isArray(rawTarget) && rawTarget.length > 0
      ? (rawTarget as string[]).join(" > ")
      : null;

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
    codeSelector,
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
    // record it in the remediation + activity logs. A logging failure must
    // NEVER turn a successful issue update into a 500.
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
