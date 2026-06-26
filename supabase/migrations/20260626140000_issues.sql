-- Persistent, trackable accessibility issues (the v3.1 Audit/Issues screen).
-- Scans are snapshots; this table tracks an issue's lifecycle across scans, with
-- an owner-settable status + (future) assignee. Inserts come from scan ingest via
-- the service role; owners read + update status/assignee on their own rows.
create table if not exists issues (
  id             uuid primary key default gen_random_uuid(),
  site_id        uuid not null references sites(id) on delete cascade,
  scan_id        uuid references scans(id) on delete set null,
  rule_id        text not null,                 -- scanner rule id; upsert identity per site
  wcag_criterion text,                          -- e.g. '1.1.1'
  framework      text not null default 'wcag',  -- wcag | ada | aoda | eaa
  title          text not null,
  status         text not null default 'failing' check (status in ('failing','needs_review','passing')),
  checks_passing int  not null default 0,
  checks_total   int  not null default 0,
  assignee_id    uuid,                          -- FK to team_members added in Wave 3 (nullable now)
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  resolved_at    timestamptz,
  unique (site_id, rule_id)
);
create index if not exists issues_site_status on issues (site_id, status);

create table if not exists issue_attachments (
  id         uuid primary key default gen_random_uuid(),
  issue_id   uuid not null references issues(id) on delete cascade,
  kind       text not null check (kind in ('document','policy')),
  label      text not null,
  url        text not null,
  created_at timestamptz not null default now()
);

alter table issues            enable row level security;
alter table issue_attachments enable row level security;

create policy "owner reads own issues" on issues
  for select using (exists (select 1 from sites s where s.id = issues.site_id and s.owner_id = auth.uid()));
create policy "owner updates own issues" on issues
  for update using (exists (select 1 from sites s where s.id = issues.site_id and s.owner_id = auth.uid()))
  with check  (exists (select 1 from sites s where s.id = issues.site_id and s.owner_id = auth.uid()));
create policy "owner reads own issue attachments" on issue_attachments
  for select using (exists (select 1 from issues i join sites s on s.id = i.site_id where i.id = issue_attachments.issue_id and s.owner_id = auth.uid()));
