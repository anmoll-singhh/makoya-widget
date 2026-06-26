// ─────────────────────────────────────────────────────────────────────────────
// scripts/verify-db.mjs — Makoya DB verification harness.
//
// WHY THIS EXISTS
// ---------------
// The Supabase schema (supabase/migrations/*.sql) is the security spine of the
// product: multi-tenant isolation is enforced entirely by Postgres RLS, the
// default-config trigger removes the orphaned-site window, and the tenancy
// backfill must be safe to re-run. Until now "is the schema solid?" was a manual
// ritual (paste SQL into the Supabase editor, eyeball it). This script CODIFIES
// that ritual so the answer is a single command — locally and in CI.
//
// WHAT IT PROVES (each assertion prints PASS/FAIL; ANY failure → exit non-zero)
//   1. Every migration applies cleanly, in filename order, to a REAL Postgres 16.
//   2. The site_config trigger auto-creates exactly one config row with the full
//      15-feature default array.
//   3. RLS is enabled on every public table.
//   4. `leads` and `consultation_requests` are RLS-on with ZERO policies
//      (service-role-only by construction).
//   5. Cross-tenant reads/writes are impossible for role `authenticated`
//      (owner A cannot see or modify owner B's site; nobody reads `leads`).
//   6. The tenancy backfill is idempotent (re-running it changes nothing:
//      one org per owner, no null-org sites).
//
// HOW IT TALKS TO POSTGRES
//   - If DATABASE_URL is set (e.g. a GitHub Actions `services: postgres:16`
//     container), it targets that and spins up NO Docker.
//   - Otherwise it boots an ephemeral `postgres:16` container via `docker run`
//     on a free port with a throwaway password, waits for readiness, runs, and
//     ALWAYS tears the container down in a `finally`.
//
// Migrations target real Supabase, so before applying them we install a faithful
// SHIM (auth schema + auth.users + auth.uid() + anon/authenticated/service_role
// roles + pgcrypto). This script NEVER touches a cloud/prod database.
// ─────────────────────────────────────────────────────────────────────────────

import { execSync } from 'node:child_process';
import { createServer } from 'node:net';
import { randomBytes, randomUUID } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pg from 'pg';

const { Client } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, '..', 'supabase', 'migrations');
const BACKFILL_FILE = '20260626170100_tenancy_backfill.sql';

// The canonical default feature set new sites get (widget_config_v3 migration).
const EXPECTED_FEATURE_COUNT = 15;
// Tables that must have RLS on and NO policy (only the service role touches them).
const SERVICE_ONLY_TABLES = ['leads', 'consultation_requests'];

// ── tiny test harness ───────────────────────────────────────────────────────
const results = [];
function record(name, ok, detail = '') {
  results.push({ name, ok });
  const tag = ok ? 'PASS' : 'FAIL';
  console.log(`  [${tag}] ${name}${detail ? ` — ${detail}` : ''}`);
}
async function assert(name, fn) {
  try {
    const detail = await fn();
    record(name, true, detail || '');
  } catch (err) {
    record(name, false, err && err.message ? err.message : String(err));
  }
}

// ── docker helpers ────────────────────────────────────────────────────────────
function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

function sh(cmd) {
  return execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim();
}

async function connectWithRetry(connectionString, { tries = 40, delayMs = 1000 } = {}) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    const client = new Client({ connectionString });
    try {
      await client.connect();
      return client;
    } catch (err) {
      lastErr = err;
      try { await client.end(); } catch { /* noop */ }
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new Error(`Could not connect to Postgres after ${tries} tries: ${lastErr?.message}`);
}

// ── the Supabase shim ─────────────────────────────────────────────────────────
// Reproduces, on vanilla Postgres, the bits of a Supabase project the migrations
// assume already exist. Faithful to Supabase: service_role has BYPASSRLS.
const SHIM_SQL = `
create extension if not exists pgcrypto;

create schema if not exists auth;

create table if not exists auth.users (
  id    uuid primary key default gen_random_uuid(),
  email text
);

-- Supabase's auth.uid(): the current request's JWT subject, or null.
create or replace function auth.uid() returns uuid
  language sql stable
  as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end $$;
`;

// After migrations, mirror Supabase's default table grants so RLS (not a missing
// GRANT) is what governs anon/authenticated access. Security still comes from RLS;
// these grants are exactly what Supabase issues out of the box.
// NB: we grant EXECUTE only to authenticated/service_role, NOT anon. Supabase's
// default privileges hand EXECUTE to anon/authenticated/service_role; the tenancy
// migration deliberately REVOKEs it from anon/public for SECURITY DEFINER helpers
// (so they can't be abused as RPCs) while leaving authenticated able to call them
// from inside RLS policies. Granting anon here would mask that revoke.
const GRANTS_SQL = `
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public
  to anon, authenticated, service_role;
grant execute on all functions in schema public to authenticated, service_role;
`;

