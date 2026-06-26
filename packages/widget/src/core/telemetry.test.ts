/**
 * telemetry.test.ts
 *
 * Test runner: npx tsx src/core/telemetry.test.ts  (node:assert, NOT vitest —
 * matches src/core/state.test.ts / src/loader.test.ts conventions).
 *
 * Proves the fire-and-forget, never-throws usage telemetry:
 *   1. recordHeartbeat POSTs to the right URL with the right body, and the
 *      5-minute throttle suppresses a second immediate call.
 *   2. trackEvent batches multiple events into ONE POST with the correct shape;
 *      the buffer caps at 50.
 *   3. a throwing / rejecting fetch does NOT throw out of the module (fail-silent).
 *   4. data-no-telemetry / missing siteId → ZERO network calls.
 *   5. a flush fires on pagehide AND on visibilitychange→hidden.
 */

import assert from "node:assert/strict";

// ---------------------------------------------------------------------------
// Stub browser globals BEFORE importing telemetry. apiOrigin() derives the
// backend origin from window.MAKOYA_CONFIG_BASE (same mechanism as fetch-config),
// so https://api.test/api/config → origin https://api.test.
// ---------------------------------------------------------------------------

interface FetchCall {
  url: string;
  opts: any;
}
const fetchCalls: FetchCall[] = [];
let fetchMode: "ok" | "reject" = "ok";

const docListeners: Record<string, Array<() => void>> = {};
const winListeners: Record<string, Array<() => void>> = {};

const windowStub: any = {
  MAKOYA_CONFIG_BASE: "https://api.test/api/config",
  addEventListener: (type: string, cb: () => void) => {
    (winListeners[type] ??= []).push(cb);
  },
};
(globalThis as any).window = windowStub;

const documentStub: any = {
  visibilityState: "visible",
  addEventListener: (type: string, cb: () => void) => {
    (docListeners[type] ??= []).push(cb);
  },
  // No telemetry opt-out tag by default; tests flip this.
  querySelector: (_sel: string) => null,
};
(globalThis as any).document = documentStub;

(globalThis as any).location = {
  href: "https://site.example/page?x=1",
  origin: "https://site.example",
};

(globalThis as any).fetch = (url: string, opts: any) => {
  fetchCalls.push({ url, opts });
  if (fetchMode === "reject") return Promise.reject(new Error("network down"));
  return Promise.resolve({ ok: true, json: async () => ({}) });
};

// Any leaked unhandled rejection FAILS the suite loudly (proves never-throws).
process.on("unhandledRejection", (reason) => {
  console.error("  ✗ UNHANDLED REJECTION (telemetry leaked an error):", reason);
  process.exit(1);
});

// ---------------------------------------------------------------------------
// Tiny harness (mirrors state.test.ts / loader.test.ts).
// ---------------------------------------------------------------------------
let passed = 0;
let failed = 0;

