/**
 * ui/features.ts
 *
 * Maps every FeatureKey to:
 *   ICON         — decorative SVG string (all 15 keys)
 *   buildFeature — returns the `.mky-row` HTMLElement for a given key,
 *                  or null for unknown keys.
 *
 * This module replaces the old inline `FEATURES` map in ui.ts and adds
 * controls for the 6 new WS1 keys: saturation, readingMask, highlightTitles,
 * textAlign, muteSounds, readAloud.
 *
 * Design rules followed here:
 *   - No host-page DOM manipulation — all elements are Shadow DOM children.
 *   - No "compliant" / "guaranteed accessible" copy anywhere.
 *   - All labels come from i18n `t()` — never hard-coded English strings.
 *   - `buildFeature` is a pure factory; it reads `prefs` at call time and
 *     wires the `onChange` callback. It does NOT subscribe/poll.
 */

import type { FeatureKey } from "@makoya/shared";
import type { Prefs } from "../core/state";
import type { Lang } from "./i18n";
import { t } from "./i18n";
import { makeSwitch, makeSeg, makeStepper, makeColorPalette, row } from "./controls";

// ---------------------------------------------------------------------------
// ICON map — decorative inline SVGs for all 15 FeatureKeys.
// ---------------------------------------------------------------------------

/**
 * Inline SVG strings keyed by FeatureKey. All SVGs use `currentColor` so they
 * inherit the panel's text colour and respect dark-mode CSS overrides.
 * The map is Partial so unknown keys (future) don't cause type errors.
 */
