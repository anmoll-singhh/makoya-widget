/**
 * state.test.ts
 *
 * Test runner: npx tsx src/core/state.test.ts (node:assert, no vitest needed)
 *
 * Verifies:
 *  - DEFAULT_PREFS shape for all new fields (Task 1 of WS1)
 *  - loadPrefs() merges stored JSON over defaults safely
 *  - applyPrefs() sets the right html data-attributes
 */

import assert from "node:assert/strict";

// ---------------------------------------------------------------------------
// Stub out browser globals that state.ts / effects.ts depend on.
// We test the logic, not the DOM plumbing.
// ---------------------------------------------------------------------------

// Minimal localStorage stub
const _store: Record<string, string> = {};
const localStorageStub = {
  getItem: (k: string) => _store[k] ?? null,
  setItem: (k: string, v: string) => { _store[k] = v; },
  removeItem: (k: string) => { delete _store[k]; },
};
(globalThis as any).localStorage = localStorageStub;

// Track setAttribute / removeAttribute calls on a fake html element
const _attrs: Record<string, string | null> = {};
const fakeHtml = {
  setAttribute: (name: string, value: string) => { _attrs[name] = value; },
  removeAttribute: (name: string) => { _attrs[name] = null; },
  getAttribute: (name: string) => _attrs[name] ?? null,
};

// Minimal document stub
(globalThis as any).document = {
  documentElement: fakeHtml,
  getElementById: (_id: string) => ({ id: "makoya-effects" }), // pretend style exists
  createElement: () => ({ id: "", textContent: "", rel: "" }),
  head: { appendChild: () => {} },
};

// ---------------------------------------------------------------------------
// Import AFTER stubs so module-level code runs against the stubs
// ---------------------------------------------------------------------------
import { DEFAULT_PREFS, loadPrefs, savePrefs, applyPrefs } from "./state.js";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

console.log("\n--- Task 1: Prefs expansion ---\n");

// -- DEFAULT_PREFS: existing fields untouched ---------------------------------
test("DEFAULT_PREFS.text === 0", () => assert.equal(DEFAULT_PREFS.text, 0));
test("DEFAULT_PREFS.contrast === 'off'", () => assert.equal(DEFAULT_PREFS.contrast, "off"));
test("DEFAULT_PREFS.spacing === false", () => assert.equal(DEFAULT_PREFS.spacing, false));
test("DEFAULT_PREFS.stopMotion === false", () => assert.equal(DEFAULT_PREFS.stopMotion, false));
test("DEFAULT_PREFS.ruler === false", () => assert.equal(DEFAULT_PREFS.ruler, false));
test("DEFAULT_PREFS.links === false", () => assert.equal(DEFAULT_PREFS.links, false));
test("DEFAULT_PREFS.font === false", () => assert.equal(DEFAULT_PREFS.font, false));
test("DEFAULT_PREFS.images === false", () => assert.equal(DEFAULT_PREFS.images, false));

// -- DEFAULT_PREFS: NEW fields (these FAIL before the state.ts change) --------
test('DEFAULT_PREFS.cursor === "off"', () => assert.equal(DEFAULT_PREFS.cursor, "off"));
test('DEFAULT_PREFS.saturation === "off"', () => assert.equal(DEFAULT_PREFS.saturation, "off"));
test('DEFAULT_PREFS.mask === "off"', () => assert.equal(DEFAULT_PREFS.mask, "off"));
test("DEFAULT_PREFS.titles === false", () => assert.equal(DEFAULT_PREFS.titles, false));
test("DEFAULT_PREFS.align === false", () => assert.equal(DEFAULT_PREFS.align, false));
test("DEFAULT_PREFS.mute === false", () => assert.equal(DEFAULT_PREFS.mute, false));
test("DEFAULT_PREFS.readAloud === false", () => assert.equal(DEFAULT_PREFS.readAloud, false));

// -- loadPrefs(): merges stored JSON over defaults ----------------------------
test("loadPrefs() returns defaults when nothing stored", () => {
  delete _store["makoya_prefs"];
  const p = loadPrefs();
  assert.equal(p.cursor, "off");
  assert.equal(p.saturation, "off");
  assert.equal(p.mask, "off");
  assert.equal(p.titles, false);
});

