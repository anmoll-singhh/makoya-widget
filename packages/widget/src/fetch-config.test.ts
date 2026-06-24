/**
 * fetch-config.test.ts
 *
 * Test runner: npx tsx src/fetch-config.test.ts  (node:assert, NOT vitest —
 * matches the existing src/loader.test.ts / src/core/state.test.ts convention).
 *
 * Proves fetchGatedConfig()'s gate + FAIL-OPEN asymmetry:
 *   1. active:false response      → { active:false } (suppress mount)
 *   2. network failure (throw)    → { active:true, config:{} } (FAIL OPEN)
 *   3. non-200 response           → { active:true, config:{} } (FAIL OPEN)
 *   4. normal config              → active:true + config applied + `active` stripped
 *   5. token provided             → forwarded to the fetched URL as ?t=TOKEN
 */

import assert from "node:assert/strict";

// ---------------------------------------------------------------------------
// Stub browser globals BEFORE importing fetch-config.ts. The module reads
// `window` only lazily (inside configBase()), but fetch is read at call time —
// we install both up front and a recorder for the URL each fetch is called with.
// ---------------------------------------------------------------------------

(globalThis as any).window = {
  // Override the config base so we get a deterministic, asserted URL prefix.
  MAKOYA_CONFIG_BASE: "https://test.example/api/config",
};

// Controllable fetch: each test sets the behaviour. "reject" simulates a thrown
// network/CORS error; an object is returned as an ok JSON body; { __status:404 }
// simulates a non-200. The URL of the last call is recorded for assertion.
let nextFetch: Record<string, unknown> | "reject" | { __status: number } = {};
let lastUrl = "";

(globalThis as any).fetch = async (url: string) => {
  lastUrl = url;
  if (nextFetch === "reject") throw new Error("network down");
  if (typeof nextFetch === "object" && "__status" in nextFetch) {
    return { ok: false, status: (nextFetch as any).__status, json: async () => ({}) };
  }
  return { ok: true, json: async () => nextFetch };
};

// ---------------------------------------------------------------------------
// Tiny harness (mirrors loader.test.ts)
// ---------------------------------------------------------------------------
let passed = 0;
let failed = 0;

async function test(name: string, fn: () => void | Promise<void>): Promise<void> {
  lastUrl = "";
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

async function main(): Promise<void> {
  console.log("\n--- fetchGatedConfig: gate + fail-open ---\n");

  const { fetchGatedConfig } = await import("./fetch-config.js");

  // 1. Explicit active:false → suppress (active === false) --------------------
  await test("active:false response → { active:false }", async () => {
    nextFetch = { active: false, primaryColor: "#abc" };
    const r = await fetchGatedConfig("site-1");
    assert.equal(r.active, false, "explicit off-switch must yield active:false");
    // active is stripped from config even in the suppress case.
    assert.equal("active" in r.config, false, "`active` must be stripped from config");
  });

  // 2. Network failure (fetch throws) → FAIL OPEN -----------------------------
  await test("network failure → { active:true, config:{} }", async () => {
    nextFetch = "reject";
    const r = await fetchGatedConfig("site-1");
    assert.equal(r.active, true, "thrown fetch must FAIL OPEN to active:true");
    assert.deepEqual(r.config, {}, "no config on network failure");
  });

  // 3. Non-200 → FAIL OPEN -----------------------------------------------------
  await test("non-200 response → { active:true, config:{} }", async () => {
    nextFetch = { __status: 404 };
    const r = await fetchGatedConfig("site-1");
    assert.equal(r.active, true, "non-200 must FAIL OPEN to active:true");
    assert.deepEqual(r.config, {}, "no config on non-200");
  });

  // 4. Normal config → active:true, config applied, `active` stripped ---------
  await test("normal config → active:true + config applied + active stripped", async () => {
    nextFetch = { active: true, primaryColor: "#123456", position: "left" };
    const r = await fetchGatedConfig("site-1");
    assert.equal(r.active, true);
    assert.equal((r.config as any).primaryColor, "#123456", "config field must pass through");
    assert.equal((r.config as any).position, "left");
    assert.equal("active" in r.config, false, "`active` must be stripped from returned config");
  });

  // 4b. Config with NO `active` field still mounts (active:true) --------------
  await test("config with no active field → active:true (active !== false)", async () => {
    nextFetch = { primaryColor: "#0f0" };
    const r = await fetchGatedConfig("site-1");
    assert.equal(r.active, true, "missing active must default to mount");
  });

  // 5. Token forwarded to the URL as ?t=TOKEN ---------------------------------
  await test("token provided → forwarded to fetched URL as ?t=TOKEN", async () => {
    nextFetch = {};
    await fetchGatedConfig("site abc", "tok/en+1");
    assert.match(
      lastUrl,
      /^https:\/\/test\.example\/api\/config\/site%20abc\?t=tok%2Fen%2B1$/,
      `URL must include encoded siteId + ?t=encoded token (got: ${lastUrl})`,
    );
  });

  // 5b. No token → no query string -------------------------------------------
  await test("no token → no ?t= query string", async () => {
    nextFetch = {};
    await fetchGatedConfig("site-1");
    assert.equal(lastUrl, "https://test.example/api/config/site-1", "no token → bare URL");
  });

  console.log(`\n  ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

void main();
