/**
 * lib/scanner/plain-language.ts
 *
 * Turns a raw rule id (+ axe tags + help text) into a plain-English, audience-
 * aware explanation a non-technical site owner can act on:
 *   - title           — what's wrong, in one line
 *   - whatItMeans     — the user impact, jargon-free
 *   - whoItAffects    — a sentence naming the affected people
 *   - disabilityGroups— STRUCTURED audience tags (for badges/filtering)
 *   - howToFix        — concrete, action-oriented remediation
 *
 * Coverage: a curated map of the rules that actually fire on real sites (axe
 * core rules + our 6 custom checks). Unmapped rules degrade safely — the title
 * comes from the rule id, the explanation from axe's own help text, and the
 * disability groups are INFERRED from the rule's WCAG tags (never fabricated).
 */

import type {
  AccessibilityReport,
  AccessibilityIssue,
  SeverityLevel,
  DisabilityGroup,
} from "@/types";

export interface PlainIssue {
  id: string;
  impact: SeverityLevel | null;
  title: string;
  whatItMeans: string;
  whoItAffects: string;
  disabilityGroups: DisabilityGroup[];
  howToFix: string;
  /** Measured fact behind the failure (e.g. contrast ratio), when available. */
  measuredEvidence?: string;
}

type Entry = {
  title: string;
  whatItMeans: string;
  whoItAffects: string;
  disabilityGroups: DisabilityGroup[];
  howToFix: string;
};

