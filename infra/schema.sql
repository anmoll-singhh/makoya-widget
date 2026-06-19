-- Makoya schema (Supabase / Postgres). Multi-tenant via RLS.
-- Apply in Supabase → SQL Editor.

create table if not exists sites (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  domain      text not null,
  plan        text not null default 'free',          -- free | pro | managed
  created_at  timestamptz not null default now()
);

create table if not exists site_config (
  site_id                    uuid primary key references sites(id) on delete cascade,
  primary_color              text    not null default '#2563eb',
  position                   text    not null default 'bottom-right',
  launcher_icon              text    not null default 'accessibility',
  features_enabled           text[]  not null default array[
    'textSize','lineSpacing','contrast','stopMotion','readingRuler',
    'highlightLinks','bigCursor','readableFont','hideImages',
    'saturation','readingMask','highlightTitles','textAlign','muteSounds','readAloud'
  ],
  hide_branding              boolean not null default false,
  launcher_size              text    not null default 'md',
  default_profile            text    not null default 'none',
  accessibility_statement_url text   not null default '',
  default_language           text    not null default 'en',
  panel_title                text    not null default '',
  updated_at                 timestamptz not null default now()
);

create table if not exists scans (
  id          uuid primary key default gen_random_uuid(),
  site_id     uuid references sites(id) on delete cascade,
  url         text not null,
  score       int  not null,
  totals      jsonb not null,        -- {critical, serious, moderate, minor, total}
  issues      jsonb not null,        -- grouped AccessibilityReport.issues
  created_at  timestamptz not null default now()
);

create table if not exists consultation_requests (
  id          uuid primary key default gen_random_uuid(),
  site_id     uuid references sites(id) on delete cascade,
  scan_id     uuid references scans(id) on delete set null,
  type        text not null default 'full_report',   -- full_report | book_call
  note        text,
  status      text not null default 'new',           -- new | contacted | won | lost
  created_at  timestamptz not null default now()
);

alter table sites                 enable row level security;
alter table site_config           enable row level security;
alter table scans                 enable row level security;
alter table consultation_requests enable row level security;

create policy "owner reads own sites" on sites
  for select using (owner_id = auth.uid());
create policy "owner writes own sites" on sites
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "owner manages own config" on site_config
  for all using (exists (select 1 from sites s where s.id = site_config.site_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from sites s where s.id = site_config.site_id and s.owner_id = auth.uid()));

create policy "owner reads own scans" on scans
  for select using (exists (select 1 from sites s where s.id = scans.site_id and s.owner_id = auth.uid()));

-- consultation_requests: RLS on, NO client policy → service role only.

-- ── ATOMIC DEFAULT CONFIG ─────────────────────────────────────────────────
-- Auto-create the default site_config row whenever a site is created.
create or replace function create_default_site_config()
returns trigger language plpgsql security definer as $$
begin
  insert into site_config (site_id) values (new.id);
  return new;
end; $$;
drop trigger if exists trg_create_default_site_config on sites;
create trigger trg_create_default_site_config
  after insert on sites for each row execute function create_default_site_config();
