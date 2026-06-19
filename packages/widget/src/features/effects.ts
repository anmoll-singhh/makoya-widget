/**
 * effects.ts
 *
 * The widget UI lives in a Shadow DOM (isolated). But the *effects*
 * (bigger text, contrast, spacing) must change the REAL page. We do that
 * the safe way: we inject ONE stylesheet whose rules only activate when we
 * set data-attributes on <html>. Nothing is touched until the user opts in,
 * and turning a toggle off cleanly removes the attribute. No DOM rewriting.
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

/* Contrast filters are applied to BODY (not html). A filter on an ancestor
   breaks position:fixed for its descendants — the widget is mounted on <html>
   (outside body), so the page's filter never re-anchors or hides it. */
html[data-mky-contrast="on"] body { filter: contrast(1.18); }
html[data-mky-contrast="dark"] { background: #000; }
html[data-mky-contrast="dark"] body { filter: invert(1) hue-rotate(180deg); background: #fff; }
html[data-mky-contrast="dark"] body img,
html[data-mky-contrast="dark"] body video,
html[data-mky-contrast="dark"] body picture,
html[data-mky-contrast="dark"] body [style*="background-image"] {
  filter: invert(1) hue-rotate(180deg);
}

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

html[data-mky-cursor="on"] * {
  cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'%3E%3Cpath d='M6 2 L6 38 L16 28 L22 42 L28 39 L22 26 L36 26 Z' fill='black' stroke='white' stroke-width='2'/%3E%3C/svg%3E") 4 2, auto !important;
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
