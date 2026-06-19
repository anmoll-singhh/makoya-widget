/**
 * lib/scanner/link-extractor.ts
 *
 * Extracts internal same-domain links from a Playwright page that is already
 * loaded and ready.  Operates entirely inside a single `page.evaluate` call to
 * avoid N round-trips to the browser process.
 *
 * Rules (in order of evaluation):
 *  1. `href` must resolve to the same origin as `baseUrl`.
 *  2. Must use `http:` or `https:` protocol only.
 *  3. Must not point to a binary resource (PDF, image, archive, media, font …).
 *  4. After stripping hash, the resulting URL must differ from the homepage URL
 *     (pure fragment navigation is excluded).
 *  5. Deduplicated by normalised URL (no trailing slash, no fragment).
 *  6. Results are capped at `max` (default 3).
 *
 * Memory safety:
 *  - Runs inside the browser context via `page.evaluate` — no DOM references
 *    leak into the Node.js heap.
 *  - If `page.evaluate` throws (context destroyed, navigation race) we catch
 *    and return an empty array rather than propagating an error.
 */

import type { Page } from "playwright-core";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * File-extension blocklist.  Any link whose pathname ends with one of these
 * extensions is silently skipped — these resources cannot be meaningfully
 * scanned by axe-core.
 */
const BLOCKED_EXTENSIONS = new Set([
  // Documents
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".odt", ".ods",
  // Images
  ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".ico", ".avif", ".bmp",
  // Media
  ".mp4", ".mp3", ".mov", ".avi", ".webm", ".ogg", ".wav", ".flac",
  // Archives
  ".zip", ".tar", ".gz", ".bz2", ".rar", ".7z",
  // Code / data (not scannable pages)
  ".css", ".js", ".mjs", ".json", ".xml", ".csv", ".txt",
  // Fonts
  ".woff", ".woff2", ".ttf", ".otf", ".eot",
]);

/** Maximum number of links returned when caller does not supply a limit. */
const DEFAULT_MAX = 3;

// ---------------------------------------------------------------------------
// Public extractor
// ---------------------------------------------------------------------------

/**
 * Extracts up to `max` internal, same-domain page links from the currently
 * loaded Playwright page.
 *
 * @param page    Playwright `Page` — must already be navigated to `baseUrl`.
 * @param baseUrl The homepage URL used to determine "same origin".
 * @param max     Upper bound on returned links (default 3).
 * @returns       Deduplicated, normalised URL strings safe to pass to `runScan`.
 */
export async function extractSameDomainLinks(
  page: Page,
  baseUrl: string,
  max: number = DEFAULT_MAX
): Promise<string[]> {
  let base: URL;
  try {
    base = new URL(baseUrl);
  } catch {
    // Malformed base URL — nothing we can do.
    return [];
  }

  // ── Collect all href values from the live DOM in a single evaluate ────────
  let rawHrefs: string[] = [];
  try {
    rawHrefs = await page.evaluate((): string[] =>
      Array.from(document.querySelectorAll("a[href]")).map(
        (el) => (el as HTMLAnchorElement).href  // browser resolves relative URLs
      )
    );
  } catch {
    // Page context destroyed or navigation occurred — bail out safely.
    return [];
  }

  // ── Filter, normalise, deduplicate ────────────────────────────────────────
  const seen = new Set<string>();
  const links: string[] = [];

  for (const href of rawHrefs) {
    if (links.length >= max) break;

    // Parse — the browser already resolved relative URLs so this should
    // always succeed, but guard defensively.
    let parsed: URL;
    try {
      parsed = new URL(href);
    } catch {
      continue;
    }

    // Rule 1: Same origin only (scheme + hostname + port must match).
    if (parsed.origin !== base.origin) continue;

    // Rule 2: HTTP(S) only — filters out mailto:, tel:, javascript:, etc.
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") continue;

    // Rule 3: No binary extensions.
    const ext = parsed.pathname.toLowerCase().match(/\.[a-z0-9]{1,6}$/)?.[0] ?? "";
    if (ext && BLOCKED_EXTENSIONS.has(ext)) continue;

    // Rule 4: Must differ from the homepage (strip search + hash for comparison).
    parsed.hash = "";  // remove fragment — fragments are client-side only
    const normalised = parsed.toString().replace(/\/$/, ""); // strip trailing slash

    const baseNormalised = base.toString().replace(/\/$/, "").replace(/#.*$/, "");
    if (normalised === baseNormalised) continue;

    // Rule 5: Deduplicate.
    if (seen.has(normalised)) continue;
    seen.add(normalised);

    links.push(normalised);
  }

  return links;
}
