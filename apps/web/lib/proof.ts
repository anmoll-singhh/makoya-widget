/**
 * lib/proof.ts — the v3.1 "Proof of effort" pack assembler.
 *
 * The Proof screen answers one merchant question honestly: "what work has been
 * done on my site's accessibility?" It is a read-only roll-up of signals that
 * already have their own lanes — the audit history (scans), the remediation log
 * (lib/remediation), the published accessibility statement (lib/statement), the
 * widget install/uptime (lib/heartbeat) — plus two evidence records that Makoya
 * curates: VPAT/ACR documents and manual expert audits (this module's own
 * tables). Like lib/overview, it owns minimal storage and keeps ALL shaping in a
 * PURE helper (`assembleProofStatus`) so the view-model is unit-tested without a
 * database.
 *
 * Write/read split mirrors the other v3.1 lanes: `vpat_documents` / `manual_audits`
 * have RLS on with a SELECT-only owner policy and NO write policy — only the
 * service role writes them (Makoya uploads the docs). Owners READ their own
 * site's records through the authed `/api/sites/[id]/proof-pack` route; RLS makes
 * cross-tenant reads impossible.
 *
 * Error discipline mirrors lib/sites.ts / lib/overview.ts: any Supabase `error`
 * is an INFRA failure → THROW so the authed route surfaces a generic 500.
 *
 * Columns are snake_case in Postgres; the mappers convert to camelCase.
 *
 * COMPLIANCE — this pack documents proof of *effort*, never a guarantee. Nothing
 * here asserts a site "is compliant", is "certified", or is "guaranteed
 * accessible"; it only reports work done (audits run, fixes applied, statement
 * published, evidence on file). Do not introduce such claims.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { countRemediatedSince } from "./remediation";
import { getStatement, type StatementRecord } from "./statement";
import { getHeartbeat, type HeartbeatRecord } from "./heartbeat";
import { getLatestScan, type ScanRecord } from "./scans";

/** camelCase view of a `vpat_documents` row (a VPAT/ACR evidence document). */
export interface VpatDocument {
  id: string;
  siteId: string;
  title: string;
  url: string;
  generatedOn: string | null;
  createdAt: string;
}

/** camelCase view of a `manual_audits` row (a human expert audit record). */
export interface ManualAudit {
  id: string;
  siteId: string;
  auditor: string;
  summary: string | null;
  reportUrl: string | null;
  performedOn: string | null;
  createdAt: string;
}

/** The Proof screen view-model. A descriptive roll-up of effort — never a claim. */
export interface ProofPack {
  auditHistory: { count: number; latestScore: number | null; latestOn: string | null };
  remediationCount: number;
  statementPublished: boolean;
  install: { daysInstalled: number; firstSeenOn: string | null };
  vpat: VpatDocument[];
  manualAudits: ManualAudit[];
}

/** The gathered inputs `assembleProofStatus` shapes into a `ProofPack`. These are
 *  the raw return values of the consumed data layers, passed straight through so
 *  the orchestrator stays thin and ALL derivation lives in the pure helper. */
export interface ProofParts {
  scanCount: number;
  latestScan: ScanRecord | null;
  remediationCount: number;
  statement: StatementRecord | null;
  heartbeat: HeartbeatRecord | null;
  vpat: VpatDocument[];
  manualAudits: ManualAudit[];
  /** Injectable clock for deterministic `daysInstalled` in tests. */
  nowMs?: number;
}

const DAY_MS = 24 * 60 * 60_000;

/** snake_case `vpat_documents` row → camelCase `VpatDocument`. Tolerates a null
 *  generated_on. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rowToVpat(row: any): VpatDocument {
  return {
    id: row.id,
    siteId: row.site_id,
    title: row.title,
    url: row.url,
    generatedOn: row.generated_on ?? null,
    createdAt: row.created_at,
  };
}

/** snake_case `manual_audits` row → camelCase `ManualAudit`. Tolerates null
 *  summary / report_url / performed_on. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rowToManualAudit(row: any): ManualAudit {
  return {
    id: row.id,
    siteId: row.site_id,
    auditor: row.auditor,
    summary: row.summary ?? null,
    reportUrl: row.report_url ?? null,
    performedOn: row.performed_on ?? null,
    createdAt: row.created_at,
  };
}

/**
 * PURE: how many whole days the widget has been installed, end-to-end. Unlike
 * `streakDays` (lib/overview) there is NO staleness gate — this measures total
 * tenure since the first heartbeat, so an old-but-quiet install still counts.
 * Returns 0 when never installed (null first-seen), when first-seen is
 * unparseable, or when first-seen is in the future. `nowMs` is injectable for
 * deterministic tests. No I/O — fully unit-tested.
 */
