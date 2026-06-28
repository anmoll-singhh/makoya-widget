/**
 * lib/verify-install-detect.ts — pure, unit-testable detection logic for the
 * install-verification route (`/api/sites/[id]/verify-install`).
 *
 * WHY THIS LIVES IN lib/ (not in the route file):
 *   Next.js App Router route modules may only export route handlers (GET/POST/…)
 *   and a small set of config fields (`runtime`, `dynamic`, …). Exporting a
 *   helper like `detectMakoyaLoader` from the route file fails the production
 *   `next build` with "… is not a valid Route export field". Keeping the pure
 *   logic here lets both the route AND the unit tests import it cleanly.
 *
 * This module has NO I/O and NO side effects — it only inspects raw HTML text.
 */

/** Result of inspecting a page's raw HTML for the Makoya loader. */
export interface DetectResult {
  installed: boolean;
  reason: string;
  details: {
    loaderFound: boolean;
    siteIdMatch: boolean;
    widgetRootFound: boolean;
  };
}

/**
 * Inspects raw HTML text to determine whether the Makoya loader snippet is
 * present for `siteId`. Pure and testable — no I/O, no side effects.
 *
 * Both (loaderFound && siteIdMatch) must be true for installed:true. Detecting
 * the loader without the right data-site gives an actionable "data-site
 * mismatch" reason rather than a generic "not found".
 *
 * siteId is regex-escaped before use so IDs containing regex metacharacters
 * (dots, plusses, etc.) are matched literally.
 */
export function detectMakoyaLoader(html: string, siteId: string): DetectResult {
  // Check 1: loader script tag — src contains "/widget/loader.js"
  const loaderFound = /\bsrc=["'][^"']*\/widget\/loader\.js["']/i.test(html);

  // Check 2: data-site attribute matching this site's ID exactly.
  // Escape the siteId so any regex metacharacters in the ID are literal.
  const escapedId = siteId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const siteIdMatch = new RegExp(`data-site=["']${escapedId}["']`, "i").test(html);

  // Check 3: widget root marker — bonus signal, present once the widget has
  // rendered on the page at least once (less reliable in static snapshots but
  // useful to surface in details so owners can diagnose caching issues).
  const widgetRootFound = /id=["']makoya-widget-root["']/i.test(html);

  if (loaderFound && siteIdMatch) {
    return {
      installed: true,
      reason: "installed ✓",
      details: { loaderFound, siteIdMatch, widgetRootFound },
    };
  }

  if (loaderFound && !siteIdMatch) {
    return {
      installed: false,
      reason: "found loader but data-site mismatch — check your snippet",
      details: { loaderFound, siteIdMatch, widgetRootFound },
    };
  }

  return {
    installed: false,
    reason: "loader script not found in page HTML",
    details: { loaderFound, siteIdMatch, widgetRootFound },
  };
}
