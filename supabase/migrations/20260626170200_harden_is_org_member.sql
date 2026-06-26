-- ───────────────────────────────────────────────────────────────────────────
-- Wave 3 follow-up hardening (2026-06-26). Resolves Supabase advisor lint
-- 0029_authenticated_security_definer_function_executable.
--
-- `is_org_member` must be EXECUTE-able by `authenticated` so the org-read RLS
-- policies can evaluate it — but granting that in the API-exposed `public` schema
-- also exposes it as a PostgREST RPC (`/rest/v1/rpc/is_org_member`). We move it
-- into a NON-exposed `private` schema: RLS policies call it by its qualified name
-- (which still works), but it is no longer reachable as an API endpoint.
--
-- Information-disclosure note: the function only ever reports the CALLER'S OWN
-- membership (`tm.user_id = auth.uid()`), so the RPC exposure was low-risk — but
-- removing the surface entirely is the correct, advisor-clean posture.
-- ───────────────────────────────────────────────────────────────────────────

create schema if not exists private;
grant usage on schema private to authenticated, service_role;

-- Recreate the helper in `private` (same SECURITY DEFINER + pinned search_path).
create or replace function private.is_org_member(org uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from team_members tm where tm.org_id = org and tm.user_id = auth.uid());
$$;
revoke all on function private.is_org_member(uuid) from public, anon;
grant execute on function private.is_org_member(uuid) to authenticated, service_role;

-- Repoint every org policy at the private helper, then drop the public one.
drop policy if exists "members read their orgs" on organizations;
create policy "members read their orgs" on organizations
  for select using (private.is_org_member(id) or created_by = auth.uid());

drop policy if exists "members read team" on team_members;
create policy "members read team" on team_members
  for select using (private.is_org_member(org_id));

drop policy if exists "members read invites" on team_invites;
create policy "members read invites" on team_invites
  for select using (private.is_org_member(org_id));

drop policy if exists "members read api keys" on api_keys;
create policy "members read api keys" on api_keys
  for select using (private.is_org_member(org_id));

drop policy if exists "org members read sites" on sites;
create policy "org members read sites" on sites
  for select using (org_id is not null and private.is_org_member(org_id));

drop function if exists public.is_org_member(uuid);
