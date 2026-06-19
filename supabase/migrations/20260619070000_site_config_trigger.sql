-- Atomic default config: when a site is created, auto-create its site_config row.
-- Removes the orphaned-site window (previously a second insert in app code).
create or replace function create_default_site_config()
returns trigger language plpgsql security definer as $$
begin
  insert into site_config (site_id) values (new.id);
  return new;
end; $$;

drop trigger if exists trg_create_default_site_config on sites;
create trigger trg_create_default_site_config
  after insert on sites
  for each row execute function create_default_site_config();
