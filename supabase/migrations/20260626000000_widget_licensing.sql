-- Phase 1 — Widget License & Domain Gate
--
-- Adds per-site license + domain-allowlist columns so the public config endpoint
-- can gate the widget (monitor → enforce). Behaviour-neutral on its own:
--   * license_status defaults to 'active' → every existing/new row is grandfathered.
--   * allowed_domains is backfilled (apex + www) from the existing bare-host domain.
-- The public endpoint reads these via the service-role client (bypasses RLS), so
-- no RLS policy change is needed here.

alter table sites
  add column if not exists license_status  text        not null default 'active',
  add column if not exists trial_ends_at    timestamptz,
  add column if not exists allowed_domains  text[]      not null default '{}';

alter table sites drop constraint if exists sites_license_status_chk;
alter table sites add constraint sites_license_status_chk
  check (license_status in ('active','trial','past_due','suspended','canceled'));

update sites
set allowed_domains = array_remove(array[
      lower(domain),
      case when lower(domain) like 'www.%' then substring(lower(domain) from 5)
           else 'www.' || lower(domain) end
    ], null)
where coalesce(array_length(allowed_domains,1),0) = 0;
