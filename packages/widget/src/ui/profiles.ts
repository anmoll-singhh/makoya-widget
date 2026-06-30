/**
 * ui/profiles.ts
 *
 * Accessibility profile definitions for the widget panel.
 *
 * Each profile is a one-click preset that resets prefs to their defaults and
 * then applies a curated combination of settings for a specific user need.
 *
 * Profiles exported:
 *   PROFILES           — ordered array of Profile objects (shown as chips).
 *   applyProfileByKey  — reset + apply by WidgetProfileKey string (used by
 *                        `defaultProfile` config option on first open).
 *
 * Design rules:
 *   - No "compliant", "guaranteed accessible", or ADA/WCAG claims anywhere.
 *   - apply() mutates the Prefs object in place — caller owns save/apply cycle.
 *   - applyProfileByKey resets to DEFAULT_PREFS before applying so profiles
 *     are always additive from a clean slate.
 */

import type { WidgetProfileKey } from "@makoya/shared";
import { type Prefs, DEFAULT_PREFS } from "../core/state";
import type { StringKey } from "./i18n";

// ---------------------------------------------------------------------------
// Profile interface
// ---------------------------------------------------------------------------

export interface Profile {
  /** Matches WidgetProfileKey values (except "none"). */
  key: WidgetProfileKey;
  /** i18n key for the chip label (e.g. "profile_vision"). */
  labelKey: StringKey;
  /** Decorative inline SVG string. Uses currentColor for theme-ability. */
  icon: string;
  /**
   * Mutates `p` in place. Callers must reset to DEFAULT_PREFS before calling
   * if a clean slate is desired (applyProfileByKey does this automatically).
   */
  apply: (p: Prefs) => void;
}

// ---------------------------------------------------------------------------
// PROFILES
// ---------------------------------------------------------------------------

/**
 * All 8 accessibility quick-profiles shown in the panel chip grid.
 * Order here controls display order.
 */
export const PROFILES: Profile[] = [
  // ── 1. Vision impaired ──────────────────────────────────────────────────
  {
    key: "vision",
    labelKey: "profile_vision",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>`,
    apply: (p) => {
      p.contrast = "on";
      p.fontScale = 140;
      p.cursor = "black";
    },
  },

  // ── 2. Low vision ───────────────────────────────────────────────────────
  {
    key: "lowVision",
    labelKey: "profile_lowVision",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.4 1.4M17.6 17.6L19 19M19 5l-1.4 1.4M6.4 17.6L5 19"/></svg>`,
    apply: (p) => {
      p.fontScale = 130;
      p.lineHeightPct = 180;
      p.letterSpacingPct = 5;
      p.cursor = "black";
      p.links = true;
    },
  },

  // ── 3. Dyslexia ─────────────────────────────────────────────────────────
  {
    key: "dyslexia",
    labelKey: "profile_dyslexia",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg>`,
    apply: (p) => {
      p.font = "dyslexic";
      p.lineHeightPct = 180;
      p.letterSpacingPct = 5;
      p.fontScale = 110;
    },
  },

  // ── 4. ADHD / Focus ─────────────────────────────────────────────────────
  {
    key: "adhd",
    labelKey: "profile_adhd",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/></svg>`,
    apply: (p) => {
      p.stopMotion = true;
      p.lineHeightPct = 180;
      p.letterSpacingPct = 5;
      p.links = true;
    },
  },

  // ── 5. Seizure safe ─────────────────────────────────────────────────────
  {
    key: "seizure",
    labelKey: "profile_seizure",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3l8 3v6c0 4-3 7-8 9-5-2-8-5-8-9V6z"/></svg>`,
    apply: (p) => {
      p.stopMotion = true;
    },
  },

  // ── 6. Senior ───────────────────────────────────────────────────────────
  {
    key: "senior",
    labelKey: "profile_senior",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>`,
    apply: (p) => {
      p.fontScale = 130;
      p.lineHeightPct = 180;
      p.letterSpacingPct = 5;
      p.cursor = "black";
      p.font = "readable";
    },
  },

  // ── 7. Cognitive (NEW) ──────────────────────────────────────────────────
  {
    key: "cognitive",
    labelKey: "profile_cognitive",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24A2.5 2.5 0 0 1 9.5 2z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24A2.5 2.5 0 0 0 14.5 2z"/></svg>`,
    apply: (p) => {
      p.mask = "dim";
      p.lineHeightPct = 180;
      p.letterSpacingPct = 5;
      p.images = true;
      p.stopMotion = true;
    },
  },

  // ── 8. Color blind (NEW) ────────────────────────────────────────────────
  {
    key: "colorBlind",
    labelKey: "profile_colorBlind",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 3v9M12 12l7.5 4.5" stroke-width="1.5"/><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/></svg>`,
    apply: (p) => {
      p.saturation = "high";
      p.titles = true;
    },
  },

  // ── 9. Motor / tremor friendly (NEW) ────────────────────────────────────
  // Big cursor + bigger tap targets + stop motion — three quick wins for
  // users with reduced fine motor control or hand tremor.
  {
    key: "motorTremor",
    labelKey: "profile_motorTremor",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>`,
    apply: (p) => {
      p.cursor = "black";
      p.biggerTargets = true;
      p.stopMotion = true;
    },
  },

  // ── 10. ESL / Easy reading (NEW) ────────────────────────────────────────
  // Readable font + line spacing + reading ruler — common needs for users
  // reading in a second language or those with mild literacy difficulties.
  {
    key: "eslReading",
    labelKey: "profile_eslReading",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`,
    apply: (p) => {
      p.font = "readable";
      p.lineHeightPct = 180;
      p.letterSpacingPct = 5;
      p.ruler = true;
    },
  },

  // ── 11. Keyboard navigation (NEW — completes accessiBe's 6) ──────────────
  {
    key: "keyboardNav",
    labelKey: "profile_keyboardNav",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8"/></svg>`,
    apply: (p) => {
      p.keyboardNav = true;
      p.focusIndicator = true;
      p.biggerTargets = true;
    },
  },

  // ── 12. Clear reading (NEW — completes accessiBe's 6; compliance-safe name)
  {
    key: "clearReading",
    labelKey: "profile_clearReading",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M9 7h7M9 11h5"/></svg>`,
    apply: (p) => {
      p.font = "readable";
      p.titles = true;
      p.links = true;
    },
  },
];

// ---------------------------------------------------------------------------
// applyProfileByKey
// ---------------------------------------------------------------------------

/**
 * Resets `prefs` to DEFAULT_PREFS values, then applies the matching profile.
 * If `key` is "none" (or no matching profile exists), only the reset happens.
 *
 * Mutates `prefs` in place — caller is responsible for the save/apply cycle.
 */
export function applyProfileByKey(prefs: Prefs, key: WidgetProfileKey): void {
  // Reset to defaults in-place (keeps the same object reference).
  Object.assign(prefs, DEFAULT_PREFS);

  if (key === "none") return;

  const profile = PROFILES.find((p) => p.key === key);
  profile?.apply(prefs);
}