async function applyMigrations(client) {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  console.log(`\nApplying ${files.length} migration(s) from supabase/migrations/ …`);
  for (const file of files) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
    try {
      await client.query(sql);
      console.log(`  applied ${file}`);
    } catch (err) {
      throw new Error(`Migration FAILED: ${file}\n        ${err.message}`);
    }
  }
  return files;
}

// ── the assertions ────────────────────────────────────────────────────────────
async function runAssertions(client) {
  console.log('\nRunning assertions …');

  // 1. Trigger: a new site auto-creates exactly one 15-feature site_config row.
  await assert('trigger: site insert auto-creates one 15-feature site_config', async () => {
    const owner = randomUUID();
    await client.query('insert into auth.users (id, email) values ($1, $2)', [
      owner,
      'trigger@example.com',
    ]);
    const { rows } = await client.query(
      "insert into sites (owner_id, domain) values ($1, 'trigger.example.com') returning id",
      [owner],
    );
    const siteId = rows[0].id;
    const cfg = await client.query(
      'select features_enabled from site_config where site_id = $1',
      [siteId],
    );
    if (cfg.rowCount !== 1) throw new Error(`expected 1 site_config row, got ${cfg.rowCount}`);
    const feats = cfg.rows[0].features_enabled;
    if (!Array.isArray(feats) || feats.length !== EXPECTED_FEATURE_COUNT) {
      throw new Error(`expected ${EXPECTED_FEATURE_COUNT} features, got ${feats?.length}`);
    }
    return `1 config row, ${feats.length} features`;
  });

  // 2. RLS enabled on every public table.
  await assert('RLS enabled on every public table', async () => {
    const { rows } = await client.query(`
      select c.relname
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity = false
       order by c.relname
    `);
    if (rows.length > 0) {
      throw new Error(`tables WITHOUT RLS: ${rows.map((r) => r.relname).join(', ')}`);
    }
    const total = await client.query(`
      select count(*)::int as n
        from pg_class c join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relkind = 'r'
    `);
    return `all ${total.rows[0].n} public tables have RLS`;
  });

  // 3. Service-only tables: RLS on, ZERO policies.
  for (const tbl of SERVICE_ONLY_TABLES) {
    await assert(`service-only table \`${tbl}\`: RLS on, zero policies`, async () => {
      const rls = await client.query(
        `select c.relrowsecurity
           from pg_class c join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = 'public' and c.relname = $1`,
        [tbl],
      );
      if (rls.rowCount !== 1) throw new Error(`table ${tbl} not found`);
      if (rls.rows[0].relrowsecurity !== true) throw new Error('RLS is OFF');
      const pol = await client.query(
        `select count(*)::int as n from pg_policies where schemaname = 'public' and tablename = $1`,
        [tbl],
      );
      if (pol.rows[0].n !== 0) throw new Error(`expected 0 policies, found ${pol.rows[0].n}`);
      return 'RLS on, 0 policies';
    });
  }

  // 4. Cross-tenant negative: as role `authenticated`, owner A sees only their
  //    own site, cannot update B's site, and cannot read `leads` at all.
  const ownerA = randomUUID();
  const ownerB = randomUUID();
  await client.query('insert into auth.users (id, email) values ($1, $2), ($3, $4)', [
    ownerA, 'a@example.com', ownerB, 'b@example.com',
  ]);
  const aSite = (await client.query(
    "insert into sites (owner_id, domain) values ($1, 'a.example.com') returning id",
    [ownerA],
  )).rows[0].id;
  const bSite = (await client.query(
    "insert into sites (owner_id, domain) values ($1, 'b.example.com') returning id",
    [ownerB],
  )).rows[0].id;
  // Seed a lead so "0 rows" means RLS blocked it, not an empty table.
  await client.query(
    "insert into leads (email, url) values ('lead@example.com', 'https://x.test')",
  );

  await assert('cross-tenant: authenticated owner A reads exactly 1 site', async () => {
    await client.query('begin');
    try {
      await client.query("select set_config('request.jwt.claim.sub', $1, true)", [ownerA]);
      await client.query('set local role authenticated');
      const { rows } = await client.query('select id from sites');
      if (rows.length !== 1 || rows[0].id !== aSite) {
        throw new Error(`A saw ${rows.length} site(s): ${rows.map((r) => r.id).join(',')}`);
      }
      return 'A sees only A’s site';
    } finally {
      await client.query('rollback');
    }
  });

  await assert("cross-tenant: authenticated owner A cannot UPDATE B's site", async () => {
    await client.query('begin');
    try {
      await client.query("select set_config('request.jwt.claim.sub', $1, true)", [ownerA]);
      await client.query('set local role authenticated');
      const res = await client.query("update sites set domain = 'hijacked' where id = $1", [bSite]);
      if (res.rowCount !== 0) throw new Error(`UPDATE affected ${res.rowCount} row(s), expected 0`);
      return '0 rows updated (B protected)';
    } finally {
      await client.query('rollback');
    }
  });

  await assert('cross-tenant: authenticated reads 0 rows from `leads`', async () => {
    await client.query('begin');
    try {
      await client.query("select set_config('request.jwt.claim.sub', $1, true)", [ownerA]);
      await client.query('set local role authenticated');
      const { rows } = await client.query('select count(*)::int as n from leads');
      if (rows[0].n !== 0) throw new Error(`authenticated read ${rows[0].n} lead(s), expected 0`);
      return '0 leads visible';
    } finally {
      await client.query('rollback');
    }
  });

  // 5. Backfill idempotency. The migration backfill ran on an empty DB (no-op),
  //    so the test sites above still have null org_id. Run the backfill once to
  //    establish orgs, snapshot, then run it a SECOND time and prove nothing
  //    changed: one org per owner, and no site left with a null org_id.
  const backfillSql = readFileSync(join(MIGRATIONS_DIR, BACKFILL_FILE), 'utf8');

  await client.query(backfillSql); // first real run (backfills the test data)
  const orgCount1 = (await client.query('select count(*)::int as n from organizations')).rows[0].n;

  await assert('backfill idempotency: re-run leaves org count unchanged', async () => {
    await client.query(backfillSql); // second run
    const orgCount2 = (await client.query('select count(*)::int as n from organizations')).rows[0].n;
    if (orgCount2 !== orgCount1) {
      throw new Error(`org count changed ${orgCount1} → ${orgCount2} on re-run`);
    }
    return `org count stable at ${orgCount2}`;
  });

  await assert('backfill idempotency: exactly one org per owner', async () => {
    const { rows } = await client.query(`
      select created_by, count(*)::int as n
        from organizations group by created_by having count(*) > 1
    `);
    if (rows.length > 0) {
      throw new Error(`owners with >1 org: ${rows.map((r) => `${r.created_by}=${r.n}`).join(', ')}`);
    }
    return 'every owner has at most one org';
  });

  await assert('backfill idempotency: zero sites with null org_id', async () => {
    const { rows } = await client.query('select count(*)::int as n from sites where org_id is null');
    if (rows[0].n !== 0) throw new Error(`${rows[0].n} site(s) still have null org_id`);
    return 'all sites have an org_id';
  });
}

