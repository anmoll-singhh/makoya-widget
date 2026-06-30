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
 *
 * Block 27: Added biggerTargets (CSS tap-target enlargement) and focusIndicator
 * (enhanced keyboard focus rings) as pure attribute-driven CSS effects.
 */

import { ensureEffectStyles, setHtmlAttr, setHtmlVar } from "../features/effects";

export interface Prefs {
  /**
   * Content scaling — whole-page zoom, 70–150 % (step 10). 100 = no zoom.
   * Applied as `body { zoom }` via the `--mky-zoom` custom property.
   */
  contentScale: number;
  /**
   * Font size — root font scaling, 80–200 % (step 10). 100 = default.
   * Replaces the old `text: 0|1|2|3` step model (migrated in migratePrefs).
   */
  fontScale: number;
  /**
   * Line height — 100–250 % (step 10). 100 = site default (no override).
   * Replaces the old boolean `spacing` (migrated to 180).
   */
  lineHeightPct: number;
  /**
   * Letter spacing — 0–50 in ×0.01em units (step 5). 0 = site default.
   * New field; old `spacing:true` also seeded this to 5.
   */
  letterSpacingPct: number;
  /** "off" | "on" | "dark" (invert) | "light" (force light) | "high" (boost) */
  contrast: "off" | "on" | "dark" | "light" | "high";
  /** true = motion stopped */
  stopMotion: boolean;
  ruler: boolean;
  links: boolean;
  /**
   * Big cursor color. "off" = default system cursor.
   * CHANGED from boolean in WS1 Task 1 — breaking type change.
   */
  cursor: "off" | "black" | "white";
  /**
   * Readable / dyslexia font. CHANGED from boolean → segmented:
   * "off" | "readable" (clean sans stack) | "dyslexic" (OpenDyslexic-style).
   * Old `font:true` migrates to "readable".
   */
  font: "off" | "readable" | "dyslexic";
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
  /**
   * Text alignment override. CHANGED from boolean `align` → segmented:
   * "off" | "left" | "center" | "right" | "justify". Old `align:true` → "left".
   */
  textAlign: "off" | "left" | "center" | "right" | "justify";
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
  /**
   * Reading-ruler band color (any CSS hex color). Default yellow.
   * LIVE: applied by makeRuler().setColor() in ui/live.ts whenever the ruler
   * is active or when the color changes.
   */
  rulerColor: string;
  /**
   * Outline the element currently under the mouse pointer.
   * Helps focus/low-vision users see what they are pointing at.
   * LIVE: controlled by ui/live.ts makeHoverHighlight() — not a CSS attribute.
   */
  hoverHighlight: boolean;
  /**
   * Enlarge tap/click targets on links, buttons, and other interactive elements
   * by adding extra padding. Helps users with motor impairment or tremor.
   * CSS-attribute driven: html[data-mky-targets="on"].
   */
  biggerTargets: boolean;
  /**
   * Enhance the visible focus indicator on all keyboard-focusable elements —
   * useful for keyboard-only navigation. CSS-attribute driven:
   * html[data-mky-focus="on"].
   */
  focusIndicator: boolean;

  // ── Color overrides ("" = off). CSS-var driven; disabled while contrast is
  //    "dark"/"light" (invert would flip them). See effects.ts. ──────────────
  /** Body text color override (curated swatch hex, "" = off). */
  textColor: string;
  /** Heading (h1–h6) color override ("" = off). */
  titleColor: string;
  /** Page background color override ("" = off). */
  bgColor: string;

  // ── Live controllers (managed by ui.ts apply(), NOT applyPrefs CSS attrs) ──
  /** Pointer-driven magnifier lens. LIVE. */
  magnifier: boolean;
  /** Distraction-free reading pane (our Shadow-DOM overlay). LIVE. */
  readMode: boolean;
  /** Useful-links jump menu. LIVE (panel-rendered). */
  usefulLinks: boolean;
  /** Page-structure (headings/landmarks) jump menu. LIVE (panel-rendered). */
  pageStructure: boolean;
  /** Modifier-based quick-jump keyboard shortcuts. LIVE. */
  keyboardNav: boolean;
  /** On-screen virtual keyboard. LIVE. */
  virtualKeyboard: boolean;
  /** Voice navigation (SpeechRecognition). LIVE. */
  voiceNav: boolean;
  /** Dictionary lookup on text selection. LIVE. */
  dictionary: boolean;
}

export const STORAGE_KEY = "makoya_prefs";

