-- ───────────────────────────────────────────────────────────────────────────
-- Performance hardening (2026-06-29). Resolves Supabase performance advisor
-- lints 0003_auth_rls_initplan, 0006_multiple_permissive_policies, and
-- 0001_unindexed_foreign_keys. NO behavioural / security-semantic change:
-- every policy grants exactly the same rows as before — we only change HOW the
-- predicate is evaluated so Postgres stops re-running it per scanned row.
--
-- WHY (0003): `auth.uid()` is STABLE and query-constant, but when written bare
-- in an RLS predicate the planner re-evaluates it for EVERY row scanned. Wrapping
-- it as `(select auth.uid())` turns it into an InitPlan computed ONCE per query.
-- Invisible at 5 rows; the difference between linear and quadratic at scale.
-- NOTE: `private.is_org_member(org_id)` is deliberately NOT wrapped — it takes a
-- per-row column argument, so it cannot be hoisted to a single evaluation and the
-- subselect wrapper would buy nothing.
--
-- WHY (0006): `sites` had three permissive policies overlapping on SELECT
-- (`owner reads own sites`, `owner writes own sites` [ALL → includes SELECT],
-- `org members read sites`). Postgres ORs every permissive policy on each query,
-- so each SELECT ran all three predicates. We collapse to ONE policy per action:
-- a single SELECT policy (owner OR org-member) plus per-command write policies.
--
-- WHY (0001): foreign keys without a covering index force a sequential scan on
-- the child table for joins and for every parent DELETE's referential check.
-- We add the missing covering indexes. Two are genuinely hot, not just lint:
--   • sites(owner_id)            — every owner-RLS check + listSites()
--   • scans(site_id, created_at) — getLatestScan() recency lookup
-- Indexes are created plain (not CONCURRENTLY) because migrations run in a
-- transaction and the tables are still small. AT SCALE, add future FK indexes
-- via `CREATE INDEX CONCURRENTLY` in a transaction-less migration to avoid
-- locking writes on a large table.
-- ───────────────────────────────────────────────────────────────────────────

-- ============================================================================
-- PART 1 — RLS initplan fix (0003). Owner-scoped policies: auth.uid() → (select).
--          Each policy is recreated verbatim except for the wrapped call.
-- ============================================================================

drop policy if exists "owner manages own statement" on accessibility_statements;
create policy "owner manages own statement" on accessibility_statements
  for all
  using (exists (select 1 from sites s where s.id = accessibility_statements.site_id and s.owner_id = (select auth.uid())))
  with check (exists (select 1 from sites s where s.id = accessibility_statements.site_id and s.owner_id = (select auth.uid())));

drop policy if exists "owner reads own activity" on activity_log;
create policy "owner reads own activity" on activity_log
  for select
  using (exists (select 1 from sites s where s.id = activity_log.site_id and s.owner_id = (select auth.uid())));

drop policy if exists "owner reads own subscription" on billing_subscriptions;
create policy "owner reads own subscription" on billing_subscriptions
  for select
  using (exists (select 1 from sites s where s.id = billing_subscriptions.site_id and s.owner_id = (select auth.uid())));

drop policy if exists "owner reads own issue attachments" on issue_attachments;
create policy "owner reads own issue attachments" on issue_attachments
  for select
  using (exists (
    select 1 from issues i join sites s on s.id = i.site_id
    where i.id = issue_attachments.issue_id and s.owner_id = (select auth.uid())));

drop policy if exists "owner reads own issues" on issues;
create policy "owner reads own issues" on issues
  for select
  using (exists (select 1 from sites s where s.id = issues.site_id and s.owner_id = (select auth.uid())));

drop policy if exists "owner updates own issues" on issues;
create policy "owner updates own issues" on issues
  for update
  using (exists (select 1 from sites s where s.id = issues.site_id and s.owner_id = (select auth.uid())))
  with check (exists (select 1 from sites s where s.id = issues.site_id and s.owner_id = (select auth.uid())));

drop policy if exists "owner reads own manual audits" on manual_audits;
create policy "owner reads own manual audits" on manual_audits
  for select
  using (exists (select 1 from sites s where s.id = manual_audits.site_id and s.owner_id = (select auth.uid())));

drop policy if exists "owner reads own monthly reports" on monthly_reports;
create policy "owner reads own monthly reports" on monthly_reports
  for select
  using (exists (select 1 from sites s where s.id = monthly_reports.site_id and s.owner_id = (select auth.uid())));

drop policy if exists "members read their orgs" on organizations;
create policy "members read their orgs" on organizations
  for select
  using (private.is_org_member(id) or created_by = (select auth.uid()));

