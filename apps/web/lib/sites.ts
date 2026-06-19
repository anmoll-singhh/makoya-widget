import type { SupabaseClient } from "@supabase/supabase-js";
import { rowToConfig, configToRow, type SiteConfig } from "./sites-mappers";

export type { SiteConfig };
export interface Site {
  id: string;
  ownerId: string;
  domain: string;
  plan: "free" | "pro" | "managed";
  createdAt: string;
}

function rowToSite(r: any): Site {
  return { id: r.id, ownerId: r.owner_id, domain: r.domain, plan: r.plan, createdAt: r.created_at };
}

/**
 * Creates a site. The default `site_config` row is created atomically by a
 * Postgres AFTER INSERT trigger (see infra/schema.sql), so there is no
 * second insert here and therefore no orphaned-site window.
 */
export async function createSite(client: SupabaseClient, ownerId: string, domain: string): Promise<Site> {
  const { data, error } = await client
    .from("sites")
    .insert({ owner_id: ownerId, domain })
    .select("*")
    .single();
  if (error) throw error;
  return rowToSite(data);
}

export async function listSites(client: SupabaseClient, ownerId: string): Promise<Site[]> {
  const { data, error } = await client
    .from("sites").select("*").eq("owner_id", ownerId).order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(rowToSite);
}

export async function getSite(client: SupabaseClient, id: string): Promise<Site | null> {
  const { data, error } = await client.from("sites").select("*").eq("id", id).maybeSingle();
  if (error) throw error; // distinguish infra failure from "not found" (null)
  return data ? rowToSite(data) : null;
}

export async function getConfig(client: SupabaseClient, siteId: string): Promise<SiteConfig | null> {
  const { data, error } = await client.from("site_config").select("*").eq("site_id", siteId).maybeSingle();
  if (error) throw error;
  return data ? rowToConfig(data) : null;
}

export async function updateConfig(client: SupabaseClient, siteId: string, patch: Partial<SiteConfig>): Promise<void> {
  const { error } = await client.from("site_config").update(configToRow(patch)).eq("site_id", siteId);
  if (error) throw error;
}
