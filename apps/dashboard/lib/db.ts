/**
 * lib/db.ts — the data layer.
 *
 * MOCK MODE (default): in-memory store seeded with demo data. The whole
 * dashboard RUNS with zero credentials so you can click through everything.
 * Data resets when the server restarts — that's expected in mock mode.
 *
 * REAL MODE: set DB_MODE=supabase + Supabase env vars (see .env.example).
 * The same functions then read/write Postgres. Swap with no UI changes.
 *
 * REQUIRED_MANUAL_SETUP (only for real mode):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  → from supabase.com → Project → Settings → API
 */
import type { Site, SiteConfigRow, Scan, Lead } from "./types";
import { seedSites, seedConfigs, seedScans, seedLeads } from "./seed";

const MODE = process.env.DB_MODE === "supabase" ? "supabase" : "mock";

// ---- in-memory store (mock) ------------------------------------------------
const mem = {
  sites: [...seedSites],
  configs: [...seedConfigs],
  scans: [...seedScans],
  leads: [...seedLeads],
};

// ---- supabase client (lazy, only in real mode) -----------------------------
function sb() {
  // Imported lazily so mock mode needs no supabase package installed.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createClient } = require("@supabase/supabase-js");
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

// ---- public API (same shape in both modes) ---------------------------------
export const db = {
  async listSites(ownerEmail: string): Promise<Site[]> {
    if (MODE === "mock") return mem.sites.filter((s) => s.ownerEmail === ownerEmail);
    const { data } = await sb().from("sites").select("*").eq("owner_email", ownerEmail);
    return (data ?? []) as Site[];
  },

  async getSite(id: string): Promise<Site | null> {
    if (MODE === "mock") return mem.sites.find((s) => s.id === id) ?? null;
    const { data } = await sb().from("sites").select("*").eq("id", id).single();
    return (data ?? null) as Site | null;
  },

  async createSite(ownerEmail: string, domain: string): Promise<Site> {
    const site: Site = {
      id: crypto.randomUUID(),
      ownerEmail, domain, plan: "free", createdAt: new Date().toISOString(),
    };
    const config: SiteConfigRow = {
      siteId: site.id, primaryColor: "#2563eb", position: "bottom-right",
      featuresEnabled: ["textSize","lineSpacing","contrast","stopMotion","readingRuler","highlightLinks","bigCursor"],
      hideBranding: false,
    };
    if (MODE === "mock") { mem.sites.push(site); mem.configs.push(config); return site; }
    await sb().from("sites").insert({ id: site.id, owner_email: ownerEmail, domain, plan: "free" });
    await sb().from("site_config").insert({ site_id: site.id, ...toSnake(config) });
    return site;
  },

  async getConfig(siteId: string): Promise<SiteConfigRow | null> {
    if (MODE === "mock") return mem.configs.find((c) => c.siteId === siteId) ?? null;
    const { data } = await sb().from("site_config").select("*").eq("site_id", siteId).single();
    return data ? fromSnake(data) : null;
  },

  async updateConfig(siteId: string, patch: Partial<SiteConfigRow>): Promise<void> {
    if (MODE === "mock") {
      const c = mem.configs.find((x) => x.siteId === siteId);
      if (c) Object.assign(c, patch);
      return;
    }
    await sb().from("site_config").update(toSnake(patch)).eq("site_id", siteId);
  },

  async listScans(siteId: string): Promise<Scan[]> {
    if (MODE === "mock") return mem.scans.filter((s) => s.siteId === siteId);
    const { data } = await sb().from("scans").select("*").eq("site_id", siteId);
    return (data ?? []) as Scan[];
  },

  async addScan(scan: Omit<Scan, "id" | "scannedAt">): Promise<Scan> {
    const full: Scan = { ...scan, id: crypto.randomUUID(), scannedAt: new Date().toISOString() };
    if (MODE === "mock") { mem.scans.push(full); return full; }
    await sb().from("scans").insert({ id: full.id, site_id: full.siteId, url: full.url, score: full.score, totals: full.totals });
    return full;
  },

  async listLeads(): Promise<Lead[]> {
    if (MODE === "mock") return [...mem.leads].sort((a,b) => b.createdAt.localeCompare(a.createdAt));
    const { data } = await sb().from("leads").select("*").order("created_at", { ascending: false });
    return (data ?? []) as Lead[];
  },

  async addLead(lead: Omit<Lead, "id" | "createdAt" | "status">): Promise<Lead> {
    const full: Lead = { ...lead, id: crypto.randomUUID(), status: "new", createdAt: new Date().toISOString() };
    if (MODE === "mock") { mem.leads.push(full); return full; }
    await sb().from("leads").insert({ id: full.id, email: full.email, url: full.url, scan_id: full.scanId });
    return full;
  },
};

// snake_case helpers for supabase columns
function toSnake(c: Partial<SiteConfigRow>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (c.primaryColor !== undefined) out.primary_color = c.primaryColor;
  if (c.position !== undefined) out.position = c.position;
  if (c.featuresEnabled !== undefined) out.features_enabled = c.featuresEnabled;
  if (c.hideBranding !== undefined) out.hide_branding = c.hideBranding;
  return out;
}
function fromSnake(r: any): SiteConfigRow {
  return {
    siteId: r.site_id, primaryColor: r.primary_color, position: r.position,
    featuresEnabled: r.features_enabled, hideBranding: r.hide_branding,
  };
}

export const dbMode = MODE;
