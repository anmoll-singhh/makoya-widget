-- monthly_reports: per-site monthly rollup powering the v3.1 Reports table and
-- the Overview compliance-trend. Written by a recompute job via the service role.
create table if not exists monthly_reports (
  site_id         uuid not null references sites(id) on delete cascade,
  period          text not null,                -- 'YYYY-MM'
  score           int,
  issues_found    int  not null default 0,
  issues_resolved int  not null default 0,
  pdf_url         text,
  computed_at     timestamptz not null default now(),
  primary key (site_id, period)
);
alter table monthly_reports enable row level security;
create policy "owner reads own monthly reports" on monthly_reports
  for select using (exists (select 1 from sites s where s.id = monthly_reports.site_id and s.owner_id = auth.uid()));
