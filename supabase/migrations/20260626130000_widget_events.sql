-- widget_events: raw widget-usage telemetry, written by the public widget via
-- the service role. widget_event_daily is the pre-aggregated rollup the v3.1
-- Analytics screen reads (opens, feature activations, most-used, over-time).
create table if not exists widget_events (
  id          uuid primary key default gen_random_uuid(),
  site_id     uuid not null references sites(id) on delete cascade,
  event       text not null check (event in ('open','feature_activated')),
  feature_key text,
  occurred_at timestamptz not null default now()
);
create index if not exists widget_events_site_time on widget_events (site_id, occurred_at);

create table if not exists widget_event_daily (
  site_id     uuid    not null references sites(id) on delete cascade,
  day         date    not null,
  event       text    not null,
  feature_key text    not null default '',
  count       integer not null default 0,
  primary key (site_id, day, event, feature_key)
);

alter table widget_events      enable row level security;
alter table widget_event_daily enable row level security;

-- Owners READ their own analytics; WRITES are service-role only (no write policy).
create policy "owner reads own events" on widget_events
  for select using (exists (select 1 from sites s where s.id = widget_events.site_id and s.owner_id = auth.uid()));
create policy "owner reads own event daily" on widget_event_daily
  for select using (exists (select 1 from sites s where s.id = widget_event_daily.site_id and s.owner_id = auth.uid()));
