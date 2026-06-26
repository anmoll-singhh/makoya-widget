/**
 * lib/site-settings.ts — PRIVATE per-site owner/account settings for the v3.1
 * Settings screen (#12): the operator's contact details + notification prefs.
 *
 * WHY A SEPARATE TABLE (not site_config):
 * ───────────────────────────────────────
 * `site_config` is surfaced (its safe display fields) through the PUBLIC widget
 * config JSON at /api/config/[siteId]. Owner name / email / phone and
 * notification preferences are ACCOUNT METADATA and must NEVER reach a visitor's
 * browser. So they live in their own `site_settings` table that the public
 * endpoint never reads, guarded by owner-scoped RLS — the same "don't leak
 * private data into public config" discipline used for `leads`.
 *
 * Error discipline mirrors lib/sites.ts + lib/heartbeat.ts:
 *  - a Supabase `error` is an INFRA failure → THROW (caller decides),
 *  - simply no row → return safe DEFAULTS (every site logically "has" settings;
 *    an unset row is just all-empty, so the UI never has to special-case null).
 *
 * Columns are snake_case in Postgres; the mappers convert to camelCase.
 *
 * Honesty: nothing here asserts any WCAG/ADA "compliance" — these are pure
 * account/contact + notification-preference fields.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export interface SiteSettings {
  siteId: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  /** Free-form per-owner notification toggles (e.g. { weeklyReport: true }). */
  notificationPrefs: Record<string, unknown>;
  /** ISO timestamp of the last write, or null if never saved. */
  updatedAt: string | null;
}

/** The empty-but-valid settings for a site that has never saved any. */
export function defaultSiteSettings(siteId: string): SiteSettings {
  return {
    siteId,
    ownerName: "",
    ownerEmail: "",
    ownerPhone: "",
    notificationPrefs: {},
    updatedAt: null,
  };
}

/** snake_case row → camelCase record. Tolerates null/missing optional columns. */
export function rowToSettings(row: any): SiteSettings {
  return {
    siteId: row.site_id,
    ownerName: row.owner_name ?? "",
    ownerEmail: row.owner_email ?? "",
    ownerPhone: row.owner_phone ?? "",
    notificationPrefs: row.notification_prefs ?? {},
    updatedAt: row.updated_at ?? null,
  };
}

/** camelCase patch → snake_case row, including only the fields actually provided. */
export function settingsToRow(patch: Partial<SiteSettings>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (patch.ownerName !== undefined) out.owner_name = patch.ownerName;
  if (patch.ownerEmail !== undefined) out.owner_email = patch.ownerEmail;
  if (patch.ownerPhone !== undefined) out.owner_phone = patch.ownerPhone;
  if (patch.notificationPrefs !== undefined) out.notification_prefs = patch.notificationPrefs;
  return out;
}

/**
 * Reads one site's private settings. Pass an OWNER-scoped client; RLS already
 * limits the read to the caller's own sites. Infra error → throw; no row →
 * safe defaults (the screen always has a complete object to render).
 */
export async function getSiteSettings(
  client: SupabaseClient,
  siteId: string
): Promise<SiteSettings> {
  const { data, error } = await client
    .from("site_settings")
    .select("*")
    .eq("site_id", siteId)
    .maybeSingle();
  if (error) throw error; // infra failure — caller decides
  return data ? rowToSettings(data) : defaultSiteSettings(siteId);
}

/**
 * Creates or updates a site's private settings. MUST be called with an
 * OWNER-scoped client — RLS enforces that the caller owns `siteId` (the policy
 * checks `sites.owner_id = auth.uid()`), so this never lets one owner touch
 * another's row. `updated_at` is bumped on every write. Returns the persisted
 * settings. Infra error → throw.
 */
export async function upsertSiteSettings(
  client: SupabaseClient,
  siteId: string,
  patch: Partial<SiteSettings>
): Promise<SiteSettings> {
  const row = {
    ...settingsToRow(patch),
    site_id: siteId,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await client
    .from("site_settings")
    .upsert(row as never, { onConflict: "site_id" })
    .select("*")
    .single();
  if (error) throw error;
  return rowToSettings(data);
}
