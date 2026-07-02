-- scan_audits: the deep-audit sidecar for the accessScan-style Full Audit report.
--
-- WHY A SIDECAR (not columns on `scans`, not the `issues` table):
--  - The per-rule audit blob is large (every rule's outcome + capped code
--    snapshots), and the hot `scans` row is read constantly for score/totals —
--    keeping the blob out of it avoids bloating those reads.
--  - `issues` is a per-rule LIFECYCLE table (unique(site_id,rule_id), mutable
--    status); a deep audit is a per-scan SNAPSHOT. Forcing it there would
--    overwrite history. A row keyed by scan_id is the correct shape.
--
-- One row per scan that was run in deep-audit mode. `detail` holds
-- { version, axeVersion, rulesetHash, generatedAt, rules: RuleAuditResult[] };
-- `detail_version` is duplicated as a column so the shape is queryable/attributable
-- without opening the JSONB (mirrors engine_meta versioning on `scans`).
--
-- WRITE PATH: service role only, written in the SAME flow that stores the scan
-- (see lib/scan-runner.ts) so the header score and the per-rule rows always come
-- from one page load. RLS is enabled with a SELECT-only owner policy and NO write
-- policy — identical to `monthly_reports` / `remediation_log` / `leads`.
create table if not exists scan_audits (
  scan_id        uuid primary key references scans(id) on delete cascade,
  site_id        uuid not null references sites(id) on delete cascade,
  detail_version int  not null default 1,
  detail         jsonb not null,
  created_at     timestamptz not null default now()
);

-- "Latest audit for this site" lookups without walking the scans table.
create index if not exists scan_audits_site_time on scan_audits (site_id, created_at desc);

alter table scan_audits enable row level security;

create policy "owner reads own scan audits" on scan_audits
  for select using (
    exists (select 1 from sites s where s.id = scan_audits.site_id and s.owner_id = auth.uid())
  );
-- No INSERT/UPDATE/DELETE policy → writes are service-role only.
