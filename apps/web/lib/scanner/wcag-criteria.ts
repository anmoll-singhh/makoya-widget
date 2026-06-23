/**
 * lib/scanner/wcag-criteria.ts
 *
 * Maps axe-core rule tags to real WCAG success criteria.
 *
 * Why a static exact-string table (and NOT digit-splitting):
 * ──────────────────────────────────────────────────────────
 * axe tags a rule with strings like "wcag143" (→ 1.4.3) and "wcag1410"
 * (→ 1.4.10). You CANNOT recover the criterion by splitting digits, because
 * "wcag1410" is ambiguous (1.4.10 vs 14.10). The only correct approach is an
 * exact-string lookup table keyed by the tag axe actually emits. This table is
 * sourced from axe-core's published rule metadata and the WCAG 2.2 spec.
 *
 * Three kinds of tag:
 *  - criterion tags ("wcag143")  → a specific success criterion
 *  - level tags ("wcag2aa")      → a CONFORMANCE LEVEL, never a criterion
 *  - everything else ("best-practice", "cat.color") → neither
 *
 * Scope: WCAG 2.0 / 2.1 / 2.2 Level A and AA (the legal baseline). AAA is
 * intentionally excluded to match the engine's enabled rule tags.
 */

export type WcagLevelLabel = "A" | "AA" | "AAA";

export interface WcagCriterion {
  /** Dotted criterion number, e.g. "1.4.3". */
  criterion: string;
  /** Human-readable criterion name, e.g. "Contrast (Minimum)". */
  name: string;
  /** Conformance level. */
  level: WcagLevelLabel;
  /** Link to the official W3C "Understanding" document. */
  url: string;
}

/** Resolved WCAG context for a rule that may carry several criterion tags. */
export interface ResolvedWcag {
  /** Primary criterion number (lowest), or null for best-practice rules. */
  criterion: string | null;
  /** Primary criterion name, or null. */
  name: string | null;
  /** Primary criterion level, or "best-practice" when there is no criterion. */
  level: WcagLevelLabel | "best-practice";
  /** Link to the primary criterion's Understanding doc, or null. */
  url: string | null;
  /** Any additional criterion numbers this rule maps to (deterministic order). */
  others: string[];
}

const UNDERSTANDING = (slug: string) =>
  `https://www.w3.org/WAI/WCAG22/Understanding/${slug}.html`;

/**
 * Exact axe-tag → criterion table. Key is the literal tag string axe emits
 * ("wcag" + criterion digits, no separators).
 */
