-- 20260626210000_billing.sql — Wave 5A: Billing scaffold (#11).
--
-- Plan catalog quotas (server-side enforcement + future Stripe price wiring) and
-- per-site subscription state. Stripe columns are nullable placeholders until the
-- Stripe account exists. Slugs are the v3.1 catalog set (decoupled from the legacy
-- sites.plan values free|pro|managed, which are left untouched this wave).
--
-- The slug cutover (retiring pro/managed on sites.plan in favour of the catalog
-- set) is a DELIBERATE later step. This migration is purely additive: it adds new
-- tables alongside the live admin's sites.plan column and never changes it. The
-- legacy→catalog mapping (free→free, pro→growth, managed→scale) lives in the app
-- adapter (apps/web/lib/billing.ts → legacyToCatalogSlug), not in SQL.
--
-- Quota enforcement is SERVER-SIDE only and SOFT: over-quota → warn + upgrade
-- prompt, never a hard widget kill (widget rule #1: always render).
--
-- Honesty: nothing here asserts WCAG/ADA "compliance" or any "guarantee" — these
-- are commercial plan/quota records only.
create table if not exists plan_quotas (
  slug                    text primary key check (slug in ('free','starter','growth','scale','enterprise')),
  visit_limit             integer,  -- null = unlimited
  site_limit              integer,
  seat_limit              integer,
  vpat_per_year           integer,
  monthly_price_cents     integer,
  yearly_price_cents      integer,
  stripe_price_id_monthly text,
  stripe_price_id_yearly  text,
  updated_at              timestamptz not null default now()
);
insert into plan_quotas (slug, visit_limit, site_limit, seat_limit, vpat_per_year, monthly_price_cents, yearly_price_cents) values
  ('free',        1000,  1,    1,    0,    0,     0),
  ('starter',     5000,  1,    1,    0,    4500,  39000),
  ('growth',      30000, 3,    3,    1,    16900, 149000),
  ('scale',       100000,10,   10,   null, 44000, 390000),
  ('enterprise',  null,  null, null, null, null,  null)
on conflict (slug) do nothing;

create table if not exists billing_subscriptions (
  site_id                uuid primary key references sites(id) on delete cascade,
  plan_slug              text not null default 'free' check (plan_slug in ('free','starter','growth','scale','enterprise')),
  period                 text not null default 'yearly' check (period in ('monthly','yearly')),
  status                 text not null default 'inactive' check (status in ('inactive','trialing','active','past_due','canceled')),
  renews_at              timestamptz,
  stripe_customer_id     text,
  stripe_subscription_id text,
  updated_at             timestamptz not null default now()
);

alter table plan_quotas           enable row level security;
alter table billing_subscriptions enable row level security;
-- plan_quotas is reference data: readable by signed-in users, writes service-role only.
create policy "authenticated reads plan quotas" on plan_quotas
  for select to authenticated using (true);
-- subscription: owner reads own; writes service-role only (future Stripe webhook).
create policy "owner reads own subscription" on billing_subscriptions
  for select using (exists (select 1 from sites s where s.id = billing_subscriptions.site_id and s.owner_id = auth.uid()));
