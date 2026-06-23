/**
 * lib/scanner/content-hash.ts
 *
 * Produces a stable "did the page actually change?" fingerprint.
 *
 * Why a structural/a11y skeleton and NOT the visible text:
 * ────────────────────────────────────────────────────────
 * The score's defensibility rests on telling "the SITE changed" apart from
 * "WE changed". Hashing visible text would report a change on almost every
 * real site every run — timestamps, "5 minutes ago", cart counts, CSRF
 * tokens, ad slots, and framework-randomised ids/classes (React `useId`,
 * styled-components hashes) all churn between identical renders.
 *
 * Instead we hash a skeleton of: the tag-name tree + only accessibility-
 * relevant attributes, with volatile values dropped. This changes when the
 * structure or the a11y semantics change (exactly what axe scores) and stays
 * constant when only cosmetic/volatile content changes.
 *
 * `buildA11ySkeleton` is intentionally SELF-CONTAINED (no external references)
 * so Playwright can serialize it into `page.evaluate` and run it in the
 * browser, while the same function runs under jsdom in tests — one code path,
 * fully tested, no runtime DOM dependency in the bundle.
 */

import { createHash } from "crypto";

/**
 * Walks the DOM from `root` and returns a normalised skeleton string capturing
 * structure + accessibility semantics only. Self-contained: uses only DOM APIs
 * available in both the browser and jsdom, with all constants inlined.
 */
export function buildA11ySkeleton(root: Element = document.documentElement): string {
  // Never traverse into these — their content is not part of the a11y tree and
  // routinely contains volatile data (inline scripts with timestamps, etc.).
  const SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"]);
  // Attributes whose VALUE is accessibility-relevant (kept name=value).
  const VALUE_ATTRS = new Set([
    "role", "alt", "title", "type", "lang", "for", "headers", "scope", "tabindex",
  ]);
  // Attributes where only PRESENCE matters; the value is volatile (URLs with
  // session tokens, etc.) so it is dropped, but "a link/media exists" is kept.
  const PRESENCE_ATTRS = new Set(["href", "src", "controls", "autoplay", "muted"]);

  const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
  const tokens: string[] = [];

  const walk = (el: Element, depth: number): void => {
    if (SKIP.has(el.tagName)) return;

    const parts: string[] = [];
    for (const name of el.getAttributeNames()) {
      if (name.startsWith("aria-") || VALUE_ATTRS.has(name)) {
        parts.push(`${name}=${norm(el.getAttribute(name) ?? "")}`);
      } else if (PRESENCE_ATTRS.has(name)) {
        parts.push(name);
      }
      // everything else (id, class, style, data-*, nonce, on*, name, value,
      // width/height, …) is intentionally dropped as volatile/cosmetic.
    }
    parts.sort();
    tokens.push(`${depth}:${el.tagName.toLowerCase()}[${parts.join(";")}]`);

    for (const child of Array.from(el.children)) walk(child, depth + 1);
  };

  walk(root, 0);
  return tokens.join(">");
}

/** SHA-256 hex digest of a skeleton string. Stable and collision-resistant. */
export function computeContentHash(skeleton: string): string {
  return createHash("sha256").update(skeleton).digest("hex");
}
