-- activity_log: the v3.1 Overview "recent activity" feed (append-only).
-- remediation_log: fixes logged with their WCAG criterion — feeds Reports'
-- remediation tab, the "issues resolved" metric, and the proof-of-effort pack.
-- Both are written by the system via the service role; owners read their own.
-- NOTE: remediation_log.issue_id references issues(id), created by the Wave-2A
-- migration (timestamp 20260626140000, applied before this one).
create table if not exists activity_log (
  id         uuid primary key default gen_random_uuid(),
  site_id    uuid not null references sites(id) on delete cascade,
  actor      text not null default 'system',  -- system | mike | user | specialist
  type       text not null,                   -- scan_completed | issue_found | issue_resolved | widget_milestone | ...
  summary    text not null,
  wcag_ref   text,
  created_at timestamptz not null default now()
);
create index if not exists activity_site_time on activity_log (site_id, created_at desc);

create table if not exists remediation_log (
  id             uuid primary key default gen_random_uuid(),
  site_id        uuid not null references sites(id) on delete cascade,
  issue_id       uuid references issues(id) on delete set null,
  wcag_criterion text,
  action         text not null,
  fixed_by       text,                          -- free text now; FK to team_members later
  fixed_at       timestamptz not null default now(),
  created_at     timestamptz not null default now()
);
create index if not exists remediation_site_time on remediation_log (site_id, fixed_at desc);

alter table activity_log    enable row level security;
alter table remediation_log enable row level security;

create policy "owner reads own activity" on activity_log
  for select using (exists (select 1 from sites s where s.id = activity_log.site_id and s.owner_id = auth.uid()));
create policy "owner reads own remediation" on remediation_log
  for select using (exists (select 1 from sites s where s.id = remediation_log.site_id and s.owner_id = auth.uid()));
