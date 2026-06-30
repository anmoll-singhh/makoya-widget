/**
 * state.test.ts
 *
 * Test runner: npx tsx src/core/state.test.ts (node:assert, no vitest needed)
 *
 * Verifies, for the accessiBe-parity numeric/string Prefs model:
 *  - DEFAULT_PREFS shape for the new continuous + segmented + color fields
 *  - migratePrefs() maps AND strips every legacy key, snapping to the step grid
 *  - loadPrefs() merges migrated JSON over defaults safely (incl. corrupt JSON)
 *  - applyPrefs() sets the right gated html attributes + inline CSS custom props
 *  - REGRESSION GUARD: at default typography, NO typography attr/var is emitted
 *    (so html{font-size:62.5%} rem-reset sites are left untouched)
 */

import assert from "node:assert/strict";

// ---------------------------------------------------------------------------
// Stub browser globals state.ts / effects.ts depend on. We test logic, not DOM.
// ---------------------------------------------------------------------------

const _store: Record<string, string> = {};
const localStorageStub = {
  getItem: (k: string) => _store[k] ?? null,
  setItem: (k: string, v: string) => { _store[k] = v; },
  removeItem: (k: string) => { delete _store[k]; },
};
(globalThis as any).localStorage = localStorageStub;

// Track setAttribute/removeAttribute AND inline style custom properties.
const _attrs: Record<string, string | null> = {};
const _vars: Record<string, string> = {};
const fakeHtml = {
  setAttribute: (name: string, value: string) => { _attrs[name] = value; },
  removeAttribute: (name: string) => { _attrs[name] = null; },
  getAttribute: (name: string) => _attrs[name] ?? null,
  style: {
    setProperty: (name: string, value: string) => { _vars[name] = value; },
    removeProperty: (name: string) => { delete _vars[name]; },
    getPropertyValue: (name: string) => _vars[name] ?? "",
  },
};

(globalThis as any).document = {
  documentElement: fakeHtml,
  getElementById: (_id: string) => ({ id: "makoya-effects" }), // pretend style exists
  createElement: () => ({ id: "", textContent: "", rel: "" }),
  head: { appendChild: () => {} },
};

// Import AFTER stubs so module-level code runs against them.
import { DEFAULT_PREFS, loadPrefs, savePrefs, applyPrefs, migratePrefs } from "./state.js";