drop policy if exists "owner reads own remediation" on remediation_log;
create policy "owner reads own remediation" on remediation_log
  for select
  using (exists (select 1 from sites s where s.id = remediation_log.site_id and s.owner_id = (select auth.uid())));

drop policy if exists "owner reads own scans" on scans;
create policy "owner reads own scans" on scans
  for select
  using (exists (select 1 from sites s where s.id = scans.site_id and s.owner_id = (select auth.uid())));

drop policy if exists "owner manages own config" on site_config;
create policy "owner manages own config" on site_config
  for all
  using (exists (select 1 from sites s where s.id = site_config.site_id and s.owner_id = (select auth.uid())))
  with check (exists (select 1 from sites s where s.id = site_config.site_id and s.owner_id = (select auth.uid())));

drop policy if exists "owner manages own settings" on site_settings;
create policy "owner manages own settings" on site_settings
  for all
  using (exists (select 1 from sites s where s.id = site_settings.site_id and s.owner_id = (select auth.uid())))
  with check (exists (select 1 from sites s where s.id = site_settings.site_id and s.owner_id = (select auth.uid())));

drop policy if exists "owner reads own vpat" on vpat_documents;
create policy "owner reads own vpat" on vpat_documents
  for select
  using (exists (select 1 from sites s where s.id = vpat_documents.site_id and s.owner_id = (select auth.uid())));

drop policy if exists "owner reads own event daily" on widget_event_daily;
create policy "owner reads own event daily" on widget_event_daily
  for select
  using (exists (select 1 from sites s where s.id = widget_event_daily.site_id and s.owner_id = (select auth.uid())));

drop policy if exists "owner reads own events" on widget_events;
create policy "owner reads own events" on widget_events
  for select
  using (exists (select 1 from sites s where s.id = widget_events.site_id and s.owner_id = (select auth.uid())));

drop policy if exists "owner reads own heartbeat" on widget_heartbeats;
create policy "owner reads own heartbeat" on widget_heartbeats
  for select
  using (exists (select 1 from sites s where s.id = widget_heartbeats.site_id and s.owner_id = (select auth.uid())));

drop policy if exists "owner reads own uptime" on widget_uptime_days;
create policy "owner reads own uptime" on widget_uptime_days
  for select
  using (exists (select 1 from sites s where s.id = widget_uptime_days.site_id and s.owner_id = (select auth.uid())));

-- ============================================================================
-- PART 2 — sites policy consolidation (0006) + initplan fix.
--          Three overlapping SELECT-capable policies → one policy per action.
--          Net access is IDENTICAL: owner may do everything; org members may
--          read. (Org members were already read-only before.)
-- ============================================================================

drop policy if exists "org members read sites" on sites;
drop policy if exists "owner reads own sites" on sites;
drop policy if exists "owner writes own sites" on sites;

create policy "sites_select" on sites
  for select
  using (
    owner_id = (select auth.uid())
    or (org_id is not null and private.is_org_member(org_id))
  );

create policy "sites_insert" on sites
  for insert
  with check (owner_id = (select auth.uid()));

create policy "sites_update" on sites
  for update
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "sites_delete" on sites
  for delete
  using (owner_id = (select auth.uid()));

-- ============================================================================
-- PART 3 — Covering indexes for unindexed foreign keys (0001).
--          IF NOT EXISTS keeps this idempotent.
-- ============================================================================

-- Hot paths (not just lint):
create index if not exists sites_owner_id_idx           on sites (owner_id);
create index if not exists scans_site_created_idx       on scans (site_id, created_at desc);

-- Remaining FK covering indexes:
create index if not exists api_keys_created_by_idx        on api_keys (created_by);
create index if not exists api_keys_org_id_idx            on api_keys (org_id);
create index if not exists consultation_requests_scan_idx on consultation_requests (scan_id);
create index if not exists consultation_requests_site_idx on consultation_requests (site_id);
create index if not exists issue_attachments_issue_idx    on issue_attachments (issue_id);
create index if not exists issues_assignee_idx            on issues (assignee_id);
create index if not exists issues_scan_idx                on issues (scan_id);
create index if not exists manual_audits_site_idx         on manual_audits (site_id);
create index if not exists organizations_created_by_idx   on organizations (created_by);
create index if not exists partner_clients_client_org_idx on partner_clients (client_org_id);
create index if not exists remediation_log_issue_idx      on remediation_log (issue_id);
create index if not exists team_invites_invited_by_idx    on team_invites (invited_by);
create index if not exists team_invites_org_idx           on team_invites (org_id);
create index if not exists vpat_documents_site_idx        on vpat_documents (site_id);
