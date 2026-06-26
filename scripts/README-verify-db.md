# DB verification harness (`scripts/verify-db.mjs`)

Proves the Supabase schema is solid on demand. It applies **every** migration in
`supabase/migrations/` (in filename order) to a **real Postgres 16**, then runs a
suite of assertions over RLS, triggers, and the tenancy backfill. Exits non-zero
on any failure; always tears down the throwaway database.

It never touches a cloud/prod database — only a local Docker container or a CI
service container.

## Run it

```bash
# Local — spins up an ephemeral postgres:16 Docker container (needs Docker):
npm run verify:db
#   …or directly:
node scripts/verify-db.mjs

# Against an existing Postgres (CI, or a local instance you control):
DATABASE_URL=postgres://user:pass@host:5432/db node scripts/verify-db.mjs
```

- **No `DATABASE_URL`** → boots `postgres:16` via `docker run` on a free port with
  a randomly-generated throwaway password, waits for readiness, runs, then
  `docker rm -f` in a `finally`.
- **`DATABASE_URL` set** → targets that database, spins **no** Docker. This is how
  `.github/workflows/db-verify.yml` runs it against a `services: postgres:16`
  container. One script, both environments.

## What it checks

1. **Migrations apply cleanly** — fails loudly with the offending filename + SQL
   error if any migration breaks.
2. **Trigger** — inserting a `sites` row auto-creates exactly one `site_config`
   row with the full 15-element `features_enabled` default.
3. **RLS enabled** — every table in `public` has row-level security on.
4. **Service-only tables** — `leads` and `consultation_requests` have RLS on and
   **zero** policies (only the service role can touch them).
5. **Cross-tenant isolation** — as role `authenticated`, owner A reads only their
   own site, an `UPDATE` of owner B's site affects 0 rows, and `authenticated`
   reads 0 rows from `leads`.
6. **Backfill idempotency** — re-running `20260626170100_tenancy_backfill.sql`
   leaves the org count unchanged, keeps exactly one org per owner, and leaves no
   site with a null `org_id`.

## How it fakes Supabase on vanilla Postgres

Migrations assume a Supabase project. Before applying them the script installs a
faithful shim:

- schema `auth` with `auth.users(id, email)` and `auth.uid()` (reads the request
  JWT subject from `request.jwt.claim.sub`);
- roles `anon`, `authenticated`, `service_role` (the last with `BYPASSRLS`, as in
  Supabase);
- the `pgcrypto` extension (for `gen_random_uuid()`).

After migrations it applies Supabase's default table/function grants so that
**RLS** — not a missing `GRANT` — is what governs access. `EXECUTE` is granted to
`authenticated`/`service_role` only (never `anon`), preserving the migrations'
deliberate revoke of SECURITY DEFINER helpers from `anon`/`public`.

## Requirements

- Node 18+ and the `pg` devDependency (installed via `npm install`).
- Docker (only for the local, no-`DATABASE_URL` path).
