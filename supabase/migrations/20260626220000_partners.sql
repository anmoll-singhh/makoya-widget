-- ───────────────────────────────────────────────────────────────────────────
-- Wave 5B — Partner / agency program (v3.1 Partners screen). WRITE-ONLY: not
-- applied yet. ADDITIVE: layers a reseller program on top of the LIVE org/team
-- tenancy model without touching any existing table or policy.
--
-- A *partner* is an organization enrolled as a reseller. It manages client
-- organizations, can white-label the experience, and earns recurring commission.
--
-- RLS REUSE: every read policy here reuses the hardened, qualified helper
-- `private.is_org_member(org uuid)` (from 20260626170200_harden_is_org_member.sql)
-- so partner data is visible ONLY to members of the partner's own org. There are
-- NO write policies — exactly like team_invites / api_keys, all writes happen via
-- the service role from authed, role-gated routes (never from the browser).
--
-- Guardrail note: white-label here is cosmetic branding only (brand name, logo,
-- color, support email, hiding Makoya branding). It carries NO accessibility
-- "compliance" / "guarantee" claims.
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists partner_accounts (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null unique references organizations(id) on delete cascade,
  status              text not null default 'active' check (status in ('active','suspended')),
  commission_rate     numeric(5,4) not null default 0.2000,  -- 0..1
  white_label_enabled boolean not null default false,
  created_at          timestamptz not null default now()
);

create table if not exists partner_clients (
  id            uuid primary key default gen_random_uuid(),
  partner_id    uuid not null references partner_accounts(id) on delete cascade,
  client_org_id uuid not null references organizations(id) on delete cascade,
  created_at    timestamptz not null default now(),
  unique (partner_id, client_org_id)
);

create table if not exists white_label_config (
  partner_id           uuid primary key references partner_accounts(id) on delete cascade,
  brand_name           text not null default '',
  logo_url             text not null default '',
  primary_color        text not null default '',
  support_email        text not null default '',
  hide_makoya_branding boolean not null default true,
  updated_at           timestamptz not null default now()
);

create table if not exists partner_commissions (
  id           uuid primary key default gen_random_uuid(),
  partner_id   uuid not null references partner_accounts(id) on delete cascade,
  period       text not null,                 -- 'YYYY-MM'
  amount_cents integer not null default 0,
  status       text not null default 'pending' check (status in ('pending','paid')),
  created_at   timestamptz not null default now(),
  unique (partner_id, period)
);

alter table partner_accounts    enable row level security;
alter table partner_clients     enable row level security;
alter table white_label_config  enable row level security;
alter table partner_commissions enable row level security;

-- A partner's own org members may READ the partner records; writes are
-- service-role only (no write policy → like team_invites / api_keys).
create policy "partner org reads partner account" on partner_accounts
  for select using (private.is_org_member(org_id));
create policy "partner org reads clients" on partner_clients
  for select using (exists (select 1 from partner_accounts pa where pa.id = partner_clients.partner_id and private.is_org_member(pa.org_id)));
create policy "partner org reads white label" on white_label_config
  for select using (exists (select 1 from partner_accounts pa where pa.id = white_label_config.partner_id and private.is_org_member(pa.org_id)));
create policy "partner org reads commissions" on partner_commissions
  for select using (exists (select 1 from partner_accounts pa where pa.id = partner_commissions.partner_id and private.is_org_member(pa.org_id)));
