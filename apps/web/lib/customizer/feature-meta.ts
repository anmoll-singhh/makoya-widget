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
 * All 35 widget feature entries in canonical default order.
 * Matches the order of DEFAULT_CONFIG.featuresEnabled exactly (content →
 * color/display → orientation/navigation → audio → chrome/tools). The chrome
 * tools reuse the existing `group` tags (the tag is cosmetic — it does not
 * control array position).
 */
export const FEATURE_META: FeatureMeta[] = [
  // ── Content ───────────────────────────────────────────────────────────────
  {
    key: "contentScale",
    label: "Page zoom",
    description: "Scale the whole page from 70% to 150%.",
    group: "content",
  },
  {
    key: "textSize",
    label: "Text size",
    description: "Scale the page text from 80% to 200%.",
    group: "content",
  },
  {
    key: "lineSpacing",
    label: "Line spacing",
    description: "Add space between lines for easier reading.",
    group: "content",
  },
  {
    key: "letterSpacing",
    label: "Letter spacing",
    description: "Widen the spacing between letters.",
    group: "content",
  },
  {
    key: "readableFont",
    label: "Readable font",
    description: "Switch to a clearer or dyslexia-friendly font.",
    group: "content",
  },
  {
    key: "textAlign",
    label: "Text alignment",
    description: "Left, center, right, or justify text.",
    group: "content",
  },
  {
    key: "highlightTitles",
    label: "Highlight titles",
    description: "Outline headings to map the page.",
    group: "content",
  },
  {
    key: "highlightLinks",
    label: "Highlight links",
    description: "Make links stand out on the page.",
    group: "content",
  },
  {
    key: "hideImages",
    label: "Hide images",
    description: "Replace images to reduce distraction.",
    group: "content",
  },
  {
    key: "stopMotion",
    label: "Stop animations",
    description: "Pause motion and autoplay effects.",
    group: "navigation",
  },
  // ── Color / display ─────────────────────────────────────────────────────
  {
    key: "contrast",
    label: "Contrast modes",
    description: "On, light, dark, and high-contrast modes.",
    group: "color",
  },
  {
    key: "saturation",
    label: "Saturation",
    description: "Grayscale, low, or high color saturation.",
    group: "color",
  },
  {
    key: "textColor",
    label: "Text color",
    description: "Override the body text color.",
    group: "color",
  },
  {
    key: "titleColor",
    label: "Title color",
    description: "Override the heading color.",
    group: "color",
  },
  {
    key: "bgColor",
    label: "Background color",
    description: "Override the page background color.",
    group: "color",
  },
  {
    key: "readingMask",
    label: "Reading mask",
    description: "Dim the page around a focus band, or tint it.",
    group: "color",
  },
  // ── Orientation / navigation ────────────────────────────────────────────
  {
    key: "readingRuler",
    label: "Reading ruler",
    description: "A guide line that follows the cursor.",
    group: "navigation",
  },
  {
    key: "bigCursor",
    label: "Big cursor",
    description: "A larger black or white pointer.",
    group: "navigation",
  },
  {
    key: "highlightHover",
    label: "Highlight on hover",
    description: "Outline the element under the cursor.",
    group: "navigation",
  },
  {
    key: "biggerTargets",
    label: "Bigger tap targets",
    description: "Enlarge clickable areas for easier motor access.",
    group: "navigation",
  },
  {
    key: "focusIndicator",
    label: "Enhanced focus",
    description: "Bold, high-contrast keyboard focus ring.",
    group: "navigation",
  },
  {
    key: "magnifier",
    label: "Text magnifier",
    description: "A pointer-driven magnifying lens.",
    group: "navigation",
  },
  {
    key: "readMode",
    label: "Reading mode",
    description: "Open a distraction-free reading pane.",
    group: "navigation",
  },
  {
    key: "usefulLinks",
    label: "Useful links",
    description: "A jump menu of the page's links.",
    group: "navigation",
  },
  {
    key: "pageStructure",
    label: "Page structure",
    description: "A jump menu of headings and landmarks.",
    group: "navigation",
  },
  {
    key: "keyboardNav",
    label: "Keyboard navigation",
    description: "Modifier shortcuts plus a focus ring.",
    group: "navigation",
  },
  {
    key: "virtualKeyboard",
    label: "Virtual keyboard",
    description: "An on-screen keyboard for inputs.",
    group: "navigation",
  },
  {
    key: "voiceNav",
    label: "Voice navigation",
    description: "Navigate the page by voice commands.",
    group: "navigation",
  },
  // ── Audio ────────────────────────────────────────────────────────────────
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
  // ── Chrome / tools ─────────────────────────────────────────────────────
  {
    key: "dictionary",
    label: "Dictionary",
    description: "Look up a selected word.",
    group: "navigation",
  },
  {
    key: "feedbackForm",
    label: "Feedback form",
    description: "Let visitors report an accessibility issue.",
    group: "navigation",
  },
  {
    key: "hideInterface",
    label: "Hide interface",
    description: "Hide the launcher for the rest of the session.",
    group: "navigation",
  },
  {
    key: "userGuide",
    label: "User guide",
    description: "In-panel help for the tools.",
    group: "navigation",
  },
  {
    key: "aiSimplify",
    label: "AI simplify",
    description: "Simplify selected text (off unless enabled per plan).",
    group: "navigation",
  },
];
