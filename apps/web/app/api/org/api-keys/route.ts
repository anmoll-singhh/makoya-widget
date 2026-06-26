/**
 * /api/org/api-keys — org API key management.
 *
 *   GET    → list the caller's org keys (display fields only; never key_hash).
 *   POST   → mint a new key. Gated: owner/admin only (`canManageTeam`). Returns
 *            the raw key EXACTLY ONCE; only the hash + prefix are persisted.
 *   DELETE → revoke a key by id (body { id }). Gated: owner/admin only. The key
 *            is verified to belong to the caller's org before revocation so a
 *            member can't revoke another org's key.
 *
 * Authed: 401 no session; 404 no org; 403 insufficient role. Writes use
 * getAdminSupabase() AFTER the role check (these tables have no member write
 * policy this wave). Errors route through the observability seam → generic 500.
 */

import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getMembershipForUser, listApiKeys, createApiKey, revokeApiKey } from "@/lib/org";
import { canManageTeam } from "@/lib/roles";
import { captureError } from "@/lib/observability";
import { parseBody } from "@/lib/validation/api";
import { createApiKeyBodySchema, revokeApiKeyBodySchema } from "@/lib/validation/org";

export async function GET() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const membership = await getMembershipForUser(supabase, user.id);
    if (!membership) return NextResponse.json({ error: "not found" }, { status: 404 });
    const keys = await listApiKeys(supabase, membership.orgId);
    return NextResponse.json({ keys });
  } catch (err) {
    captureError(err, { route: "GET /api/org/api-keys", userId: user.id });
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const parsed = parseBody(createApiKeyBodySchema, json);
  if (!parsed.ok) return NextResponse.json({ error: "invalid request" }, { status: 400 });

  try {
    const membership = await getMembershipForUser(supabase, user.id);
    if (!membership) return NextResponse.json({ error: "not found" }, { status: 404 });
    if (!canManageTeam(membership.role)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const { record, rawKey } = await createApiKey(getAdminSupabase(), {
      orgId: membership.orgId,
      name: parsed.data.name,
      createdBy: user.id,
    });
    // rawKey shown ONCE; the client must store it now. Never logged, never re-fetchable.
    return NextResponse.json({ key: record, secret: rawKey }, { status: 201 });
  } catch (err) {
    captureError(err, { route: "POST /api/org/api-keys", userId: user.id });
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const parsed = parseBody(revokeApiKeyBodySchema, json);
  if (!parsed.ok) return NextResponse.json({ error: "invalid request" }, { status: 400 });

  try {
    const membership = await getMembershipForUser(supabase, user.id);
    if (!membership) return NextResponse.json({ error: "not found" }, { status: 404 });
    if (!canManageTeam(membership.role)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    // Ensure the target key belongs to the caller's org before revoking (the
    // RLS member-read policy already scopes this list to the caller's org).
    const keys = await listApiKeys(supabase, membership.orgId);
    if (!keys.some((k) => k.id === parsed.data.id)) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    await revokeApiKey(getAdminSupabase(), parsed.data.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    captureError(err, { route: "DELETE /api/org/api-keys", userId: user.id });
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
