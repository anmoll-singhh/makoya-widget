-- ───────────────────────────────────────────────────────────────────────────
-- Wave 3 — Org / Team / Roles tenancy (2026-06-26). WRITE-ONLY: not applied yet.
--
-- ADDITIVE by design. The app is single-user today: `sites` is gated by
-- `owner_id = auth.uid()` and every child table by an
-- `exists(select 1 from sites s where s.id = <tbl>.site_id and s.owner_id = auth.uid())`
-- subquery (see infra/schema.sql). Those owner policies MUST keep working.
--
-- This migration LAYERS an org/team model on top WITHOUT removing or weakening
-- any existing policy:
--   * `sites.org_id` is added NULLABLE — existing rows stay null, so the existing
--     owner_id policy is unaffected and keeps gating them exactly as before.
--   * NEW org-membership SELECT policies are added ALONGSIDE the owner policies.
--     Postgres permissive policies are OR'd, so org members GAIN read access
--     without the owner ever losing theirs. We do NOT drop/replace any policy and
--     we do NOT touch child-table (site_config / scans / consultation_requests)
--     policies this wave — that full cutover is deferred.
--
-- The membership helper follows the Phase-H hardening convention
-- (20260625000000_harden_create_default_site_config.sql): SECURITY DEFINER with a
-- pinned search_path, and EXECUTE revoked from anon/public so it can't be abused
-- as an RPC. It is SECURITY DEFINER so the org SELECT policies can read
-- team_members without recursing into team_members' own RLS.
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists organizations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists team_members (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references organizations(id) on delete cascade,
  user_id    uuid references auth.users(id) on delete cascade,  -- null until invite accepted
  email      text not null,
  role       text not null check (role in ('owner','admin','developer')),
  created_at timestamptz not null default now(),
  unique (org_id, email)
);
create index if not exists team_members_user on team_members (user_id);

create table if not exists team_invites (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  email       text not null,
  role        text not null check (role in ('owner','admin','developer')),
  token_hash  text not null unique,                 -- store only a hash of the invite token
  invited_by  uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  created_at  timestamptz not null default now()
);

create table if not exists api_keys (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organizations(id) on delete cascade,
  name         text not null,
  key_hash     text not null,        -- SHA-256 of the raw key; raw key shown once, never stored
  prefix       text not null,        -- first 8 chars for display
  created_by   uuid references auth.users(id) on delete set null,
  last_used_at timestamptz,
  revoked_at   timestamptz,
  created_at   timestamptz not null default now()
);

-- org_id on sites (nullable, additive — existing owner_id policy unaffected).
alter table sites add column if not exists org_id uuid references organizations(id) on delete set null;
create index if not exists sites_org on sites (org_id);

-- issues.assignee_id → team_members (the column is introduced by Wave 2A). Guarded
-- so this write-only migration is safe to apply in any wave order: the FK is added
-- only when the `issues` table + `assignee_id` column exist and the FK is absent.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'issues' and column_name = 'assignee_id'
  ) and not exists (
    select 1 from pg_constraint where conname = 'issues_assignee_fk'
  ) then
    alter table issues
      add constraint issues_assignee_fk
      foreign key (assignee_id) references team_members(id) on delete set null;
  end if;
end $$;

-- Membership helper (SECURITY DEFINER + pinned search_path per the hardening convention).
create or replace function is_org_member(org uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from team_members tm where tm.org_id = org and tm.user_id = auth.uid());
$$;
revoke all on function is_org_member(uuid) from public, anon;

alter table organizations enable row level security;
alter table team_members  enable row level security;
alter table team_invites  enable row level security;
alter table api_keys      enable row level security;

-- Members read their orgs; the creator can always read (bootstrap before membership row exists).
create policy "members read their orgs" on organizations
  for select using (is_org_member(id) or created_by = auth.uid());
-- Members read their org's roster; writes are service-role only this wave (no write policy).
create policy "members read team" on team_members
  for select using (is_org_member(org_id));
create policy "members read invites" on team_invites
  for select using (is_org_member(org_id));
create policy "members read api keys" on api_keys
  for select using (is_org_member(org_id));

-- ADDITIVE org read on sites — alongside (NOT replacing) the existing owner_id policy.
create policy "org members read sites" on sites
  for select using (org_id is not null and is_org_member(org_id));
