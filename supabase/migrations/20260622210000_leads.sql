-- Phase 1 — funnel leads from the public scanner.
--
-- A lead is ANONYMOUS: just an email + the URL they scanned + the summary score.
-- There is no account and no site_id yet (that's the whole point of the funnel —
-- capture intent before signup). This is why it cannot reuse consultation_requests,
-- which is keyed to an existing site_id.
--
-- Service-role only: RLS is ENABLED with NO policy, so the anon/auth clients can
-- never read it. Only the operator CRM (getAdminSupabase()) and the public ingest
-- route (also service-role, after validation) touch this table. This matches the
-- original "leads is service-role only" design intent.

create table if not exists leads (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  url         text not null,
  score       int,                                   -- 0..100, nullable if unknown
  totals      jsonb not null default '{}'::jsonb,    -- {critical, serious, moderate, minor, total}
  status      text not null default 'new',           -- new | contacted | qualified | won | lost
  source      text not null default 'scanner',       -- where the lead came from
  created_at  timestamptz not null default now()
);

alter table leads enable row level security;
-- Intentionally NO policy → only the service role can read/write.

create index if not exists leads_created_at_idx on leads (created_at desc);
create index if not exists leads_status_idx on leads (status);
