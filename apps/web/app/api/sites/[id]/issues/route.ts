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
 */
import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getSite } from "@/lib/sites";
import { listIssues, updateIssue, getIssueSiteId } from "@/lib/issues";
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
    // Confirm the issue belongs to THIS site (RLS already scopes the read to the
    // caller's own sites — a foreign/missing issue reads as null → 404).
    const issueSiteId = await getIssueSiteId(supabase, parsed.data.issueId);
    if (issueSiteId !== id) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    await updateIssue(supabase, parsed.data.issueId, {
      status: parsed.data.status,
      assigneeId: parsed.data.assigneeId,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    captureError(e, { route: "sites/[id]/issues#PATCH" });
    return NextResponse.json({ error: "failed to update issue" }, { status: 500 });
  }
}
