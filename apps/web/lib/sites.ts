import type { SupabaseClient } from "@supabase/supabase-js";
import type { FeatureKey } from "@makoya/shared";
import { rowToConfig, configToRow, type SiteConfig } from "./sites-mappers";

export type { SiteConfig };
export interface Site {
  id: string;
  ownerId: string;
  domain: string;
  plan: "free" | "pro" | "managed";
  createdAt: string;
}

const DEFAULT_FEATURES: FeatureKey[] = [
  "textSize", "lineSpacing", "contrast", "stopMotion",
  "readingRuler", "highlightLinks", "bigCursor",
];

function rowToSite(r: any): Site {
  return { id: r.id, ownerId: r.owner_id, domain: r.domain, plan: r.plan, createdAt: r.created_at };
}

export async function createSite(client: SupabaseClient, ownerId: string, domain: string): Promise<Site> {
  const { data, error } = await client
    .from("sites")
    .insert({ owner_id: ownerId, domain })
    .select("*")
    .single();
  if (error) throw error;
  // create the default config row for this site
  const { error: cErr } = await client.from("site_config").insert({
    site_id: data.id,
    features_enabled: DEFAULT_FEATURES,
  });
  if (cErr) throw cErr;
  return rowToSite(data);
}

export async function listSites(client: SupabaseClient, ownerId: string): Promise<Site[]> {
  const { data, error } = await client
    .from("sites").select("*").eq("owner_id", ownerId).order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(rowToSite);
}

export async function getSite(client: SupabaseClient, id: string): Promise<Site | null> {
  const { data } = await client.from("sites").select("*").eq("id", id).maybeSingle();
  return data ? rowToSite(data) : null;
}

export async function getConfig(client: SupabaseClient, siteId: string): Promise<SiteConfig | null> {
  const { data } = await client.from("site_config").select("*").eq("site_id", siteId).maybeSingle();
  return data ? rowToConfig(data) : null;
}

export async function updateConfig(client: SupabaseClient, siteId: string, patch: Partial<SiteConfig>): Promise<void> {
  const { error } = await client.from("site_config").update(configToRow(patch)).eq("site_id", siteId);
  if (error) throw error;
}
