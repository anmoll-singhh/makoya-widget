/**
 * state.ts
 *
 * Holds the user's chosen settings, persists them in localStorage, and
 * applies them to the page via data-attributes. This is the bridge between
 * "what the user clicked" and "what the page looks like".
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
  cursor: boolean;
}

const STORAGE_KEY = "makoya_prefs";

export const DEFAULT_PREFS: Prefs = {
  text: 0,
  spacing: false,
  contrast: "off",
  stopMotion: false,
  ruler: false,
  links: false,
  cursor: false,
};

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    // localStorage can throw in privacy mode — never let that break the widget.
    return { ...DEFAULT_PREFS };
  }
}

export function savePrefs(prefs: Prefs): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore — settings just won't persist this session */
  }
}

/**
 * Push the current prefs onto the page. Called on load, on every change,
 * and after SPA route changes (so settings survive client-side navigation).
 */
export function applyPrefs(prefs: Prefs): void {
  ensureEffectStyles();
  setHtmlAttr("data-mky-text", prefs.text === 0 ? null : String(prefs.text));
  setHtmlAttr("data-mky-spacing", prefs.spacing ? "on" : null);
  setHtmlAttr("data-mky-contrast", prefs.contrast === "off" ? null : prefs.contrast);
  setHtmlAttr("data-mky-motion", prefs.stopMotion ? "off" : null);
  setHtmlAttr("data-mky-links", prefs.links ? "on" : null);
  setHtmlAttr("data-mky-cursor", prefs.cursor ? "on" : null);
  // Reading ruler is a live element, handled separately in ui.ts.
}
