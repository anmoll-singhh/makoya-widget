/**
 * lib/leads.ts — data layer for funnel leads (service-role only).
 *
 * The `leads` table has RLS enabled with no policy, so EVERY function here must
 * be called with the service-role client (getAdminSupabase()) from server code
 * that has already done its own validation/authorization. Never expose these to
 * a browser client.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type LeadStatus = "new" | "contacted" | "qualified" | "won" | "lost";

export interface LeadTotals {
  critical: number;
  serious: number;
  moderate: number;
  minor: number;
  total?: number;
}

export interface Lead {
  id: string;
  email: string;
  url: string;
  score: number | null;
  totals: LeadTotals;
  status: LeadStatus;
  source: string;
  createdAt: string;
}

export interface NewLead {
  email: string;
  url: string;
  score: number | null;
  totals: LeadTotals;
  source?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function leadRowToRecord(r: any): Lead {
  return {
    id: r.id,
    email: r.email,
    url: r.url,
    score: r.score ?? null,
    totals: (r.totals ?? {}) as LeadTotals,
    status: r.status as LeadStatus,
    source: r.source,
    createdAt: r.created_at,
  };
}

export async function createLead(admin: SupabaseClient, lead: NewLead): Promise<Lead> {
  const { data, error } = await admin
    .from("leads")
    .insert({
      email: lead.email,
      url: lead.url,
      score: lead.score,
      totals: lead.totals,
      source: lead.source ?? "scanner",
    })
    .select("*")
    .single();
  if (error) throw error;
  return leadRowToRecord(data);
}

export async function listLeads(admin: SupabaseClient): Promise<Lead[]> {
  const { data, error } = await admin
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(leadRowToRecord);
}
