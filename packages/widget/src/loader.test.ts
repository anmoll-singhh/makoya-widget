/**
 * loader.test.ts
 *
 * Test runner: npx tsx src/loader.test.ts  (node:assert, no vitest needed —
 * matches the existing src/core/state.test.ts convention in this package).
 *
 * Proves the Phase-1 licensing "off-switch" in loader.ts boot():
 *   1. server returns { active: false } → widget does NOT mount (init not called).
 *   2. fetch fails / returns {} (network failure) → widget DOES mount on defaults.
 *   3. normal config (no `active`, or active:true) → mounts with that config applied.
 *
 * The asymmetry is the whole point: an EXPLICIT `active:false` suppresses mount,
 * but a missing `active` (network outage → {}) must STILL mount (non-negotiable
 * rule #1 — availability is never sacrificed).
 */

import assert from "node:assert/strict";

// ---------------------------------------------------------------------------
// Stub browser globals BEFORE importing loader.ts (its module body reads
// `window` immediately, and we must suppress the top-level auto-boot()).
// ---------------------------------------------------------------------------

type InitCall = { siteId: string; active?: unknown; [k: string]: unknown };

// Records every MakoyaWidget.init(...) call so we can assert mount / no-mount.
const initCalls: InitCall[] = [];

// Controllable fetch: each test sets `nextFetch` to either a payload (resolves
// res.ok with that JSON) or the string "reject" (simulates a network failure).
let nextFetch: Record<string, unknown> | "reject" = {};

const windowStub: any = {
  // Pre-set so loadCore() short-circuits (resolve immediately) and never tries
  // to inject a <script> for core.js — keeps the test pure-logic, no real DOM.
  MakoyaWidget: {
    init: (cfg: InitCall) => {
      initCalls.push(cfg);
    },
  },
  // Suppress the module-level auto-boot(); the tests drive boot() explicitly.
  MAKOYA_LOADER_NO_AUTOBOOT: true,
};
(globalThis as any).window = windowStub;

// Minimal document stub. currentScript carries data-site so getSiteId() works.
(globalThis as any).document = {
  currentScript: { dataset: { site: "site-123" } },
  querySelector: () => null,
  createElement: () => ({ setAttribute() {}, set onload(_: unknown) {}, set onerror(_: unknown) {} }),
  head: { appendChild: () => {} },
};

// fetch stub honouring `nextFetch`.
(globalThis as any).fetch = async () => {
  if (nextFetch === "reject") throw new Error("network down");
  return {
    ok: true,
    json: async () => nextFetch,
  };
};

// ---------------------------------------------------------------------------
// Import AFTER stubs. loader.ts reads `window` at MODULE TOP LEVEL (CONFIG_BASE
// / CORE_URL), so a static `import` (hoisted above the stubs by ESM) would crash
// with "window is not defined". A dynamic import() runs only once we reach this
// line — after the globals above are installed — and the auto-boot() is
// suppressed by the MAKOYA_LOADER_NO_AUTOBOOT flag.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Tiny test harness (mirrors state.test.ts)
// ---------------------------------------------------------------------------
let passed = 0;
let failed = 0;

async function test(name: string, fn: () => void | Promise<void>): Promise<void> {
  initCalls.length = 0; // reset spy between cases
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
  console.log("\n--- Phase 1: loader license off-switch ---\n");

  // Dynamic import so loader.ts evaluates against the stubs installed above.
  const { boot } = await import("./loader.js");

  // 1. Explicit active:false → MUST NOT mount ---------------------------------
  await test("active:false → widget does NOT mount (init not called)", async () => {
    nextFetch = { active: false, primaryColor: "#abcabc", siteId: "site-123" };
    await boot();
    assert.equal(initCalls.length, 0, "init should not be called when active:false");
  });

  // 2a. Network failure (fetch throws → {}) → MUST mount on defaults ----------
  await test("network failure → widget DOES mount with defaults", async () => {
    nextFetch = "reject";
    await boot();
    assert.equal(initCalls.length, 1, "init should be called on network failure (fallback)");
    assert.equal(initCalls[0].siteId, "site-123");
    // No `active` field leaks into init's config (it's stripped before spread).
    assert.equal("active" in initCalls[0], false, "`active` must not be forwarded to init");
  });

  // 2b. Empty object (non-200 → {}) also mounts (no `active` field) -----------
  await test("empty config {} (no active field) → widget DOES mount", async () => {
    nextFetch = {};
    await boot();
    assert.equal(initCalls.length, 1, "init should be called when no verdict is delivered");
  });

  // 3a. Normal config, no `active` → mounts with that config -------------------
  await test("normal config (no active) → mounts with config applied", async () => {
    nextFetch = { primaryColor: "#123456", position: "left" };
    await boot();
    assert.equal(initCalls.length, 1);
    assert.equal(initCalls[0].siteId, "site-123");
    assert.equal(initCalls[0].primaryColor, "#123456", "fetched config field should reach init");
    assert.equal(initCalls[0].position, "left");
  });

  // 3b. Explicit active:true → mounts (true is not false) ---------------------
  await test("active:true → widget mounts (true is not the off-switch)", async () => {
    nextFetch = { active: true, primaryColor: "#0000ff" };
    await boot();
    assert.equal(initCalls.length, 1, "active:true must still mount");
    assert.equal("active" in initCalls[0], false, "`active` must not be forwarded to init");
    assert.equal(initCalls[0].primaryColor, "#0000ff");
  });

  console.log(`\n  ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

void main();
