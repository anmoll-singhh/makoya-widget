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
 * AUTO-INIT (the fix for "icon not showing").
 * If core.js is included directly with a data-site attribute, mount with
 * sensible defaults — no manual init() call needed. This is what makes
 * `<script src="core.js" data-site="demo"></script>` "just work".
 * Set data-no-auto on the script tag to opt out (e.g. when the loader drives init).
 */
(function autoInit() {
  try {
    const self =
      (document.currentScript as HTMLScriptElement | null) ??
      document.querySelector<HTMLScriptElement>("script[data-site]");
    if (!self) return;
    if (self.hasAttribute("data-no-auto")) return;
    const siteId = self.dataset.site || "auto";
    const color = self.dataset.color;
    init({ siteId, ...(color ? { primaryColor: color } : {}) });
  } catch {
    /* never throw from auto-init */
  }
})();