export const DEFAULT_PREFS: Prefs = {
  contentScale: 100,
  fontScale: 100,
  lineHeightPct: 100,
  letterSpacingPct: 0,
  contrast: "off",
  stopMotion: false,
  ruler: false,
  links: false,
  cursor: "off",
  font: "off",
  images: false,
  saturation: "off",
  mask: "off",
  titles: false,
  textAlign: "off",
  mute: false,
  readAloud: false,
  rulerColor: "#ffd400",
  hoverHighlight: false,
  biggerTargets: false,
  focusIndicator: false,
  textColor: "",
  titleColor: "",
  bgColor: "",
  magnifier: false,
  readMode: false,
  usefulLinks: false,
  pageStructure: false,
  keyboardNav: false,
  virtualKeyboard: false,
  voiceNav: false,
  dictionary: false,
};

/**
 * Migrate a parsed localStorage blob from any prior Prefs shape to the current
 * one. PURE: takes the parsed object, returns a `Partial<Prefs>` with legacy
 * keys mapped to their new fields AND **stripped** (so `savePrefs` never
 * re-serializes dead keys), snapping to the new step grids.
 *
 * Legacy → new:
 *   text: 1|2|3        → fontScale 110|130|140   (80–200 /10 grid)
 *   spacing: true      → lineHeightPct 180 + letterSpacingPct 5  (0–50 /5 grid)
 *   align: true        → textAlign "left"
 *   font: true|false   → "readable"|"off"
 *
 * Why explicit, not a bare spread: once DEFAULT_PREFS drops text/spacing/align,
 * `{...DEFAULT_PREFS, ...parsed}` leaves the legacy keys dangling on the object
 * and the new fields at their defaults — i.e. it silently does NOT migrate.
 * Unknown/missing values fall through to defaults via the caller's spread.
 */
export function migratePrefs(parsed: unknown): Partial<Prefs> {
  if (!parsed || typeof parsed !== "object") return {};
  const p = { ...(parsed as Record<string, unknown>) };

  // text 0|1|2|3 → fontScale (only when the new field isn't already present)
  if ("text" in p) {
    if (p.fontScale === undefined) {
      if (p.text === 1) p.fontScale = 110;
      else if (p.text === 2) p.fontScale = 130;
      else if (p.text === 3) p.fontScale = 140;
      // text 0 / unknown → leave fontScale unset → default 100
    }
    delete p.text;
  }

  // spacing:true → line-height 180 + letter-spacing 5 (don't clobber new fields)
  if ("spacing" in p) {
    if (p.spacing === true) {
      if (p.lineHeightPct === undefined) p.lineHeightPct = 180;
      if (p.letterSpacingPct === undefined) p.letterSpacingPct = 5;
    }
    delete p.spacing;
  }

  // align:true → textAlign "left"
  if ("align" in p) {
    if (p.align === true && p.textAlign === undefined) p.textAlign = "left";
    delete p.align;
  }

  // font boolean → segmented string
  if (typeof p.font === "boolean") {
    p.font = p.font ? "readable" : "off";
  }

  return p as Partial<Prefs>;
}

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    return { ...DEFAULT_PREFS, ...migratePrefs(JSON.parse(raw)) };
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
 * Continuous typography is driven by per-property inline CSS custom properties
 * on <html>, each gated by its own attribute (present ONLY when the value
 * deviates from default):
 *   data-mky-zoom/--mky-zoom              (contentScale, body zoom)
 *   data-mky-fontscale/--mky-font-scale   (fontScale, root font-size)
 *   data-mky-lh/--mky-line-height         (lineHeightPct)
 *   data-mky-ls/--mky-letter-spacing      (letterSpacingPct + word-spacing)
 *
 * Enumerated attribute effects:
 *   data-mky-contrast  → "on"/"light"/"dark"/"high" or absent
 *   data-mky-sat       → "grayscale"/"low"/"high" or absent
 *   data-mky-font      → "readable"/"dyslexic" or absent
 *   data-mky-align     → "left"/"center"/"right"/"justify" or absent
 *   data-mky-cursor    → "black"/"white" or absent
 *   data-mky-motion/links/images/titles/targets/focus → "on"/"off" or absent
 *   data-mky-textcolor/titlecolor/bgcolor + matching --mky-*-color vars
 *     (suppressed while contrast is "dark"/"light" — invert would flip them)
 *
 * NOT set here (LIVE controllers manage these): mask, mute, readAloud, ruler,
 * magnifier, readMode, usefulLinks, pageStructure, keyboardNav, virtualKeyboard,
 * voiceNav, dictionary — they need JS, not just CSS attributes.
 */
