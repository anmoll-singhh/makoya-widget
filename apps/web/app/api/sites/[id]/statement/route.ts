/**
 * /api/sites/[id]/statement — AUTHED, owner-only access to a site's accessibility
 * statement (the v3.1 Statement screen).
 *
 *  - GET  → the current statement, or 200 with `null` when none exists yet.
 *  - POST → generate + upsert the statement from the submitted inputs, returning
 *           the full record (including the generated html).
 *
 * Auth + ownership mirror /api/sites/[id]/issues: 401 with no session; 404 when
 * the site doesn't exist or isn't the caller's (RLS already scopes the read; the
 * ownership check just turns a not-found into a clean 404 and avoids confirming
 * foreign site ids). The POST body is validated with Zod via `parseBody`, which
 * DROPS field-level detail → a generic 400. DB errors never reach the client —
 * they route through the `captureError` observability seam as a generic 500.
 *
 * Compliance: the generated html only ever describes a commitment + a conformance
 * target (see lib/statement.ts) — never a certification claim.
 */
import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getSite } from "@/lib/sites";
import { getStatement, upsertStatement } from "@/lib/statement";
import { parseBody } from "@/lib/validation/api";
import { statementBodySchema } from "@/lib/validation/statement";
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
    const statement = await getStatement(supabase, id);
    return NextResponse.json(statement);
  } catch (e) {
    captureError(e, { route: "sites/[id]/statement#GET" });
    return NextResponse.json({ error: "failed to load statement" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
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
  const parsed = parseBody(statementBodySchema, json);
  if (!parsed.ok) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  try {
    const statement = await upsertStatement(supabase, id, parsed.data);
    return NextResponse.json(statement);
  } catch (e) {
    captureError(e, { route: "sites/[id]/statement#POST" });
    return NextResponse.json({ error: "failed to save statement" }, { status: 500 });
  }
}
