/**
 * effects.ts
 *
 * The widget UI lives in a Shadow DOM (isolated). But the *effects*
 * (bigger text, contrast, spacing, saturation, cursor color, highlight titles,
 * left-align) must change the REAL page. We do that the safe way: we inject
 * ONE stylesheet whose rules only activate when we set data-attributes on
 * <html>. Nothing is touched until the user opts in, and turning a toggle off
 * cleanly removes the attribute. No DOM rewriting.
 *
 * KEY SAFETY INVARIANT — filters stay on <body>, never <html>:
 *   A CSS `filter` on an ancestor breaks `position:fixed` stacking for all
 *   descendants. The widget host is mounted on `<html>` (outside body), so any
 *   filter on `<html>` would create a new stacking/containing block and hide or
 *   re-anchor the fixed widget panel. All colour filters (contrast, saturation)
 *   are therefore applied to `<body>` via CSS custom properties:
 *
 *     body { filter: var(--mky-f-contrast,) var(--mky-f-sat,); }
 *
 *   When neither variable is set the value resolves to whitespace, which is an
 *   invalid filter → the browser ignores the declaration → body is unfiltered.
 *   The two variables are set by rules on `html[data-mky-contrast/sat=...]` so
 *   they compose automatically when both are active simultaneously.
 */

const STYLE_ID = "makoya-effects";

