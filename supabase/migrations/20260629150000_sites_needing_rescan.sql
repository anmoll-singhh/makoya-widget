-- ───────────────────────────────────────────────────────────────────────────
-- sites_needing_rescan(p_stale_before, p_limit, p_after) (2026-06-29).
--
-- WHY: the daily rescan cron previously did an N+1 — one "latest scan" query per
-- site inside a single 60s function, then scanned inline. That dies at a few
-- hundred sites. The new producer cron instead ENQUEUES stale sites onto a Redis
-- queue (a worker fan-out scans them), and needs ONE set-based, keyset-paginated
-- query to find stale sites cheaply at hundreds-of-thousands scale.
--
-- Returns site ids whose most-recent scan is older than p_stale_before (or who
-- have never been scanned), ordered by id for keyset pagination via p_after.
-- The LATERAL "latest scan" uses scans(site_id, created_at desc) — the index added
-- in 20260629120000_perf_rls_initplan_and_indexes.sql (scans_site_created_idx).
--
-- SECURITY: SECURITY INVOKER. Sole caller is the cron via the SERVICE ROLE (which
-- bypasses RLS). EXECUTE granted to service_role only; revoked from anon/auth/public
-- so it is never reachable as a browser-facing PostgREST RPC.
-- ───────────────────────────────────────────────────────────────────────────

create or replace function public.sites_needing_rescan(
  p_stale_before timestamptz,
  p_limit int,
  p_after uuid default null
)
returns table(id uuid)
language sql
stable
set search_path = public
as $$
  select s.id
  from sites s
  left join lateral (
    select created_at
    from scans
    where site_id = s.id
    order by created_at desc
    limit 1
  ) ls on true
  where (ls.created_at is null or ls.created_at < p_stale_before)
    and (p_after is null or s.id > p_after)
  order by s.id
  limit p_limit;
$$;

revoke all on function public.sites_needing_rescan(timestamptz, int, uuid) from public, anon, authenticated;
grant execute on function public.sites_needing_rescan(timestamptz, int, uuid) to service_role;
