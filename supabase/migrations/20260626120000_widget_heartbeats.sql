-- widget_heartbeats: one row per site, written by the public widget via the
-- service role (the widget is unauthenticated). Powers install-verification,
-- monitoring-streak and uptime for the v3.1 dashboard.
create table if not exists widget_heartbeats (
  site_id       uuid primary key references sites(id) on delete cascade,
  first_seen_at timestamptz not null default now(),
  last_seen_at  timestamptz not null default now(),
  ping_count    bigint      not null default 0,
  last_url      text
);

create table if not exists widget_uptime_days (
  site_id uuid    not null references sites(id) on delete cascade,
  day     date    not null,
  pings   integer not null default 0,
  primary key (site_id, day)
);

alter table widget_heartbeats  enable row level security;
alter table widget_uptime_days enable row level security;

-- Owners may READ their own site's liveness; WRITES are service-role only
-- (no insert/update policy → only the service key can write, mirroring leads).
create policy "owner reads own heartbeat" on widget_heartbeats
  for select using (exists (select 1 from sites s where s.id = widget_heartbeats.site_id and s.owner_id = auth.uid()));
create policy "owner reads own uptime" on widget_uptime_days
  for select using (exists (select 1 from sites s where s.id = widget_uptime_days.site_id and s.owner_id = auth.uid()));
