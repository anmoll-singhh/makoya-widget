/**
 * state.ts
 *
 * Holds the user's chosen settings, persists them in localStorage, and
 * applies them to the page via data-attributes.
 *
 * WS1 Task 1: Prefs expanded with cursor color, saturation, reading mask,
 * highlight titles, left-align, mute sounds, and read-aloud. The cursor field
 * is a BREAKING change from boolean → "off"|"black"|"white". mask/mute/readAloud
 * are LIVE preferences controlled by ui/live.ts controllers — applyPrefs does
 * not set HTML attributes for them (no CSS-attr equivalent; they need JS).
 */

import { ensureEffectStyles, setHtmlAttr } from "../features/effects";

export interface Prefs {
  /** 0 = off, 1/2/3 = size steps */
  text: 0 | 1 | 2 | 3;
  spacing: boolean;
  /** "off" | "on" (mild contrast boost) | "dark" (inverted) */
  contrast: "off" | "on" | "dark";
  /** true = motion stopped */
  stopMotion: boolean;
  ruler: boolean;
  links: boolean;
  /**
   * Big cursor color. "off" = default system cursor.
   * CHANGED from boolean in WS1 Task 1 — breaking type change.
   */
  cursor: "off" | "black" | "white";
  /** legible/dyslexia-friendly font */
  font: boolean;
  /** hide page images to reduce distraction */
  images: boolean;
  /** Color saturation filter applied to the page body */
  saturation: "off" | "grayscale" | "low" | "high";
  /**
   * Reading mask overlay mode.
   * "off" = no overlay; "dim" = dark band with clear center; "tint" = soft full overlay.
   * LIVE: controlled by ui/live.ts makeMask() — not a CSS attribute.
   */
  mask: "off" | "dim" | "tint";
  /** Highlight h1–h6 headings with a yellow background + outline */
  titles: boolean;
  /** Force left-align on all body text */
  align: boolean;
  /**
   * Mute all audio/video on the page.
   * LIVE: controlled by ui/live.ts makeMute() — not a CSS attribute.
   */
  mute: boolean;
  /**
   * Read aloud: clicking page text reads it via SpeechSynthesis.
   * LIVE: controlled by ui/live.ts makeReadAloud() — not a CSS attribute.
   */
  readAloud: boolean;
}

export const STORAGE_KEY = "makoya_prefs";

export const DEFAULT_PREFS: Prefs = {
  text: 0,
  spacing: false,
  contrast: "off",
  stopMotion: false,
  ruler: false,
  links: false,
  cursor: "off",
  font: false,
  images: false,
  saturation: "off",
  mask: "off",
  titles: false,
  align: false,
  mute: false,
  readAloud: false,
};

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function savePrefs(prefs: Prefs): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore — privacy mode */
  }
}

/**
 * Push the current prefs onto the page. Called on load, on every change,
 * and after SPA route changes.
 *
 * Attribute mapping:
 *   data-mky-text      → 1/2/3 or absent
 *   data-mky-spacing   → "on" or absent
 *   data-mky-contrast  → "on"/"dark" or absent
 *   data-mky-motion    → "off" or absent (stops animations)
 *   data-mky-links     → "on" or absent
 *   data-mky-cursor    → "black"/"white" or absent  (WS1: was boolean "on")
 *   data-mky-font      → "on" or absent
 *   data-mky-images    → "off" or absent
 *   data-mky-sat       → "grayscale"/"low"/"high" or absent  (WS1 new)
 *   data-mky-titles    → "on" or absent  (WS1 new)
 *   data-mky-align     → "on" or absent  (WS1 new)
 *
 * NOT set here (LIVE controllers in ui/live.ts manage these):
 *   mask, mute, readAloud — these require JS, not just CSS attributes.
 * Reading ruler is also a live element, handled separately in ui.ts.
 */
export function applyPrefs(prefs: Prefs): void {
  ensureEffectStyles();
  setHtmlAttr("data-mky-text", prefs.text === 0 ? null : String(prefs.text));
  setHtmlAttr("data-mky-spacing", prefs.spacing ? "on" : null);
  setHtmlAttr("data-mky-contrast", prefs.contrast === "off" ? null : prefs.contrast);
  setHtmlAttr("data-mky-motion", prefs.stopMotion ? "off" : null);
  setHtmlAttr("data-mky-links", prefs.links ? "on" : null);
  // WS1 Task 1: cursor changed from boolean → "off"|"black"|"white"
  setHtmlAttr("data-mky-cursor", prefs.cursor === "off" ? null : prefs.cursor);
  setHtmlAttr("data-mky-font", prefs.font ? "on" : null);
  setHtmlAttr("data-mky-images", prefs.images ? "off" : null);
  // WS1 Task 1: new attrs
  setHtmlAttr("data-mky-sat", prefs.saturation === "off" ? null : prefs.saturation);
  setHtmlAttr("data-mky-titles", prefs.titles ? "on" : null);
  setHtmlAttr("data-mky-align", prefs.align ? "on" : null);
  // mask, mute, readAloud → LIVE (ui/live.ts), no CSS attribute needed here.
}