export function daysInstalled(firstSeenIso: string | null, nowMs: number = Date.now()): number {
  if (!firstSeenIso) return 0;
  const firstSeen = Date.parse(firstSeenIso);
  if (!Number.isFinite(firstSeen)) return 0;
  const days = Math.floor((nowMs - firstSeen) / DAY_MS);
  return days > 0 ? days : 0;
}

/**
 * PURE: shape the gathered parts into the Proof view-model. Derives every field
 * here so `getProofPack` stays a thin fan-out:
 *  - auditHistory: scan count + the latest scan's score/date (null when none).
 *  - remediationCount: total fixes applied (passed through).
 *  - statementPublished: true iff a statement record exists.
 *  - install: whole days installed + the first-seen date (null when never seen).
 *  - vpat / manualAudits: the evidence records, passed through.
 * No I/O — fully unit-tested.
 */
export function assembleProofStatus(parts: ProofParts): ProofPack {
  const firstSeenOn = parts.heartbeat?.firstSeenAt ?? null;
  return {
    auditHistory: {
      count: parts.scanCount,
      latestScore: parts.latestScan ? parts.latestScan.score : null,
      latestOn: parts.latestScan ? parts.latestScan.createdAt : null,
    },
    remediationCount: parts.remediationCount,
    statementPublished: parts.statement !== null,
    install: {
      daysInstalled: daysInstalled(firstSeenOn, parts.nowMs),
      firstSeenOn,
    },
    vpat: parts.vpat,
    manualAudits: parts.manualAudits,
  };
}

/**
 * Counts a site's scans. Uses a head/count query (no rows returned), mirroring
 * `countRemediatedSince`. RLS scopes the count to the caller's own sites. Throws
 * on infra error.
 */
async function countScans(client: SupabaseClient, siteId: string): Promise<number> {
  const { count, error } = await client
    .from("scans")
    .select("*", { count: "exact", head: true })
    .eq("site_id", siteId);
  if (error) throw error;
  return count ?? 0;
}

/**
 * Reads a site's VPAT/ACR documents, newest first. RLS scopes the read to the
 * caller's own sites. Throws on infra error.
 */
export async function listVpat(client: SupabaseClient, siteId: string): Promise<VpatDocument[]> {
  const { data, error } = await client
    .from("vpat_documents")
    .select("*")
    .eq("site_id", siteId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToVpat);
}

/**
 * Reads a site's manual expert audits, newest first. RLS scopes the read to the
 * caller's own sites. Throws on infra error.
 */
export async function listManualAudits(
  client: SupabaseClient,
  siteId: string
): Promise<ManualAudit[]> {
  const { data, error } = await client
    .from("manual_audits")
    .select("*")
    .eq("site_id", siteId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToManualAudit);
}

/**
 * Assembles the Proof-of-effort pack for one site. Thin orchestration only — it
 * fans out to the consumed data layers (read-only, RLS-scoped via the cookie
 * client) and delegates ALL shaping to the PURE `assembleProofStatus`. The
 * remediation total uses the Unix epoch as the "since" floor so every recorded
 * fix is counted. Any infra error from a consumed layer propagates so the authed
 * route can surface a generic 500.
 */
export async function getProofPack(client: SupabaseClient, siteId: string): Promise<ProofPack> {
  const [scanCount, latestScan, remediationCount, statement, heartbeat, vpat, manualAudits] =
    await Promise.all([
      countScans(client, siteId),
      getLatestScan(client, siteId),
      countRemediatedSince(client, siteId, "1970-01-01T00:00:00.000Z"),
      getStatement(client, siteId),
      getHeartbeat(client, siteId),
      listVpat(client, siteId),
      listManualAudits(client, siteId),
    ]);

  return assembleProofStatus({
    scanCount,
    latestScan,
    remediationCount,
    statement,
    heartbeat,
    vpat,
    manualAudits,
  });
}
