/**
 * lib/partner.ts — data layer for the Partner / agency (white-label) program
 * (Wave 5B, v3.1 Partners screen).
 *
 * Mirrors the existing data-layer discipline (see lib/org.ts, lib/sites.ts):
 *   • every function takes a SupabaseClient (caller decides cookie-bound vs
 *     service-role) — no client is constructed here,
 *   • a Supabase `error` is an INFRA failure → throw; simply no row → null,
 *   • columns are snake_case and converted to camelCase by pure mappers.
 *
 * RLS shape (see supabase/migrations/20260626220000_partners.sql): the partner
 * tables have member READ policies that reuse `private.is_org_member` on the
 * partner's org, and NO write policy. So the READS below are safe with a
 * cookie-bound client (RLS scopes them to the caller's own partner), while the
 * WRITES must use the service-role client and are only ever called by routes
 * AFTER they have resolved the caller's org + role and derived the partner from
 * that org (never from request input).
 *
 * Honesty / guardrail: white-label here is cosmetic branding only. Nothing in
 * this layer asserts any WCAG/ADA "compliance" or "guarantee".
 */

import type { SupabaseClient } from "@supabase/supabase-js";

// ── Records (camelCase) ───────────────────────────────────────────────────────

export type PartnerStatus = "active" | "suspended";
export type CommissionStatus = "pending" | "paid";

export interface PartnerAccount {
  id: string;
  orgId: string;
  status: PartnerStatus;
  /** Fraction 0..1 (e.g. 0.2 = 20%). Stored as numeric(5,4); coerced to number. */
  commissionRate: number;
  whiteLabelEnabled: boolean;
  createdAt: string;
}

export interface PartnerClient {
  id: string;
  partnerId: string;
  clientOrgId: string;
  createdAt: string;
}

export interface WhiteLabelConfig {
  partnerId: string;
  brandName: string;
  logoUrl: string;
  primaryColor: string;
  supportEmail: string;
  hideMakoyaBranding: boolean;
  updatedAt: string;
}

export interface PartnerCommission {
  id: string;
  partnerId: string;
  /** Billing period bucket, 'YYYY-MM'. */
  period: string;
  amountCents: number;
  status: CommissionStatus;
  createdAt: string;
}

/** A patch of the white-label branding fields (all optional). */
export type WhiteLabelPatch = Partial<{
  brandName: string;
  logoUrl: string;
  primaryColor: string;
  supportEmail: string;
  hideMakoyaBranding: boolean;
}>;

// ── Pure mappers ──────────────────────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */
export function partnerAccountRowToRecord(r: any): PartnerAccount {
  return {
    id: r.id,
    orgId: r.org_id,
    status: r.status as PartnerStatus,
    // numeric(5,4) comes back as a string from PostgREST — coerce to number.
    commissionRate: Number(r.commission_rate ?? 0),
    whiteLabelEnabled: Boolean(r.white_label_enabled),
    createdAt: r.created_at,
  };
}

export function partnerClientRowToRecord(r: any): PartnerClient {
  return {
    id: r.id,
    partnerId: r.partner_id,
    clientOrgId: r.client_org_id,
    createdAt: r.created_at,
  };
}

export function whiteLabelRowToRecord(r: any): WhiteLabelConfig {
  return {
    partnerId: r.partner_id,
    brandName: r.brand_name ?? "",
    logoUrl: r.logo_url ?? "",
    primaryColor: r.primary_color ?? "",
    supportEmail: r.support_email ?? "",
    hideMakoyaBranding: Boolean(r.hide_makoya_branding),
    updatedAt: r.updated_at,
  };
}

