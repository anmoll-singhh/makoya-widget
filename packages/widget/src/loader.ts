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

// In production these come from your build env. Hardcoded defaults keep the
// loader working even if env injection fails.
const CONFIG_BASE =
  (window as any).MAKOYA_CONFIG_BASE || "https://cdn.makoya.example/config";
const CORE_URL =
  (window as any).MAKOYA_CORE_URL || "https://cdn.makoya.example/core.js";

function getSiteId(): string | null {
  const current = document.currentScript as HTMLScriptElement | null;
  if (current?.dataset.site) return current.dataset.site;
  // Fallback: find any script tag with data-site (currentScript can be null
  // when bundlers inline the loader).
  const tag = document.querySelector<HTMLScriptElement>("script[data-site]");
  return tag?.dataset.site ?? null;
}

async function fetchConfig(siteId: string): Promise<Partial<WidgetConfig>> {
  try {
    const res = await fetch(`${CONFIG_BASE}/${encodeURIComponent(siteId)}.json`, {
      cache: "default",
    });
    if (!res.ok) return {};
    return (await res.json()) as Partial<WidgetConfig>;
  } catch {
    // Network/CORS failure must NEVER stop the widget — fall back to defaults.
    return {};
  }
}

function loadCore(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.MakoyaWidget) return resolve();
    const s = document.createElement("script");
    s.src = CORE_URL;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Makoya core failed to load"));
    document.head.appendChild(s);
  });
}

async function boot(): Promise<void> {
  const siteId = getSiteId();
  if (!siteId) return; // nothing to do without a site id

  // Fetch config and core in parallel; apply defaults if config is missing.
  const [partial] = await Promise.all([fetchConfig(siteId), loadCore()]);
  window.MakoyaWidget?.init({ ...DEFAULT_CONFIG, ...partial, siteId });
}

boot();
