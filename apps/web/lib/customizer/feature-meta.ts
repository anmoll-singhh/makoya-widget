/**
 * feature-meta.ts
 *
 * Static metadata for every widget feature toggle. Each entry carries the
 * human-readable label and description shown in the customizer UI, plus a
 * group tag used for rendering tabs/sections.
 *
 * IMPORTANT: the array order MUST equal DEFAULT_CONFIG.featuresEnabled —
 * that is the canonical display order the widget and dashboard both respect.
 * The `group` field is a category tag; it does NOT control array position.
 *
 * Strings are plain, user-facing English. No compliance or legal claims.
 */

import type { FeatureKey } from "@/lib/shared";

export type FeatureGroup = "content" | "color" | "navigation" | "audio";

export interface FeatureMeta {
  key: FeatureKey;
  label: string;
  description: string;
  group: FeatureGroup;
}

/**
 * All 19 widget feature entries in canonical default order.
 * Matches the order of DEFAULT_CONFIG.featuresEnabled exactly.
 */
export const FEATURE_META: FeatureMeta[] = [
  {
    key: "textSize",
    label: "Text size",
    description: "Scale the page text up or down.",
    group: "content",
  },
  {
    key: "lineSpacing",
    label: "Line spacing",
    description: "Add space between lines for easier reading.",
    group: "content",
  },
  {
    key: "contrast",
    label: "Contrast & dark mode",
    description: "High-contrast and dark color modes.",
    group: "color",
  },
  {
    key: "stopMotion",
    label: "Stop animations",
    description: "Pause motion and autoplay effects.",
    group: "navigation",
  },
  {
    key: "readingRuler",
    label: "Reading ruler",
    description: "A guide line that follows the cursor.",
    group: "navigation",
  },
  {
    key: "highlightLinks",
    label: "Highlight links",
    description: "Make links stand out on the page.",
    group: "content",
  },
  {
    key: "bigCursor",
    label: "Big cursor",
    description: "A larger black or white pointer.",
    group: "navigation",
  },
  {
    key: "readableFont",
    label: "Readable font",
    description: "Switch to a clearer, dyslexia-friendly font.",
    group: "content",
  },
  {
    key: "hideImages",
    label: "Hide images",
    description: "Replace images to reduce distraction.",
    group: "content",
  },
  {
    key: "saturation",
    label: "Saturation",
    description: "Grayscale, low, or high color saturation.",
    group: "color",
  },
  {
    key: "readingMask",
    label: "Reading mask",
    description: "Dim the page around a focus band, or tint it.",
    group: "color",
  },
  {
    key: "highlightTitles",
    label: "Highlight titles",
    description: "Outline headings to map the page.",
    group: "content",
  },
  {
    key: "textAlign",
    label: "Left-align text",
    description: "Force text to align left.",
    group: "content",
  },
  {
    key: "muteSounds",
    label: "Mute sounds",
    description: "Silence audio and video on the page.",
    group: "audio",
  },
  {
    key: "readAloud",
    label: "Read aloud",
    description: "Click text to have it read out loud.",
    group: "audio",
  },
  {
    key: "highlightHover",
    label: "Highlight on hover",
    description: "Outline the element under the cursor.",
    group: "navigation",
  },
  {
    key: "keyboardNav",
    label: "Keyboard navigation",
    description: "Skip link plus shortcuts to jump between headings, regions, and links.",
    group: "navigation",
  },
  {
    key: "focusMode",
    label: "Focus highlight",
    description: "Add a strong, high-contrast outline to whatever is focused.",
    group: "navigation",
  },
  {
    key: "colorBlindFilter",
    label: "Color-blind filter",
    description: "Daltonization filters for protanopia, deuteranopia, and tritanopia.",
    group: "color",
  },
];
