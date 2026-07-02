import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { EngineMeta } from "@/types";
import type { RuleAuditResult } from "@/lib/scanner/types";

/**
 * lib/audits.ts — data layer for the `scan_audits` deep-audit sidecar.
 *
 * `scan_audits` is written by the SERVICE ROLE only, inside the same
 * `runAndStoreScan` flow that stores the scan (so the header score and the
 * per-rule rows always come from one page load). Owners READ their own rows
 * through the authed route; RLS scopes every read to `sites.owner_id`.
 *
 * `detail` is a versioned envelope: `version` gates the per-rule shape so a
 * future scanner change is attributable and old audits stay renderable. Engine
 * provenance (axe version, ruleset hash, scoring-model version) is copied in
 * from the scan's `engineMeta`, mirroring how `scans.engine_meta` is stored.
 *
 * Only type-only imports from `@/lib/scanner/types` here — this module must not
 * pull the headless engine (axe/Playwright) into API-route bundles.
 */

/** Current `scan_audits.detail` envelope version. Bump on shape change. */
export const AUDIT_DETAIL_VERSION = 1 as const;

/** Versioned envelope stored in `scan_audits.detail`. */
export interface AuditDetail {
  version: number;
  /** ISO timestamp the audit blob was assembled. */
  generatedAt: string;
  /**
   * The scan these rules came from — the canonical URL, the overall score, and
   * the scan time are stored ALONGSIDE the rules so the report header and the
   * per-rule rows are provably from ONE page load (reviewer P0), with no scan
   * join needed at render time.
   */
  url: string;
  score: number;
  scannedAt: string;
  axeVersion: string | null;
  rulesetHash: string | null;
  scoringModelVersion: number | null;
  /** Every rule axe evaluated, with its outcome + capped snapshots. */
  rules: RuleAuditResult[];
}

/** A `scan_audits` row mapped to camelCase. */
export interface AuditRecord {
  scanId: string;
  siteId: string;
  detailVersion: number;
  detail: AuditDetail;
  createdAt: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToAudit(row: any): AuditRecord {
  return {
    scanId: row.scan_id,
    siteId: row.site_id,
    detailVersion: typeof row.detail_version === "number" ? row.detail_version : 1,
    detail: (row.detail ?? { version: 1, generatedAt: "", axeVersion: null, rulesetHash: null, scoringModelVersion: null, rules: [] }) as AuditDetail,
    createdAt: row.created_at,
  };
}

/**
 * Upserts the deep-audit sidecar for a scan. MUST be called with the
 * SERVICE-ROLE client (the table is write-locked to the service key). Keyed by
 * `scan_id`, so re-running a deep audit for the same scan replaces the blob.
 * Throws on infra error — the caller (`runAndStoreScan`) swallows it so the
 * scan itself always returns.
 */
export async function saveAudit(
  service: SupabaseClient,
  siteId: string,
  scanId: string,
  args: {
    url: string;
    score: number;
    scannedAt: string;
    rules: RuleAuditResult[];
    engineMeta?: EngineMeta;
  }
): Promise<void> {
  const detail: AuditDetail = {
    version: AUDIT_DETAIL_VERSION,
    generatedAt: new Date().toISOString(),
    url: args.url,
    score: args.score,
    scannedAt: args.scannedAt,
    axeVersion: args.engineMeta?.axeVersion ?? null,
    rulesetHash: args.engineMeta?.rulesetHash ?? null,
    scoringModelVersion: args.engineMeta?.scoringModelVersion ?? null,
    rules: args.rules,
  };

  const { error } = await service
    .from("scan_audits")
    .upsert(
      {
        scan_id: scanId,
        site_id: siteId,
        detail_version: AUDIT_DETAIL_VERSION,
        detail,
      } as never,
      { onConflict: "scan_id" }
    );
  if (error) throw error;
}

/**
 * Reads a site's most-recent deep audit (newest first). RLS scopes the read to
 * the caller's own sites. Returns null when the site has no deep audit yet.
 * Throws on infra error (the authed route surfaces a generic 500).
 */
export async function getLatestAudit(
  client: SupabaseClient,
  siteId: string
): Promise<AuditRecord | null> {
  const { data, error } = await client
    .from("scan_audits")
    .select("*")
    .eq("site_id", siteId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToAudit(data) : null;
}
