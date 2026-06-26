/**
 * lib/org.ts — data layer for the org/team/API-key tenancy model (Wave 3).
 *
 * Mirrors the existing data-layer discipline (see lib/sites.ts, lib/leads.ts):
 *   • every function takes a SupabaseClient (caller decides cookie-bound vs
 *     service-role) — no client is constructed here,
 *   • a Supabase `error` is an INFRA failure → throw; simply no row → null,
 *   • columns are snake_case and converted to camelCase by pure mappers.
 *
 * SECRET-SHAPING IS LOAD-BEARING. Two columns are secrets-at-rest and must NEVER
 * leave this layer: `team_invites.token_hash` and `api_keys.key_hash`. The
 * mappers below deliberately omit them, so an accidental `JSON.stringify(record)`
 * in a route can't leak them. Raw secrets exist only transiently in the create
 * helpers' return value, to be shown to the user exactly once.
 *
 * Writes (createInvite / createApiKey / revokeApiKey) are SERVICE-ROLE this wave:
 * team_members / team_invites / api_keys have RLS read policies for members but
 * NO write policy, so the routes call these with getAdminSupabase() only AFTER
 * resolving the caller's org + role and checking it.
 */

import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { hashApiKey, generateApiKey } from "./api-keys";
import type { Role } from "./roles";

// ── Records (camelCase; secrets intentionally absent) ─────────────────────────

export interface Organization {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
}

export interface TeamMember {
  id: string;
  orgId: string;
  /** Null until the invited user has accepted and been linked to an auth user. */
  userId: string | null;
  email: string;
  role: Role;
  createdAt: string;
}

/** A pending invite. NEVER carries token_hash. */
export interface TeamInvite {
  id: string;
  orgId: string;
  email: string;
  role: Role;
  invitedBy: string | null;
  acceptedAt: string | null;
  createdAt: string;
}