async function test(name: string, fn: () => void | Promise<void>): Promise<void> {
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

function resetEnv(): void {
  fetchCalls.length = 0;
  fetchMode = "ok";
  documentStub.visibilityState = "visible";
  documentStub.querySelector = () => null;
  delete windowStub.MAKOYA_NO_TELEMETRY;
}

async function main(): Promise<void> {
  console.log("\n--- widget telemetry: heartbeat + usage events ---\n");

  const {
    configureTelemetry,
    recordHeartbeat,
    trackEvent,
    flushEvents,
    __resetTelemetryForTests,
  } = await import("./telemetry.js");

  // 1. Heartbeat URL + body + throttle ----------------------------------------
  await test(
    "recordHeartbeat POSTs correct URL/body; 5-min throttle blocks 2nd call",
    () => {
      resetEnv();
      __resetTelemetryForTests();
      configureTelemetry({ siteId: "site-1", token: "tok-9" });

      recordHeartbeat();
      assert.equal(fetchCalls.length, 1, "first heartbeat should POST once");
      const call = fetchCalls[0];
      assert.equal(call.url, "https://api.test/api/heartbeat");
      assert.equal(call.opts.method, "POST");
      assert.equal(call.opts.keepalive, true);
      assert.equal(call.opts.mode, "cors");
      assert.equal(call.opts.headers["content-type"], "application/json");
      const body = JSON.parse(call.opts.body);
      assert.equal(body.siteId, "site-1");
      assert.equal(body.token, "tok-9");
      assert.equal(body.url, "https://site.example/page?x=1");

      // Immediate second call is within the 5-min window → suppressed.
      recordHeartbeat();
      assert.equal(fetchCalls.length, 1, "throttle must suppress the immediate 2nd heartbeat");
    },
  );

  // 2. Event batching into one POST + buffer cap ------------------------------
  await test(
    "trackEvent batches into ONE POST with correct shape",
    () => {
      resetEnv();
      __resetTelemetryForTests();
      configureTelemetry({ siteId: "site-2", token: "tok-2" });

      trackEvent("open");
      trackEvent("feature_activated", "textSize");
      trackEvent("feature_activated", "contrast");
      assert.equal(fetchCalls.length, 0, "events should buffer, not POST immediately");

      flushEvents();
      assert.equal(fetchCalls.length, 1, "flush should send exactly ONE batched POST");
      const call = fetchCalls[0];
      assert.equal(call.url, "https://api.test/api/widget-events");
      assert.equal(call.opts.keepalive, true);
      const body = JSON.parse(call.opts.body);
      assert.equal(body.siteId, "site-2");
      assert.equal(body.token, "tok-2");
      assert.equal(body.events.length, 3);
      assert.equal(body.events[0].event, "open");
      assert.equal(body.events[0].featureKey, undefined);
      assert.equal(body.events[1].event, "feature_activated");
      assert.equal(body.events[1].featureKey, "textSize");
      assert.equal(typeof body.events[1].ts, "number");
    },
  );

  await test("trackEvent buffer caps at 50", () => {
    resetEnv();
    __resetTelemetryForTests();
    configureTelemetry({ siteId: "site-3" });

    for (let i = 0; i < 75; i++) trackEvent("feature_activated", "textSize");
    flushEvents();
    assert.equal(fetchCalls.length, 1, "one flush POST");
    const body = JSON.parse(fetchCalls[0].opts.body);
    assert.equal(body.events.length, 50, "buffer must cap the batch at 50");
  });

  // 3. Fail-silent on a rejecting/throwing fetch ------------------------------
  await test("rejecting fetch does NOT throw out of the module", async () => {
    resetEnv();
    fetchMode = "reject";
    __resetTelemetryForTests();
    configureTelemetry({ siteId: "site-4" });

    // Neither of these may throw, even though fetch rejects.
    assert.doesNotThrow(() => recordHeartbeat());
    assert.doesNotThrow(() => {
      trackEvent("open");
      flushEvents();
    });
    // Both attempted a network call (and swallowed the rejection).
    assert.equal(fetchCalls.length, 2, "both heartbeat + events attempted a POST");
    // Let any microtasks settle so a leaked rejection would trip the guard.
    await new Promise((r) => setTimeout(r, 0));
  });

  await test("fetch throwing synchronously does NOT throw out of the module", () => {
    resetEnv();
    __resetTelemetryForTests();
    (globalThis as any).fetch = () => {
      throw new Error("sync boom");
    };
    configureTelemetry({ siteId: "site-4b" });
    assert.doesNotThrow(() => recordHeartbeat());
    // Restore the well-behaved fetch spy.
    (globalThis as any).fetch = (url: string, opts: any) => {
      fetchCalls.push({ url, opts });
      if (fetchMode === "reject") return Promise.reject(new Error("network down"));
      return Promise.resolve({ ok: true, json: async () => ({}) });
    };
  });

  // 4. Opt-out / missing siteId → zero network --------------------------------
  await test("missing siteId → ZERO network calls", () => {
    resetEnv();
    __resetTelemetryForTests();
    configureTelemetry({ siteId: null });
    recordHeartbeat();
    trackEvent("open");
    flushEvents();
    assert.equal(fetchCalls.length, 0, "no siteId must mean no emission");
  });

  await test("data-no-telemetry script tag → ZERO network calls", () => {
    resetEnv();
    __resetTelemetryForTests();
    documentStub.querySelector = (sel: string) =>
      sel === "script[data-no-telemetry]" ? { tag: "script" } : null;
    configureTelemetry({ siteId: "site-5" });
    recordHeartbeat();
    trackEvent("open");
    flushEvents();
    assert.equal(fetchCalls.length, 0, "data-no-telemetry must disable all emission");
  });

  await test("MAKOYA_NO_TELEMETRY global → ZERO network calls", () => {
    resetEnv();
    __resetTelemetryForTests();
    windowStub.MAKOYA_NO_TELEMETRY = true;
    configureTelemetry({ siteId: "site-6" });
    recordHeartbeat();
    trackEvent("open");
    flushEvents();
    assert.equal(fetchCalls.length, 0, "MAKOYA_NO_TELEMETRY must disable all emission");
  });

  // 5. Flush on page-hide signals ---------------------------------------------
  await test("flush fires on pagehide", () => {
    resetEnv();
    __resetTelemetryForTests();
    configureTelemetry({ siteId: "site-7" });
    trackEvent("open");
    assert.equal(fetchCalls.length, 0, "buffered, not yet sent");

    (winListeners["pagehide"] ?? []).forEach((cb) => cb());
    assert.equal(fetchCalls.length, 1, "pagehide must flush the buffer");
    assert.equal(fetchCalls[0].url, "https://api.test/api/widget-events");
  });

  await test("flush fires on visibilitychange → hidden", () => {
    resetEnv();
    __resetTelemetryForTests();
    configureTelemetry({ siteId: "site-8" });
    trackEvent("feature_activated", "contrast");

    // Visible → no flush.
    documentStub.visibilityState = "visible";
    (docListeners["visibilitychange"] ?? []).forEach((cb) => cb());
    assert.equal(fetchCalls.length, 0, "visible state must NOT flush");

    // Hidden → flush.
    documentStub.visibilityState = "hidden";
    (docListeners["visibilitychange"] ?? []).forEach((cb) => cb());
    assert.equal(fetchCalls.length, 1, "hidden state must flush the buffer");
  });

  console.log(`\n  ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

void main();
