-- ───────────────────────────────────────────────────────────────────────────
-- Wave 3 backfill (2026-06-26). WRITE-ONLY: not applied yet.
--
-- Gives every EXISTING site owner a one-person organization, makes them an
-- 'owner' team_member, and points each of their sites at that org. This makes the
-- later child-table cutover trivial (every site already has an org_id) while
-- staying behaviour-neutral today: the additive org SELECT policy only grants
-- access to members, and the original owner_id policies are untouched.
--
-- Idempotent-ish: only processes sites whose org_id is still null, and the
-- team_members insert is ON CONFLICT DO NOTHING. Safe to run on a near-empty
-- production set.
-- ───────────────────────────────────────────────────────────────────────────
do $$
declare r record; new_org uuid; owner_email text;
begin
  for r in (select distinct owner_id from sites where org_id is null) loop
    insert into organizations (name, created_by) values ('My Organization', r.owner_id)
      returning id into new_org;
    select email into owner_email from auth.users where id = r.owner_id;
    insert into team_members (org_id, user_id, email, role)
      values (new_org, r.owner_id, coalesce(owner_email, 'owner@unknown'), 'owner')
      on conflict (org_id, email) do nothing;
    update sites set org_id = new_org where owner_id = r.owner_id and org_id is null;
  end loop;
end $$;
