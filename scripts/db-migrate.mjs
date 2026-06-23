/**
 * db-migrate.mjs — apply a single idempotent SQL migration to Supabase Postgres.
 *
 * WHY: the Supabase service-role key (in apps/web/.env.local) authenticates
 * PostgREST/Auth but CANNOT run DDL. Schema changes need a direct Postgres
 * connection. This script applies a migration file over that connection so the
 * agent can manage migrations without the interactive `supabase` CLI login.
 *
 * SETUP (one-time): add the Supabase connection string to apps/web/.env.local:
 *   SUPABASE_DB_URL=postgresql://postgres.<ref>:<PASSWORD>@<host>:5432/postgres
 * (Supabase dashboard → Project Settings → Database → Connection string → URI;
 *  it already includes the password.)
 *
 * USAGE:
 *   node scripts/db-migrate.mjs                                  # applies the leads migration
 *   node scripts/db-migrate.mjs supabase/migrations/<file>.sql   # applies a specific file
 *
 * SAFETY: runs the file inside a single transaction (all-or-nothing). Only use
 * with idempotent migrations (CREATE TABLE IF NOT EXISTS, etc.) so re-running is safe.
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

function loadDbUrl() {
  if (process.env.SUPABASE_DB_URL) return process.env.SUPABASE_DB_URL.trim();
  try {
    const envFile = readFileSync(resolve(root, "apps/web/.env.local"), "utf8");
    const m = envFile.match(/^\s*SUPABASE_DB_URL\s*=\s*(.+)\s*$/m);
    if (m) return m[1].trim().replace(/^["']|["']$/g, "");
  } catch {
    /* no env file */
  }
  return null;
}

const file = process.argv[2] || "supabase/migrations/20260622210000_leads.sql";
const dbUrl = loadDbUrl();

if (!dbUrl) {
  console.error(
    "✗ Missing SUPABASE_DB_URL.\n" +
      "  Add it to apps/web/.env.local (Supabase dashboard → Settings → Database →\n" +
      "  Connection string → URI; it includes the password):\n" +
      "    SUPABASE_DB_URL=postgresql://postgres.<ref>:<PASSWORD>@<host>:5432/postgres"
  );
  process.exit(1);
}

const sql = readFileSync(resolve(root, file), "utf8");
const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

(async () => {
  await client.connect();
  await client.query("begin");
  try {
    await client.query(sql);
    await client.query("commit");
    console.log(`✓ applied ${file}`);
  } catch (e) {
    await client.query("rollback");
    console.error(`✗ failed (rolled back): ${e.message}`);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
})().catch((e) => {
  console.error(`✗ connection error: ${e.message}`);
  process.exit(1);
});
