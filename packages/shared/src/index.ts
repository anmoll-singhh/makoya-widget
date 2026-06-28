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

export type LauncherIconKey = "accessibility" | "person" | "eye" | "adjust";

/** Inline SVGs for the launcher button. Shared so the widget and the
 *  dashboard live-preview render the exact same icon. */
export const LAUNCHER_ICONS: Record<LauncherIconKey, string> = {
  accessibility: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="4" r="2"/><path d="M21 9c0 .55-.45 1-1 1h-4v11a1 1 0 0 1-2 0v-5h-4v5a1 1 0 0 1-2 0V10H4a1 1 0 0 1 0-2h16c.55 0 1 .45 1 1z"/></svg>`,
  person: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="7" r="4"/><path d="M4 21a8 8 0 0 1 16 0 1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/></svg>`,
  eye: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 5c-5 0-9 4.5-10 7 1 2.5 5 7 10 7s9-4.5 10-7c-1-2.5-5-7-10-7zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8z"/><circle cx="12" cy="12" r="2"/></svg>`,
  adjust: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 7h11a3 3 0 0 1 6 0h1a1 1 0 0 1 0 2h-1a3 3 0 0 1-6 0H3a1 1 0 0 1 0-2zm6 8a3 3 0 0 1 6 0h6a1 1 0 0 1 0 2h-6a3 3 0 0 1-6 0H3a1 1 0 0 1 0-2h6z"/></svg>`,
};

/** Every toggle the widget can show. Keep this list in sync with the UI. */
export type FeatureKey =
  | "textSize"
  | "lineSpacing"
  | "contrast"
  | "stopMotion"
  | "readingRuler"
  | "highlightLinks"
  | "bigCursor"
  | "readableFont"
  | "hideImages"
  | "saturation"
  | "readingMask"
  | "highlightTitles"
  | "textAlign"
  | "muteSounds"
  | "readAloud"
  | "highlightHover";

export type WidgetLauncherSize = "sm" | "md" | "lg";
export type WidgetLanguage = "en" | "es" | "fr" | "de";
export type WidgetProfileKey =
  | "none" | "vision" | "lowVision" | "dyslexia"
  | "adhd" | "seizure" | "senior" | "cognitive" | "colorBlind";

export interface WidgetConfig {
  /** Public site id (lives in the <script> snippet — NOT a secret). */
  siteId: string;
  /** Accent colour for the button + active toggles. */
  primaryColor: string;
  /** Where the launcher button sits. */
  position: WidgetPosition;
  /** Which launcher icon the button shows. */
  launcherIcon: LauncherIconKey;
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
}

/** Safe defaults. The widget MUST render even if config never loads. */
export const DEFAULT_CONFIG: WidgetConfig = {
  siteId: "unknown",
  primaryColor: "#2563eb",
  position: "bottom-right",
  launcherIcon: "accessibility",
  featuresEnabled: [
    "textSize","lineSpacing","contrast","stopMotion","readingRuler",
    "highlightLinks","bigCursor","readableFont","hideImages",
    "saturation","readingMask","highlightTitles","textAlign","muteSounds","readAloud",
    "highlightHover",
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
};

/** Merge a partial config (from the network) over safe defaults. */
export function resolveConfig(
  siteId: string,
  partial: Partial<WidgetConfig> | null | undefined
): WidgetConfig {
  return { ...DEFAULT_CONFIG, ...(partial ?? {}), siteId };
}
