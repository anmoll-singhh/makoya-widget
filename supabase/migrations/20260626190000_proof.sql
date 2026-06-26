-- Proof-of-effort evidence records (v3.1 Proof of effort screen). VPAT/ACR docs
-- and manual expert audits are recorded by Makoya (service role); owners read
-- their own. The pack aggregates these with scans/remediation/statement/heartbeat.
create table if not exists vpat_documents (
  id           uuid primary key default gen_random_uuid(),
  site_id      uuid not null references sites(id) on delete cascade,
  title        text not null,
  url          text not null,
  generated_on date,
  created_at   timestamptz not null default now()
);
create table if not exists manual_audits (
  id           uuid primary key default gen_random_uuid(),
  site_id      uuid not null references sites(id) on delete cascade,
  auditor      text not null,
  summary      text,
  report_url   text,
  performed_on date,
  created_at   timestamptz not null default now()
);
alter table vpat_documents enable row level security;
alter table manual_audits  enable row level security;
create policy "owner reads own vpat" on vpat_documents
  for select using (exists (select 1 from sites s where s.id = vpat_documents.site_id and s.owner_id = auth.uid()));
create policy "owner reads own manual audits" on manual_audits
  for select using (exists (select 1 from sites s where s.id = manual_audits.site_id and s.owner_id = auth.uid()));
