/**
 * font.test.ts
 *
 * Test runner: npx tsx src/features/font.test.ts (node:assert, no vitest needed)
 *
 * Verifies the embedded OpenDyslexic webfont:
 *  - the two exported data: URIs are well-formed and decode to real woff2 bytes
 *  - ensureDyslexiaFont() injects a single <style> with the right @font-face
 *  - it is idempotent (second call does not inject again)
 *  - it never throws (progressive enhancement)
 */

import assert from "node:assert/strict";

// ---------------------------------------------------------------------------
// Minimal DOM stub: a real-ish element registry so getElementById only finds
// the style AFTER it has been appended (the state.test stub always returns a
// truthy element, which would mask injection — so we use our own here).
// ---------------------------------------------------------------------------
type FakeEl = { id: string; textContent: string };
const appended: FakeEl[] = [];
(globalThis as any).document = {
  getElementById: (id: string) => appended.find((e) => e.id === id) ?? null,
  createElement: (): FakeEl => ({ id: "", textContent: "" }),
  head: { appendChild: (el: FakeEl) => { appended.push(el); } },
};

import { ensureDyslexiaFont } from "./effects.js";
import {
  OPENDYSLEXIC_REGULAR_WOFF2,
  OPENDYSLEXIC_BOLD_WOFF2,
} from "./opendyslexic-font.js";

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

console.log("\n--- OpenDyslexic embedded font ---\n");

function woff2MagicOf(dataUri: string): string {
  const prefix = "data:font/woff2;base64,";
  assert.ok(dataUri.startsWith(prefix), "data: URI has the woff2 base64 prefix");
  const b64 = dataUri.slice(prefix.length);
  return Buffer.from(b64, "base64").subarray(0, 4).toString("latin1");
}

test("Regular data URI decodes to valid woff2 (wOF2 magic)", () => {
  assert.equal(woff2MagicOf(OPENDYSLEXIC_REGULAR_WOFF2), "wOF2");
});

test("Bold data URI decodes to valid woff2 (wOF2 magic)", () => {
  assert.equal(woff2MagicOf(OPENDYSLEXIC_BOLD_WOFF2), "wOF2");
});

test("ensureDyslexiaFont injects one <style id=makoya-dyslexia-font>", () => {
  appended.length = 0;
  ensureDyslexiaFont();
  const styles = appended.filter((e) => e.id === "makoya-dyslexia-font");
  assert.equal(styles.length, 1);
});

test("injected CSS has Regular(400) + Bold(700) @font-face with swap", () => {
  const css = appended.find((e) => e.id === "makoya-dyslexia-font")!.textContent;
  assert.match(css, /@font-face/);
  assert.match(css, /font-family:\s*"OpenDyslexic"/);
  assert.match(css, /font-weight:\s*400/);
  assert.match(css, /font-weight:\s*700/);
  assert.match(css, /font-display:\s*swap/);
  assert.match(css, /data:font\/woff2;base64,/);
});

test("ensureDyslexiaFont is idempotent (no second injection)", () => {
  ensureDyslexiaFont();
  ensureDyslexiaFont();
  const styles = appended.filter((e) => e.id === "makoya-dyslexia-font");
  assert.equal(styles.length, 1);
});

test("ensureDyslexiaFont never throws when document is unusable", () => {
  const saved = (globalThis as any).document;
  (globalThis as any).document = undefined;
  assert.doesNotThrow(() => ensureDyslexiaFont());
  (globalThis as any).document = saved;
});

console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
