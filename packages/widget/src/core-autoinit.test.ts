/**
 * core-autoinit.test.ts
 *
 * Test runner: npx tsx src/core-autoinit.test.ts  (node:assert, NOT vitest —
 * matches src/loader.test.ts / src/core/state.test.ts).
 *
 * Proves core/index.ts auto-init now FETCHES + GATES (the direct-core.js bypass
 * is closed) and NEVER throws:
 *   1. active:false response → init NOT reached (no mount).
 *   2. data-demo (flag on)  → init reached WITHOUT any fetch (offline escape hatch);
 *      and data-demo with the flag OFF (shipped bundle) is IGNORED → gated fetch.
 *   3. normal data-site     → fetch happens, THEN init reached (mount).
 *   4. data-no-auto         → neither fetch nor init (loader drives init).
 *   5. fetch throws         → does NOT propagate (no unhandled rejection) and
 *                             STILL mounts on defaults (fail-open).
 *
 * HOW WE OBSERVE MOUNT WITHOUT A REAL DOM
 *   init()'s first observable action is `document.getElementById("makoya-widget-root")`
 *   (its double-init guard). We make that return a truthy element so init aborts
 *   BEFORE mountUI (no heavy DOM build) and RECORD the call — every recorded
 *   "makoya-widget-root" lookup means "init() was entered" = a mount attempt.
 *   No lookup = init was never called = no mount.
 *
 * Each test re-imports the module via a fresh import key (?v=N) so the
 * module-level auto-init IIFE re-runs against that test's stubbed currentScript.
 */

import assert from "node:assert/strict";

// ---------------------------------------------------------------------------
// Mutable stub state the harness rewrites per test.
// ---------------------------------------------------------------------------

// fetch behaviour: "reject" throws; otherwise an ok JSON body is returned.
let nextFetch: Record<string, unknown> | "reject" = {};
let fetchCalls = 0;

// Records each init() entry (via the getElementById guard) → proxy for "mounted".
let mountAttempts = 0;

// Raw attribute names present on the script tag, for hasAttribute() lookups
// (data-demo / data-no-auto are read via hasAttribute, not dataset).
let rawAttrSet = new Set<string>();

(globalThis as any).window = {
  MAKOYA_CONFIG_BASE: "https://test.example/api/config",
};

(globalThis as any).fetch = async () => {
  fetchCalls++;
  if (nextFetch === "reject") throw new Error("network down");
  return { ok: true, json: async () => nextFetch };
};

// document stub. currentScript is rebuilt per test (setScript). getElementById
// returns a truthy element for the widget-root id AND records the lookup as a
// mount attempt; readyState is "complete" so init() runs start() synchronously
// (it never reaches mountUI because the guard aborts first).
let currentScriptStub: any = null;
(globalThis as any).document = {
  get currentScript() {
    return currentScriptStub;
  },
  querySelector: () => null,
  getElementById: (id: string) => {
    if (id === "makoya-widget-root") {
      mountAttempts++;
      return { id }; // truthy → init() aborts at its guard, before mountUI
    }
    return null;
  },
  readyState: "complete",
  addEventListener: () => {},
};

function setScript(dataset: Record<string, string>, presentAttrs: string[] = []): void {
  rawAttrSet = new Set(presentAttrs);
  currentScriptStub = {
    dataset,
    hasAttribute: (name: string) => rawAttrSet.has(name),
  };
}

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------
let passed = 0;
let failed = 0;
let importVersion = 0;