/** Curated, plain-English explanations for the rules that fire in practice. */
const MAP: Record<string, Entry> = {
  "image-alt": {
    title: "Images are missing text descriptions",
    whatItMeans: "Some images don't have alternative text, so their meaning is lost when the image can't be seen.",
    whoItAffects: "Blind and low-vision visitors using screen readers.",
    disabilityGroups: ["blind", "low-vision"],
    howToFix: "Add an `alt` attribute describing what each image shows (e.g. alt=\"Team photo outside the office\"). For purely decorative images, use empty alt=\"\" so screen readers skip them.",
  },
  "color-contrast": {
    title: "Text is hard to read against its background",
    whatItMeans: "Some text doesn't stand out enough from its background colour to be comfortably readable.",
    whoItAffects: "People with low vision, colour blindness, or anyone in bright light.",
    disabilityGroups: ["low-vision", "color-blind"],
    howToFix: "Darken the text or lighten the background until the contrast ratio is at least 4.5:1 for normal text (3:1 for large text). Check colours with a contrast checker before shipping.",
  },
  "label": {
    title: "Form fields aren't clearly labelled",
    whatItMeans: "Some input boxes have no label telling the visitor (or their screen reader) what to type.",
    whoItAffects: "Screen-reader users and people with cognitive differences.",
    disabilityGroups: ["blind", "low-vision", "cognitive"],
    howToFix: "Give every input a visible `<label>` linked with `for=\"fieldId\"`, or an `aria-label`. Placeholder text alone is not a label.",
  },
  "link-name": {
    title: "Some links have no readable text",
    whatItMeans: "A link has no text a screen reader can announce, so its destination is unknown.",
    whoItAffects: "Blind and low-vision visitors.",
    disabilityGroups: ["blind", "low-vision"],
    howToFix: "Put real text inside the link, or add an `aria-label` describing where it goes. Icon-only links need a hidden text label.",
  },
  "button-name": {
    title: "Some buttons have no readable name",
    whatItMeans: "A button has no text or label, so it's announced as just 'button' with no purpose.",
    whoItAffects: "Screen-reader users.",
    disabilityGroups: ["blind", "low-vision"],
    howToFix: "Add text inside the button, or an `aria-label` (e.g. aria-label=\"Close dialog\") for icon-only buttons.",
  },
  "icon-button-no-label": {
    title: "Icon-only buttons have no label",
    whatItMeans: "Buttons that show only an icon have no hidden text, so their purpose isn't announced.",
    whoItAffects: "Screen-reader users.",
    disabilityGroups: ["blind", "low-vision"],
    howToFix: "Add an `aria-label` to every icon-only button describing its action (e.g. aria-label=\"Search\", aria-label=\"Open menu\").",
  },
  "html-has-lang": {
    title: "The page doesn't declare its language",
    whatItMeans: "The page doesn't say which language it's written in, so screen readers may mispronounce it.",
    whoItAffects: "Screen-reader users, especially on multilingual sites.",
    disabilityGroups: ["blind", "low-vision"],
    howToFix: "Add a `lang` attribute to the `<html>` tag, e.g. `<html lang=\"en\">`.",
  },
  "document-title": {
    title: "The page has no title",
    whatItMeans: "The browser tab and screen reader have no title to identify this page.",
    whoItAffects: "Screen-reader users and anyone with many tabs open.",
    disabilityGroups: ["blind", "low-vision", "cognitive"],
    howToFix: "Add a unique, descriptive `<title>` in the page `<head>` that names the page and the site.",
  },
  "heading-order": {
    title: "Headings are out of order",
    whatItMeans: "Headings skip levels, which breaks the outline people use to navigate.",
    whoItAffects: "Screen-reader users who jump between headings.",
    disabilityGroups: ["blind", "low-vision", "cognitive"],
    howToFix: "Use heading levels in order (h1 → h2 → h3) without skipping. Don't pick a heading level just for its size — style with CSS instead.",
  },
  "empty-heading": {
    title: "A heading has no text",
    whatItMeans: "A heading element is empty, so it adds a blank entry to the page outline.",
    whoItAffects: "Screen-reader users navigating by heading.",
    disabilityGroups: ["blind", "low-vision"],
    howToFix: "Put text inside the heading, or remove the empty heading element if it isn't needed.",
  },
  "region": {
    title: "Page content isn't organised into landmarks",
    whatItMeans: "Parts of the page aren't inside navigation landmarks, making it harder to jump around.",
    whoItAffects: "Screen-reader users navigating by region.",
    disabilityGroups: ["blind", "low-vision"],
    howToFix: "Wrap content in landmark elements: `<header>`, `<nav>`, `<main>`, `<footer>` (or ARIA roles) so users can jump between sections.",
  },
  "landmark-one-main": {
    title: "The page has no main content area",
    whatItMeans: "There's no 'main' landmark marking the primary content, so users can't skip straight to it.",
    whoItAffects: "Screen-reader and keyboard users.",
    disabilityGroups: ["blind", "low-vision", "motor"],
    howToFix: "Wrap the primary content of the page in a single `<main>` element.",
  },
  "list": {
    title: "Lists aren't marked up correctly",
    whatItMeans: "Content that looks like a list isn't coded as one, so its structure is lost to assistive tech.",
    whoItAffects: "Screen-reader users.",
    disabilityGroups: ["blind", "low-vision"],
    howToFix: "Use `<ul>`/`<ol>` with `<li>` children for lists. Don't fake lists with `<div>`s and bullet characters.",
  },
  "listitem": {
    title: "A list item is outside a list",
    whatItMeans: "A list item isn't inside a proper list, so the structure is announced incorrectly.",
    whoItAffects: "Screen-reader users.",
    disabilityGroups: ["blind", "low-vision"],
    howToFix: "Make sure every `<li>` is a direct child of a `<ul>` or `<ol>`.",
  },
  "generic-link-text": {
    title: "Links use vague text like 'click here'",
    whatItMeans: "Some links don't describe where they go, which is confusing out of context.",
    whoItAffects: "Screen-reader users scanning a list of links, and everyone skimming.",
    disabilityGroups: ["blind", "low-vision", "cognitive"],
    howToFix: "Replace generic text with the destination, e.g. \"Read our pricing\" instead of \"click here\". Screen-reader users often hear links as a standalone list.",
  },
  "new-window-no-warning": {
    title: "Links open new tabs without warning",
    whatItMeans: "Some links open a new window or tab without telling the visitor first.",
    whoItAffects: "Screen-reader users and people who lose track of context.",
    disabilityGroups: ["blind", "low-vision", "cognitive"],
    howToFix: "Add \"(opens in new window)\" to the link text or aria-label for any link with target=\"_blank\".",
  },
  "media-autoplay": {
    title: "Media plays automatically",
    whatItMeans: "Audio or video starts on its own, which can be disorienting and hard to stop.",
    whoItAffects: "Screen-reader users and people with attention or anxiety conditions.",
    disabilityGroups: ["blind", "low-vision", "cognitive", "vestibular"],
    howToFix: "Remove `autoplay`, or ensure media is muted and give an obvious pause/stop control.",
  },
  "focus-ring-hidden": {
    title: "The keyboard focus outline is hidden",
    whatItMeans: "The highlight that shows where you are when using a keyboard has been removed.",
    whoItAffects: "Keyboard-only users and people who can't use a mouse.",
    disabilityGroups: ["motor", "blind", "low-vision"],
    howToFix: "Never use `outline: none` on focusable elements without a replacement. Provide a clear `:focus-visible` style (e.g. a 2px outline).",
  },
  "document-link-no-type": {
    title: "Document links don't say the file type",
    whatItMeans: "Links to files like PDFs don't mention the format, so visitors don't know what they'll download.",
    whoItAffects: "Screen-reader users and people on limited connections.",
    disabilityGroups: ["blind", "low-vision", "cognitive"],
    howToFix: "Add the file type to the link text, e.g. \"Annual Report (PDF, 2 MB)\".",
  },
  "aria-required-attr": {
    title: "An interactive element is missing required ARIA attributes",
    whatItMeans: "An element uses an ARIA role but is missing attributes that role needs, so its state isn't announced correctly.",
    whoItAffects: "Screen-reader users.",
    disabilityGroups: ["blind", "low-vision"],
    howToFix: "Add the ARIA attributes the role requires (e.g. a checkbox role needs aria-checked), or use the native HTML element instead.",
  },
  "aria-required-children": {
    title: "An ARIA container is missing its required child roles",
    whatItMeans: "A component (like a menu or list) is missing the inner items its role expects, so it's announced incompletely.",
    whoItAffects: "Screen-reader users.",
    disabilityGroups: ["blind", "low-vision"],
    howToFix: "Add the required child roles inside the container (e.g. a role=\"list\" needs role=\"listitem\" children), or switch to native HTML.",
  },
  "aria-required-parent": {
    title: "An ARIA item is outside its required container",
    whatItMeans: "An item that must live inside a specific component isn't, so assistive tech can't interpret it correctly.",
    whoItAffects: "Screen-reader users.",
    disabilityGroups: ["blind", "low-vision"],
    howToFix: "Move the item inside its required parent role (e.g. a role=\"option\" must be inside role=\"listbox\").",
  },
  "aria-roles": {
    title: "An element uses an invalid ARIA role",
    whatItMeans: "An ARIA role isn't a recognised value, so assistive tech doesn't know how to present the element.",
    whoItAffects: "Screen-reader users.",
    disabilityGroups: ["blind", "low-vision"],
    howToFix: "Use a valid ARIA role from the spec, or remove the role and use the matching native HTML element.",
  },
  "aria-valid-attr-value": {
    title: "An ARIA attribute has an invalid value",
    whatItMeans: "An ARIA attribute's value isn't valid, so the information it's meant to convey is lost.",
    whoItAffects: "Screen-reader users.",
    disabilityGroups: ["blind", "low-vision"],
    howToFix: "Fix the attribute value to a valid one (e.g. aria-expanded must be \"true\" or \"false\"; ids in aria-labelledby must exist).",
  },
  "aria-hidden-focus": {
    title: "A hidden element can still be focused",
    whatItMeans: "An element marked hidden from screen readers can still be reached by keyboard, creating a confusing 'ghost' stop.",
    whoItAffects: "Screen-reader and keyboard users.",
    disabilityGroups: ["blind", "low-vision", "motor"],
    howToFix: "On elements with aria-hidden=\"true\", also remove them from the tab order (tabindex=\"-1\" or hide them fully).",
  },
  "aria-hidden-body": {
    title: "The whole page is hidden from screen readers",
    whatItMeans: "aria-hidden is set on the page body, which hides everything from assistive tech.",
    whoItAffects: "Screen-reader users — the page is unusable for them.",
    disabilityGroups: ["blind", "low-vision"],
    howToFix: "Remove aria-hidden from the `<body>`. Only hide specific decorative or off-screen elements.",
  },
  "aria-command-name": {
    title: "A control has no accessible name",
    whatItMeans: "A button, link, or menu item built with ARIA has no name, so it's announced without a purpose.",
    whoItAffects: "Screen-reader users.",
    disabilityGroups: ["blind", "low-vision"],
    howToFix: "Add visible text or an `aria-label` naming the control's action.",
  },
  "aria-input-field-name": {
    title: "A form field has no accessible name",
    whatItMeans: "An input built with ARIA has no associated label, so its purpose isn't announced.",
    whoItAffects: "Screen-reader users.",
    disabilityGroups: ["blind", "low-vision", "cognitive"],
    howToFix: "Add a `<label>`, `aria-label`, or `aria-labelledby` so the field has a name.",
  },
  "aria-toggle-field-name": {
    title: "A toggle/checkbox has no accessible name",
    whatItMeans: "A checkbox, switch, or radio built with ARIA has no label, so its purpose isn't announced.",
    whoItAffects: "Screen-reader users.",
    disabilityGroups: ["blind", "low-vision", "cognitive"],
    howToFix: "Give the toggle a label via `<label>`, `aria-label`, or `aria-labelledby`.",
  },
  "frame-title": {
    title: "An embedded frame has no title",
    whatItMeans: "An iframe has no title, so screen-reader users can't tell what it contains before entering it.",
    whoItAffects: "Screen-reader users.",
    disabilityGroups: ["blind", "low-vision"],
    howToFix: "Add a descriptive `title` attribute to each `<iframe>` (e.g. title=\"Location map\").",
  },
  "input-image-alt": {
    title: "An image button has no text description",
    whatItMeans: "A button made from an image has no alternative text, so its action isn't announced.",
    whoItAffects: "Screen-reader users.",
    disabilityGroups: ["blind", "low-vision"],
    howToFix: "Add `alt` text to `<input type=\"image\">` describing what the button does (e.g. alt=\"Search\").",
  },
  "role-img-alt": {
    title: "An image element has no text description",
    whatItMeans: "An element acting as an image has no alternative text, so its meaning is lost when it can't be seen.",
    whoItAffects: "Blind and low-vision visitors.",
    disabilityGroups: ["blind", "low-vision"],
    howToFix: "Add an `aria-label` (or alt) to elements with role=\"img\" describing what they convey.",
  },
  "svg-img-alt": {
    title: "An SVG graphic has no text description",
    whatItMeans: "An SVG conveying meaning has no accessible name, so screen-reader users miss what it shows.",
    whoItAffects: "Blind and low-vision visitors.",
    disabilityGroups: ["blind", "low-vision"],
    howToFix: "Add a `<title>` inside the SVG, or `aria-label` on it. If the SVG is decorative, add aria-hidden=\"true\".",
  },
  "select-name": {
    title: "A dropdown has no label",
    whatItMeans: "A select menu has no label telling the visitor what they're choosing.",
    whoItAffects: "Screen-reader users.",
    disabilityGroups: ["blind", "low-vision", "cognitive"],
    howToFix: "Link a `<label>` to the `<select>`, or add an `aria-label`.",
  },
  "td-headers-attr": {
    title: "A data table's cells reference missing headers",
    whatItMeans: "Table cells point to header cells that don't exist, breaking how the table is read aloud.",
    whoItAffects: "Screen-reader users.",
    disabilityGroups: ["blind", "low-vision"],
    howToFix: "Make sure each `headers` attribute points to the `id` of a real `<th>` in the table.",
  },
  "th-has-data-cells": {
    title: "A table header has no data cells",
    whatItMeans: "A header cell isn't associated with any data, so the table's structure is announced incorrectly.",
    whoItAffects: "Screen-reader users.",
    disabilityGroups: ["blind", "low-vision"],
    howToFix: "Ensure every `<th>` actually heads a row or column of `<td>` data cells, with correct scope.",
  },
  "valid-lang": {
    title: "A language code is invalid",
    whatItMeans: "Part of the page declares a language that isn't a valid code, so screen readers may mispronounce it.",
    whoItAffects: "Screen-reader users on multilingual content.",
    disabilityGroups: ["blind", "low-vision"],
    howToFix: "Use a valid `lang` value (e.g. lang=\"fr\", lang=\"es-MX\") on the element.",
  },
  "meta-viewport": {
    title: "The page blocks zooming",
    whatItMeans: "The page prevents pinch-to-zoom, so people who need to enlarge text can't.",
    whoItAffects: "People with low vision.",
    disabilityGroups: ["low-vision"],
    howToFix: "Remove `user-scalable=no` and `maximum-scale=1` from the viewport meta tag so users can zoom.",
  },
  "scrollable-region-focusable": {
    title: "A scrollable area can't be reached by keyboard",
    whatItMeans: "A region that scrolls can't be focused with the keyboard, so its content is unreachable without a mouse.",
    whoItAffects: "Keyboard-only users.",
    disabilityGroups: ["motor", "blind"],
    howToFix: "Add `tabindex=\"0\"` to scrollable containers so keyboard users can focus and scroll them.",
  },
  "nested-interactive": {
    title: "Interactive controls are nested inside each other",
    whatItMeans: "A control contains another control (like a button inside a button), which confuses assistive tech.",
    whoItAffects: "Screen-reader and keyboard users.",
    disabilityGroups: ["blind", "low-vision", "motor"],
    howToFix: "Don't nest interactive elements (e.g. a link inside a button). Restructure so each control stands alone.",
  },
  "link-in-text-block": {
    title: "Links aren't distinguishable from surrounding text",
    whatItMeans: "Links rely on colour alone to stand out from text, so they're invisible to some readers.",
    whoItAffects: "People with low vision or colour blindness.",
    disabilityGroups: ["low-vision", "color-blind"],
    howToFix: "Underline links in body text, or otherwise distinguish them by more than colour.",
  },
  "form-field-multiple-labels": {
    title: "A form field has conflicting labels",
    whatItMeans: "A field has more than one label, which can be announced unpredictably.",
    whoItAffects: "Screen-reader users.",
    disabilityGroups: ["blind", "low-vision", "cognitive"],
    howToFix: "Give each field exactly one label. Combine the text into a single `<label>` if needed.",
  },
  "bypass": {
    title: "There's no way to skip to the main content",
    whatItMeans: "The page offers no skip link or landmark to jump past repeated navigation.",
    whoItAffects: "Keyboard and screen-reader users.",
    disabilityGroups: ["motor", "blind", "low-vision"],
    howToFix: "Add a \"Skip to main content\" link as the first focusable element, jumping to the `<main>` landmark.",
  },
  "target-size": {
    title: "Tap targets are too small or too close together",
    whatItMeans: "Buttons or links are small or crowded, making them hard to tap accurately.",
    whoItAffects: "People with motor impairments and touchscreen users.",
    disabilityGroups: ["motor"],
    howToFix: "Make tap targets at least 24×24 CSS pixels (44×44 is safer), with spacing between them.",
  },
  "duplicate-id-aria": {
    title: "An ARIA reference points to a duplicated id",
    whatItMeans: "Two elements share an id used by ARIA, so a label or relationship resolves to the wrong element.",
    whoItAffects: "Screen-reader users.",
    disabilityGroups: ["blind", "low-vision"],
    howToFix: "Make every id unique, especially ones referenced by aria-labelledby/aria-describedby.",
  },
  "tabindex": {
    title: "A positive tabindex disrupts keyboard order",
    whatItMeans: "An element forces itself early in the keyboard order, so focus jumps around unpredictably.",
    whoItAffects: "Keyboard-only and screen-reader users.",
    disabilityGroups: ["motor", "blind", "low-vision"],
    howToFix: "Avoid tabindex values above 0. Use tabindex=\"0\" (natural order) or rearrange the DOM instead.",
  },
  "autocomplete-valid": {
    title: "A field has an invalid autocomplete value",
    whatItMeans: "A form field's autocomplete hint isn't valid, so browsers and assistive tech can't auto-fill it.",
    whoItAffects: "People with cognitive or motor disabilities who rely on auto-fill.",
    disabilityGroups: ["cognitive", "motor"],
    howToFix: "Use a valid autocomplete token (e.g. autocomplete=\"email\", \"name\", \"tel\") on common fields.",
  },
};

