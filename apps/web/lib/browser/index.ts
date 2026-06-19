/**
 * lib/browser/index.ts
 *
 * Barrel export for the browser engine layer.
 *
 * Import surface for consumers:
 *   import { scanPage } from "@/lib/browser";
 *   import { launchBrowser, openPage } from "@/lib/browser";
 */

export { launchBrowser, openPage } from "./launcher";
export type { BrowserHandle, PageHandle } from "./launcher";

export { scanPage } from "./scanPage";
export type { ScanPageResult } from "./scanPage";
