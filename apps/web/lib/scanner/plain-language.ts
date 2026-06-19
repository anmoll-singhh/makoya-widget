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