let passed = 0;
let failed = 0;
function test(name: string, fn: () => void): void {
  try { fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (err: any) { console.error(`  ✗ ${name}`); console.error(`    ${err.message}`); failed++; }
}

console.log("\n--- accessiBe-parity: Prefs model + migration ---\n");

// -- DEFAULT_PREFS new shape --------------------------------------------------
test("DEFAULT_PREFS.contentScale === 100", () => assert.equal(DEFAULT_PREFS.contentScale, 100));
test("DEFAULT_PREFS.fontScale === 100", () => assert.equal(DEFAULT_PREFS.fontScale, 100));
test("DEFAULT_PREFS.lineHeightPct === 100", () => assert.equal(DEFAULT_PREFS.lineHeightPct, 100));
test("DEFAULT_PREFS.letterSpacingPct === 0", () => assert.equal(DEFAULT_PREFS.letterSpacingPct, 0));
test('DEFAULT_PREFS.contrast === "off"', () => assert.equal(DEFAULT_PREFS.contrast, "off"));
test('DEFAULT_PREFS.font === "off"', () => assert.equal(DEFAULT_PREFS.font, "off"));
test('DEFAULT_PREFS.textAlign === "off"', () => assert.equal(DEFAULT_PREFS.textAlign, "off"));
test('DEFAULT_PREFS.textColor === ""', () => assert.equal(DEFAULT_PREFS.textColor, ""));
test("DEFAULT_PREFS.magnifier === false", () => assert.equal(DEFAULT_PREFS.magnifier, false));
test("DEFAULT_PREFS.virtualKeyboard === false", () => assert.equal(DEFAULT_PREFS.virtualKeyboard, false));
test("DEFAULT_PREFS has NO legacy keys", () => {
  assert.ok(!("text" in DEFAULT_PREFS), "text should be gone");
  assert.ok(!("spacing" in DEFAULT_PREFS), "spacing should be gone");
  assert.ok(!("align" in DEFAULT_PREFS), "align should be gone");
});

// -- migratePrefs: legacy → new, with stripping -------------------------------
test("migratePrefs: text 1|2|3 → fontScale 110|130|140 and strips text", () => {
  for (const [t, fs] of [[1, 110], [2, 130], [3, 140]] as const) {
    const m = migratePrefs({ text: t });
    assert.equal(m.fontScale, fs);
    assert.ok(!("text" in m), "legacy text must be stripped");
  }
});
test("migratePrefs: text 0 → no fontScale (defaults via caller)", () => {
  const m = migratePrefs({ text: 0 });
  assert.equal(m.fontScale, undefined);
  assert.ok(!("text" in m));
});
test("migratePrefs: spacing:true → lineHeightPct 180 + letterSpacingPct 5, strips spacing", () => {
  const m = migratePrefs({ spacing: true });
  assert.equal(m.lineHeightPct, 180);
  assert.equal(m.letterSpacingPct, 5);
  assert.ok(!("spacing" in m));
});
test("migratePrefs: align:true → textAlign 'left', strips align", () => {
  const m = migratePrefs({ align: true });
  assert.equal(m.textAlign, "left");
  assert.ok(!("align" in m));
});
test("migratePrefs: font:true → 'readable', font:false → 'off'", () => {
  assert.equal(migratePrefs({ font: true }).font, "readable");
  assert.equal(migratePrefs({ font: false }).font, "off");
});
test("migratePrefs: new-shape values pass through untouched", () => {
  const m = migratePrefs({ fontScale: 120, contrast: "high", textColor: "#123456" });
  assert.equal(m.fontScale, 120);
  assert.equal(m.contrast, "high");
  assert.equal(m.textColor, "#123456");
});
test("migratePrefs: non-object → {}", () => {
  assert.deepEqual(migratePrefs("nope"), {});
  assert.deepEqual(migratePrefs(null), {});
});

// -- loadPrefs ----------------------------------------------------------------
test("loadPrefs returns defaults when nothing stored", () => {
  delete _store["makoya_prefs"];
  const p = loadPrefs();
  assert.equal(p.fontScale, 100);
  assert.equal(p.contrast, "off");
});
test("loadPrefs migrates a fully-legacy blob and drops dead keys", () => {
  _store["makoya_prefs"] = JSON.stringify({ text: 2, spacing: true, align: true, font: true });
  const p = loadPrefs();
  assert.equal(p.fontScale, 130);
  assert.equal(p.lineHeightPct, 180);
  assert.equal(p.letterSpacingPct, 5);
  assert.equal(p.textAlign, "left");
  assert.equal(p.font, "readable");
  assert.ok(!("text" in p) && !("spacing" in p) && !("align" in p));
  delete _store["makoya_prefs"];
});
test("loadPrefs returns defaults on corrupt JSON", () => {
  _store["makoya_prefs"] = "{{{not-json";
  assert.equal(loadPrefs().fontScale, 100);
  delete _store["makoya_prefs"];
});

// -- applyPrefs: gated typography attrs + vars --------------------------------
test("applyPrefs at defaults emits NO typography attrs/vars (62.5% rem guard)", () => {
  applyPrefs({ ...DEFAULT_PREFS });
  assert.equal(_attrs["data-mky-fontscale"], null);
  assert.equal(_attrs["data-mky-lh"], null);
  assert.equal(_attrs["data-mky-ls"], null);
  assert.equal(_attrs["data-mky-zoom"], null);
  assert.equal(_vars["--mky-font-scale"], undefined);
});
test("applyPrefs fontScale=130 sets attr + var 1.3", () => {
  applyPrefs({ ...DEFAULT_PREFS, fontScale: 130 });
  assert.equal(_attrs["data-mky-fontscale"], "on");
  assert.equal(_vars["--mky-font-scale"], "1.3");
});
test("applyPrefs lineHeightPct=180 sets --mky-line-height 1.8", () => {
  applyPrefs({ ...DEFAULT_PREFS, lineHeightPct: 180 });
  assert.equal(_attrs["data-mky-lh"], "on");
  assert.equal(_vars["--mky-line-height"], "1.8");
});
test("applyPrefs letterSpacingPct=5 sets --mky-letter-spacing 0.05em", () => {
  applyPrefs({ ...DEFAULT_PREFS, letterSpacingPct: 5 });
  assert.equal(_attrs["data-mky-ls"], "on");
  assert.equal(_vars["--mky-letter-spacing"], "0.05em");
});
test("applyPrefs contentScale=120 sets --mky-zoom 1.2", () => {
  applyPrefs({ ...DEFAULT_PREFS, contentScale: 120 });
  assert.equal(_attrs["data-mky-zoom"], "on");
  assert.equal(_vars["--mky-zoom"], "1.2");
});

// -- applyPrefs: segmented + color --------------------------------------------
test("applyPrefs contrast='high'|'light' set data-mky-contrast", () => {
  applyPrefs({ ...DEFAULT_PREFS, contrast: "high" });
  assert.equal(_attrs["data-mky-contrast"], "high");
  applyPrefs({ ...DEFAULT_PREFS, contrast: "light" });
  assert.equal(_attrs["data-mky-contrast"], "light");
});
test("applyPrefs font='dyslexic' sets data-mky-font", () => {
  applyPrefs({ ...DEFAULT_PREFS, font: "dyslexic" });
  assert.equal(_attrs["data-mky-font"], "dyslexic");
});
test("applyPrefs textAlign='center' sets data-mky-align='center'", () => {
  applyPrefs({ ...DEFAULT_PREFS, textAlign: "center" });
  assert.equal(_attrs["data-mky-align"], "center");
});
test("applyPrefs textColor sets gated var when contrast not dark/light", () => {
  applyPrefs({ ...DEFAULT_PREFS, textColor: "#0000ff" });
  assert.equal(_attrs["data-mky-textcolor"], "on");
  assert.equal(_vars["--mky-text-color"], "#0000ff");
});
test("applyPrefs suppresses color overrides while contrast='dark' (invert flip)", () => {
  applyPrefs({ ...DEFAULT_PREFS, textColor: "#0000ff", contrast: "dark" });
  assert.equal(_attrs["data-mky-textcolor"], null);
});

// -- savePrefs round-trip -----------------------------------------------------
test("savePrefs + loadPrefs round-trips the new fields", () => {
  const saved = {
    ...DEFAULT_PREFS,
    fontScale: 160, lineHeightPct: 200, letterSpacingPct: 10,
    contrast: "high" as const, font: "dyslexic" as const, textAlign: "justify" as const,
    textColor: "#112233", magnifier: true, voiceNav: true,
  };
  savePrefs(saved);
  const loaded = loadPrefs();
  assert.equal(loaded.fontScale, 160);
  assert.equal(loaded.lineHeightPct, 200);
  assert.equal(loaded.contrast, "high");
  assert.equal(loaded.font, "dyslexic");
  assert.equal(loaded.textAlign, "justify");
  assert.equal(loaded.textColor, "#112233");
  assert.equal(loaded.magnifier, true);
  assert.equal(loaded.voiceNav, true);
  delete _store["makoya_prefs"];
});

console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