export function commissionRowToRecord(r: any): PartnerCommission {
  return {
    id: r.id,
    partnerId: r.partner_id,
    period: r.period,
    amountCents: Number(r.amount_cents ?? 0),
    status: r.status as CommissionStatus,
    createdAt: r.created_at,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ── Pure helpers (the Partners dashboard math) ────────────────────────────────

/**
 * The recurring commission (in whole cents) a partner earns on a client's plan,
 * given the plan price and the partner's rate. Rate is clamped to 0..1 and the
 * result is floored to whole cents. Non-finite / negative inputs collapse to 0
 * so a bad rate or price can never produce a nonsense (or negative) payout.
 */
export function commissionFor(planPriceCents: number, rate: number): number {
  const price = Number.isFinite(planPriceCents) ? Math.max(0, planPriceCents) : 0;
  const r = Number.isFinite(rate) ? Math.min(1, Math.max(0, rate)) : 0;
  return Math.floor(price * r);
}

/** One client's contribution to the partner's dashboard totals. */
export interface PartnerClientSummary {
  /** Team members (agents) in this client org. */
  agents: number;
  /** Commission earned from this client for the current month, in cents. */
  monthlyRevenueCents: number;
}

/**
 * Aggregate a partner's client portfolio into the three Partners dashboard
 * cards: how many clients, how many agents managed across them, and total
 * monthly recurring revenue. Each part is defensively floored at 0 so a stray
 * NaN / negative / Infinity can't corrupt a headline number.
 */
export function summarizePartner(parts: PartnerClientSummary[]): {
  clientCount: number;
  agentsManaged: number;
  monthlyRevenueCents: number;
} {
  const safe = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);
  let agentsManaged = 0;
  let monthlyRevenueCents = 0;
  for (const p of parts) {
    agentsManaged += Math.floor(safe(p.agents));
    monthlyRevenueCents += Math.floor(safe(p.monthlyRevenueCents));
  }
  return { clientCount: parts.length, agentsManaged, monthlyRevenueCents };
}

// ── Reads (cookie client, RLS-scoped) ─────────────────────────────────────────

/** The partner account for an org, or null if the org isn't a partner. Throws on infra error. */
export async function getPartnerForOrg(
  client: SupabaseClient,
  orgId: string
): Promise<PartnerAccount | null> {
  const { data, error } = await client
    .from("partner_accounts")
    .select("*")
    .eq("org_id", orgId)
    .maybeSingle();
  if (error) throw error;
  return data ? partnerAccountRowToRecord(data) : null;
}

/** All client orgs managed by a partner, oldest first. Throws on infra error. */
export async function listPartnerClients(
  client: SupabaseClient,
  partnerId: string
): Promise<PartnerClient[]> {
  const { data, error } = await client
    .from("partner_clients")
    .select("*")
    .eq("partner_id", partnerId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(partnerClientRowToRecord);
}

/** A partner's white-label config, or null if none set yet. Throws on infra error. */
export async function getWhiteLabel(
  client: SupabaseClient,
  partnerId: string
): Promise<WhiteLabelConfig | null> {
  const { data, error } = await client
    .from("white_label_config")
    .select("*")
    .eq("partner_id", partnerId)
    .maybeSingle();
  if (error) throw error;
  return data ? whiteLabelRowToRecord(data) : null;
}

/** A partner's commissions, newest first. Throws on infra error. */
export async function listCommissions(
  client: SupabaseClient,
  partnerId: string
): Promise<PartnerCommission[]> {
  const { data, error } = await client
    .from("partner_commissions")
    .select("*")
    .eq("partner_id", partnerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(commissionRowToRecord);
}

// ── Writes (service-role) ─────────────────────────────────────────────────────

/** Enroll an org as a partner (defaults: active, 20% rate). Throws on infra error. */
export async function enrollPartner(
  service: SupabaseClient,
  orgId: string
): Promise<PartnerAccount> {
  const { data, error } = await service
    .from("partner_accounts")
    .insert({ org_id: orgId })
    .select("*")
    .single();
  if (error) throw error;
  return partnerAccountRowToRecord(data);
}

/** Link a client org to a partner. Throws on infra error. */
export async function addPartnerClient(
  service: SupabaseClient,
  partnerId: string,
  clientOrgId: string
): Promise<PartnerClient> {
  const { data, error } = await service
    .from("partner_clients")
    .insert({ partner_id: partnerId, client_org_id: clientOrgId })
    .select("*")
    .single();
  if (error) throw error;
  return partnerClientRowToRecord(data);
}

/**
 * Upsert a partner's white-label config. Only the fields present in `patch` are
 * written (mapped to snake_case); `updated_at` is always refreshed. Upserts on
 * the partner_id primary key so first-write inserts and later writes update.
 */
export async function upsertWhiteLabel(
  service: SupabaseClient,
  partnerId: string,
  patch: WhiteLabelPatch
): Promise<WhiteLabelConfig> {
  const row: Record<string, unknown> = {
    partner_id: partnerId,
    updated_at: new Date().toISOString(),
  };
  if (patch.brandName !== undefined) row.brand_name = patch.brandName;
  if (patch.logoUrl !== undefined) row.logo_url = patch.logoUrl;
  if (patch.primaryColor !== undefined) row.primary_color = patch.primaryColor;
  if (patch.supportEmail !== undefined) row.support_email = patch.supportEmail;
  if (patch.hideMakoyaBranding !== undefined) row.hide_makoya_branding = patch.hideMakoyaBranding;

  const { data, error } = await service
    .from("white_label_config")
    .upsert(row as never, { onConflict: "partner_id" })
    .select("*")
    .single();
  if (error) throw error;
  return whiteLabelRowToRecord(data);
}

/**
 * Record (or update) a partner's commission for a billing period. Upserts on
 * (partner_id, period) so re-recording a period overwrites rather than dupes.
 * Throws on infra error.
 */
export async function recordCommission(
  service: SupabaseClient,
  args: { partnerId: string; period: string; amountCents: number }
): Promise<PartnerCommission> {
  const { data, error } = await service
    .from("partner_commissions")
    .upsert(
      { partner_id: args.partnerId, period: args.period, amount_cents: args.amountCents } as never,
      { onConflict: "partner_id,period" }
    )
    .select("*")
    .single();
  if (error) throw error;
  return commissionRowToRecord(data);
}