export function applyPrefs(prefs: Prefs): void {
  ensureEffectStyles();

  // Coerce numeric fields defensively: localStorage can be edited externally to
  // a non-number, which would make `value / 100` NaN and silently break the
  // effect while still setting the gating attribute. Fall back to the default.
  const num = (v: unknown, def: number): number =>
    typeof v === "number" && Number.isFinite(v) ? v : def;
  const contentScale = num(prefs.contentScale, 100);
  const fontScale = num(prefs.fontScale, 100);
  const lineHeightPct = num(prefs.lineHeightPct, 100);
  const letterSpacingPct = num(prefs.letterSpacingPct, 0);

  // ── Continuous typography — per-property gated CSS vars. Each property is
  //    emitted ONLY when it deviates from default, so a site the visitor never
  //    touched (incl. html{font-size:62.5%} rem-reset sites) is left untouched.
  //    The gating attribute presence activates the rule; the var carries value.
  const zoom = contentScale !== 100;
  setHtmlVar("--mky-zoom", zoom ? String(contentScale / 100) : null);
  setHtmlAttr("data-mky-zoom", zoom ? "on" : null);

  const fscale = fontScale !== 100;
  setHtmlVar("--mky-font-scale", fscale ? String(fontScale / 100) : null);
  setHtmlAttr("data-mky-fontscale", fscale ? "on" : null);

  const lh = lineHeightPct !== 100;
  setHtmlVar("--mky-line-height", lh ? String(lineHeightPct / 100) : null);
  setHtmlAttr("data-mky-lh", lh ? "on" : null);

  const ls = letterSpacingPct !== 0;
  setHtmlVar("--mky-letter-spacing", ls ? `${letterSpacingPct * 0.01}em` : null);
  setHtmlAttr("data-mky-ls", ls ? "on" : null);

  // ── Color / display ──────────────────────────────────────────────────────
  setHtmlAttr("data-mky-contrast", prefs.contrast === "off" ? null : prefs.contrast);
  setHtmlAttr("data-mky-sat", prefs.saturation === "off" ? null : prefs.saturation);

  // Color overrides are mutually exclusive with invert/force contrast — when
  // contrast is "dark" or "light", invert/force would flip chosen colors, so we
  // suppress the palettes (last-set-wins, surfaced in the UI).
  const colorsAllowed = prefs.contrast !== "dark" && prefs.contrast !== "light";
  const tc = colorsAllowed && prefs.textColor !== "";
  setHtmlVar("--mky-text-color", tc ? prefs.textColor : null);
  setHtmlAttr("data-mky-textcolor", tc ? "on" : null);
  const ttc = colorsAllowed && prefs.titleColor !== "";
  setHtmlVar("--mky-title-color", ttc ? prefs.titleColor : null);
  setHtmlAttr("data-mky-titlecolor", ttc ? "on" : null);
  const bc = colorsAllowed && prefs.bgColor !== "";
  setHtmlVar("--mky-bg-color", bc ? prefs.bgColor : null);
  setHtmlAttr("data-mky-bgcolor", bc ? "on" : null);

  // ── On/off attribute effects (unchanged model) ───────────────────────────
  setHtmlAttr("data-mky-motion", prefs.stopMotion ? "off" : null);
  setHtmlAttr("data-mky-links", prefs.links ? "on" : null);
  setHtmlAttr("data-mky-cursor", prefs.cursor === "off" ? null : prefs.cursor);
  setHtmlAttr("data-mky-font", prefs.font === "off" ? null : prefs.font);
  setHtmlAttr("data-mky-images", prefs.images ? "off" : null);
  setHtmlAttr("data-mky-titles", prefs.titles ? "on" : null);
  setHtmlAttr("data-mky-align", prefs.textAlign === "off" ? null : prefs.textAlign);
  setHtmlAttr("data-mky-targets", prefs.biggerTargets ? "on" : null);
  setHtmlAttr("data-mky-focus", prefs.focusIndicator ? "on" : null);

  // mask, mute, readAloud, magnifier, readMode, usefulLinks, pageStructure,
  // keyboardNav, virtualKeyboard, voiceNav, dictionary → LIVE controllers
  // (ui/live.ts + Wave-2 modules), wired in ui.ts apply(). No CSS attr here.
}
