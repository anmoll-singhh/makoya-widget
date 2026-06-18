/**
 * effects.ts
 *
 * The widget UI lives in a Shadow DOM (isolated). But the *effects*
 * (bigger text, contrast, spacing) must change the REAL page. We do that
 * the safe way: we inject ONE stylesheet whose rules only activate when we
 * set data-attributes on <html>. Nothing is touched until the user opts in,
 * and turning a toggle off cleanly removes the attribute. No DOM rewriting,
 * no ARIA injection, no fighting the user's assistive tech.
 */

const STYLE_ID = "makoya-effects";

/** The single stylesheet we add to the host <head>, scoped by html[data-mky-*]. */
const EFFECT_CSS = `
html[data-mky-text="1"] body { font-size: 112% !important; }
html[data-mky-text="2"] body { font-size: 125% !important; }
html[data-mky-text="3"] body { font-size: 140% !important; }

html[data-mky-spacing="on"] body,
html[data-mky-spacing="on"] body * {
  line-height: 1.8 !important;
  letter-spacing: 0.04em !important;
  word-spacing: 0.1em !important;
}

html[data-mky-contrast="on"] {
  filter: contrast(1.15);
}
html[data-mky-contrast="dark"] {
  filter: invert(1) hue-rotate(180deg);
}
html[data-mky-contrast="dark"] img,
html[data-mky-contrast="dark"] video,
html[data-mky-contrast="dark"] picture,
html[data-mky-contrast="dark"] [style*="background-image"] {
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
