/**
 * core/index.ts
 *
 * The widget "engine". Exposes window.MakoyaWidget.init(config).
 * The loader (loader.ts) calls this after it has fetched the site's config.
 *
 * SPA guard: on single-page-app navigations (React/Next/Vue route changes),
 * the <html> attributes survive but the live ruler element can get wiped if
 * the framework replaces <body> children. We re-apply prefs after route
 * changes so the user's settings never silently disappear.
 */

import { resolveConfig, WidgetConfig } from "@makoya/shared";
import { mountUI } from "../ui/ui";
import { loadPrefs, applyPrefs } from "./state";
import { fetchGatedConfig } from "../fetch-config";

let mounted = false;

function hookSpaNavigation(): void {
  const reapply = () => applyPrefs(loadPrefs());
  const wrap = (type: "pushState" | "replaceState") => {
    const orig = history[type];
    history[type] = function (this: History, ...args: unknown[]) {
      // @ts-expect-error spread into native signature
      const result = orig.apply(this, args);
      setTimeout(reapply, 50);
      return result;
    } as typeof history[typeof type];
  };
  wrap("pushState");
  wrap("replaceState");
  window.addEventListener("popstate", () => setTimeout(reapply, 50));
}

export function init(partial: Partial<WidgetConfig> & { siteId: string }): void {
  // Guard against double-initialisation (script included twice).
  if (mounted || document.getElementById("makoya-widget-root")) return;
  mounted = true;

  const config = resolveConfig(partial.siteId, partial);

  const start = () => {
    mountUI(config);
    hookSpaNavigation();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
}

// Expose on window so the loader (separate bundle) can call it.
declare global {
  interface Window {
    MakoyaWidget?: { init: typeof init };
    MAKOYA_AUTO_INIT?: boolean;
  }
}
window.MakoyaWidget = { init };

/**
 * AUTO-INIT — now GATED (closes the direct-core.js bypass).
 *
 * When core.js is included directly with a `data-site` attribute we used to
 * mount on raw DEFAULT_CONFIG without ever calling the config endpoint — a free
 * path around the licensing gate. We now fetch + gate exactly like the loader:
 * forward `data-token` to the endpoint and honour an explicit `active: false`.
 *
 * Modes (decided by the script tag's data-* attrs):
 *   • data-no-auto  → return immediately. The LOADER drives init() (it sets this
 *     on the core <script> it injects), so auto-init must stay out of its way.
 *   • data-demo     → mount on defaults WITHOUT a fetch. An offline-demo escape
 *     hatch so `<script src="core.js" data-site="demo" data-demo>` "just works"
 *     with no network (used by the standalone demos).
 *   • otherwise     → fetchGatedConfig(siteId, token); only init() if the server
 *     did not return active:false; merge the fetched config over defaults.
 *
 * NEVER THROWS (non-negotiable #1): wrapped in a try/catch AND the async IIFE
 * has `.catch(() => {})` attached so a rejected promise can't surface as an
 * unhandled rejection. fetchGatedConfig itself fails open ({} / active:true) on
 * any network/CORS/timeout error, so a real outage STILL mounts on defaults.
 */
(async function autoInit() {
  try {
    const self =
      (document.currentScript as HTMLScriptElement | null) ??
      document.querySelector<HTMLScriptElement>("script[data-site]");
    if (!self) return;
    // The loader sets data-no-auto on the core <script> it injects; honour it.
    if (self.hasAttribute("data-no-auto")) return;

    const siteId = self.dataset.site || "auto";
    const token = self.dataset.token;
    const color = self.dataset.color;
    const colorPart = color ? { primaryColor: color } : {};

    // Offline-demo escape hatch: mount on defaults, skip the network entirely.
    if (self.hasAttribute("data-demo")) {
      init({ siteId, ...colorPart });
      return;
    }

    // Gated path: fetch the config (fails open on any error) and honour the
    // explicit off-switch. An outage yields active:true → we still mount.
    const { active, config } = await fetchGatedConfig(siteId, token);
    if (active === false) return;
    init({ ...config, siteId, ...colorPart });
  } catch {
    /* never throw from auto-init */
  }
})().catch(() => {
  /* belt-and-braces: swallow any rejection so it never becomes an unhandled one */
});
