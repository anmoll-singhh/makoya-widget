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
 *
 *   The same composite carries a THIRD slot, `--mky-f-cf`, for the colour-blind
 *   assist filter (see ensureColorFilterSvg below). It references an SVG
 *   <filter> by url(#…); the SVG itself is injected once into the host page.
 */

const STYLE_ID = "makoya-effects";
const SVG_ID = "makoya-colorfilters";

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

/* Readable / dyslexia-friendly font.
   The stack leads with genuinely dyslexia-recommended faces and degrades to
   widely-installed safe fallbacks:
     - "OpenDyslexic"        — the purpose-built open-source dyslexia face. Only
                               renders if the visitor already has it installed OR
                               the lazy @font-face below succeeds (see TODO(font)).
     - "Atkinson Hyperlegible" — Braille Institute's legibility-tuned face.
     - "Comic Sans MS"/"Comic Sans" — frequently recommended by dyslexia
                               organisations and installed on the vast majority of
                               Windows/macOS systems, so it is a real, honest
                               improvement even with NO webfont download.
     - Verdana/Tahoma        — humanist sans fallbacks with open letterforms.
   TODO(font): a self-hosted OpenDyslexic woff2 (Regular+Bold) can be embedded as
   a data: URI @font-face and injected lazily on first activation to guarantee the
   face is present; shipped as the system stack for now to keep core.js lean and
   never block render. */
html[data-mky-font="on"] body,
html[data-mky-font="on"] body * {
  font-family: "OpenDyslexic", "Atkinson Hyperlegible", "Comic Sans MS", "Comic Sans", Verdana, Tahoma, sans-serif !important;
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
body { filter: var(--mky-f-contrast,) var(--mky-f-sat,) var(--mky-f-cf,); }
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

/* Colour-blind assist (daltonization). Each value references an injected SVG
   <filter> (see ensureColorFilterSvg). Applied via the SAME body composite as
   contrast/saturation so the filter lives on <body>, never <html> (keeps the
   fixed widget unaffected). Real daltonization CORRECTION matrices, not mere
   saturation — they redistribute the colour information a given dichromat
   cannot perceive into channels they can. */
html[data-mky-cf="protanopia"]   { --mky-f-cf: url(#mky-cf-protanopia); }
html[data-mky-cf="deuteranopia"] { --mky-f-cf: url(#mky-cf-deuteranopia); }
html[data-mky-cf="tritanopia"]   { --mky-f-cf: url(#mky-cf-tritanopia); }

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

/* Global focus mode — every focusable element, when focused, gets a thick
   high-contrast ring that stays visible on ANY background (blue ring + white +
   blue halo). Distinct from the links option, which only restyles anchors.
   Pure CSS; toggled by applyPrefs via data-mky-focus. */
html[data-mky-focus="on"] *:focus,
html[data-mky-focus="on"] *:focus-visible {
  outline: 3px solid #1e63ff !important;
  outline-offset: 2px !important;
  box-shadow: 0 0 0 3px #fff, 0 0 0 6px #1e63ff !important;
  border-radius: 2px;
}
`;

/**
 * Daltonization SVG markup — three <filter> elements (protanopia, deuteranopia,
 * tritanopia) using feColorMatrix. Each matrix is a CORRECTION (daltonization)
 * matrix, derived as  M = I + C·(I − S)  where:
 *   S = the standard published dichromacy SIMULATION matrix for the type,
 *   C = the classic error-redistribution matrix that pushes the un-seen colour
 *       error into channels the viewer CAN distinguish.
 * Because both steps are linear they compose into ONE 4×5 feColorMatrix, so a
 * single SVG filter per type does genuine correction (not just a saturation
 * tweak, which does nothing for colour blindness). Values are pre-computed:
 *
 *   Protanopia   S=[.567 .433 0 / .558 .442 0 / 0 .242 .758], C→G,B
 *   Deuteranopia S=[.625 .375 0 / .70 .30 0 / 0 .30 .70],     C→G,B
 *   Tritanopia   S=[.95 .05 0 / 0 .433 .567 / 0 .475 .525],   C→R,G
 */
const COLOR_FILTER_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" id="${SVG_ID}" aria-hidden="true" focusable="false" style="position:absolute;width:0;height:0;overflow:hidden;pointer-events:none">
  <defs>
    <filter id="mky-cf-protanopia" color-interpolation-filters="sRGB">
      <feColorMatrix type="matrix" values="1 0 0 0 0  -0.2549 1.2549 0 0 0  0.3031 -0.5451 1.242 0 0  0 0 0 1 0"/>
    </filter>
    <filter id="mky-cf-deuteranopia" color-interpolation-filters="sRGB">
      <feColorMatrix type="matrix" values="1 0 0 0 0  -0.4375 1.4375 0 0 0  0.2625 -0.5625 1.30 0 0  0 0 0 1 0"/>
    </filter>
    <filter id="mky-cf-tritanopia" color-interpolation-filters="sRGB">
      <feColorMatrix type="matrix" values="1.05 -0.3825 0.3325 0 0  0 1.2345 -0.2345 0 0  0 0 1 0 0  0 0 0 1 0"/>
    </filter>
  </defs>
</svg>`;

/**
 * Inject the colour-blind daltonization SVG filters into the host page exactly
 * once. The SVG is aria-hidden, 0×0, absolutely positioned and pointer-events
 * disabled, so it is invisible and inert. Idempotent and never throws — a
 * failure here must never block the rest of applyPrefs.
 */
export function ensureColorFilterSvg(): void {
  try {
    if (document.getElementById(SVG_ID)) return;
    const wrap = document.createElement("div");
    wrap.setAttribute("aria-hidden", "true");
    wrap.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";
    wrap.innerHTML = COLOR_FILTER_SVG;
    // Append to <html> (not <body>): the SVG defs are referenced by a filter on
    // <body>, but the defs element itself can live anywhere in the document.
    document.documentElement.appendChild(wrap);
  } catch {
    /* never throw — colour filter is a progressive enhancement */
  }
}

/** Inject the effect stylesheet (and colour-filter SVG) once. Safe to call
 *  repeatedly. */
export function ensureEffectStyles(): void {
  // Colour-filter SVG is injected alongside the stylesheet so the url(#…)
  // references in EFFECT_CSS always resolve. Guarded + idempotent internally.
  ensureColorFilterSvg();
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