// ── main ──────────────────────────────────────────────────────────────────────
async function main() {
  const externalUrl = process.env.DATABASE_URL;
  let containerId = null;
  let connectionString = externalUrl;

  try {
    if (!externalUrl) {
      const port = await getFreePort();
      const password = randomBytes(16).toString('hex'); // throwaway, never committed
      console.log(`No DATABASE_URL set — booting ephemeral postgres:16 on port ${port} …`);
      containerId = sh(
        `docker run -d --rm -e POSTGRES_PASSWORD=${password} -e POSTGRES_DB=postgres ` +
          `-p 127.0.0.1:${port}:5432 postgres:16`,
      );
      console.log(`  container ${containerId.slice(0, 12)} starting …`);
      connectionString = `postgres://postgres:${password}@127.0.0.1:${port}/postgres`;
    } else {
      console.log('DATABASE_URL is set — targeting existing Postgres (no Docker).');
    }

    const client = await connectWithRetry(connectionString);
    console.log('Connected.');
    try {
      console.log('\nInstalling Supabase shim (auth schema, roles, pgcrypto) …');
      await client.query(SHIM_SQL);
      await applyMigrations(client);
      console.log('Applying Supabase-style table grants …');
      await client.query(GRANTS_SQL);
      await runAssertions(client);
    } finally {
      await client.end();
    }
  } finally {
    if (containerId) {
      console.log(`\nTearing down container ${containerId.slice(0, 12)} …`);
      try {
        sh(`docker rm -f ${containerId}`);
      } catch (err) {
        console.error(`  warning: failed to remove container: ${err.message}`);
      }
    }
  }

  // ── verdict ──────────────────────────────────────────────────────────────
  const failed = results.filter((r) => !r.ok);
  console.log('\n────────────────────────────────────────────────────────');
  console.log(`Result: ${results.length - failed.length}/${results.length} assertions passed.`);
  if (failed.length > 0) {
    console.log(`FAILED: ${failed.map((r) => r.name).join('; ')}`);
    process.exitCode = 1;
  } else {
    console.log('All assertions PASSED. Schema is solid. ✅');
    process.exitCode = 0;
  }
}

main().catch((err) => {
  console.error('\nFATAL:', err.message);
  process.exitCode = 1;
});
