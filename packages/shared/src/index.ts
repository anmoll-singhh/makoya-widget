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

/** Every toggle the widget can show. Keep this list in sync with the UI. */
export type FeatureKey =
  | "textSize"
  | "lineSpacing"
  | "contrast"
  | "stopMotion"
  | "readingRuler"
  | "highlightLinks"
  | "bigCursor";

export interface WidgetConfig {
  /** Public site id (lives in the <script> snippet — NOT a secret). */
  siteId: string;
  /** Accent colour for the button + active toggles. */
  primaryColor: string;
  /** Where the launcher button sits. */
  position: WidgetPosition;
  /** Which toggles are shown, in display order. */
  featuresEnabled: FeatureKey[];
  /** Paid plans can hide the "Powered by Makoya" line. */
  hideBranding: boolean;
  /** URL the "Powered by Makoya" link points to (your scanner = free leads). */
  brandingUrl: string;
}

/** Safe defaults. The widget MUST render even if config never loads. */
export const DEFAULT_CONFIG: WidgetConfig = {
  siteId: "unknown",
  primaryColor: "#2563eb",
  position: "bottom-right",
  featuresEnabled: [
    "textSize",
    "lineSpacing",
    "contrast",
    "stopMotion",
    "readingRuler",
    "highlightLinks",
    "bigCursor",
  ],
  hideBranding: false,
  brandingUrl: "https://makoya.example/scan",
};

/** Merge a partial config (from the network) over safe defaults. */
export function resolveConfig(
  siteId: string,
  partial: Partial<WidgetConfig> | null | undefined
): WidgetConfig {
  return { ...DEFAULT_CONFIG, ...(partial ?? {}), siteId };
}
