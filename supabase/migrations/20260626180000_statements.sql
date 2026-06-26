-- Accessibility statement generator (v3.1 Statement screen). One current
-- statement per site; owners create/update their own. The generated HTML states
-- a commitment + conformance target — NOT a certification (compliance guardrail).
create table if not exists accessibility_statements (
  site_id            uuid primary key references sites(id) on delete cascade,
  brand_name         text not null,
  jurisdictions      text[] not null default '{}',     -- subset of: ada, aoda, aca, eaa
  conformance_target text not null default 'WCAG 2.1 AA',
  contact_email      text not null,
  html               text not null,
  updated_at         timestamptz not null default now()
);
alter table accessibility_statements enable row level security;
create policy "owner manages own statement" on accessibility_statements
  for all  using (exists (select 1 from sites s where s.id = accessibility_statements.site_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from sites s where s.id = accessibility_statements.site_id and s.owner_id = auth.uid()));
