/**
 * Plain-language translations of axe-core rule IDs.
 *
 * Every field is written for a non-technical audience.
 * stat    — a real, sourced statistic about this class of problem.
 * legalRisk — why this specific issue creates lawsuit exposure.
 *
 * Sources: WebAIM Million Report 2024, Deque accessibility research,
 * Bureau of Internet Accessibility annual report, UsableNet ADA lawsuit data,
 * W3C WAI statistics, National Federation of the Blind litigation reports.
 */
export interface RulePlainLanguage {
  title: string;
  summary: string;
  whoItAffects: string;
  howToFix: string;
  stat?: string;
  legalRisk?: string;
}

export const RULE_PLAIN_LANGUAGE: Record<string, RulePlainLanguage> = {

  // ── Visual / Colour ──────────────────────────────────────────────────────

  "color-contrast": {
    title: "Text is too hard to read",
    summary: "Some text doesn't have enough colour contrast against its background — it looks faint or washed out.",
    whoItAffects: "300 million people worldwide have colour vision deficiency. Low contrast also affects everyone reading in bright sunlight or on a cheap screen.",
    howToFix: "Darken the text or lighten the background. Normal text needs a 4.5:1 contrast ratio; large text (18px+ bold or 24px+) needs 3:1. Use a contrast checker tool.",
    stat: "83.9% of the top 1 million homepages have colour contrast failures — it is the single most common WCAG violation found every year.",
    legalRisk: "Contrast failures appear in the majority of ADA Title III web lawsuits. The DOJ's 2024 final rule explicitly lists contrast as a compliance requirement.",
  },

  "color-contrast-enhanced": {
    title: "Text fails the stricter contrast standard (WCAG AAA)",
    summary: "The text contrast meets the basic AA standard but fails the enhanced AAA level (7:1 for normal text, 4.5:1 for large text).",
    whoItAffects: "People with low vision who need higher contrast to read comfortably — approximately 246 million people globally have moderate to severe vision impairment.",
    howToFix: "Increase contrast ratio to 7:1 for normal text and 4.5:1 for large/bold text. This is recommended for government, healthcare, and educational sites.",
    stat: "Only 4.1% of pages meet WCAG AAA contrast standards despite it being the recommended level for most content.",
  },

  // ── Images & Media ───────────────────────────────────────────────────────

  "image-alt": {
    title: "Images have no description for screen readers",
    summary: "These images don't have any alt text — a text description that describes what the image shows.",
    whoItAffects: "7.6 million people in the US use screen readers. Without alt text they hear nothing — the image is skipped entirely as if it doesn't exist.",
    howToFix: 'Add a short, descriptive alt attribute to each image: alt="Bar chart showing 40% sales increase in Q3". For purely decorative images that add no information, use alt="" so screen readers skip them cleanly.',
    stat: "55.4% of the top 1 million homepages have images with missing alt text — it's the second most common WCAG failure after colour contrast.",
    legalRisk: "Missing alt text on product images, logos, and informational graphics has been central to dozens of successful ADA lawsuits including cases against Fortune 500 retailers.",
  },

  "image-redundant-alt": {
    title: "Image description repeats the surrounding text",
    summary: "The alt text on this image says the same thing as the text right next to it.",
    whoItAffects: "Screen reader users hear the same content twice in a row, which is confusing and slows down navigation.",
    howToFix: 'If the image is described by adjacent text, set alt="" so screen readers skip it, avoiding the repetition.',
  },

  "input-image-alt": {
    title: "Image buttons have no description",
    summary: "A button that uses an image instead of text has no alt text explaining what it does.",
    whoItAffects: "Screen reader users hear 'button' with no context about what clicking it will do — they cannot safely use the site.",
    howToFix: 'Add an alt attribute to the image button describing its action: alt="Search" or alt="Submit order".',
    legalRisk: "Image buttons without alt text are a primary target in e-commerce accessibility lawsuits — they prevent users from completing purchases.",
  },

  "area-alt": {
    title: "Image map areas have no description",
    summary: "Clickable areas on an image map are missing text descriptions.",
    whoItAffects: "Screen reader users cannot identify or navigate image map regions.",
    howToFix: "Add an alt attribute to every <area> element describing what it links to.",
  },

  "object-alt": {
    title: "Embedded objects have no description",
    summary: "An <object> element (PDF, Flash, media player) has no text alternative.",
    whoItAffects: "Screen reader users cannot access the content inside the embedded object.",
    howToFix: "Add descriptive text inside the <object> tag as a fallback, or provide a separate text alternative link.",
  },

  "video-caption": {
    title: "Videos have no captions",
    summary: "Video content on this page has no closed captions or subtitles.",
    whoItAffects: "466 million people worldwide have disabling hearing loss. Captions also help people watching without audio (e.g. in public) and non-native speakers.",
    howToFix: "Add accurate closed captions to all videos. Use WebVTT or SRT format. Auto-generated captions from YouTube/Vimeo can be a starting point but must be reviewed for accuracy.",
    stat: "Netflix, Domino's, and Winn-Dixie all faced successful ADA lawsuits in part because of inaccessible video content.",
    legalRisk: "The ADA and Section 508 both require captions for video content. This is one of the most litigated accessibility issues for media and entertainment sites.",
  },

  "audio-caption": {
    title: "Audio content has no transcript",
    summary: "Audio-only content (podcasts, voice messages) has no text transcript.",
    whoItAffects: "Deaf users and people in sound-sensitive environments cannot access the content.",
    howToFix: "Provide a full text transcript for all audio content, either inline on the page or linked nearby.",
  },

  // ── Forms ────────────────────────────────────────────────────────────────

  "label": {
    title: "Form fields have no label",
    summary: "Some inputs, dropdowns, or checkboxes don't have a label telling users what to fill in.",
    whoItAffects: "Screen reader users can't tell what information a field is asking for — they hear 'edit text' with no context.",
    howToFix: "Add a <label> element to every form control and link it with the for attribute matching the input's id. Every single input must have a label.",
    stat: "Unlabelled form controls appear on 36.7% of top websites — they are the third most common accessibility failure.",
    legalRisk: "Inaccessible forms have been at the centre of lawsuits against banks, airlines, and healthcare providers — users can't complete registrations or transactions.",
  },

  "label-content-name-mismatch": {
    title: "Button label doesn't match its visible text",
    summary: "The accessible name (read by screen readers) doesn't match what's visually shown on the button.",
    whoItAffects: "Voice control users who say the visible button text find it doesn't activate — they can't use the site.",
    howToFix: "Ensure the accessible name (aria-label or aria-labelledby) starts with or contains the visible button text.",
    legalRisk: "WCAG 2.1 Success Criterion 2.5.3 — required for AA compliance. Breaks voice control software like Dragon NaturallySpeaking.",
  },

  "select-name": {
    title: "Dropdown menu has no label",
    summary: "A dropdown select element doesn't have a label telling users what they're choosing.",
    whoItAffects: "Screen reader users hear a list of options with no context about what they're selecting.",
    howToFix: "Add a <label> element linked to the <select>, or add an aria-label attribute describing what this selection is for.",
  },

  "autocomplete-valid": {
    title: "Form fields are missing autocomplete hints",
    summary: "Input fields for personal information (name, email, phone) don't have autocomplete attributes.",
    whoItAffects: "People with cognitive disabilities and motor impairments who rely on browser autofill or password managers to complete forms accurately.",
    howToFix: 'Add autocomplete attributes to personal data fields: autocomplete="name", autocomplete="email", autocomplete="tel", autocomplete="street-address".',
  },

  // ── Buttons & Links ──────────────────────────────────────────────────────

  "button-name": {
    title: "Buttons don't say what they do",
    summary: "Some buttons have no label — they're just blank interactive elements with no accessible name.",
    whoItAffects: "Screen reader users hear 'button' with zero context. They can't tell if it submits a form, opens a menu, or deletes their account.",
    howToFix: "Add visible text inside the button. For icon-only buttons, add aria-label='Submit contact form' describing exactly what the action does.",
    stat: "28.2% of websites have at least one button with no accessible name — one of the most dangerous usability failures.",
    legalRisk: "Unidentified buttons directly prevent users from completing key actions. They appear in lawsuits against e-commerce and financial services sites.",
  },

  "link-name": {
    title: "Links don't describe where they go",
    summary: "Some links say 'click here', 'read more', 'here', or have no text at all.",
    whoItAffects: "Screen reader users navigate pages by scanning a list of all links. Hearing 'click here, click here, click here' 20 times gives zero information about where links lead.",
    howToFix: "Rewrite link text to describe the destination or action: 'Read our WCAG compliance guide' instead of 'click here'. Every link text should make sense on its own, out of context.",
    stat: "21% of links with images have no accessible text. Meaningless link text is the fourth most common accessibility failure.",
    legalRisk: "Ambiguous navigation links have been cited in ADA cases involving travel, financial, and retail websites where users couldn't navigate to key pages.",
  },

  "link-in-text-block": {
    title: "Links aren't distinguishable from regular text",
    summary: "Links within body text rely only on colour to be identified — there's no underline or other visual indicator.",
    whoItAffects: "People with colour blindness who can't tell the link colour apart from regular text will miss links entirely.",
    howToFix: "Add an underline to links in body text, or use another non-colour visual indicator (bold, icon). Colour alone is never sufficient.",
  },

  "identical-links-same-purpose": {
    title: "Same-text links go to different places",
    summary: "Multiple links on the page use identical text but point to different destinations.",
    whoItAffects: "Screen reader users navigating by links see identical text entries but land at different places — there's no way to predict where they'll go.",
    howToFix: "Make link text unique so it clearly describes each destination, or use aria-label to add distinguishing context to each link.",
  },

  // ── Headings & Structure ─────────────────────────────────────────────────

  "heading-order": {
    title: "Headings are in the wrong order",
    summary: "The page skips heading levels — for example, jumping from H1 to H3, skipping H2.",
    whoItAffects: "Screen reader users navigate pages by jumping between headings, like using a table of contents. Skipped levels break this navigation pattern.",
    howToFix: "Use headings in strict order: H1 → H2 → H3. Never skip a level for visual styling — use CSS for that. Each page should have exactly one H1 that describes the page's main purpose.",
    stat: "59.5% of screen reader users say heading structure is their most important tool for navigating a web page.",
  },

  "page-has-heading-one": {
    title: "Page has no main heading (H1)",
    summary: "There's no H1 heading on this page to describe what it's about.",
    whoItAffects: "Screen reader users and search engines need an H1 to understand the page's purpose. Without it, users have no anchor for navigation.",
    howToFix: "Add a single <h1> that clearly describes the primary purpose or topic of this page. Every page should have exactly one H1.",
  },

  "empty-heading": {
    title: "A heading tag is empty",
    summary: "There's an H1–H6 heading tag with no text inside it.",
    whoItAffects: "Screen reader users navigating by headings land on a blank and get completely disoriented — they can't tell if they've moved to a new section.",
    howToFix: "Either add meaningful text to the heading, or remove the empty element entirely.",
  },

  "empty-table-header": {
    title: "Table header cell is empty",
    summary: "A <th> header cell in a data table has no text.",
    whoItAffects: "Screen reader users announcing table cells in context of their headers hear nothing — data becomes meaningless.",
    howToFix: "Add descriptive text to every <th> header cell. If a column has no logical header, restructure the table.",
  },

  // ── Landmarks & Page Structure ───────────────────────────────────────────

  "landmark-one-main": {
    title: "No 'main content' area is marked",
    summary: "The page doesn't have a designated <main> region telling assistive technologies where the core content is.",
    whoItAffects: "Screen reader users can't skip straight to the main content — on every page load they must listen through the entire navigation menu before reaching any content.",
    howToFix: "Wrap your primary page content in a <main> element. Every page should have exactly one <main> landmark.",
    stat: "57.8% of pages are missing a main landmark. This is the fastest win for keyboard and screen reader users.",
  },

  "landmark-no-duplicate-main": {
    title: "Multiple 'main' areas found",
    summary: "There is more than one <main> element on the page.",
    whoItAffects: "Screen readers announce 'main' landmarks — multiple instances confuse users about where the primary content starts.",
    howToFix: "Each page should have exactly one <main> element containing the primary content.",
  },

  "landmark-complementary-is-top-level": {
    title: "Sidebar isn't correctly placed",
    summary: "An <aside> (complementary) landmark is nested inside a <main> when it should be at the top level.",
    whoItAffects: "Screen reader users navigating by landmarks get a confusing structure.",
    howToFix: "Move <aside> elements to be siblings of <main>, not children of it.",
  },

  "region": {
    title: "Content has no structural organisation",
    summary: "Large blocks of content aren't organised inside any semantic landmark region.",
    whoItAffects: "Screen reader users can't orient themselves within the page or jump between sections efficiently.",
    howToFix: "Organise page content within semantic HTML: <header>, <nav>, <main>, <aside>, <footer>. For sections without a clear semantic element, use <section aria-label='...'> or <div role='region' aria-label='...'>.",
  },

  "bypass": {
    title: "No way to skip repetitive navigation",
    summary: "There's no 'Skip to main content' link at the top of the page.",
    whoItAffects: "Keyboard users must press Tab through every single navigation link on every single page load before reaching any content — sometimes 20–40 Tab presses.",
    howToFix: "Add a 'Skip to main content' anchor link as the very first focusable element on the page. It can be visually hidden until it receives focus.",
    stat: "Keyboard-only navigation is the primary access method for 7% of users with disabilities. Skip links are the most fundamental keyboard accessibility feature.",
    legalRisk: "Missing skip links have been cited in ADA complaints as a primary barrier to keyboard navigation — required by WCAG 2.4.1.",
  },

  // ── Document & Meta ──────────────────────────────────────────────────────

  "document-title": {
    title: "Browser tab has no title",
    summary: "The page's <title> tag (shown in the browser tab and bookmarks) is empty or missing.",
    whoItAffects: "Screen reader users hear the title announced when switching tabs. Blank titles are deeply disorienting. This also significantly hurts SEO.",
    howToFix: "Add a descriptive <title> inside the page's <head>: 'Contact Us — Acme Store'. Each page should have a unique, descriptive title.",
    stat: "Missing or generic page titles affect 56.3% of websites — they fail both accessibility and basic SEO standards simultaneously.",
  },

  "html-has-lang": {
    title: "Page language is not set",
    summary: "The HTML element doesn't declare what language the page is written in.",
    whoItAffects: "Screen readers detect the language setting to pronounce words with correct phonetics and accent. Without it, an English screen reader may mispronounce all French or Spanish text.",
    howToFix: "Add a lang attribute to your <html> tag: <html lang='en'>. Use the appropriate BCP 47 language code for your content.",
    stat: "The lang attribute is missing on 18.6% of the top 1 million web pages despite being one of the simplest fixes.",
  },

  "html-lang-valid": {
    title: "Language code is incorrect",
    summary: "The lang attribute exists but uses an invalid or unrecognised language code.",
    whoItAffects: "Screen readers may mispronounce content or fall back to the reader's default language — wrong for the content's actual language.",
    howToFix: "Use a valid BCP 47 code: 'en' for English, 'es' for Spanish, 'fr' for French, 'de' for German, 'zh' for Chinese, 'ar' for Arabic.",
  },

  "html-xml-lang-mismatch": {
    title: "HTML and XML language codes don't match",
    summary: "The lang and xml:lang attributes on the <html> element specify different languages.",
    whoItAffects: "Assistive technologies may be confused about which language declaration to trust.",
    howToFix: "Make both lang and xml:lang attributes identical: <html lang='en' xml:lang='en'>.",
  },

  "meta-viewport": {
    title: "Pinch-to-zoom is disabled",
    summary: "A meta tag is preventing users from zooming in on the page on mobile devices.",
    whoItAffects: "People with low vision who need to zoom to 200% or more to read are blocked. On mobile, this is their only way to make text larger.",
    howToFix: "Remove 'user-scalable=no' and 'maximum-scale=1' from your viewport meta tag. The tag should be: <meta name='viewport' content='width=device-width, initial-scale=1'>.",
    stat: "Disabling zoom is flagged in 23% of mobile accessibility audits — it's a WCAG 1.4.4 violation (Resize Text) that affects 246 million people with low vision globally.",
    legalRisk: "Blocking zoom on mobile is a direct violation of DOJ's 2024 web accessibility rule which specifically addresses mobile accessibility requirements.",
  },

  "meta-refresh": {
    title: "Page auto-refreshes without warning",
    summary: "The page uses a meta refresh tag to automatically redirect or reload.",
    whoItAffects: "Screen reader users lose their place when the page reloads mid-navigation. People with cognitive disabilities can lose data they were entering.",
    howToFix: "Avoid meta refresh redirects. Use server-side redirects (HTTP 301/302) instead. If a countdown is needed, provide a way for users to stop it.",
  },

  // ── Keyboard & Focus ─────────────────────────────────────────────────────

  "tabindex": {
    title: "Tab order is broken",
    summary: "Elements use positive tabindex values (tabindex='1', '2', etc.) which override the natural reading order of the page.",
    whoItAffects: "Keyboard users jump to unexpected places as they tab through the page — focus appears to teleport, making the site unusable with a keyboard alone.",
    howToFix: "Remove all positive tabindex values. Use tabindex='0' only to make non-interactive elements focusable in natural DOM order. The DOM order itself should define the reading order.",
    stat: "Incorrect tab order affects 23% of pages and makes keyboard navigation completely unpredictable for power users and assistive technology users alike.",
  },

  "scrollable-region-focusable": {
    title: "Scrollable areas can't be reached by keyboard",
    summary: "There are scrollable containers on the page that keyboard users cannot focus on or scroll.",
    whoItAffects: "Keyboard-only users — including people with motor disabilities and power users — cannot access content hidden in these scrollable regions.",
    howToFix: "Add tabindex='0' to scrollable div elements so keyboard users can focus them, then use arrow keys to scroll the content.",
  },

  "focus-trap": {
    title: "Keyboard focus gets permanently trapped",
    summary: "Once a user enters a component (like a modal or dropdown), they cannot tab out of it or press Escape to close it.",
    whoItAffects: "Keyboard users become stuck — the only way out is to refresh the entire page, losing all unsaved work.",
    howToFix: "Ensure all modal dialogs and overlay components properly manage focus: trap focus within the modal while open, restore focus to the trigger element when closed, and close on Escape key press.",
    legalRisk: "Focus traps are one of the most severe accessibility failures — they completely prevent task completion and appear frequently in ADA lawsuits against e-commerce sites.",
  },

  "focus-order-semantics": {
    title: "Visual layout and tab order don't match",
    summary: "When tabbing through the page, focus jumps in a confusing order that doesn't follow the visual layout top-to-bottom.",
    whoItAffects: "Keyboard users lose track of where they are. Sighted keyboard users see the visual layout but experience a different navigation order.",
    howToFix: "Ensure your HTML source order matches your visual layout. Use CSS for positioning instead of reordering elements with CSS grid or flexbox in ways that create mismatches.",
  },

  "focus-visible": {
    title: "No visible focus indicator",
    summary: "When navigating with a keyboard, there's no visible outline or indicator showing which element is currently focused.",
    whoItAffects: "Sighted keyboard users — including people who can't use a mouse due to motor disabilities — are completely lost without a visible focus indicator.",
    howToFix: "Never add 'outline: none' or 'outline: 0' to CSS without replacing it with a custom focus style. Use :focus-visible to show focus indicators for keyboard users.",
    stat: "Invisible focus states affect 25.1% of pages and are one of the most reported keyboard accessibility barriers.",
    legalRisk: "WCAG 2.1 SC 2.4.7 requires visible keyboard focus — WCAG 2.2 SC 2.4.11 now also requires a minimum focus appearance. Both are AA requirements.",
  },

  // ── ARIA ─────────────────────────────────────────────────────────────────

  "aria-allowed-attr": {
    title: "Accessibility code is misconfigured",
    summary: "An element has an ARIA attribute that doesn't belong on that type of element.",
    whoItAffects: "Screen readers may ignore or misinterpret these elements entirely — the ARIA annotation creates more confusion than no annotation at all.",
    howToFix: "Remove the invalid ARIA attribute. Check which attributes are valid for each ARIA role in the ARIA specification. 'First do no harm' — incorrect ARIA is worse than no ARIA.",
  },

  "aria-required-attr": {
    title: "Required accessibility attribute is missing",
    summary: "An element with an ARIA role is missing an attribute that the role requires to function correctly.",
    whoItAffects: "The assistive technology cannot interpret the component correctly and may describe it wrongly or skip it.",
    howToFix: "Add the required attribute(s) for this ARIA role. For example, a role='slider' requires aria-valuenow, aria-valuemin, and aria-valuemax.",
  },

  "aria-required-children": {
    title: "Interactive widget is missing required parts",
    summary: "An accessible component (like a menu, listbox, or grid) is missing the child elements that the ARIA specification requires.",
    whoItAffects: "Keyboard and screen reader users may be completely unable to interact with this component — it's structurally broken.",
    howToFix: "Add the required child elements as defined by the ARIA specification for this widget type. For example, a role='menu' must contain role='menuitem' children.",
  },

  "aria-required-parent": {
    title: "Component is in the wrong structural location",
    summary: "An ARIA element must be nested inside a specific parent element, but it isn't.",
    whoItAffects: "Assistive technologies won't recognise this element in context and may skip it or describe it incorrectly.",
    howToFix: "Move this element inside its required parent container. For example, role='option' elements must be inside a role='listbox' parent.",
  },

  "aria-roles": {
    title: "Accessibility role is not valid",
    summary: "An element has a role attribute set to a value that doesn't exist in the ARIA specification.",
    whoItAffects: "Screen readers won't know how to handle this element — they may announce it incorrectly or skip it.",
    howToFix: "Use only valid ARIA roles: 'button', 'dialog', 'navigation', 'list', 'listitem', 'menu', 'menuitem', 'tab', 'tabpanel', 'alert', 'status', etc.",
  },

  "aria-valid-attr": {
    title: "ARIA attribute doesn't exist",
    summary: "An element uses an aria-* attribute that isn't part of the ARIA specification.",
    whoItAffects: "Screen readers silently ignore unrecognised attributes — the intended meaning is lost.",
    howToFix: "Check the ARIA specification for valid attributes. Common valid ones: aria-label, aria-labelledby, aria-describedby, aria-hidden, aria-expanded, aria-live.",
  },

  "aria-valid-attr-value": {
    title: "ARIA attribute has an incorrect value",
    summary: "An ARIA attribute exists but its value doesn't match what the specification allows.",
    whoItAffects: "The assistive technology receives conflicting or meaningless information.",
    howToFix: "Check the allowed values for this attribute. For example, aria-hidden accepts only 'true' or 'false'; aria-expanded accepts only 'true', 'false', or 'undefined'.",
  },

  "aria-hidden-body": {
    title: "The entire page is hidden from assistive technologies",
    summary: "aria-hidden='true' has been applied to the <body> element, making the entire page invisible to screen readers.",
    whoItAffects: "100% of screen reader users — the entire site becomes completely inaccessible.",
    howToFix: "Remove aria-hidden from the <body> element. Use aria-hidden only on specific decorative or irrelevant elements, never on major content containers.",
    legalRisk: "This is one of the most severe possible accessibility failures — it renders the entire site unusable for screen reader users and would be immediately actionable in any ADA complaint.",
  },

  "aria-hidden-focus": {
    title: "Hidden content can still receive keyboard focus",
    summary: "Elements marked with aria-hidden='true' (hidden from screen readers) can still be reached and activated by keyboard users.",
    whoItAffects: "Keyboard users can tab into content that is supposed to be invisible, causing confusion. Screen reader users can't perceive it but keyboard users can interact with it.",
    howToFix: "Elements with aria-hidden='true' must also be removed from the tab order. Add tabindex='-1' to them, or use visibility: hidden or display: none in CSS.",
  },

  "aria-prohibited-attr": {
    title: "Prohibited accessibility attribute used",
    summary: "An element has an ARIA attribute that is explicitly prohibited on that element type.",
    whoItAffects: "Screen readers may produce incorrect announcements, confusing users about the element's purpose.",
    howToFix: "Remove the prohibited attribute. Some HTML elements have implicit ARIA semantics that conflict with explicit ARIA attributes.",
  },

  "aria-conditional-attr": {
    title: "ARIA attribute used in wrong context",
    summary: "An ARIA attribute is being used on an element where it only applies under specific conditions that aren't met.",
    whoItAffects: "Screen readers may produce unexpected or incorrect announcements.",
    howToFix: "Review when this ARIA attribute is valid and ensure those conditions are met before applying it.",
  },

  "aria-deprecated-role": {
    title: "Outdated accessibility role in use",
    summary: "This element uses an ARIA role that has been deprecated in newer versions of the ARIA specification.",
    whoItAffects: "Some screen readers may no longer support deprecated roles correctly.",
    howToFix: "Update to the current ARIA role. For example, 'directory' is deprecated — use 'list' instead.",
  },

  "aria-tooltip-name": {
    title: "Tooltip has no accessible name",
    summary: "An element with role='tooltip' has no accessible text for screen readers to announce.",
    whoItAffects: "Screen reader users won't receive the tooltip information that sighted users see on hover.",
    howToFix: "Ensure tooltip elements have visible text content or an aria-label.",
  },

  // ── Tables ───────────────────────────────────────────────────────────────

  "td-headers-attr": {
    title: "Table data cells aren't linked to headers",
    summary: "Data cells in this table don't reference the column or row headers that label them.",
    whoItAffects: "Screen reader users can't tell what column or category a data cell belongs to — the table data becomes meaningless without context.",
    howToFix: "Add a headers attribute to each <td> that references the ID(s) of the corresponding <th> header cells: <td headers='col-id row-id'>.",
  },

  "th-has-data-cells": {
    title: "Table headers have no corresponding data",
    summary: "Header cells in this table have no data cells associated with them.",
    whoItAffects: "The table structure is unclear — screen readers may describe it incorrectly.",
    howToFix: "Ensure every <th> has corresponding data cells in its row or column, or remove headers that refer to nothing.",
  },

  "table-duplicate-name": {
    title: "Table has confusing duplicate labels",
    summary: "The table's caption and its summary say the same thing.",
    whoItAffects: "Screen reader users hear the same description twice when entering the table.",
    howToFix: "Give the table a short caption and a more detailed summary, or use only one of them.",
  },

  "scope-attr-valid": {
    title: "Table scope attribute is invalid",
    summary: "A <th> header uses an invalid scope attribute value.",
    whoItAffects: "Screen readers use the scope attribute to determine whether a header applies to a row or column. Invalid values break table navigation.",
    howToFix: "Use only valid scope values: 'row', 'col', 'rowgroup', or 'colgroup'.",
  },

  // ── Lists ─────────────────────────────────────────────────────────────────

  "list": {
    title: "List items aren't inside a proper list container",
    summary: "The <li> list item tag is used outside of a <ul> or <ol> list container.",
    whoItAffects: "Screen readers announce list items in context of 'list, X items'. Without the container, items are announced as plain text with no list context.",
    howToFix: "Always wrap <li> elements inside a <ul> (for unordered/bulleted lists) or <ol> (for numbered lists).",
  },

  "listitem": {
    title: "List container contains non-list elements",
    summary: "A <ul> or <ol> list contains direct child elements that aren't <li> items.",
    whoItAffects: "Screen readers expect only <li> children inside list containers. Other elements disrupt the announced list structure.",
    howToFix: "Ensure <ul> and <ol> elements contain only <li> children. Other elements (like <div> or <p>) must be moved outside the list or placed inside <li> elements.",
  },

  "definition-list": {
    title: "Definition list is incorrectly structured",
    summary: "A <dl> definition list contains elements other than <dt> terms and <dd> definitions.",
    whoItAffects: "Screen readers announce definition list structure. Non-standard children break this announcement.",
    howToFix: "Ensure <dl> elements contain only <dt> and <dd> children. All terms and definitions must be direct children.",
  },

  // ── Language & Content ───────────────────────────────────────────────────

  "valid-lang": {
    title: "Content language override is invalid",
    summary: "A lang attribute on an element (not the <html> tag) uses an invalid language code.",
    whoItAffects: "Screen readers switch pronunciation engines when they encounter different language codes. An invalid code may cause mispronunciation.",
    howToFix: "Use valid BCP 47 language codes on any element with a lang attribute: 'en', 'fr', 'de', 'ja', 'ar', 'zh', etc.",
  },

  // ── WCAG 2.2 Specific ────────────────────────────────────────────────────

  "target-size": {
    title: "Clickable targets are too small",
    summary: "Interactive elements (buttons, links, checkboxes) are smaller than 24×24 CSS pixels — too small to tap accurately on a touchscreen.",
    whoItAffects: "People with tremors, motor disabilities, or arthritis struggle to precisely tap small targets. Also affects anyone on a touchscreen.",
    howToFix: "Ensure all interactive targets are at least 24×24 CSS pixels. Ideally aim for 44×44 pixels — Apple's and Google's minimum recommended touch target size.",
    stat: "Small touch targets are one of the most common barriers for users with motor disabilities — Apple's iOS HIG and Google Material Design both recommend 44×44px minimum.",
    legalRisk: "WCAG 2.2 Success Criterion 2.5.8 (Target Size Minimum) was added in 2023. It is now part of the published standard and will increasingly appear in compliance requirements.",
  },

  "focus-not-obscured-minimum": {
    title: "Focused element is hidden behind sticky content",
    summary: "When an element receives keyboard focus, it is partially covered by a sticky header, footer, or other fixed-position element.",
    whoItAffects: "Sighted keyboard users can't see the focused element — they lose track of where they are on the page.",
    howToFix: "Ensure sticky headers/footers account for the focused element's position. Use scroll-padding-top to push content below sticky headers when focused.",
    stat: "Sticky navigation bars covering focused elements are a new WCAG 2.2 (SC 2.4.11) issue that now affects countless modern websites with sticky headers.",
  },

  "dragging-movements": {
    title: "Drag-and-drop has no keyboard alternative",
    summary: "Functionality that requires dragging (drag-and-drop interfaces, sliders with drag) has no single-pointer or keyboard-based alternative.",
    whoItAffects: "People with motor disabilities who can't perform precise dragging movements. Also affects mobile users who may struggle with drag gestures.",
    howToFix: "Provide an alternative method for all drag operations — for example, a button-click interface, a keyboard shortcut, or an input field where users can type a value.",
    stat: "WCAG 2.2 SC 2.5.7 (Dragging Movements) — added in 2023. Drag-only interfaces were previously unaddressed by WCAG but are now an explicit AA requirement.",
  },

  // ── Iframes ───────────────────────────────────────────────────────────────

  "frame-title": {
    title: "Embedded frames have no title",
    summary: "iframes on this page don't have a title attribute describing what they contain.",
    whoItAffects: "Screen reader users can't tell if an iframe contains a map, a form, a video player, or something else before entering it.",
    howToFix: "Add a descriptive title attribute to every iframe: <iframe title='Embedded Google Maps showing office location'>.",
  },

  "frame-focusable-content": {
    title: "Hidden iframe can receive keyboard focus",
    summary: "An iframe that is visually hidden still has content that keyboard users can tab into.",
    whoItAffects: "Keyboard users tab into invisible content and become confused — there's no visual indication of where focus has gone.",
    howToFix: "Add tabindex='-1' to hidden iframes and their focusable content to remove them from the tab order.",
  },

  // ── Page Layout ───────────────────────────────────────────────────────────

  "avoid-inline-spacing": {
    title: "Text spacing can't be overridden by users",
    summary: "Inline CSS styles are setting letter-spacing, word-spacing, line-height, or spacing after paragraphs in a way that can't be overridden by user stylesheets.",
    whoItAffects: "People with dyslexia and reading disabilities who apply custom stylesheets to increase text spacing for readability. Forced spacing prevents their adjustments from working.",
    howToFix: "Use CSS classes rather than inline styles for all text spacing. This allows user stylesheets to override your spacing with values that work for them.",
  },

  "reflow": {
    title: "Page doesn't work at 400% zoom",
    summary: "When zoomed to 400% (the WCAG standard test), content requires horizontal scrolling to read — text wraps incorrectly or overflows.",
    whoItAffects: "People with low vision who need to zoom in significantly to read text. Horizontal scrolling is exhausting and makes reading nearly impossible.",
    howToFix: "Use responsive CSS (flexbox, grid, relative units) so content reflows into a single column at any zoom level without horizontal scrolling.",
  },

  // ── Misc / Best Practice ──────────────────────────────────────────────────

  "duplicate-id-active": {
    title: "Multiple interactive elements share the same ID",
    summary: "Two or more focusable elements (buttons, inputs, links) have the same id attribute.",
    whoItAffects: "Screen readers and browser accessibility APIs use IDs to identify elements. Duplicate IDs on interactive elements cause unpredictable behaviour — ARIA relationships may point to the wrong element.",
    howToFix: "Every element's id must be unique across the entire page. Audit your HTML for duplicate IDs and rename them.",
    legalRisk: "Duplicate IDs on form elements and buttons are a common cause of broken ARIA labelledby and describedby relationships, which appear in accessibility lawsuits.",
  },

  "duplicate-id-aria": {
    title: "Elements referenced by ARIA share duplicate IDs",
    summary: "An aria-labelledby or aria-describedby attribute references an ID that belongs to more than one element.",
    whoItAffects: "Screen readers will arbitrarily pick one of the duplicate elements — the label read aloud may be completely wrong.",
    howToFix: "Make all IDs unique. ARIA ID references must point to exactly one element.",
  },

  "p-as-heading": {
    title: "Visual headings aren't marked as headings",
    summary: "Paragraph text styled to look like a heading (large, bold) is used instead of actual heading tags.",
    whoItAffects: "Screen reader users navigating by headings will miss this 'heading' entirely — they can't jump to this section.",
    howToFix: "Use real heading tags (<h1>–<h6>) for section titles. Use CSS to control their visual appearance without sacrificing semantic meaning.",
  },

  "presentational-role-conflict": {
    title: "Accessibility role conflicts with interactive content",
    summary: "An element has role='presentation' or role='none' but contains interactive children that screen readers still need to announce.",
    whoItAffects: "Screen readers may skip the interactive content inside, making buttons, links, or inputs invisible to assistive technology.",
    howToFix: "Don't apply role='none' or role='presentation' to elements that contain interactive children. These roles remove semantic meaning, which breaks child element announcements.",
  },

  "server-side-image-map": {
    title: "Server-side image map used",
    summary: "An image map that sends clicks to the server is used instead of a client-side map.",
    whoItAffects: "Screen reader users and keyboard users can't access individual map areas — they can only activate the entire image.",
    howToFix: "Replace server-side image maps with client-side image maps using the <map> and <area> elements, or replace with individual CSS-positioned links.",
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns the plain-language entry for a rule ID, or a sensible fallback.
 */
export function getPlainLanguage(
  ruleId: string,
  fallbackTitle: string,
  fallbackSummary: string
): RulePlainLanguage {
  return (
    RULE_PLAIN_LANGUAGE[ruleId] ?? {
      title: fallbackTitle.replace(/-/g, " "),
      summary: fallbackSummary,
      whoItAffects:
        "Users who rely on assistive technologies such as screen readers, keyboard navigation, or voice control software.",
      howToFix:
        "Follow the guidance in the 'Docs' link above for the specific WCAG success criterion this rule maps to.",
    }
  );
}
