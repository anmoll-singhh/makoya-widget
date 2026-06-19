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
/* Text size — scale the ROOT font-size so rem/em/%-based text all grow.
   (Scaling body alone misses rem-based text, which is most modern sites.) */
html[data-mky-text="1"] { font-size: 112.5% !important; }
html[data-mky-text="2"] { font-size: 125% !important; }
html[data-mky-text="3"] { font-size: 140% !important; }

html[data-mky-spacing="on"] body,
html[data-mky-spacing="on"] body * {
  line-height: 1.8 !important;
  letter-spacing: 0.04em !important;
  word-spacing: 0.12em !important;
}

html[data-mky-font="on"] body,
html[data-mky-font="on"] body * {
  font-family: Verdana, "Segoe UI", Tahoma, Arial, sans-serif !important;
}

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

/* Left-align — normalises centred/justified layouts for readability. */
html[data-mky-align="on"] body, html[data-mky-align="on"] body * { text-align: left !important; }
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