const CRITERIA: Record<string, WcagCriterion> = {
  wcag111: { criterion: "1.1.1", name: "Non-text Content", level: "A", url: UNDERSTANDING("non-text-content") },
  wcag121: { criterion: "1.2.1", name: "Audio-only and Video-only (Prerecorded)", level: "A", url: UNDERSTANDING("audio-only-and-video-only-prerecorded") },
  wcag122: { criterion: "1.2.2", name: "Captions (Prerecorded)", level: "A", url: UNDERSTANDING("captions-prerecorded") },
  wcag123: { criterion: "1.2.3", name: "Audio Description or Media Alternative (Prerecorded)", level: "A", url: UNDERSTANDING("audio-description-or-media-alternative-prerecorded") },
  wcag124: { criterion: "1.2.4", name: "Captions (Live)", level: "AA", url: UNDERSTANDING("captions-live") },
  wcag125: { criterion: "1.2.5", name: "Audio Description (Prerecorded)", level: "AA", url: UNDERSTANDING("audio-description-prerecorded") },
  wcag131: { criterion: "1.3.1", name: "Info and Relationships", level: "A", url: UNDERSTANDING("info-and-relationships") },
  wcag132: { criterion: "1.3.2", name: "Meaningful Sequence", level: "A", url: UNDERSTANDING("meaningful-sequence") },
  wcag133: { criterion: "1.3.3", name: "Sensory Characteristics", level: "A", url: UNDERSTANDING("sensory-characteristics") },
  wcag134: { criterion: "1.3.4", name: "Orientation", level: "AA", url: UNDERSTANDING("orientation") },
  wcag135: { criterion: "1.3.5", name: "Identify Input Purpose", level: "AA", url: UNDERSTANDING("identify-input-purpose") },
  wcag141: { criterion: "1.4.1", name: "Use of Color", level: "A", url: UNDERSTANDING("use-of-color") },
  wcag142: { criterion: "1.4.2", name: "Audio Control", level: "A", url: UNDERSTANDING("audio-control") },
  wcag143: { criterion: "1.4.3", name: "Contrast (Minimum)", level: "AA", url: UNDERSTANDING("contrast-minimum") },
  wcag144: { criterion: "1.4.4", name: "Resize Text", level: "AA", url: UNDERSTANDING("resize-text") },
  wcag145: { criterion: "1.4.5", name: "Images of Text", level: "AA", url: UNDERSTANDING("images-of-text") },
  wcag1410: { criterion: "1.4.10", name: "Reflow", level: "AA", url: UNDERSTANDING("reflow") },
  wcag1411: { criterion: "1.4.11", name: "Non-text Contrast", level: "AA", url: UNDERSTANDING("non-text-contrast") },
  wcag1412: { criterion: "1.4.12", name: "Text Spacing", level: "AA", url: UNDERSTANDING("text-spacing") },
  wcag1413: { criterion: "1.4.13", name: "Content on Hover or Focus", level: "AA", url: UNDERSTANDING("content-on-hover-or-focus") },
  wcag211: { criterion: "2.1.1", name: "Keyboard", level: "A", url: UNDERSTANDING("keyboard") },
  wcag212: { criterion: "2.1.2", name: "No Keyboard Trap", level: "A", url: UNDERSTANDING("no-keyboard-trap") },
  wcag214: { criterion: "2.1.4", name: "Character Key Shortcuts", level: "A", url: UNDERSTANDING("character-key-shortcuts") },
  wcag221: { criterion: "2.2.1", name: "Timing Adjustable", level: "A", url: UNDERSTANDING("timing-adjustable") },
  wcag222: { criterion: "2.2.2", name: "Pause, Stop, Hide", level: "A", url: UNDERSTANDING("pause-stop-hide") },
  wcag231: { criterion: "2.3.1", name: "Three Flashes or Below Threshold", level: "A", url: UNDERSTANDING("three-flashes-or-below-threshold") },
  wcag241: { criterion: "2.4.1", name: "Bypass Blocks", level: "A", url: UNDERSTANDING("bypass-blocks") },
  wcag242: { criterion: "2.4.2", name: "Page Titled", level: "A", url: UNDERSTANDING("page-titled") },
  wcag243: { criterion: "2.4.3", name: "Focus Order", level: "A", url: UNDERSTANDING("focus-order") },
  wcag244: { criterion: "2.4.4", name: "Link Purpose (In Context)", level: "A", url: UNDERSTANDING("link-purpose-in-context") },
  wcag245: { criterion: "2.4.5", name: "Multiple Ways", level: "AA", url: UNDERSTANDING("multiple-ways") },
  wcag246: { criterion: "2.4.6", name: "Headings and Labels", level: "AA", url: UNDERSTANDING("headings-and-labels") },
  wcag247: { criterion: "2.4.7", name: "Focus Visible", level: "AA", url: UNDERSTANDING("focus-visible") },
  wcag2411: { criterion: "2.4.11", name: "Focus Not Obscured (Minimum)", level: "AA", url: UNDERSTANDING("focus-not-obscured-minimum") },
  wcag251: { criterion: "2.5.1", name: "Pointer Gestures", level: "A", url: UNDERSTANDING("pointer-gestures") },
  wcag252: { criterion: "2.5.2", name: "Pointer Cancellation", level: "A", url: UNDERSTANDING("pointer-cancellation") },
  wcag253: { criterion: "2.5.3", name: "Label in Name", level: "A", url: UNDERSTANDING("label-in-name") },
  wcag254: { criterion: "2.5.4", name: "Motion Actuation", level: "A", url: UNDERSTANDING("motion-actuation") },
  wcag257: { criterion: "2.5.7", name: "Dragging Movements", level: "AA", url: UNDERSTANDING("dragging-movements") },
  wcag258: { criterion: "2.5.8", name: "Target Size (Minimum)", level: "AA", url: UNDERSTANDING("target-size-minimum") },
  wcag311: { criterion: "3.1.1", name: "Language of Page", level: "A", url: UNDERSTANDING("language-of-page") },
  wcag312: { criterion: "3.1.2", name: "Language of Parts", level: "AA", url: UNDERSTANDING("language-of-parts") },
  wcag321: { criterion: "3.2.1", name: "On Focus", level: "A", url: UNDERSTANDING("on-focus") },
  wcag322: { criterion: "3.2.2", name: "On Input", level: "A", url: UNDERSTANDING("on-input") },
  wcag323: { criterion: "3.2.3", name: "Consistent Navigation", level: "AA", url: UNDERSTANDING("consistent-navigation") },
  wcag324: { criterion: "3.2.4", name: "Consistent Identification", level: "AA", url: UNDERSTANDING("consistent-identification") },
  wcag326: { criterion: "3.2.6", name: "Consistent Help", level: "A", url: UNDERSTANDING("consistent-help") },
  wcag331: { criterion: "3.3.1", name: "Error Identification", level: "A", url: UNDERSTANDING("error-identification") },
  wcag332: { criterion: "3.3.2", name: "Labels or Instructions", level: "A", url: UNDERSTANDING("labels-or-instructions") },
  wcag333: { criterion: "3.3.3", name: "Error Suggestion", level: "AA", url: UNDERSTANDING("error-suggestion") },
  wcag334: { criterion: "3.3.4", name: "Error Prevention (Legal, Financial, Data)", level: "AA", url: UNDERSTANDING("error-prevention-legal-financial-data") },
  wcag337: { criterion: "3.3.7", name: "Redundant Entry", level: "A", url: UNDERSTANDING("redundant-entry") },
  wcag338: { criterion: "3.3.8", name: "Accessible Authentication (Minimum)", level: "AA", url: UNDERSTANDING("accessible-authentication-minimum") },
  wcag411: { criterion: "4.1.1", name: "Parsing", level: "A", url: UNDERSTANDING("parsing") },
  wcag412: { criterion: "4.1.2", name: "Name, Role, Value", level: "A", url: UNDERSTANDING("name-role-value") },
  wcag413: { criterion: "4.1.3", name: "Status Messages", level: "AA", url: UNDERSTANDING("status-messages") },
};

