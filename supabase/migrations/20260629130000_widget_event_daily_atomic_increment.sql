-- ───────────────────────────────────────────────────────────────────────────
-- widget_event_daily atomic bulk-increment (2026-06-29).
--
-- WHY: lib/analytics.recordEvents previously incremented the rollup with a
-- per-bucket SELECT current count → UPSERT (count+delta) loop. Two problems at
-- scale: (1) it is O(buckets) round-trips per ingest POST — up to ~16 SELECT+UPSERT
-- pairs for a single batch; (2) the read-modify-write is racy — two concurrent
-- POSTs for the same bucket can both read N and both write N+1, LOSING an event.
--
-- This function does the whole rollup in ONE atomic statement: a set-based
-- INSERT … ON CONFLICT DO UPDATE that adds the batch deltas to the stored count.
-- `excluded.count` is the per-row delta we passed in; the conflict target is the
-- table's composite PK. One round-trip, no lost updates.
--
-- SECURITY: SECURITY INVOKER (default). The only caller is the public ingest route
-- via the SERVICE ROLE (which already bypasses RLS — widget_event_daily has no
-- write policy by design). EXECUTE is granted to service_role ONLY and revoked from
-- anon/authenticated/public, so it is never reachable as a PostgREST RPC by a
-- browser client.
-- ───────────────────────────────────────────────────────────────────────────

create or replace function public.increment_widget_event_daily(p_site_id uuid, p_rows jsonb)
returns void
language sql
set search_path = public
as $$
  insert into widget_event_daily (site_id, day, event, feature_key, count)
  select
    p_site_id,
    (r->>'day')::date,
    r->>'event',
    coalesce(r->>'feature_key', ''),
    (r->>'delta')::int
  from jsonb_array_elements(p_rows) as r
  on conflict (site_id, day, event, feature_key)
  do update set count = widget_event_daily.count + excluded.count;
$$;

revoke all on function public.increment_widget_event_daily(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.increment_widget_event_daily(uuid, jsonb) to service_role;