async function test(
  name: string,
  setup: () => void,
  assertFn: () => void | Promise<void>,
): Promise<void> {
  fetchCalls = 0;
  mountAttempts = 0;
  setup();
  try {
    // Fresh module instance so the auto-init IIFE re-runs for this test's script.
    await import(`./core/index.js?v=${importVersion++}`);
    // Let the async IIFE settle (it awaits fetchGatedConfig).
    await new Promise((r) => setTimeout(r, 0));
    await assertFn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

// Guard so an accidental unhandled rejection FAILS the suite loudly (proves the
// "never throws" claim — test 5 would trip this if .catch were missing).
process.on("unhandledRejection", (reason) => {
  console.error("  ✗ UNHANDLED REJECTION (auto-init leaked an error):", reason);
  process.exit(1);
});

async function main(): Promise<void> {
  console.log("\n--- core auto-init: gated fetch + never-throw ---\n");

  // 1. active:false → init NOT reached (no mount) -----------------------------
  await test(
    "active:false → init NOT called (no mount)",
    () => {
      setScript({ site: "s1" });
      nextFetch = { active: false, primaryColor: "#abc" };
    },
    () => {
      assert.equal(fetchCalls, 1, "should have fetched the gated config");
      assert.equal(mountAttempts, 0, "init must NOT be entered when active:false");
    },
  );

  // 2. data-demo (demo build, flag ON) → init reached WITHOUT a fetch ----------
  await test(
    "data-demo + __MAKOYA_ALLOW_DEMO__ → init called WITHOUT fetch",
    () => {
      (globalThis as { __MAKOYA_ALLOW_DEMO__?: boolean }).__MAKOYA_ALLOW_DEMO__ = true;
      setScript({ site: "demo" }, ["data-demo"]);
      nextFetch = { primaryColor: "#fff" };
    },
    () => {
      assert.equal(fetchCalls, 0, "data-demo must NOT hit the network in a demo build");
      assert.equal(mountAttempts, 1, "data-demo must still mount on defaults");
    },
  );

  // 2b. data-demo in the SHIPPED bundle (flag OFF) → demo is IGNORED, the gated
  //     fetch path runs instead. This is the production-safety guarantee: a
  //     freeloader cannot use data-demo to bypass the licensing gate.
  await test(
    "data-demo WITHOUT the flag → ignored, falls through to the gated fetch",
    () => {
      (globalThis as { __MAKOYA_ALLOW_DEMO__?: boolean }).__MAKOYA_ALLOW_DEMO__ = false;
      setScript({ site: "demo" }, ["data-demo"]);
      nextFetch = { primaryColor: "#fff" }; // active not false → mounts after gating
    },
    () => {
      assert.equal(fetchCalls, 1, "data-demo must be IGNORED in prod → gated fetch runs");
      assert.equal(mountAttempts, 1, "still mounts (verdict allowed) via the normal path");
    },
  );

  // 3. normal data-site → fetch THEN init -------------------------------------
  await test(
    "normal data-site → fetches then init called",
    () => {
      setScript({ site: "s3" });
      nextFetch = { primaryColor: "#123456" };
    },
    () => {
      assert.equal(fetchCalls, 1, "normal path must fetch the gated config");
      assert.equal(mountAttempts, 1, "normal path must mount");
    },
  );

  // 4. data-no-auto → neither fetch nor init ----------------------------------
  await test(
    "data-no-auto → NOT auto-mounted (loader drives init)",
    () => {
      setScript({ site: "s4" }, ["data-no-auto"]);
      nextFetch = { primaryColor: "#abc" };
    },
    () => {
      assert.equal(fetchCalls, 0, "data-no-auto must short-circuit before fetch");
      assert.equal(mountAttempts, 0, "data-no-auto must NOT auto-mount");
    },
  );

  // 5. fetch throws → no unhandled rejection + STILL mounts (fail-open) -------
  await test(
    "thrown fetch → no unhandled rejection, still mounts on defaults",
    () => {
      setScript({ site: "s5" });
      nextFetch = "reject";
    },
    () => {
      assert.equal(fetchCalls, 1, "should have attempted the fetch");
      // fetchGatedConfig swallows the throw and fails open → active:true → mount.
      assert.equal(mountAttempts, 1, "a thrown fetch must STILL mount (fail-open)");
      // If the throw had escaped, the unhandledRejection guard above would have
      // already exited the process with a failure.
    },
  );

  console.log(`\n  ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

void main();