const SEVERITY_ORDER: SeverityLevel[] = ["critical", "serious", "moderate", "minor"];

/**
 * Infers disability groups for an UNMAPPED rule from its WCAG/category tags.
 * Conservative: only adds a group when the tag clearly implies it; falls back
 * to screen-reader users (the broadest assistive-tech audience) if nothing
 * matches, so the field is never empty.
 */
export function inferDisabilityGroups(tags: string[]): DisabilityGroup[] {
  const set = new Set<DisabilityGroup>();
  const has = (t: string) => tags.includes(t);

  // Colour / contrast → low vision + colour blindness
  if (has("cat.color") || has("wcag143") || has("wcag1411") || has("wcag141")) {
    set.add("low-vision");
    set.add("color-blind");
  }
  // Keyboard / focus / pointer → motor
  if (has("cat.keyboard") || has("wcag211") || has("wcag212") || has("wcag247") || has("wcag258") || has("cat.sensory-and-visual-cues")) {
    set.add("motor");
  }
  // Time / motion / animation → vestibular + cognitive
  if (has("wcag222") || has("wcag231") || has("wcag221")) {
    set.add("vestibular");
    set.add("cognitive");
  }
  // Forms / language / consistency / structure → cognitive
  if (has("cat.forms") || has("wcag332") || has("wcag324") || has("wcag323") || has("cat.language")) {
    set.add("cognitive");
  }
  // Media / audio → deaf / hard of hearing
  if (has("cat.time-and-media") || has("wcag122") || has("wcag121") || has("wcag124")) {
    set.add("deaf-hard-of-hearing");
  }
  // Most remaining axe categories (name-role-value, aria, semantics, text-
  // alternatives, tables, structure) primarily affect screen-reader users.
  if (
    set.size === 0 ||
    has("cat.aria") || has("cat.name-role-value") || has("cat.text-alternatives") ||
    has("cat.semantics") || has("cat.tables") || has("cat.structure") || has("wcag412") || has("wcag131")
  ) {
    set.add("blind");
    set.add("low-vision");
  }

  return [...set];
}