test("loadPrefs() merges partial stored prefs over defaults", () => {
  _store["makoya_prefs"] = JSON.stringify({ cursor: "black", saturation: "grayscale" });
  const p = loadPrefs();
  assert.equal(p.cursor, "black");
  assert.equal(p.saturation, "grayscale");
  // Unset fields fall back to defaults
  assert.equal(p.mask, "off");
  assert.equal(p.titles, false);
  assert.equal(p.align, false);
  assert.equal(p.mute, false);
  assert.equal(p.readAloud, false);
  delete _store["makoya_prefs"];
});

test("loadPrefs() returns defaults on corrupt JSON", () => {
  _store["makoya_prefs"] = "{{{not-json";
  const p = loadPrefs();
  assert.equal(p.cursor, "off");
  delete _store["makoya_prefs"];
});

// -- applyPrefs(): data-attributes set correctly ------------------------------
test("applyPrefs sets data-mky-cursor='black' when cursor='black'", () => {
  applyPrefs({ ...DEFAULT_PREFS, cursor: "black" });
  assert.equal(_attrs["data-mky-cursor"], "black");
});

test("applyPrefs removes data-mky-cursor when cursor='off'", () => {
  applyPrefs({ ...DEFAULT_PREFS, cursor: "off" });
  assert.equal(_attrs["data-mky-cursor"], null);
});

test("applyPrefs sets data-mky-cursor='white' when cursor='white'", () => {
  applyPrefs({ ...DEFAULT_PREFS, cursor: "white" });
  assert.equal(_attrs["data-mky-cursor"], "white");
});

test("applyPrefs sets data-mky-sat='grayscale' when saturation='grayscale'", () => {
  applyPrefs({ ...DEFAULT_PREFS, saturation: "grayscale" });
  assert.equal(_attrs["data-mky-sat"], "grayscale");
});

test("applyPrefs sets data-mky-sat='low' when saturation='low'", () => {
  applyPrefs({ ...DEFAULT_PREFS, saturation: "low" });
  assert.equal(_attrs["data-mky-sat"], "low");
});

test("applyPrefs sets data-mky-sat='high' when saturation='high'", () => {
  applyPrefs({ ...DEFAULT_PREFS, saturation: "high" });
  assert.equal(_attrs["data-mky-sat"], "high");
});

test("applyPrefs removes data-mky-sat when saturation='off'", () => {
  applyPrefs({ ...DEFAULT_PREFS, saturation: "off" });
  assert.equal(_attrs["data-mky-sat"], null);
});

test("applyPrefs sets data-mky-titles='on' when titles=true", () => {
  applyPrefs({ ...DEFAULT_PREFS, titles: true });
  assert.equal(_attrs["data-mky-titles"], "on");
});

test("applyPrefs removes data-mky-titles when titles=false", () => {
  applyPrefs({ ...DEFAULT_PREFS, titles: false });
  assert.equal(_attrs["data-mky-titles"], null);
});

test("applyPrefs sets data-mky-align='on' when align=true", () => {
  applyPrefs({ ...DEFAULT_PREFS, align: true });
  assert.equal(_attrs["data-mky-align"], "on");
});

test("applyPrefs removes data-mky-align when align=false", () => {
  applyPrefs({ ...DEFAULT_PREFS, align: false });
  assert.equal(_attrs["data-mky-align"], null);
});

// mask/mute/readAloud are LIVE (not CSS attrs) — applyPrefs does NOT set attrs for them
test("applyPrefs does NOT set data-mky-mask attr (live controller)", () => {
  const before = _attrs["data-mky-mask"];
  applyPrefs({ ...DEFAULT_PREFS, mask: "dim" });
  assert.equal(_attrs["data-mky-mask"], before); // unchanged
});

// -- savePrefs round-trip -----------------------------------------------------
test("savePrefs + loadPrefs round-trips all new fields", () => {
  const saved = {
    ...DEFAULT_PREFS,
    cursor: "white" as const,
    saturation: "high" as const,
    mask: "tint" as const,
    titles: true,
    align: true,
    mute: true,
    readAloud: true,
  };
  savePrefs(saved);
  const loaded = loadPrefs();
  assert.equal(loaded.cursor, "white");
  assert.equal(loaded.saturation, "high");
  assert.equal(loaded.mask, "tint");
  assert.equal(loaded.titles, true);
  assert.equal(loaded.align, true);
  assert.equal(loaded.mute, true);
  assert.equal(loaded.readAloud, true);
  delete _store["makoya_prefs"];
});

// ---------------------------------------------------------------------------
console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
