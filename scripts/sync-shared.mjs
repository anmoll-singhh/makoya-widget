/**
 * sync-shared.mjs — regenerates the apps/web mirror of @makoya/shared.
 *
 * WHY THIS EXISTS
 * ───────────────
 * `packages/shared/src/index.ts` is the SINGLE SOURCE OF TRUTH for the widget
 * config shape. The embeddable widget imports it directly. The Next.js app
 * (apps/web) cannot import across the monorepo boundary because Vercel uploads
 * only the apps/web directory, so it consumes a generated in-tree copy at
 * `apps/web/lib/shared/index.ts` (the `@makoya/shared` tsconfig alias points
 * there). That copy USED to be hand-maintained — which silently drifts and
 * breaks the one guarantee the architecture promises: that the widget and the
 * dashboard can never disagree about a config.
 *
 * This script makes the copy GENERATED, not hand-edited. Run it whenever you
 * change the canonical file:
 *
 *     npm run sync:shared
 *
 * CI runs `apps/web/lib/shared-sync.test.ts`, which FAILS if the two files'
 * bodies have drifted — so a forgotten sync can never reach production.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");

const CANONICAL = resolve(repoRoot, "packages/shared/src/index.ts");
const MIRROR = resolve(repoRoot, "apps/web/lib/shared/index.ts");

/** Strip the leading `/** ... *\/` doc block so we keep only the exported code. */
function stripLeadingDocBlock(src) {
  return src.replace(/^\s*\/\*\*[\s\S]*?\*\//, "").trimStart();
}

const GENERATED_HEADER = `/**
 * ⚠️  GENERATED FILE — DO NOT EDIT BY HAND.
 *
 * This is an auto-generated mirror of \`packages/shared/src/index.ts\`, the
 * single source of truth for the widget config shape. It exists so apps/web is
 * a self-contained Vercel deployment. To change the config shape, edit the
 * CANONICAL file and run:  npm run sync:shared
 *
 * CI (apps/web/lib/shared-sync.test.ts) fails if this file drifts from canonical.
 *
 * @makoya/shared — single source of truth for the widget config shape.
 */
`;

const canonicalSrc = readFileSync(CANONICAL, "utf8");
const body = stripLeadingDocBlock(canonicalSrc);
const out = `${GENERATED_HEADER}\n${body}`;

const current = (() => {
  try {
    return readFileSync(MIRROR, "utf8");
  } catch {
    return null;
  }
})();

if (current === out) {
  console.log("✓ shared mirror already in sync — no change.");
} else {
  writeFileSync(MIRROR, out, "utf8");
  console.log(`✓ regenerated ${MIRROR} from canonical packages/shared.`);
}
