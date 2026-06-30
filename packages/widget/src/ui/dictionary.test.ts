/**
 * dictionary.test.ts — tsx runner (node:assert).
 *
 * Covers the pure-ish lookupWord: input guards, API parsing, and fail-silent
 * behaviour on network/parse errors (it must NEVER throw or reject).
 */
import assert from "node:assert/strict";
import { lookupWord } from "./dictionary.js";

let passed = 0, failed = 0;
async function test(name: string, fn: () => Promise<void> | void): Promise<void> {
  try { await fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e: any) { console.error(`  ✗ ${name}\n    ${e.message}`); failed++; }
}

function stubFetch(impl: (url: string) => Promise<any>): void {
  (globalThis as any).fetch = (url: string) => impl(url);
}

console.log("\n--- dictionary.lookupWord ---\n");

await test("rejects multi-word selections without fetching", async () => {
  let called = false;
  stubFetch(async () => { called = true; return { ok: true, json: async () => [] }; });
  const r = await lookupWord("two words", "en");
  assert.equal(r.ok, false);
  assert.equal(called, false);
});

await test("rejects an over-long token without fetching", async () => {
  let called = false;
  stubFetch(async () => { called = true; return { ok: true, json: async () => [] }; });
  const r = await lookupWord("a".repeat(41), "en");
  assert.equal(r.ok, false);
  assert.equal(called, false);
});

await test("parses the first definition + partOfSpeech on success", async () => {
  stubFetch(async (url) => {
    assert.ok(url.includes("/en/accessible"));
    return {
      ok: true,
      json: async () => [
        { meanings: [{ partOfSpeech: "adjective", definitions: [{ definition: "able to be reached." }] }] },
      ],
    };
  });
  const r = await lookupWord("Accessible", "en");
  assert.equal(r.ok, true);
  assert.equal(r.word, "accessible");
  assert.equal(r.partOfSpeech, "adjective");
  assert.equal(r.definition, "able to be reached.");
});

await test("returns ok:false on a 404 (word not found)", async () => {
  stubFetch(async () => ({ ok: false, json: async () => ({}) }));
  const r = await lookupWord("zxqwv", "en");
  assert.equal(r.ok, false);
});

await test("fail-silent: a rejected fetch never throws", async () => {
  stubFetch(async () => { throw new Error("network down"); });
  const r = await lookupWord("word", "en");
  assert.equal(r.ok, false);
});

console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