export const ICON: Partial<Record<FeatureKey, string>> = {
  // ── Original 9 from ui.ts ────────────────────────────────────────────────
  textSize: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg>`,

  lineSpacing: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>`,

  contrast: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/></svg>`,

  stopMotion: `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>`,

  readingRuler: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="9" width="18" height="6" rx="1.5"/><path d="M7.5 9v3M12 9v3M16.5 9v3"/></svg>`,

  highlightLinks: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.07 0l2-2a5 5 0 0 0-7.07-7.07l-1 1"/><path d="M14 11a5 5 0 0 0-7.07 0l-2 2A5 5 0 0 0 12 20.07l1-1"/></svg>`,

  bigCursor: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M5 3l6.5 17 2.2-7.3L21 10.5 5 3z"/></svg>`,

  readableFont: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 20l4-12 4 12M6.5 16h5M14 11c0-1.7 1.3-3 3-3s3 1.3 3 3v9"/></svg>`,

  hideImages: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 16l5-5 3 3M3 3l18 18"/></svg>`,

  // ── 6 new WS1 keys ───────────────────────────────────────────────────────

  /** Color saturation: circular palette icon */
  saturation: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 3v9l6 3.5" stroke-width="1.5"/><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/></svg>`,

  /** Reading mask: horizontal band with cutout center */
  readingMask: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="5" rx="1" fill="currentColor" fill-opacity=".25"/><rect x="2" y="10" width="20" height="4" rx="1"/><rect x="2" y="16" width="20" height="5" rx="1" fill="currentColor" fill-opacity=".25"/></svg>`,

  /** Highlight titles: heading with underline accent */
  highlightTitles: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16M4 12h10"/><rect x="3" y="16" width="18" height="3" rx="1" fill="currentColor" fill-opacity=".3" stroke="none"/></svg>`,

  /** Text align: left-aligned lines */
  textAlign: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M3 11h12M3 16h15"/></svg>`,

  /** Mute sounds: speaker with X */
  muteSounds: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H3v6h3l5 4V5z"/><path d="M17 9l4 4M21 9l-4 4"/></svg>`,

  /** Read aloud: speech bubble with waveform */
  readAloud: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 10h.01M12 10h.01M16 10h.01"/></svg>`,

  /** Highlight on hover: crosshair / target icon */
  highlightHover: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/></svg>`,

  /** Bigger tap targets: hand pointer hitting a large target */
  biggerTargets: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="12" cy="12" r="3" fill="currentColor" fill-opacity=".25"/><path d="M12 9v6M9 12h6" stroke-width="1.5"/></svg>`,

  /** Focus indicator: crosshair / target rings */
  focusIndicator: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/></svg>`,
};

// ---------------------------------------------------------------------------
// Curated color swatches. Text/title swatches are all DARK (readable on a light
// background); background swatches are all LIGHT (keep default dark text legible)
// — a baseline so the tools don't actively harm readability (a11y review P1-4).
// Names are human-readable so makeColorPalette announces them, not hex (P2-14).
// "" = off.
// ---------------------------------------------------------------------------
const TEXT_COLOR_SWATCHES: { value: string; name: string }[] = [
  { value: "", name: "Off" },
  { value: "#000000", name: "Black" },
  { value: "#1f2937", name: "Dark gray" },
  { value: "#1e3a8a", name: "Navy" },
  { value: "#14532d", name: "Dark green" },
  { value: "#7f1d1d", name: "Maroon" },
  { value: "#581c87", name: "Purple" },
];
const BG_COLOR_SWATCHES: { value: string; name: string }[] = [
  { value: "", name: "Off" },
  { value: "#ffffff", name: "White" },
  { value: "#fdf6e3", name: "Cream" },
  { value: "#f1f5f9", name: "Light gray" },
  { value: "#fefce8", name: "Pale yellow" },
  { value: "#eff6ff", name: "Pale blue" },
  { value: "#f0fdf4", name: "Pale green" },
];

// ---------------------------------------------------------------------------
// buildFeature
// ---------------------------------------------------------------------------

/**
 * Builds the full `.mky-row` element for a given FeatureKey, or returns null
 * if the key is not handled (forward-compat safety net).
 *
 * @param key      - Which feature to render.
 * @param prefs    - Live prefs object; control reads current values from it
 *                   and writes back via the appropriate setter.
 * @param lang     - Active language for all labels.
 * @param onChange - Called after any pref mutation (apply + save + re-render).
 */
export function buildFeature(
  key: FeatureKey,
  prefs: Prefs,
  lang: Lang,
  onChange: () => void
): HTMLElement | null {
  const icon = ICON[key] ?? "";

  switch (key) {
    // ── % steppers (continuous Content adjusters) ────────────────────────────
    case "contentScale": {
      const label = t(lang, "f_contentScale");
      return row(icon, label, makeStepper(
        lang, label, prefs.contentScale, 70, 150, 10,
        (v) => { prefs.contentScale = v; }, onChange,
      ));
    }

    case "textSize": {
      const label = t(lang, "f_textSize");
      return row(icon, label, makeStepper(
        lang, label, prefs.fontScale, 80, 200, 10,
        (v) => { prefs.fontScale = v; }, onChange,
      ));
    }

    case "lineSpacing": {
      const label = t(lang, "f_lineSpacing");
      return row(icon, label, makeStepper(
        lang, label, prefs.lineHeightPct, 100, 250, 10,
        (v) => { prefs.lineHeightPct = v; }, onChange,
      ));
    }

    case "letterSpacing": {
      const label = t(lang, "f_letterSpacing");
      return row(icon, label, makeStepper(
        lang, label, prefs.letterSpacingPct, 0, 50, 5,
        (v) => { prefs.letterSpacingPct = v; }, onChange,
      ));
    }

    // ── Segmented controls ───────────────────────────────────────────────────
    case "contrast": {
      const label = t(lang, "f_contrast");
      const seg = makeSeg(
        label,
        [
          { value: "off",   label: t(lang, "opt_off")   },
          { value: "on",    label: t(lang, "opt_on")    },
          { value: "light", label: t(lang, "opt_light") },
          { value: "dark",  label: t(lang, "opt_dark")  },
          { value: "high",  label: t(lang, "opt_high")  },
        ],
        prefs.contrast,
        (v) => { prefs.contrast = v as Prefs["contrast"]; },
        onChange
      );
      return row(icon, label, seg);
    }

    case "textAlign": {
      const label = t(lang, "f_textAlign");
      const seg = makeSeg(
        label,
        [
          { value: "off",     label: t(lang, "opt_off")     },
          { value: "left",    label: t(lang, "opt_left")    },
          { value: "center",  label: t(lang, "opt_center")  },
          { value: "right",   label: t(lang, "opt_right")   },
          { value: "justify", label: t(lang, "opt_justify") },
        ],
        prefs.textAlign,
        (v) => { prefs.textAlign = v as Prefs["textAlign"]; },
        onChange
      );
      return row(icon, label, seg);
    }

    case "readableFont": {
      const label = t(lang, "f_readableFont");
      const seg = makeSeg(
        label,
        [
          { value: "off",      label: t(lang, "opt_off")      },
          { value: "readable", label: t(lang, "opt_readable") },
          { value: "dyslexic", label: t(lang, "opt_dyslexic") },
        ],
        prefs.font,
        (v) => { prefs.font = v as Prefs["font"]; },
        onChange
      );
      return row(icon, label, seg);
    }

    case "saturation": {
      const label = t(lang, "f_saturation");
      const seg = makeSeg(
        label,
        [
          { value: "off",       label: t(lang, "opt_off")       },
          { value: "grayscale", label: t(lang, "opt_grayscale") },
          { value: "low",       label: t(lang, "opt_low")       },
          { value: "high",      label: t(lang, "opt_high")      },
        ],
        prefs.saturation,
        (v) => { prefs.saturation = v as Prefs["saturation"]; },
        onChange
      );
      return row(icon, label, seg);
    }

    case "bigCursor": {
      const label = t(lang, "f_bigCursor");
      const seg = makeSeg(
        label,
        [
          { value: "off",   label: t(lang, "opt_off")   },
          { value: "black", label: t(lang, "opt_black") },
          { value: "white", label: t(lang, "opt_white") },
        ],
        prefs.cursor,
        (v) => { prefs.cursor = v as Prefs["cursor"]; },
        onChange
      );
      return row(icon, label, seg);
    }

    case "readingMask": {
      const label = t(lang, "f_readingMask");
      const seg = makeSeg(
        label,
        [
          { value: "off",  label: t(lang, "opt_off")  },
          { value: "dim",  label: t(lang, "opt_dim")  },
          { value: "tint", label: t(lang, "opt_tint") },
        ],
        prefs.mask,
        (v) => { prefs.mask = v as Prefs["mask"]; },
        onChange
      );
      return row(icon, label, seg);
    }

    // ── Switch controls ──────────────────────────────────────────────────────
    case "highlightLinks": {
      const label = t(lang, "f_highlightLinks");
      return row(icon, label,
        makeSwitch(label, prefs.links, (v) => { prefs.links = v; }, onChange));
    }

    case "hideImages": {
      const label = t(lang, "f_hideImages");
      return row(icon, label,
        makeSwitch(label, prefs.images, (v) => { prefs.images = v; }, onChange));
    }

    case "stopMotion": {
      const label = t(lang, "f_stopMotion");
      return row(icon, label,
        makeSwitch(label, prefs.stopMotion, (v) => { prefs.stopMotion = v; }, onChange));
    }

    case "readingRuler": {
      const label = t(lang, "f_readingRuler");
      const switchRow = row(icon, label,
        makeSwitch(label, prefs.ruler, (v) => { prefs.ruler = v; }, onChange));
      const palette = makeColorPalette(
        t(lang, "rulerColor"),
        prefs.rulerColor,
        [
          { value: "#ffd400", name: "Yellow" },
          { value: "#22c55e", name: "Green" },
          { value: "#3b82f6", name: "Blue" },
          { value: "#ec4899", name: "Pink" },
          { value: "#111827", name: "Black" },
        ],
        (c) => { prefs.rulerColor = c; },
        onChange
      );
      const wrapper = document.createElement("div");
      wrapper.append(switchRow, palette);
      return wrapper;
    }

    case "highlightTitles": {
      const label = t(lang, "f_highlightTitles");
      return row(icon, label,
        makeSwitch(label, prefs.titles, (v) => { prefs.titles = v; }, onChange));
    }

    case "muteSounds": {
      const label = t(lang, "f_muteSounds");
      return row(icon, label,
        makeSwitch(label, prefs.mute, (v) => { prefs.mute = v; }, onChange));
    }

    case "readAloud": {
      const label = t(lang, "f_readAloud");
      return row(icon, label,
        makeSwitch(label, prefs.readAloud, (v) => { prefs.readAloud = v; }, onChange));
    }

    case "highlightHover": {
      const label = t(lang, "f_highlightHover");
      return row(icon, label,
        makeSwitch(label, prefs.hoverHighlight, (v) => { prefs.hoverHighlight = v; }, onChange));
    }

    case "biggerTargets": {
      const label = t(lang, "f_biggerTargets");
      return row(icon, label,
        makeSwitch(label, prefs.biggerTargets, (v) => { prefs.biggerTargets = v; }, onChange));
    }

    case "focusIndicator": {
      const label = t(lang, "f_focusIndicator");
      return row(icon, label,
        makeSwitch(label, prefs.focusIndicator, (v) => { prefs.focusIndicator = v; }, onChange));
    }

    // ── Color palettes ───────────────────────────────────────────────────────
    case "textColor": {
      const label = t(lang, "f_textColor");
      return makeColorPalette(label, prefs.textColor, TEXT_COLOR_SWATCHES,
        (c) => { prefs.textColor = c; }, onChange);
    }
    case "titleColor": {
      const label = t(lang, "f_titleColor");
      return makeColorPalette(label, prefs.titleColor, TEXT_COLOR_SWATCHES,
        (c) => { prefs.titleColor = c; }, onChange);
    }
    case "bgColor": {
      const label = t(lang, "f_bgColor");
      return makeColorPalette(label, prefs.bgColor, BG_COLOR_SWATCHES,
        (c) => { prefs.bgColor = c; }, onChange);
    }

    // ── Live-controller toggles (the controller is wired in ui.ts apply()) ────
    case "magnifier": {
      const label = t(lang, "f_magnifier");
      return row(icon, label,
        makeSwitch(label, prefs.magnifier, (v) => { prefs.magnifier = v; }, onChange));
    }
    case "readMode": {
      const label = t(lang, "f_readMode");
      return row(icon, label,
        makeSwitch(label, prefs.readMode, (v) => { prefs.readMode = v; }, onChange));
    }
    case "usefulLinks": {
      const label = t(lang, "f_usefulLinks");
      return row(icon, label,
        makeSwitch(label, prefs.usefulLinks, (v) => { prefs.usefulLinks = v; }, onChange));
    }
    case "pageStructure": {
      const label = t(lang, "f_pageStructure");
      return row(icon, label,
        makeSwitch(label, prefs.pageStructure, (v) => { prefs.pageStructure = v; }, onChange));
    }
    case "keyboardNav": {
      const label = t(lang, "f_keyboardNav");
      return row(icon, label,
        makeSwitch(label, prefs.keyboardNav, (v) => { prefs.keyboardNav = v; }, onChange));
    }
    case "virtualKeyboard": {
      const label = t(lang, "f_virtualKeyboard");
      return row(icon, label,
        makeSwitch(label, prefs.virtualKeyboard, (v) => { prefs.virtualKeyboard = v; }, onChange));
    }
    case "voiceNav": {
      const label = t(lang, "f_voiceNav");
      return row(icon, label,
        makeSwitch(label, prefs.voiceNav, (v) => { prefs.voiceNav = v; }, onChange));
    }
    case "dictionary": {
      const label = t(lang, "f_dictionary");
      return row(icon, label,
        makeSwitch(label, prefs.dictionary, (v) => { prefs.dictionary = v; }, onChange));
    }
    case "aiSimplify": {
      const label = t(lang, "f_aiSimplify");
      return row(icon, label,
        makeSwitch(label, prefs.aiSimplify, (v) => { prefs.aiSimplify = v; }, onChange));
    }

    // feedbackForm, userGuide, hideInterface are rendered by ui.ts (they need
    // config / host context), so buildFeature intentionally skips them.
    default:
      return null;
  }
}