/** The single stylesheet we add to the host <head>, scoped by html[data-mky-*]. */
const EFFECT_CSS = `
/* ── Continuous typography — per-property gated CSS custom properties.
   Each rule is keyed off its OWN attribute (set by state.ts ONLY when the value
   deviates from default), so an untouched site — including html{font-size:62.5%}
   rem-reset sites — is never affected. The inline --mky-* var carries the value.
   We deliberately do NOT route these through one shared gate (that would force
   font-size:100% / line-height:1 / letter-spacing:0 onto every site the moment
   the visitor nudges any single control). */

/* Font size — scale the ROOT font-size so rem/em/%-based text all grow. */
html[data-mky-fontscale] { font-size: calc(100% * var(--mky-font-scale, 1)) !important; }

/* Line height */
html[data-mky-lh] body,
html[data-mky-lh] body * { line-height: var(--mky-line-height, 1.5) !important; }

/* Letter spacing — also widens word-spacing proportionally (~3×) so this control
   covers both inter-character and inter-word spacing, preserving the bundled
   behaviour of the old spacing toggle (which set letter + word spacing together). */
html[data-mky-ls] body,
html[data-mky-ls] body * {
  letter-spacing: var(--mky-letter-spacing, 0) !important;
  word-spacing: calc(var(--mky-letter-spacing, 0) * 3) !important;
}

/* Content scaling — whole-page zoom on BODY (keeps the html-mounted widget safe).
   zoom:1 is a no-op; gated so it only engages when the visitor changes it. */
html[data-mky-zoom] body { zoom: var(--mky-zoom, 1) !important; }

/* Readable / dyslexia font (segmented; old boolean "on" removed). */
html[data-mky-font="readable"] body,
html[data-mky-font="readable"] body * {
  font-family: Verdana, "Segoe UI", Tahoma, Arial, sans-serif !important;
}
html[data-mky-font="dyslexic"] body,
html[data-mky-font="dyslexic"] body * {
  /* OpenDyslexic when the embed (feat/a11y-font-embed) lands; safe stack until. */
  font-family: "OpenDyslexic", "Comic Sans MS", "Segoe Print", Verdana, sans-serif !important;
}

/* Color overrides — curated swatches set inline vars; gated per property. The
   widget host (mounted on <html>, Shadow DOM) is excluded belt-and-braces. */
html[data-mky-textcolor] body *:not(#makoya-widget-root) { color: var(--mky-text-color) !important; }
html[data-mky-titlecolor] body h1, html[data-mky-titlecolor] body h2,
html[data-mky-titlecolor] body h3, html[data-mky-titlecolor] body h4,
html[data-mky-titlecolor] body h5, html[data-mky-titlecolor] body h6 {
  color: var(--mky-title-color) !important;
}
html[data-mky-bgcolor] body { background-color: var(--mky-bg-color) !important; }

html[data-mky-images="off"] img,
html[data-mky-images="off"] picture,
html[data-mky-images="off"] video {
  opacity: 0 !important;
}

/* Composed page filter on BODY (keeps widget on <html> safe). Empty vars →
   invalid filter → ignored → body unfiltered → fixed widget unaffected.
   Saturation and contrast are set via CSS custom properties so both can
   coexist on the single "filter" property — a property can only be set once. */
body { filter: var(--mky-f-contrast,) var(--mky-f-sat,); }
html[data-mky-contrast="on"]   { --mky-f-contrast: contrast(1.18); }
/* High contrast — stronger boost, composes through the same body-filter var. */
html[data-mky-contrast="high"] { --mky-f-contrast: contrast(1.5); }
/* Light contrast — NOT a filter: force a light surface with dark text. */
html[data-mky-contrast="light"] body { background: #ffffff !important; color: #1a1a1a !important; }
html[data-mky-contrast="dark"] { --mky-f-contrast: invert(1) hue-rotate(180deg); }
html[data-mky-contrast="dark"] { background: #000; }
html[data-mky-contrast="dark"] body { background: #fff; }
html[data-mky-contrast="dark"] body img,
html[data-mky-contrast="dark"] body video,
html[data-mky-contrast="dark"] body picture,
html[data-mky-contrast="dark"] body [style*="background-image"] { filter: invert(1) hue-rotate(180deg); }
html[data-mky-sat="grayscale"] { --mky-f-sat: grayscale(1); }
html[data-mky-sat="low"]       { --mky-f-sat: saturate(.5); }
html[data-mky-sat="high"]      { --mky-f-sat: saturate(1.6); }

html[data-mky-motion="off"] *,
html[data-mky-motion="off"] *::before,
html[data-mky-motion="off"] *::after {
  animation-duration: 0.001ms !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0.001ms !important;
  scroll-behavior: auto !important;
}

html[data-mky-links="on"] a {
  text-decoration: underline !important;
  outline: 2px solid currentColor !important;
  outline-offset: 2px;
}

/* Big cursor — black and white variants (data-driven; old boolean "on" removed). */
html[data-mky-cursor="black"] * { cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'%3E%3Cpath d='M6 2 L6 38 L16 28 L22 42 L28 39 L22 26 L36 26 Z' fill='black' stroke='white' stroke-width='2'/%3E%3C/svg%3E") 4 2, auto !important; }
html[data-mky-cursor="white"] * { cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'%3E%3Cpath d='M6 2 L6 38 L16 28 L22 42 L28 39 L22 26 L36 26 Z' fill='white' stroke='black' stroke-width='2'/%3E%3C/svg%3E") 4 2, auto !important; }

/* Highlight headings — yellow chip so users can quickly scan page structure. */
html[data-mky-titles="on"] h1, html[data-mky-titles="on"] h2,
html[data-mky-titles="on"] h3, html[data-mky-titles="on"] h4,
html[data-mky-titles="on"] h5, html[data-mky-titles="on"] h6 {
  background: #fff8c5 !important; color: #1a1a1a !important;
  outline: 2px solid #facc15 !important; outline-offset: 2px;
}

/* Text alignment — segmented (left/center/right/justify). Normalises a site's
   layout to the visitor's preferred reading alignment. */
html[data-mky-align="left"] body, html[data-mky-align="left"] body * { text-align: left !important; }
html[data-mky-align="center"] body, html[data-mky-align="center"] body * { text-align: center !important; }
html[data-mky-align="right"] body, html[data-mky-align="right"] body * { text-align: right !important; }
html[data-mky-align="justify"] body, html[data-mky-align="justify"] body * { text-align: justify !important; }

/* Bigger targets — increase minimum tap/click area on interactive elements.
   Adds symmetric padding so links/buttons are ≥44px tall and easier to hit
   for users with motor impairment or tremor. !important overrides site resets. */
html[data-mky-targets="on"] a,
html[data-mky-targets="on"] button,
html[data-mky-targets="on"] [role="button"],
html[data-mky-targets="on"] input[type="submit"],
html[data-mky-targets="on"] input[type="button"],
html[data-mky-targets="on"] input[type="reset"],
html[data-mky-targets="on"] select,
html[data-mky-targets="on"] label {
  min-height: 44px !important;
  min-width: 44px !important;
  padding-top: max(0.35em, 8px) !important;
  padding-bottom: max(0.35em, 8px) !important;
  padding-left: max(0.6em, 8px) !important;
  padding-right: max(0.6em, 8px) !important;
  display: inline-flex !important;
  align-items: center !important;
}

/* Focus indicator — enhanced visible focus ring for keyboard navigation.
   A bold amber outline with a white halo so it shows on any background.
   Only fires on :focus-visible so mouse-clicks never show the ring. */
html[data-mky-focus="on"] *:focus-visible {
  outline: 3px solid #f59e0b !important;
  outline-offset: 3px !important;
  box-shadow: 0 0 0 6px rgba(245,158,11,.25) !important;
  border-radius: 2px;
}
`;

/** Inject the effect stylesheet once. Safe to call repeatedly. */
export function ensureEffectStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = EFFECT_CSS;
  document.head.appendChild(style);
}

/** Apply a single attribute on <html>, or remove it when value is null. */
export function setHtmlAttr(name: string, value: string | null): void {
  const html = document.documentElement;
  if (value === null) html.removeAttribute(name);
  else html.setAttribute(name, value);
}

/**
 * Set (or clear) an inline CSS custom property on <html>. Used for the
 * continuous typography/zoom/color effects, whose values can't be enumerated as
 * attributes. Passing null removes the property so the gated rule falls back to
 * its `var(..., default)` and the page returns to its untouched state.
 */
export function setHtmlVar(name: string, value: string | null): void {
  const html = document.documentElement;
  if (value === null) html.style.removeProperty(name);
  else html.style.setProperty(name, value);
}
