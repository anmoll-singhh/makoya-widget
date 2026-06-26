-- 20260626200000_settings.sql — Wave 4C: Settings + customize extras (#6/#12).
--
-- Two concerns, two homes, kept deliberately separate:
--
--  • Part A — widget-RUNTIME config extras live on `site_config`. That table is
--    surfaced (only its safe display fields) through the PUBLIC config JSON at
--    /api/config/[siteId], so these four flags are safe to expose: they only
--    change how the widget behaves on the host page.
--
--  • Part B — owner/account settings (contact details + notification prefs) are
--    PRIVATE. They must NEVER reach the widget, so they get their own table
--    (`site_settings`) that the public config endpoint never reads, guarded by
--    owner-scoped RLS. This is the same "never leak account metadata into the
--    public config" discipline the codebase uses for `leads`.

-- ── Part A: widget-runtime config extras on site_config (served in public config) ──
alter table site_config add column if not exists custom_trigger_selector text    not null default '';
alter table site_config add column if not exists dom_observer_enabled    boolean not null default true;
alter table site_config add column if not exists inherit_fonts           boolean not null default false;
alter table site_config add column if not exists mobile_enabled          boolean not null default true;

-- ── Part B: private per-site owner/account settings (NEVER served to the widget) ──
create table if not exists site_settings (
  site_id            uuid primary key references sites(id) on delete cascade,
  owner_name         text not null default '',
  owner_email        text not null default '',
  owner_phone        text not null default '',
  notification_prefs jsonb not null default '{}'::jsonb,
  updated_at         timestamptz not null default now()
);
alter table site_settings enable row level security;
create policy "owner manages own settings" on site_settings
  for all  using (exists (select 1 from sites s where s.id = site_settings.site_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from sites s where s.id = site_settings.site_id and s.owner_id = auth.uid()));