/** Conformance-level tags → level. These are NEVER criteria. */
const LEVEL_TAGS: Record<string, WcagLevelLabel> = {
  wcag2a: "A",
  wcag2aa: "AA",
  wcag2aaa: "AAA",
  wcag21a: "A",
  wcag21aa: "AA",
  wcag22a: "A",
  wcag22aa: "AA",
};

/** Exact-string criterion lookup. Returns null for level/unknown tags. */
export function criterionForTag(tag: string): WcagCriterion | null {
  return CRITERIA[tag] ?? null;
}

/** Level for a conformance-level tag, or null if the tag is not a level tag. */
export function levelForTag(tag: string): WcagLevelLabel | null {
  return LEVEL_TAGS[tag] ?? null;
}

/** Numeric, component-wise comparison so 1.4.3 sorts before 1.4.10. */
function compareCriteria(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/**
 * Resolves a rule's full tag list into a single primary criterion + the rest.
 *
 * Primary selection is deterministic: the lowest criterion number wins, so the
 * displayed criterion never flickers between runs. Rules with no criterion tag
 * (best-practice) are labelled as such with no fabricated criterion.
 */
export function resolveWcag(tags: string[]): ResolvedWcag {
  const matched = tags
    .map(criterionForTag)
    .filter((c): c is WcagCriterion => c !== null)
    .sort((a, b) => compareCriteria(a.criterion, b.criterion));

  if (matched.length === 0) {
    return { criterion: null, name: null, level: "best-practice", url: null, others: [] };
  }

  const [primary, ...rest] = matched;
  return {
    criterion: primary.criterion,
    name: primary.name,
    level: primary.level,
    url: primary.url,
    others: rest.map((c) => c.criterion),
  };
}
