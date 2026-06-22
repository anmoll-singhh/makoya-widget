/**
 * shared-sync.test.ts — the guard that makes the @makoya/shared mirror SAFE.
 *
 * `apps/web/lib/shared/index.ts` is a generated copy of the canonical
 * `packages/shared/src/index.ts` (see scripts/sync-shared.mjs). If the two ever
 * disagree about the config shape, the widget and the dashboard can silently
 * desync — exactly the failure the monorepo's shared package exists to prevent.
 *
 * This test compares the two files' CODE BODIES (ignoring their doc-comment
 * headers, which intentionally differ). If they drift, CI fails with a message
 * telling you to run `npm run sync:shared`.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Anchor to THIS file's location (apps/web/lib) so the test is cwd-independent.
const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..", "..", "..");
const CANONICAL = resolve(REPO_ROOT, "packages/shared/src/index.ts");
const MIRROR = resolve(REPO_ROOT, "apps/web/lib/shared/index.ts");

/** Remove the leading `/** ... *\/` doc block and surrounding whitespace. */
function codeBody(src: string): string {
  return src.replace(/^\s*\/\*\*[\s\S]*?\*\//, "").trim();
}

describe("shared config mirror", () => {
  it("apps/web mirror is byte-identical to canonical packages/shared (run `npm run sync:shared` if this fails)", () => {
    const canonical = codeBody(readFileSync(CANONICAL, "utf8"));
    const mirror = codeBody(readFileSync(MIRROR, "utf8"));
    expect(mirror).toBe(canonical);
  });
});
