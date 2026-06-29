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
 * Per-site licensing facts consumed by the public widget config endpoint.
 * Deliberately narrow: the gate only needs status + trial expiry + the domain
 * allowlist, never the full site row. snake_case columns mapped to camelCase.
 */
export interface SiteLicense {
  licenseStatus: string;
  trialEndsAt: string | null;
  allowedDomains: string[];
}

/**
 * Derives the apex + www variants of a host so a site is gated on both from the
 * moment it is created (Phase 1 §3). Bare-host in, lowercased pair out:
 *   foo.com      → ['foo.com', 'www.foo.com']
 *   www.foo.com  → ['www.foo.com', 'foo.com']
 * Mirrors the migration backfill so create-time and backfill agree.
 */
function apexAndWww(domain: string): string[] {
  const host = domain.toLowerCase();
  const sibling = host.startsWith("www.") ? host.slice(4) : `www.${host}`;
  // Dedupe defensively (host === sibling can't happen for these rules, but be safe).
  return Array.from(new Set([host, sibling]));
}

/**
 * Creates a site. The default `site_config` row is created atomically by a
 * Postgres AFTER INSERT trigger (see infra/schema.sql), so there is no
 * second insert here and therefore no orphaned-site window.
 *
 * `allowed_domains` is seeded with the apex + www of `domain` at insert time so
 * every freshly onboarded site is correctly domain-gated from creation (the DB
 * is a clean slate, so the migration backfill never runs for new rows).
 */
export async function createSite(
  client: SupabaseClient,
  ownerId: string,
  domain: string
): Promise<Site> {
  const { data, error } = await client
    .from("sites")
    .insert({ owner_id: ownerId, domain, allowed_domains: apexAndWww(domain) })
    .select("*")
    .single();
  if (error) throw error;
  return rowToSite(data);
}

/**
 * Reads the licensing facts for one site. Mirrors getSite's error discipline:
 *  - a Supabase `error` is an INFRA failure → throw (the endpoint fails OPEN on it),
 *  - simply no row → return null (not-found → the endpoint fails CLOSED on it).
 * This distinction is load-bearing for the gate's availability contract.
 */
export async function getSiteLicense(
  client: SupabaseClient,
  siteId: string
): Promise<SiteLicense | null> {
  const { data, error } = await client
    .from("sites")
    .select("license_status, trial_ends_at, allowed_domains")
    .eq("id", siteId)
    .maybeSingle();
  if (error) throw error; // infra failure — caller fails OPEN
  if (!data) return null; // not found — caller fails CLOSED
  return {
    licenseStatus: data.license_status,
    trialEndsAt: data.trial_ends_at ?? null,
    allowedDomains: data.allowed_domains ?? [],
  };
}

export async function listSites(client: SupabaseClient, ownerId: string): Promise<Site[]> {
  const { data, error } = await client
    .from("sites")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(rowToSite);
}

export async function getSite(client: SupabaseClient, id: string): Promise<Site | null> {
  const { data, error } = await client.from("sites").select("*").eq("id", id).maybeSingle();
  if (error) throw error; // distinguish infra failure from "not found" (null)
  return data ? rowToSite(data) : null;
}

export async function getConfig(
  client: SupabaseClient,
  siteId: string
): Promise<SiteConfig | null> {
  const { data, error } = await client
    .from("site_config")
    .select("*")
    .eq("site_id", siteId)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToConfig(data) : null;
}

export async function updateConfig(
  client: SupabaseClient,
  siteId: string,
  patch: Partial<SiteConfig>
): Promise<void> {
  const { error } = await client
    .from("site_config")
    .update(configToRow(patch))
    .eq("site_id", siteId);
  if (error) throw error;
}

/**
 * Single-round-trip fetch of everything the PUBLIC widget config endpoint needs:
 * the licensing facts AND the config row, via one embedded-resource query instead
 * of the two sequential round-trips getSiteLicense + getConfig used to make. This
 * is the Postgres-side half of the config hot-path optimisation (the KV cache in
 * lib/config-cache.ts is the other half — this runs only on a cache MISS).
 *
 * Same error discipline as getSiteLicense/getConfig, which the config route's
 * availability contract depends on:
 *  - a Supabase `error` is an INFRA failure → throw (the endpoint fails OPEN),
 *  - no row → { site: null, config: null } (not-found → the endpoint fails CLOSED).
 */
export async function getSiteBundle(
  client: SupabaseClient,
  siteId: string
): Promise<{ site: SiteLicense | null; config: SiteConfig | null }> {
  const { data, error } = await client
    .from("sites")
    .select("license_status, trial_ends_at, allowed_domains, site_config(*)")
    .eq("id", siteId)
    .maybeSingle();
  if (error) throw error; // infra failure — caller fails OPEN
  if (!data) return { site: null, config: null }; // not found — caller fails CLOSED
  // The embedded one-to-one may arrive as an object or a single-element array
  // depending on PostgREST's relationship inference; handle both.
  const row = data as Record<string, any>;
  const cfgRow = Array.isArray(row.site_config) ? row.site_config[0] : row.site_config;
  return {
    site: {
      licenseStatus: row.license_status,
      trialEndsAt: row.trial_ends_at ?? null,
      allowedDomains: row.allowed_domains ?? [],
    },
    config: cfgRow ? rowToConfig(cfgRow) : null,
  };
}
