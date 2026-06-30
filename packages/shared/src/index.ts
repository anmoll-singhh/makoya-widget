/**
 * @makoya/shared
 * Single source of truth for the widget config shape.
 * Both the widget (reads it) and the dashboard (writes it) import from here,
 * so they can never disagree about what a "config" is.
 */

export type WidgetPosition =
  | "bottom-right"
  | "bottom-left"
  | "top-right"
  | "top-left";

/** Shape of the launcher button.
 *  circle  → border-radius 50% (the classic round pill button)
 *  rounded → border-radius 16px (soft square, like modern app icons)
 *  square  → border-radius 8px (more formal / corporate feel)
 */
export type LauncherShape = "circle" | "rounded" | "square";

export type LauncherIconKey = "accessibility" | "person" | "eye" | "adjust";

/** Inline SVGs for the launcher button. Shared so the widget and the
 *  dashboard live-preview render the exact same icon. */
export const LAUNCHER_ICONS: Record<LauncherIconKey, string> = {
  accessibility: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="4" r="2"/><path d="M21 9c0 .55-.45 1-1 1h-4v11a1 1 0 0 1-2 0v-5h-4v5a1 1 0 0 1-2 0V10H4a1 1 0 0 1 0-2h16c.55 0 1 .45 1 1z"/></svg>`,
  person: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="7" r="4"/><path d="M4 21a8 8 0 0 1 16 0 1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/></svg>`,
  eye: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 5c-5 0-9 4.5-10 7 1 2.5 5 7 10 7s9-4.5 10-7c-1-2.5-5-7-10-7zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8z"/><circle cx="12" cy="12" r="2"/></svg>`,
  adjust: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 7h11a3 3 0 0 1 6 0h1a1 1 0 0 1 0 2h-1a3 3 0 0 1-6 0H3a1 1 0 0 1 0-2zm6 8a3 3 0 0 1 6 0h6a1 1 0 0 1 0 2h-6a3 3 0 0 1-6 0H3a1 1 0 0 1 0-2h6z"/></svg>`,
};

/** Every toggle the widget can show. Keep this list in sync with the UI.
 *
 * accessiBe-parity expansion (2026-06-30): the four original "Content" adjusters
 * became full `%` steppers (`textSize`→fontScale, `lineSpacing`→lineHeightPct,
 * plus new `contentScale` + `letterSpacing`), and a large set of color, nav, and
 * chrome tools were added. The display order here is the canonical order that
 * `DEFAULT_CONFIG.featuresEnabled` and `apps/web/lib/customizer/feature-meta.ts`
 * MUST both match. */
export type FeatureKey =
  // ── Content adjusters (% steppers + segs) ────────────────────────────────
  | "contentScale"
  | "textSize"
  | "lineSpacing"
  | "letterSpacing"
  | "readableFont"
  | "textAlign"
  | "highlightTitles"
  | "highlightLinks"
  | "hideImages"
  | "stopMotion"
  // ── Color / display ──────────────────────────────────────────────────────
  | "contrast"
  | "saturation"
  | "textColor"
  | "titleColor"
  | "bgColor"
  | "readingMask"
  // ── Orientation / navigation ─────────────────────────────────────────────
  | "readingRuler"
  | "bigCursor"
  | "highlightHover"
  /** Enlarge the tap/click target area on links, buttons, and interactive elements. */
  | "biggerTargets"
  /** Enhance visible focus indicators on all keyboard-focusable elements. */
  | "focusIndicator"
  /** Pointer-driven magnifier lens overlay. */
  | "magnifier"
  /** Extract the main article into a distraction-free reading pane (our overlay). */
  | "readMode"
  /** Jump-menu of the page's links. */
  | "usefulLinks"
  /** Jump-menu of the page's headings / landmarks / forms. */
  | "pageStructure"
  /** Modifier-based quick-jump keyboard shortcuts + focus ring. */
  | "keyboardNav"
  /** On-screen virtual keyboard that types into the focused host input. */
  | "virtualKeyboard"
  /** Voice navigation via SpeechRecognition (feature-detected). */
  | "voiceNav"
  // ── Audio ────────────────────────────────────────────────────────────────
  | "muteSounds"
  | "readAloud"
  // ── Chrome / tools ───────────────────────────────────────────────────────
  /** Look up a selected word via dictionaryapi.dev (client-side, fail-silent). */
  | "dictionary"
  /** Visitor reports an accessibility issue → emails the site owner. */
  | "feedbackForm"
  /** Hide the launcher for the rest of the session. */
  | "hideInterface"
  /** In-panel help / user guide. */
  | "userGuide"
  /** AI text simplification (ships OFF per-site behind `aiSimplifyEnabled`). */
  | "aiSimplify";

export type WidgetLauncherSize = "sm" | "md" | "lg";
export type WidgetLanguage = "en" | "es" | "fr" | "de";
export type WidgetProfileKey =
  | "none" | "vision" | "lowVision" | "dyslexia"
  | "adhd" | "seizure" | "senior" | "cognitive" | "colorBlind"
  /** Motor / tremor-friendly: big cursor, extra tap-target area, stop motion. */
  | "motorTremor"
  /** ESL / easy-reading: readable font, line spacing, reading ruler. */
  | "eslReading"
  /** Keyboard navigation: modifier shortcuts + enhanced focus + bigger targets. */
  | "keyboardNav"
  /** Clear reading: readable font + heading/link highlighting + structure aids.
   *  (Completes accessiBe's 6th profile; named to avoid screen-reader compliance
   *  framing — profile names are user-facing and fall under the copy guardrail.) */
  | "clearReading";

