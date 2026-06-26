/**
 * /api/sites/[id]/issues — AUTHED, owner-only access to a site's tracked
 * accessibility issues (the v3.1 Audit/Issues screen).
 *
 *  - GET   → issues grouped by status ({ failing, needs_review, passing }).
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
import { logRemediation } from "@/lib/remediation";
import { logActivity } from "@/lib/activity";
import { parseBody } from "@/lib/validation/api";
import { issuePatchBodySchema } from "@/lib/validation/issues";
import { captureError } from "@/lib/observability";

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
    const issues = await listIssues(supabase, id);
    return NextResponse.json(issues);
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
