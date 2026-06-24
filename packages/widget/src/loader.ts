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

import { DEFAULT_CONFIG, WidgetConfig } from "@makoya/shared";

/**
 * Loader-LOCAL transport type for the fetched payload.
 *
 * `active` is an ENVELOPE/transport flag the config endpoint uses to signal an
 * explicit "this site is licensed-off — do not mount" verdict. It is NOT a
 * widget display field, so it deliberately stays loader-local and is NEVER
 * added to the canonical `WidgetConfig` in `packages/shared` — doing so would
 * force a `sync:shared` regen and trip the shared-sync drift gate
 * (apps/web/lib/shared-sync.test.ts) for a value the widget UI never reads.
 */
type FetchedConfig = Partial<WidgetConfig> & { active?: boolean };

// In production these come from your build env. Hardcoded defaults keep the
// loader working even if env injection fails.
const CONFIG_BASE =
  (window as any).MAKOYA_CONFIG_BASE || "https://makoya-gamma.vercel.app/api/config";
const CORE_URL =
  (window as any).MAKOYA_CORE_URL || "https://makoya-gamma.vercel.app/widget/core.js";

function getSiteId(): string | null {
  const current = document.currentScript as HTMLScriptElement | null;
  if (current?.dataset.site) return current.dataset.site;
  // Fallback: find any script tag with data-site (currentScript can be null
  // when bundlers inline the loader).
  const tag = document.querySelector<HTMLScriptElement>("script[data-site]");
  return tag?.dataset.site ?? null;
}

async function fetchConfig(siteId: string): Promise<FetchedConfig> {
  try {
    const res = await fetch(`${CONFIG_BASE}/${encodeURIComponent(siteId)}`, {
      cache: "default",
    });
    if (!res.ok) return {};
    return (await res.json()) as FetchedConfig;
  } catch {
    // Network/CORS failure must NEVER stop the widget — fall back to defaults.
    // Note this returns {} (no `active` field), which is exactly why a real
    // outage still mounts the widget (see the asymmetry comment in boot()).
    return {};
  }
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
  const siteId = getSiteId();
  if (!siteId) return; // nothing to do without a site id

  // Fetch config and core in parallel; apply defaults if config is missing.
  const [partial] = await Promise.all([fetchConfig(siteId), loadCore()]);

  // Pull the transport-only `active` flag off before forwarding the rest to
  // init(config: WidgetConfig) — keeping it out of the spread avoids a TS
  // excess-property error and stops a non-WidgetConfig field leaking into core.
  const { active, ...cfg } = partial;

  // SAFE ASYMMETRY — availability must never be sacrificed (non-negotiable #1):
  //   • active === false  → an EXPLICIT server "off" verdict (licensed-off /
  //     domain-mismatch). The freeloader's browser always reaches the server,
  //     so it gets this explicit false → we do NOT mount.
  //   • active === undefined → no verdict was delivered. This is what a real
  //     network/CORS failure produces (fetchConfig returns {}), and also a
  //     plain config with no envelope flag. undefined is NOT false, so we STILL
  //     mount on defaults — a paying customer is never punished for an outage.
  // Only the explicit `false` suppresses the widget.
  if (active === false) return;

  window.MakoyaWidget?.init({ ...DEFAULT_CONFIG, ...cfg, siteId });
}

// Auto-run on load (the real client snippet path). Guarded so test harnesses
// can import this module to exercise boot() in isolation without firing a live
// boot against a mocked DOM. Production builds set neither flag, so this runs.
if (!(window as any).MAKOYA_LOADER_NO_AUTOBOOT) {
  boot();
}