/** An API key's display record. NEVER carries key_hash; prefix is for display. */
export interface ApiKeyRecord {
  id: string;
  orgId: string;
  name: string;
  prefix: string;
  createdBy: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

// ── Pure mappers ──────────────────────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */
export function orgRowToRecord(r: any): Organization {
  return { id: r.id, name: r.name, createdBy: r.created_by, createdAt: r.created_at };
}

export function teamMemberRowToRecord(r: any): TeamMember {
  return {
    id: r.id,
    orgId: r.org_id,
    userId: r.user_id ?? null,
    email: r.email,
    role: r.role as Role,
    createdAt: r.created_at,
  };
}

/** Maps an invite row, dropping `token_hash` so the secret can never leak out. */
export function inviteRowToRecord(r: any): TeamInvite {
  return {
    id: r.id,
    orgId: r.org_id,
    email: r.email,
    role: r.role as Role,
    invitedBy: r.invited_by ?? null,
    acceptedAt: r.accepted_at ?? null,
    createdAt: r.created_at,
  };
}

/** Maps an api_keys row, dropping `key_hash` so the secret can never leak out. */
export function apiKeyRowToRecord(r: any): ApiKeyRecord {
  return {
    id: r.id,
    orgId: r.org_id,
    name: r.name,
    prefix: r.prefix,
    createdBy: r.created_by ?? null,
    lastUsedAt: r.last_used_at ?? null,
    revokedAt: r.revoked_at ?? null,
    createdAt: r.created_at,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ── Reads ─────────────────────────────────────────────────────────────────────

/**
 * Resolve the caller's membership (orgId + role) from their team_members row.
 * Returns null when the user belongs to no org. Throws on an infra error.
 * A user has at most one membership in this wave (one org per owner).
 */
export async function getMembershipForUser(
  client: SupabaseClient,
  userId: string
): Promise<{ orgId: string; role: Role } | null> {
  const { data, error } = await client
    .from("team_members")
    .select("org_id, role")
    .eq("user_id", userId)
    // Deterministic pick (review L2): one membership per user holds today, but
    // order by created_at so the authorization basis can't flip if a second
    // membership ever appears (accepted invites in a later wave).
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { orgId: data.org_id, role: data.role as Role };
}

/** The user's organization, or null if they belong to none. Throws on infra error. */
export async function getOrgForUser(
  client: SupabaseClient,
  userId: string
): Promise<Organization | null> {
  const membership = await getMembershipForUser(client, userId);
  if (!membership) return null;
  const { data, error } = await client
    .from("organizations")
    .select("*")
    .eq("id", membership.orgId)
    .maybeSingle();
  if (error) throw error;
  return data ? orgRowToRecord(data) : null;
}

/** All members of an org, oldest first. Throws on infra error. */
export async function listTeam(client: SupabaseClient, orgId: string): Promise<TeamMember[]> {
  const { data, error } = await client
    .from("team_members")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(teamMemberRowToRecord);
}

/** All API keys for an org, newest first. Never includes key_hash. Throws on infra error. */
export async function listApiKeys(client: SupabaseClient, orgId: string): Promise<ApiKeyRecord[]> {
  const { data, error } = await client
    .from("api_keys")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(apiKeyRowToRecord);
}

// ── Writes (service-role) ─────────────────────────────────────────────────────

/**
 * Create a pending invite. Generates a random token, stores ONLY its hash, and
 * returns the raw token exactly once so the route can include it in the invite
 * link/email. The raw token is never persisted or logged.
 */
export async function createInvite(
  service: SupabaseClient,
  args: { orgId: string; email: string; role: Role; invitedBy: string | null }
): Promise<{ invite: TeamInvite; rawToken: string }> {
  const rawToken = randomBytes(32).toString("base64url");
  const { data, error } = await service
    .from("team_invites")
    .insert({
      org_id: args.orgId,
      email: args.email,
      role: args.role,
      token_hash: hashApiKey(rawToken),
      invited_by: args.invitedBy,
    })
    .select("*")
    .single();
  if (error) throw error;
  return { invite: inviteRowToRecord(data), rawToken };
}

/**
 * Mint an API key. Stores hash + prefix only; returns the raw key exactly once so
 * the route can show it to the user. The raw key is never persisted or logged.
 */
export async function createApiKey(
  service: SupabaseClient,
  args: { orgId: string; name: string; createdBy: string | null }
): Promise<{ record: ApiKeyRecord; rawKey: string }> {
  const { raw, prefix, hash } = generateApiKey();
  const { data, error } = await service
    .from("api_keys")
    .insert({
      org_id: args.orgId,
      name: args.name,
      key_hash: hash,
      prefix,
      created_by: args.createdBy,
    })
    .select("*")
    .single();
  if (error) throw error;
  return { record: apiKeyRowToRecord(data), rawKey: raw };
}

/** Revoke an API key by id (soft delete via revoked_at). Throws on infra error. */
export async function revokeApiKey(service: SupabaseClient, keyId: string): Promise<void> {
  const { error } = await service
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", keyId);
  if (error) throw error;
}

// ── Invite acceptance ─────────────────────────────────────────────────────────

/**
 * Case-insensitive email equality (PURE). Trims surrounding whitespace and
 * lowercases both sides. Empty/blank inputs never match — an invite issued for a
 * specific address must not be satisfiable by a blank/absent caller email.
 */
export function emailsEqualCI(a: string, b: string): boolean {
  const x = (a ?? "").trim().toLowerCase();
  const y = (b ?? "").trim().toLowerCase();
  if (!x || !y) return false;
  return x === y;
}

/**
 * Accept a team invite by its raw token, binding the invited address to the
 * authenticated user and consuming the invite.
 *
 * Security: the token alone is NOT sufficient. The invite was issued for a
 * specific email, so we require the caller's verified email to match it
 * (case-insensitively) — otherwise possessing a leaked/forwarded token would let
 * an arbitrary account join the org. We also only ever act on an UN-accepted
 * invite (single-use): the lookup filters `accepted_at is null`, so a replayed
 * token finds no row.
 *
 * Returns a result UNION rather than throwing for the expected "no"s
 * (invalid token, email mismatch) so the route can map them to one generic 400
 * without leaking which check failed. Only a genuine Supabase/infra error throws.
 *
 * SERVICE-ROLE: team_invites / team_members have no member WRITE policy, so this
 * is called with getAdminSupabase() AFTER the route has authenticated the user.
 */
export async function acceptInvite(
  service: SupabaseClient,
  rawToken: string,
  user: { id: string; email: string }
): Promise<{ ok: boolean; reason?: string; orgId?: string }> {
  const tokenHash = hashApiKey(rawToken);

  // Look up the single un-accepted invite with this token hash. A bad token OR a
  // previously-accepted invite both surface as "no row" (single-use guarantee).
  const { data: row, error: findErr } = await service
    .from("team_invites")
    .select("*")
    .eq("token_hash", tokenHash)
    .is("accepted_at", null)
    .maybeSingle();
  if (findErr) throw findErr;
  if (!row) return { ok: false, reason: "invalid" };

  const invite = inviteRowToRecord(row);

  // The invite is bound to a specific address; the caller must own that address.
  if (!emailsEqualCI(invite.email, user.email)) {
    return { ok: false, reason: "email_mismatch" };
  }

  // Upsert the membership on (org_id, email): a placeholder invite-email row (if
  // one exists) is rebound to the real auth user; otherwise a fresh row is added.
  const { error: memberErr } = await service.from("team_members").upsert(
    {
      org_id: invite.orgId,
      user_id: user.id,
      email: invite.email,
      role: invite.role,
    } as never,
    { onConflict: "org_id,email" }
  );
  if (memberErr) throw memberErr;

  // Consume the invite so the token can never be replayed.
  const { error: markErr } = await service
    .from("team_invites")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invite.id);
  if (markErr) throw markErr;

  return { ok: true, orgId: invite.orgId };
}
