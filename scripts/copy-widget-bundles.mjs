/**
 * copy-widget-bundles.mjs
 *
 * Copies the built widget bundles from packages/widget/dist into the Next.js
 * app's public/ dir, which is what production actually serves at /widget/*.
 *
 * WHY THIS EXISTS: the deployed loader.js / core.js are static files under
 * apps/web/public/widget/. They are NOT rebuilt by the Next build, so editing
 * the widget source has no effect on production until the bundle is rebuilt and
 * copied here. This step was previously manual (and was silently skipped — the
 * shipped loader.js had gone stale). Run `npm run build:widget:deploy` to do
 * both in one shot.
 */
import { copyFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "packages", "widget", "dist");
const dst = join(root, "apps", "web", "public", "widget");

for (const file of ["loader.js", "core.js"]) {
  copyFileSync(join(src, file), join(dst, file));
  console.log(`copied ${file} → apps/web/public/widget/${file}`);
}
