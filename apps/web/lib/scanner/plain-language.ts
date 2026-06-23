import type { AccessibilityReport, AccessibilityIssue, SeverityLevel } from "@/types";

export interface PlainIssue {
  id: string;
  impact: SeverityLevel | null;
  title: string;
  whatItMeans: string;
  whoItAffects: string;
}

type Entry = { title: string; whatItMeans: string; whoItAffects: string };

/** Curated, plain-English explanations for the most common rules (axe + custom). */
const MAP: Record<string, Entry> = {
  "image-alt": {
    title: "Images are missing text descriptions",
    whatItMeans: "Some images don't have alternative text, so their meaning is lost when the image can't be seen.",
    whoItAffects: "Blind and low-vision visitors using screen readers.",
  },
  "color-contrast": {
    title: "Text is hard to read against its background",
    whatItMeans: "Some text doesn't stand out enough from its background colour to be comfortably readable.",
    whoItAffects: "People with low vision, colour blindness, or anyone in bright light.",
  },
  "label": {
    title: "Form fields aren't clearly labelled",
    whatItMeans: "Some input boxes have no label telling the visitor (or their screen reader) what to type.",
    whoItAffects: "Screen-reader users and people with cognitive differences.",
  },
  "link-name": {
    title: "Some links have no readable text",
    whatItMeans: "A link has no text a screen reader can announce, so its destination is unknown.",
    whoItAffects: "Blind and low-vision visitors.",
  },
  "button-name": {
    title: "Some buttons have no readable name",
    whatItMeans: "A button has no text or label, so it's announced as just 'button' with no purpose.",
    whoItAffects: "Screen-reader users.",
  },
  "icon-button-no-label": {
    title: "Icon-only buttons have no label",
    whatItMeans: "Buttons that show only an icon have no hidden text, so their purpose isn't announced.",
    whoItAffects: "Screen-reader users.",
  },
  "html-has-lang": {
    title: "The page doesn't declare its language",
    whatItMeans: "The page doesn't say which language it's written in, so screen readers may mispronounce it.",
    whoItAffects: "Screen-reader users, especially on multilingual sites.",
  },
  "document-title": {
    title: "The page has no title",
    whatItMeans: "The browser tab and screen reader have no title to identify this page.",
    whoItAffects: "Screen-reader users and anyone with many tabs open.",
  },
  "heading-order": {
    title: "Headings are out of order",
    whatItMeans: "Headings skip levels, which breaks the outline people use to navigate.",
    whoItAffects: "Screen-reader users who jump between headings.",
  },
  "region": {
    title: "Page content isn't organised into landmarks",
    whatItMeans: "Parts of the page aren't inside navigation landmarks, making it harder to jump around.",
    whoItAffects: "Screen-reader users navigating by region.",
  },
  "landmark-one-main": {
    title: "The page has no main content area",
    whatItMeans: "There's no 'main' landmark marking the primary content, so users can't skip straight to it.",
    whoItAffects: "Screen-reader and keyboard users.",
  },
  "list": {
    title: "Lists aren't marked up correctly",
    whatItMeans: "Content that looks like a list isn't coded as one, so its structure is lost to assistive tech.",
    whoItAffects: "Screen-reader users.",
  },
  "generic-link-text": {
    title: "Links use vague text like 'click here'",
    whatItMeans: "Some links don't describe where they go, which is confusing out of context.",
    whoItAffects: "Screen-reader users scanning a list of links, and everyone skimming.",
  },
  "new-window-no-warning": {
    title: "Links open new tabs without warning",
    whatItMeans: "Some links open a new window or tab without telling the visitor first.",
    whoItAffects: "Screen-reader users and people who lose track of context.",
  },
  "media-autoplay": {
    title: "Media plays automatically",
    whatItMeans: "Audio or video starts on its own, which can be disorienting and hard to stop.",
    whoItAffects: "Screen-reader users and people with attention or anxiety conditions.",
  },
  "focus-ring-hidden": {
    title: "The keyboard focus outline is hidden",
    whatItMeans: "The highlight that shows where you are when using a keyboard has been removed.",
    whoItAffects: "Keyboard-only users and people who can't use a mouse.",
  },
  "document-link-no-type": {
    title: "Document links don't say the file type",
    whatItMeans: "Links to files like PDFs don't mention the format, so visitors don't know what they'll download.",
    whoItAffects: "Screen-reader users and people on limited connections.",
  },
  "aria-required-attr": {
    title: "An interactive element is missing required ARIA attributes",
    whatItMeans: "An element uses an ARIA role but is missing attributes that role needs, so its state isn't announced correctly.",
    whoItAffects: "Screen-reader users.",
  },
  "aria-required-children": {
    title: "An ARIA container is missing its required child roles",
    whatItMeans: "A component (like a menu or list) is missing the inner items its role expects, so it's announced incompletely.",
    whoItAffects: "Screen-reader users.",
  },
  "aria-required-parent": {
    title: "An ARIA item is outside its required container",
    whatItMeans: "An item that must live inside a specific component isn't, so assistive tech can't interpret it correctly.",
    whoItAffects: "Screen-reader users.",
  },
  "aria-roles": {
    title: "An element uses an invalid ARIA role",
    whatItMeans: "An ARIA role isn't a recognised value, so assistive tech doesn't know how to present the element.",
    whoItAffects: "Screen-reader users.",
  },
  "aria-valid-attr-value": {
    title: "An ARIA attribute has an invalid value",
    whatItMeans: "An ARIA attribute's value isn't valid, so the information it's meant to convey is lost.",
    whoItAffects: "Screen-reader users.",
  },
  "aria-hidden-focus": {
    title: "A hidden element can still be focused",
    whatItMeans: "An element marked hidden from screen readers can still be reached by keyboard, creating a confusing 'ghost' stop.",
    whoItAffects: "Screen-reader and keyboard users.",
  },
  "aria-command-name": {
    title: "A control has no accessible name",
    whatItMeans: "A button, link, or menu item built with ARIA has no name, so it's announced without a purpose.",
    whoItAffects: "Screen-reader users.",
  },
  "aria-input-field-name": {
    title: "A form field has no accessible name",
    whatItMeans: "An input built with ARIA has no associated label, so its purpose isn't announced.",
    whoItAffects: "Screen-reader users.",
  },
  "frame-title": {
    title: "An embedded frame has no title",
    whatItMeans: "An iframe has no title, so screen-reader users can't tell what it contains before entering it.",
    whoItAffects: "Screen-reader users.",
  },
  "input-image-alt": {
    title: "An image button has no text description",
    whatItMeans: "A button made from an image has no alternative text, so its action isn't announced.",
    whoItAffects: "Screen-reader users.",
  },
  "role-img-alt": {
    title: "An image element has no text description",
    whatItMeans: "An element acting as an image has no alternative text, so its meaning is lost when it can't be seen.",
    whoItAffects: "Blind and low-vision visitors.",
  },
  "svg-img-alt": {
    title: "An SVG graphic has no text description",
    whatItMeans: "An SVG conveying meaning has no accessible name, so screen-reader users miss what it shows.",
    whoItAffects: "Blind and low-vision visitors.",
  },
  "select-name": {
    title: "A dropdown has no label",
    whatItMeans: "A select menu has no label telling the visitor what they're choosing.",
    whoItAffects: "Screen-reader users.",
  },
  "td-headers-attr": {
    title: "A data table's cells reference missing headers",
    whatItMeans: "Table cells point to header cells that don't exist, breaking how the table is read aloud.",
    whoItAffects: "Screen-reader users.",
  },
  "th-has-data-cells": {
    title: "A table header has no data cells",
    whatItMeans: "A header cell isn't associated with any data, so the table's structure is announced incorrectly.",
    whoItAffects: "Screen-reader users.",
  },
  "valid-lang": {
    title: "A language code is invalid",
    whatItMeans: "Part of the page declares a language that isn't a valid code, so screen readers may mispronounce it.",
    whoItAffects: "Screen-reader users on multilingual content.",
  },
  "meta-viewport": {
    title: "The page blocks zooming",
    whatItMeans: "The page prevents pinch-to-zoom, so people who need to enlarge text can't.",
    whoItAffects: "People with low vision.",
  },
  "scrollable-region-focusable": {
    title: "A scrollable area can't be reached by keyboard",
    whatItMeans: "A region that scrolls can't be focused with the keyboard, so its content is unreachable without a mouse.",
    whoItAffects: "Keyboard-only users.",
  },
  "nested-interactive": {
    title: "Interactive controls are nested inside each other",
    whatItMeans: "A control contains another control (like a button inside a button), which confuses assistive tech.",
    whoItAffects: "Screen-reader and keyboard users.",
  },
  "link-in-text-block": {
    title: "Links aren't distinguishable from surrounding text",
    whatItMeans: "Links rely on colour alone to stand out from text, so they're invisible to some readers.",
    whoItAffects: "People with low vision or colour blindness.",
  },
  "listitem": {
    title: "A list item is outside a list",
    whatItMeans: "A list item isn't inside a proper list, so the structure is announced incorrectly.",
    whoItAffects: "Screen-reader users.",
  },
  "form-field-multiple-labels": {
    title: "A form field has conflicting labels",
    whatItMeans: "A field has more than one label, which can be announced unpredictably.",
    whoItAffects: "Screen-reader users.",
  },
  "bypass": {
    title: "There's no way to skip to the main content",
    whatItMeans: "The page offers no skip link or landmark to jump past repeated navigation.",
    whoItAffects: "Keyboard and screen-reader users.",
  },
  "target-size": {
    title: "Tap targets are too small or too close together",
    whatItMeans: "Buttons or links are small or crowded, making them hard to tap accurately.",
    whoItAffects: "People with motor impairments and touchscreen users.",
  },
};

const SEVERITY_ORDER: SeverityLevel[] = ["critical", "serious", "moderate", "minor"];

export function toPlainIssue(issue: AccessibilityIssue): PlainIssue {
  const entry = MAP[issue.id];
  if (entry) return { id: issue.id, impact: issue.impact, ...entry };
  // Safe generic fallback built from axe's own fields.
  const title = humanizeId(issue.id);
  return {
    id: issue.id,
    impact: issue.impact,
    title,
    whatItMeans: issue.help || issue.description || "This element doesn't meet a common accessibility guideline.",
    whoItAffects: "Visitors using assistive technology such as screen readers or keyboard navigation.",
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
