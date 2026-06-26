-- ───────────────────────────────────────────────────────────────────────────
-- Wave 3 — Onboarding trigger (2026-06-26). Auto-provision tenancy on site create.
--
-- WHY
-- ---
-- The `20260626170100_tenancy_backfill.sql` migration gave EXISTING sites an org,
-- an 'owner' membership, and an org_id — but it ran once. NEW sites (from any
-- creation path: the dashboard, the admin Add-Customer form, a future API) still
-- got NOTHING: no organization, no team_members row, a null sites.org_id, and no
-- billing_subscriptions row. That leaves every freshly created site half-tenanted
-- and unbilled until someone re-runs the backfill by hand.
--
-- This migration closes that gap at the DATABASE layer (not the app layer) so the
-- guarantee holds for every path, atomically, inside the same transaction as the
-- INSERT. An AFTER INSERT trigger on `sites`:
--   1. Reuses the owner's existing org if they already have a team_members row
--      (so a second site for the same owner shares ONE org — never a duplicate).
--   2. Otherwise creates organizations(name = the site's domain, created_by = owner)
--      and a team_members 'owner' row for that owner.
--   3. Stamps sites.org_id (only when it was left null — explicit org assignment by
--      a creation path is respected).
--   4. Seeds one free/yearly/inactive billing_subscriptions row for the site.
--
-- CONVENTIONS (mirrors 20260625000000_harden_create_default_site_config.sql)
--   * SECURITY DEFINER with a pinned `search_path = public, pg_temp` so a hostile
--     search_path can't redirect the writes to attacker-controlled objects.
--   * Trigger functions run as the table owner regardless of EXECUTE grants, so no
--     extra grant/revoke is required. It is never exposed as an RPC.
--   * Idempotent + non-blocking: the membership insert is ON CONFLICT DO NOTHING and
--     the subscription insert is ON CONFLICT (site_id) DO NOTHING, so the trigger
--     can NEVER abort a legitimate site insert. Order versus the existing
--     create_default_site_config trigger does not matter.
--
-- Honesty: this only provisions tenancy + a commercial plan record; it asserts no
-- WCAG/ADA "compliance" of any kind.
-- ───────────────────────────────────────────────────────────────────────────

create or replace function public.provision_site_tenancy()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_org   uuid;
  owner_email  text;
begin
  -- 1. Reuse an org this user OWNS (role 'owner') — NOT merely one they belong to.
  -- Matching on membership alone would, once team invites ship, attach a brand-new
  -- owner's first site to a DIFFERENT tenant's org they were invited into (e.g. as a
  -- 'developer'), leaking it cross-tenant via the org-read policy (review H1). The
  -- role filter + deterministic order close that.
  select tm.org_id into target_org
    from public.team_members tm
   where tm.user_id = new.owner_id
     and tm.role = 'owner'
   order by tm.created_at
   limit 1;

  -- 2. Otherwise mint a fresh org + an 'owner' membership for this owner.
  if target_org is null then
    insert into public.organizations (name, created_by)
      values (new.domain, new.owner_id)
      returning id into target_org;

    select email into owner_email from auth.users where id = new.owner_id;

    insert into public.team_members (org_id, user_id, email, role)
      values (target_org, new.owner_id, coalesce(owner_email, 'owner@unknown'), 'owner')
      on conflict (org_id, email) do nothing;
  end if;

  -- 3. Stamp org_id only when the creation path didn't set one explicitly.
  if new.org_id is null then
    update public.sites set org_id = target_org where id = new.id;
  end if;

  -- 4. Seed a free subscription for the new site (idempotent safety net).
  insert into public.billing_subscriptions (site_id, plan_slug, period, status)
    values (new.id, 'free', 'yearly', 'inactive')
    on conflict (site_id) do nothing;

  return new;
end; $$;

-- Belt-and-braces: this is a trigger function, not an RPC. Strip any default
-- PUBLIC execute grant so it can't be invoked via /rest/v1/rpc/ (trigger
-- execution is unaffected — triggers run as the table owner).
revoke execute on function public.provision_site_tenancy() from anon, authenticated, public;

drop trigger if exists provision_site_tenancy_trigger on public.sites;
create trigger provision_site_tenancy_trigger
  after insert on public.sites
  for each row execute function public.provision_site_tenancy();