export interface WidgetConfig {
  /** Public site id (lives in the <script> snippet — NOT a secret). */
  siteId: string;
  /** Accent colour for the button + active toggles. */
  primaryColor: string;
  /** Where the launcher button sits. */
  position: WidgetPosition;
  /** Which launcher icon the button shows. */
  launcherIcon: LauncherIconKey;
  /**
   * Shape of the launcher button.
   * circle = 50% (round pill), rounded = 16px, square = 8px.
   */
  launcherShape: LauncherShape;
  /** Which toggles are shown, in display order. */
  featuresEnabled: FeatureKey[];
  /** Paid plans can hide the "Powered by Makoya" line. */
  hideBranding: boolean;
  /** URL the "Powered by Makoya" link points to (your scanner = free leads). */
  brandingUrl: string;
  /** Launcher button size. */
  launcherSize: WidgetLauncherSize;
  /** Profile auto-applied on a visitor's first open ("none" = no auto-apply). */
  defaultProfile: WidgetProfileKey;
  /** URL for the "Accessibility statement" link (empty = link hidden). */
  accessibilityStatementUrl: string;
  /** Default language for the widget's OWN labels. */
  defaultLanguage: WidgetLanguage;
  /** Optional custom panel title (paid). Empty = built-in localized title. */
  panelTitle: string;
  /**
   * CSS selector for a host-page element that, when clicked, opens the panel
   * (a "bring your own launcher" hook). Empty = use the built-in launcher only.
   * Widget-runtime only; safe to serve publicly.
   */
  customTriggerSelector: string;
  /**
   * Re-apply the visitor's prefs after dynamic DOM changes (SPA re-renders,
   * lazy content). Default on so single-page apps keep their accessibility
   * settings; can be disabled on very busy pages for performance.
   */
  domObserverEnabled: boolean;
  /**
   * Inherit the host site's own fonts instead of forcing the widget's stack on
   * the page. Off by default (predictable rendering); on for brand fidelity.
   */
  inheritFonts: boolean;
  /** Show the widget on small/mobile viewports. Default on. */
  mobileEnabled: boolean;
  /**
   * Horizontal pixel offset applied on top of the corner anchor position.
   * Positive = further right (for right-edge positions: towards edge;
   * for left-edge positions: away from edge). Clamped to ±200 px.
   */
  offsetX: number;
  /**
   * Vertical pixel offset applied on top of the corner anchor position.
   * Positive = further down (for bottom-edge positions: towards bottom;
   * for top-edge positions: away from top). Clamped to ±200 px.
   */
  offsetY: number;
  /**
   * Enable the AI Text Simplification tool for this site. Ships OFF: it is the
   * only recurring-cost / abuse-surface tool on a public widget, so the server
   * route (`/api/widget-simplify`) refuses (404/403) unless this is true. The
   * `aiSimplify` FeatureKey can be listed in `featuresEnabled` but the control
   * stays inert until the founder enables it per plan.
   */
  aiSimplifyEnabled: boolean;
}

/** Safe defaults. The widget MUST render even if config never loads. */
export const DEFAULT_CONFIG: WidgetConfig = {
  siteId: "unknown",
  primaryColor: "#2563eb",
  position: "bottom-right",
  launcherIcon: "accessibility",
  launcherShape: "circle",
  // Canonical display order — MUST match the FeatureKey union order above and
  // apps/web/lib/customizer/feature-meta.ts. Grouped: content, color/display,
  // orientation/nav, audio, chrome/tools.
  featuresEnabled: [
    "contentScale","textSize","lineSpacing","letterSpacing","readableFont",
    "textAlign","highlightTitles","highlightLinks","hideImages","stopMotion",
    "contrast","saturation","textColor","titleColor","bgColor","readingMask",
    "readingRuler","bigCursor","highlightHover","biggerTargets","focusIndicator",
    "magnifier","readMode","usefulLinks","pageStructure","keyboardNav",
    "virtualKeyboard","voiceNav","muteSounds","readAloud",
    "dictionary","feedbackForm","hideInterface","userGuide","aiSimplify",
  ],
  hideBranding: false,
  brandingUrl: "https://makoya.example/scan",
  launcherSize: "md",
  defaultProfile: "none",
  accessibilityStatementUrl: "",
  defaultLanguage: "en",
  panelTitle: "",
  customTriggerSelector: "",
  domObserverEnabled: true,
  inheritFonts: false,
  mobileEnabled: true,
  offsetX: 0,
  offsetY: 0,
  aiSimplifyEnabled: false,
};

/** Clamp a number to [min, max]. */
function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/** Merge a partial config (from the network) over safe defaults.
 *  offsetX and offsetY are clamped to ±200 px for safety. */
export function resolveConfig(
  siteId: string,
  partial: Partial<WidgetConfig> | null | undefined
): WidgetConfig {
  const merged = { ...DEFAULT_CONFIG, ...(partial ?? {}), siteId };
  // Clamp offsets — avoids clients pushing the launcher off-screen.
  if (typeof merged.offsetX === "number") merged.offsetX = clamp(merged.offsetX, -200, 200);
  if (typeof merged.offsetY === "number") merged.offsetY = clamp(merged.offsetY, -200, 200);
  return merged;
}
