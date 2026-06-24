/**
 * loader.ts  →  builds to /dist/loader.js  (the stable URL clients paste ONCE)
 *
 * This file is intentionally tiny and changes almost never. It:
 *   1. Reads data-site from its own <script> tag.
 *   2. Fetches that site's config JSON from the CDN (with safe fallback).
 *   3. Loads the versioned core bundle.
 *   4. Calls MakoyaWidget.init(config).
 *
 * Why the split? You push new features by shipping a new core bundle. Clients
 * never edit their snippet again — the loader URL stays the same forever.
 *
 * Snippet the client pastes:
 *   <script src="https://cdn.makoya.example/loader.js" data-site="SITE_ID" defer></script>
 */

import { DEFAULT_CONFIG } from "@makoya/shared";
import { fetchGatedConfig } from "./fetch-config";

// CORE_URL is loader-local; the config base now lives in fetch-config.ts (shared
// by both bundles) so the loader and core auto-init resolve it identically.
const CORE_URL =
  (window as any).MAKOYA_CORE_URL || "https://makoya-gamma.vercel.app/widget/core.js";

/**
 * Read the script tag this loader was injected as, so we can pull its data-*
 * attributes. `currentScript` can be null when bundlers inline the loader, so
 * we fall back to the first <script data-site> on the page.
 */
function getSelfScript(): HTMLScriptElement | null {
  const current = document.currentScript as HTMLScriptElement | null;
  if (current?.dataset.site) return current;
  return document.querySelector<HTMLScriptElement>("script[data-site]");
}

function loadCore(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.MakoyaWidget) return resolve();
    const s = document.createElement("script");
    s.src = CORE_URL;
    s.async = true;
    // The loader drives init() with the fetched config. Without this, core's
    // auto-init would fire first with DEFAULTS and win the double-init guard,
    // ignoring the site's real config.
    s.setAttribute("data-no-auto", "");
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Makoya core failed to load"));
    document.head.appendChild(s);
  });
}

export async function boot(): Promise<void> {
  const self = getSelfScript();
  const siteId = self?.dataset.site ?? null;
  if (!siteId) return; // nothing to do without a site id

  // The per-site token (read the same way as data-site) is forwarded to the
  // config endpoint as `?t=` so the server can issue its licensing verdict.
  const token = self?.dataset.token;

  // Fetch the gated config and core in parallel. fetchGatedConfig NEVER throws —
  // on any failure it returns { active: true, config: {} } (FAIL OPEN).
  const [{ active, config }] = await Promise.all([
    fetchGatedConfig(siteId, token),
    loadCore(),
  ]);

  // SAFE ASYMMETRY — availability must never be sacrificed (non-negotiable #1):
  //   • active === false → an EXPLICIT server "off" verdict (licensed-off /
  //     domain-mismatch). The freeloader's browser always reaches the server,
  //     so it gets this explicit false → we do NOT mount.
  //   • Any failure (network/CORS/non-200) yields active === true (fetchGatedConfig
  //     fails open), so a paying customer is never punished for an outage.
  // Only the explicit `false` suppresses the widget.
  if (active === false) return;

  window.MakoyaWidget?.init({ ...DEFAULT_CONFIG, ...config, siteId });
}

// Auto-run on load (the real client snippet path). Guarded so test harnesses
// can import this module to exercise boot() in isolation without firing a live
// boot against a mocked DOM. Production builds set neither flag, so this runs.
if (!(window as any).MAKOYA_LOADER_NO_AUTOBOOT) {
  boot();
}