export function toPlainIssue(issue: AccessibilityIssue): PlainIssue {
  const entry = MAP[issue.id];
  if (entry) {
    return { id: issue.id, impact: issue.impact, ...entry, measuredEvidence: issue.measuredEvidence };
  }

  // Safe generic fallback built from axe's own fields + inferred audience.
  const title = humanizeId(issue.id);
  return {
    id: issue.id,
    impact: issue.impact,
    title,
    whatItMeans: issue.help || issue.description || "This element doesn't meet a common accessibility guideline.",
    whoItAffects: "Visitors using assistive technology such as screen readers or keyboard navigation.",
    disabilityGroups: inferDisabilityGroups(issue.tags ?? []),
    howToFix: issue.help || "Review this element against the linked WCAG guidance and apply the recommended fix.",
    measuredEvidence: issue.measuredEvidence,
  };
}

export function topPlainIssues(report: AccessibilityReport, n = 3): PlainIssue[] {
  const ordered: AccessibilityIssue[] = [];
  for (const sev of SEVERITY_ORDER) ordered.push(...report.issues[sev]);
  return ordered.slice(0, n).map(toPlainIssue);
}

/** "some-unknown-rule" -> "Some unknown rule" */
function humanizeId(id: string): string {
  const s = id.replace(/[-_]+/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}
