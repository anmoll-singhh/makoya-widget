-- ───────────────────────────────────────────────────────────────────────────
-- Phase H hardening (2026-06-25): lock down the SECURITY DEFINER trigger helper.
--
-- `create_default_site_config` is a TRIGGER function (fires on `sites` insert to
-- auto-create the default `site_config` row). The Supabase security linter flagged
-- it three ways:
--   0011 function_search_path_mutable         — no pinned search_path
--   0028 anon_security_definer_function_exec   — callable by anon via /rest/v1/rpc/
--   0029 authenticated_security_definer_..._exec — callable by signed-in users too
--
-- Fix:
--  1. Pin search_path (+ schema-qualify the table) so a malicious search_path
--     can't redirect the INSERT to an attacker-controlled object.
--  2. REVOKE direct EXECUTE from anon / authenticated / public so it can't be
--     invoked as an RPC. Trigger execution is UNAFFECTED — triggers run as the
--     table owner regardless of EXECUTE grants.
--
-- Applied to prod via Supabase MCP on 2026-06-25 (founder-approved); this file is
-- the canonical record per the supabase/migrations convention.
-- ───────────────────────────────────────────────────────────────────────────

create or replace function public.create_default_site_config()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.site_config (site_id) values (new.id);
  return new;
end; $$;

revoke execute on function public.create_default_site_config() from anon, authenticated, public;
