var MakoyaCore=function(D){"use strict";const W={accessibility:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="4" r="2"/><path d="M21 9c0 .55-.45 1-1 1h-4v11a1 1 0 0 1-2 0v-5h-4v5a1 1 0 0 1-2 0V10H4a1 1 0 0 1 0-2h16c.55 0 1 .45 1 1z"/></svg>',person:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="7" r="4"/><path d="M4 21a8 8 0 0 1 16 0 1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/></svg>',eye:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 5c-5 0-9 4.5-10 7 1 2.5 5 7 10 7s9-4.5 10-7c-1-2.5-5-7-10-7zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8z"/><circle cx="12" cy="12" r="2"/></svg>',adjust:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 7h11a3 3 0 0 1 6 0h1a1 1 0 0 1 0 2h-1a3 3 0 0 1-6 0H3a1 1 0 0 1 0-2zm6 8a3 3 0 0 1 6 0h6a1 1 0 0 1 0 2h-6a3 3 0 0 1-6 0H3a1 1 0 0 1 0-2h6z"/></svg>'},de={siteId:"unknown",primaryColor:"#2563eb",position:"bottom-right",launcherIcon:"accessibility",featuresEnabled:["textSize","lineSpacing","contrast","stopMotion","readingRuler","highlightLinks","bigCursor","readableFont","hideImages","saturation","readingMask","highlightTitles","textAlign","muteSounds","readAloud"],hideBranding:!1,brandingUrl:"https://makoya.example/scan",launcherSize:"md",defaultProfile:"none",accessibilityStatementUrl:"",defaultLanguage:"en",panelTitle:""};function ue(e,t){return{...de,...t!=null?t:{},siteId:e}}const Z="makoya-effects",pe=`
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
`;function he(){if(document.getElementById(Z))return;const e=document.createElement("style");e.id=Z,e.textContent=pe,document.head.appendChild(e)}function k(e,t){const o=document.documentElement;t===null?o.removeAttribute(e):o.setAttribute(e,t)}const P="makoya_prefs",T={text:0,spacing:!1,contrast:"off",stopMotion:!1,ruler:!1,links:!1,cursor:"off",font:!1,images:!1,saturation:"off",mask:"off",titles:!1,align:!1,mute:!1,readAloud:!1};function X(){try{const e=localStorage.getItem(P);return e?{...T,...JSON.parse(e)}:{...T}}catch{return{...T}}}function me(e){try{localStorage.setItem(P,JSON.stringify(e))}catch{}}function J(e){he(),k("data-mky-text",e.text===0?null:String(e.text)),k("data-mky-spacing",e.spacing?"on":null),k("data-mky-contrast",e.contrast==="off"?null:e.contrast),k("data-mky-motion",e.stopMotion?"off":null),k("data-mky-links",e.links?"on":null),k("data-mky-cursor",e.cursor==="off"?null:e.cursor),k("data-mky-font",e.font?"on":null),k("data-mky-images",e.images?"off":null),k("data-mky-sat",e.saturation==="off"?null:e.saturation),k("data-mky-titles",e.titles?"on":null),k("data-mky-align",e.align?"on":null)}const fe={sm:48,md:56,lg:64};function ge(e,t){const o=fe[t],i=Math.round(o*.5/2)*2;return`
/* ─────────────────────────────────────────────────────────────────────────
   RESET + HOST
   ───────────────────────────────────────────────────────────────────────── */
:host {
  all: initial;
  /* Re-establish display so shadow children participate in layout */
  display: contents;
}
*, *::before, *::after {
  box-sizing: border-box;
}

/* ─────────────────────────────────────────────────────────────────────────
   LAUNCHER BUTTON
   ───────────────────────────────────────────────────────────────────────── */
.mky-btn {
  position: fixed;
  z-index: 2147483647;
  width: ${o}px;
  height: ${o}px;
  border-radius: 50%;
  background: ${e};
  color: #fff;
  border: none;
  cursor: pointer;
  display: grid;
  place-items: center;
  /* Layered soft shadow for depth — adapts to any background */
  box-shadow:
    0 10px 26px -8px rgba(0,0,0,.45),
    0 2px 6px rgba(0,0,0,.18),
    0 0 0 1px rgba(255,255,255,.08) inset;
  transition:
    transform .18s cubic-bezier(.2,.8,.2,1),
    box-shadow .18s ease;
  -webkit-tap-highlight-color: transparent;
  /* Prevent text-size scaling from distorting the button */
  font-size: 0;
}
.mky-btn:hover {
  transform: scale(1.06);
  box-shadow:
    0 14px 32px -8px rgba(0,0,0,.5),
    0 4px 10px rgba(0,0,0,.22),
    0 0 0 1px rgba(255,255,255,.12) inset;
}
.mky-btn:active {
  transform: scale(.95);
}
.mky-btn:focus-visible {
  outline: 3px solid #fff;
  outline-offset: 3px;
  box-shadow:
    0 10px 26px -8px rgba(0,0,0,.45),
    0 2px 6px rgba(0,0,0,.18),
    0 0 0 4px ${e};
}
.mky-btn svg {
  width: ${i}px;
  height: ${i}px;
  /* Prevent icon from absorbing pointer events */
  pointer-events: none;
}

/* ─────────────────────────────────────────────────────────────────────────
   PANEL — GLASS (desktop ≥481px)
   ───────────────────────────────────────────────────────────────────────── */
.mky-panel {
  position: fixed;
  z-index: 2147483647;
  width: 360px;
  max-width: calc(100vw - 24px);
  max-height: calc(100vh - 108px);
  overflow-y: auto;
  /* Scrollbar styling (Webkit) */
  scrollbar-width: thin;
  scrollbar-color: rgba(15,23,42,.12) transparent;

  border-radius: 22px;
  /* Hairline border over the glass */
  border: 1px solid rgba(255,255,255,.55);
  /* Outer glow / shadow stack for premium depth */
  box-shadow:
    0 28px 64px -16px rgba(0,0,0,.28),
    0 8px 24px -10px rgba(0,0,0,.18),
    0 2px 6px rgba(0,0,0,.08),
    0 0 0 1px rgba(15,23,42,.06);

  /* Glass shell — semi-transparent so backdrop shows through */
  background: rgba(255,255,255,.72);
  backdrop-filter: blur(20px) saturate(1.4);
  -webkit-backdrop-filter: blur(20px) saturate(1.4);

  /* Typography base */
  font: 14px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, system-ui, sans-serif;
  color: #0f172a;

  /* Hidden state */
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transform: translateY(10px) scale(.985);
  transition:
    opacity .22s ease,
    transform .22s cubic-bezier(.2,.8,.2,1),
    visibility .22s;
}
.mky-panel.open {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transform: none;
}

/* Solid fallback for browsers without backdrop-filter support */
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .mky-panel {
    background: #fff;
  }
}

/* Webkit scrollbar cosmetics (inside shadow DOM, so safe to style) */
.mky-panel::-webkit-scrollbar { width: 5px; }
.mky-panel::-webkit-scrollbar-track { background: transparent; }
.mky-panel::-webkit-scrollbar-thumb {
  background: rgba(15,23,42,.14);
  border-radius: 99px;
}

/* ─────────────────────────────────────────────────────────────────────────
   AA LEGIBILITY INNER LAYERS
   The body gets a near-opaque tint so text stays WCAG AA over the glass
   blur. Head and foot are handled separately below because they are sticky
   and need their OWN opaque surface to prevent scrolled body content from
   showing through them.
   ───────────────────────────────────────────────────────────────────────── */
.mky-body {
  background: rgba(255,255,255,.9);
}

/* ─────────────────────────────────────────────────────────────────────────
   HEADER
   ───────────────────────────────────────────────────────────────────────── */
.mky-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 16px 18px 14px;
  border-bottom: 1px solid rgba(15,23,42,.07);
  /* Stick header at the top when body scrolls */
  position: sticky;
  top: 0;
  /* Must be above .mky-body so scrolled rows don't bleed through */
  z-index: 2;
  /* Round top corners to match panel */
  border-radius: 22px 22px 0 0;
  /*
   * Opaque-enough surface so body content scrolling underneath is invisible.
   * Own backdrop-filter creates a frosted layer matching the panel glass look.
   * rgba(.92) base means even at low GPU quality there is <8% bleed-through.
   */
  background: rgba(255,255,255,.92);
  -webkit-backdrop-filter: blur(20px) saturate(1.4);
  backdrop-filter: blur(20px) saturate(1.4);
}

/*
 * Solid white fallback for browsers / headless environments without
 * backdrop-filter support (no GPU blur). This is the critical path for
 * automated QA (headless Chromium) — must be fully opaque: no bleed.
 */
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .mky-head {
    background: #fff;
  }
}
.mky-title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -.01em;
  color: #0f172a;
}
.mky-sub {
  margin: 2px 0 0;
  font-size: 12px;
  color: #64748b;
}
.mky-close {
  width: 30px;
  height: 30px;
  flex: none;
  border: none;
  background: transparent;
  color: #64748b;
  border-radius: 9px;
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: background .15s, color .15s;
  -webkit-tap-highlight-color: transparent;
}
.mky-close:hover {
  background: rgba(15,23,42,.06);
  color: #0f172a;
}
.mky-close:focus-visible {
  outline: 2px solid ${e};
  outline-offset: 1px;
}
.mky-close svg {
  width: 18px;
  height: 18px;
  pointer-events: none;
}

/* Language select — small, unobtrusive, native */
.mky-lang {
  appearance: none;
  -webkit-appearance: none;
  border: 1px solid rgba(15,23,42,.12);
  border-radius: 8px;
  background: rgba(255,255,255,.8);
  color: #475569;
  font: inherit;
  font-size: 12px;
  font-weight: 500;
  padding: 4px 22px 4px 8px;
  cursor: pointer;
  flex: none;
  /* Caret via background SVG */
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%2364748b' stroke-width='1.5' stroke-linecap='round' fill='none'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 7px center;
  transition: border-color .15s, background-color .15s;
}
.mky-lang:hover {
  border-color: ${e};
  background-color: #fff;
}
.mky-lang:focus-visible {
  outline: 2px solid ${e};
  outline-offset: 1px;
}

/* ─────────────────────────────────────────────────────────────────────────
   BODY
   ───────────────────────────────────────────────────────────────────────── */
.mky-body {
  /*
   * Vertical padding ensures the first and last feature rows are never
   * hidden behind the sticky header or footer. 4px top + 4px bottom gives
   * a small visual gap between the body rows and the sticky bars.
   */
  padding: 4px 10px 4px;
}

/* Section group wrapper */
.mky-sec {
  margin-bottom: 4px;
}

.mky-sec-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .05em;
  color: #94a3b8;
  margin: 4px 8px 9px;
  display: block;
}

/* ─────────────────────────────────────────────────────────────────────────
   PROFILES (chip grid)
   ───────────────────────────────────────────────────────────────────────── */
.mky-profiles {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.mky-chip {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 10px 11px;
  min-height: 44px;
  border: 1px solid rgba(15,23,42,.1);
  border-radius: 13px;
  /* Semi-transparent chip reads well on glass */
  background: rgba(255,255,255,.8);
  cursor: pointer;
  font: inherit;
  font-weight: 600;
  font-size: 13px;
  color: #334155;
  text-align: left;
  transition: border-color .15s, background .15s, transform .15s, box-shadow .15s;
  -webkit-tap-highlight-color: transparent;
}
.mky-chip:hover {
  border-color: ${e};
  background: rgba(255,255,255,.95);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px -4px rgba(0,0,0,.14);
}
.mky-chip:active {
  transform: translateY(0);
}
.mky-chip:focus-visible {
  outline: 2px solid ${e};
  outline-offset: 1px;
}
.mky-chip svg {
  width: 18px;
  height: 18px;
  color: ${e};
  flex: none;
  pointer-events: none;
}

/* ─────────────────────────────────────────────────────────────────────────
   DIVIDER
   ───────────────────────────────────────────────────────────────────────── */
.mky-divider {
  height: 1px;
  background: rgba(15,23,42,.07);
  margin: 14px 4px 6px;
}

/* ─────────────────────────────────────────────────────────────────────────
   FEATURE ROWS
   ───────────────────────────────────────────────────────────────────────── */
.mky-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 8px;
  border-radius: 12px;
  transition: background .15s;
  min-height: 40px;
}
.mky-row:hover {
  background: rgba(15,23,42,.04);
}
.mky-label {
  display: flex;
  align-items: center;
  gap: 11px;
  font-weight: 500;
  color: #1e293b;
}
.mky-label svg {
  width: 18px;
  height: 18px;
  color: #64748b;
  flex: none;
  pointer-events: none;
}

/* ─────────────────────────────────────────────────────────────────────────
   TOGGLE SWITCH
   ───────────────────────────────────────────────────────────────────────── */
.mky-switch {
  position: relative;
  width: 42px;
  height: 24px;
  flex: none;
  border: none;
  border-radius: 999px;
  background: #e2e8f0;
  cursor: pointer;
  padding: 0;
  transition: background .2s cubic-bezier(.2,.8,.2,1);
  -webkit-tap-highlight-color: transparent;
}
.mky-switch::after {
  content: "";
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,.3);
  transition: transform .2s cubic-bezier(.2,.8,.2,1);
}
.mky-switch[aria-pressed="true"] {
  background: ${e};
}
.mky-switch[aria-pressed="true"]::after {
  transform: translateX(18px);
}
.mky-switch:focus-visible {
  outline: 2px solid ${e};
  outline-offset: 2px;
}

/* ─────────────────────────────────────────────────────────────────────────
   SEGMENTED CONTROL
   ───────────────────────────────────────────────────────────────────────── */
.mky-seg {
  display: inline-flex;
  background: rgba(15,23,42,.06);
  border-radius: 11px;
  padding: 3px;
  gap: 2px;
}
.mky-seg button {
  border: none;
  background: transparent;
  color: #475569;
  padding: 5px 11px;
  border-radius: 8px;
  cursor: pointer;
  font: inherit;
  font-weight: 500;
  font-size: 13px;
  transition: background .15s, color .15s, box-shadow .15s;
  -webkit-tap-highlight-color: transparent;
  white-space: nowrap;
}
.mky-seg button[aria-pressed="true"] {
  background: #fff;
  color: ${e};
  font-weight: 700;
  box-shadow: 0 1px 2px rgba(0,0,0,.12);
}
.mky-seg button:focus-visible {
  outline: 2px solid ${e};
  outline-offset: 1px;
}

/* ─────────────────────────────────────────────────────────────────────────
   STEPPER (text-size control)
   ───────────────────────────────────────────────────────────────────────── */
.mky-stepper {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.mky-step {
  width: 30px;
  height: 30px;
  flex: none;
  border: 1px solid rgba(15,23,42,.12);
  border-radius: 9px;
  background: rgba(255,255,255,.9);
  color: #1e293b;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: background .15s, border-color .15s;
  -webkit-tap-highlight-color: transparent;
}
.mky-step:hover {
  background: rgba(255,255,255,1);
  border-color: ${e};
}
.mky-step:focus-visible {
  outline: 2px solid ${e};
  outline-offset: 1px;
}
.mky-stepval {
  min-width: 46px;
  text-align: center;
  font-weight: 600;
  font-size: 13px;
  color: #475569;
  font-variant-numeric: tabular-nums;
}

/* ─────────────────────────────────────────────────────────────────────────
   FOOTER
   ───────────────────────────────────────────────────────────────────────── */
.mky-foot {
  padding: 12px 18px 16px;
  border-top: 1px solid rgba(15,23,42,.07);
  border-radius: 0 0 22px 22px;
  /* Stick footer at bottom when panel overflows */
  position: sticky;
  bottom: 0;
  /* Must be above .mky-body so scrolled rows don't bleed through */
  z-index: 2;
  /*
   * Opaque-enough surface so body content scrolling underneath is invisible.
   * Own backdrop-filter creates a frosted layer matching the panel glass look.
   */
  background: rgba(255,255,255,.92);
  -webkit-backdrop-filter: blur(20px) saturate(1.4);
  backdrop-filter: blur(20px) saturate(1.4);
}

/*
 * Solid white fallback for browsers / headless environments without
 * backdrop-filter support (no GPU blur). Must be fully opaque: no bleed.
 */
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .mky-foot {
    background: #fff;
  }
}
.mky-reset {
  width: 100%;
  padding: 9px;
  border: 1px solid rgba(15,23,42,.12);
  border-radius: 11px;
  background: rgba(255,255,255,.9);
  color: #334155;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  transition: background .15s, border-color .15s;
  -webkit-tap-highlight-color: transparent;
}
.mky-reset:hover {
  background: #fff;
  border-color: ${e};
}
.mky-reset:focus-visible {
  outline: 2px solid ${e};
  outline-offset: 1px;
}
.mky-note {
  margin: 11px 2px 0;
  font-size: 11px;
  line-height: 1.45;
  color: #64748b;
  text-align: center;
}
.mky-brand {
  margin: 9px 0 0;
  font-size: 11px;
  color: #64748b;
  text-align: center;
}
.mky-brand a {
  color: #475569;
  text-decoration: underline;
  font-weight: 600;
}
.mky-brand a:focus-visible {
  outline: 2px solid ${e};
  outline-offset: 1px;
  border-radius: 2px;
}
/* Accessibility statement link — same tone as .mky-brand */
.mky-statement {
  display: block;
  margin: 8px 0 0;
  font-size: 11px;
  color: #475569;
  text-align: center;
  text-decoration: underline;
  font-weight: 600;
  cursor: pointer;
}
.mky-statement:hover {
  color: #0f172a;
}
.mky-statement:focus-visible {
  outline: 2px solid ${e};
  outline-offset: 1px;
  border-radius: 2px;
}

/* ─────────────────────────────────────────────────────────────────────────
   MOBILE BOTTOM SHEET  ≤480px
   The panel detaches from its corner and fills the viewport bottom.
   Safe-area insets prevent content hiding behind home-indicator / notch.
   ───────────────────────────────────────────────────────────────────────── */
@media (max-width: 480px) {
  .mky-panel {
    /* Override any inline corner positioning set by JS */
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    top: auto !important;
    width: 100% !important;
    max-width: 100% !important;
    border-radius: 22px 22px 0 0;
    max-height: 85dvh;
    overflow-y: auto;
    /* Safe-area padding on the sides and bottom */
    padding-left: env(safe-area-inset-left, 0px);
    padding-right: env(safe-area-inset-right, 0px);
    padding-bottom: max(16px, env(safe-area-inset-bottom, 16px));
    /* Bottom-sheet hidden state: slide fully off-screen downward */
    transform: translateY(100%);
    /* Override desktop shadow with a top-shadow appropriate for sheet */
    box-shadow:
      0 -12px 40px -8px rgba(0,0,0,.18),
      0 -2px 8px rgba(0,0,0,.08);
    border-left: none;
    border-right: none;
    border-bottom: none;
    border-top: 1px solid rgba(255,255,255,.55);
  }
  .mky-panel.open {
    transform: translateY(0);
  }

  /* Header: round only the top on mobile */
  .mky-head {
    border-radius: 22px 22px 0 0;
  }
  /* Footer: flat bottom on mobile */
  .mky-foot {
    border-radius: 0;
    /* Extra bottom padding already handled by panel padding-bottom,
       but ensure the reset button itself isn't cropped */
    padding-bottom: 12px;
  }

  /* ── Touch targets: minimum 44×44px across all interactive controls ── */

  /* Close button — bump to 40px (spec requirement) */
  .mky-close {
    width: 40px;
    height: 40px;
  }

  /* Profile chips — ≥48px height as specified */
  .mky-chip {
    min-height: 48px;
    padding: 12px 11px;
  }

  /* Feature row — give more breathing room on mobile */
  .mky-row {
    min-height: 48px;
    padding: 12px 8px;
  }

  /* Toggle switch — visually taller touch target via transparent padding */
  .mky-switch {
    /* Keep the 42×24 visual but expand the tap surface */
    padding: 10px 0;
    height: auto;
    /* Use a transparent pseudo-element hit area instead */
  }
  /* Alternate approach: wrap won't work in Shadow DOM, use min-height on row */
  /* Actually on mobile, expand the switch itself for clear tapping */
  .mky-switch {
    width: 46px;
    height: 28px;
  }
  .mky-switch::after {
    width: 22px;
    height: 22px;
  }
  .mky-switch[aria-pressed="true"]::after {
    transform: translateX(18px);
  }

  /* Segmented control buttons — ≥44px height */
  .mky-seg button {
    min-height: 44px;
    padding: 10px 13px;
  }

  /* Stepper buttons — ≥44px */
  .mky-step {
    width: 44px;
    height: 44px;
    border-radius: 12px;
  }

  /* Reset button — comfortable on mobile */
  .mky-reset {
    padding: 13px;
    font-size: 15px;
  }

  /* Language select — larger tap area */
  .mky-lang {
    padding: 8px 28px 8px 10px;
    font-size: 13px;
  }

  /* The launcher stays fixed in its corner — no override needed */
}

/* ─────────────────────────────────────────────────────────────────────────
   REDUCED MOTION
   Disable all transitions for users who have requested it.
   ───────────────────────────────────────────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  .mky-btn,
  .mky-panel,
  .mky-switch,
  .mky-switch::after,
  .mky-chip,
  .mky-seg button,
  .mky-step,
  .mky-close,
  .mky-reset {
    transition: none !important;
    animation: none !important;
  }
}
`}const be={en:"English",es:"Español",fr:"Français",de:"Deutsch"},Q={en:{title:"Accessibility",subtitle:"Adjust this page to your needs",quickProfiles:"Quick profiles",profile_vision:"Vision impaired",profile_lowVision:"Low vision",profile_dyslexia:"Dyslexia",profile_adhd:"ADHD / Focus",profile_seizure:"Seizure safe",profile_senior:"Senior",profile_cognitive:"Cognitive",profile_colorBlind:"Color blind",sec_content:"Content",sec_color:"Color",sec_nav:"Navigation",sec_audio:"Audio",sec_about:"About",f_textSize:"Text size",f_lineSpacing:"Line spacing",f_contrast:"Contrast",f_stopMotion:"Pause animations",f_readingRuler:"Reading ruler",f_highlightLinks:"Highlight links",f_bigCursor:"Cursor size",f_readableFont:"Readable font",f_hideImages:"Hide images",f_saturation:"Color saturation",f_readingMask:"Reading mask",f_highlightTitles:"Highlight titles",f_textAlign:"Left-align text",f_muteSounds:"Mute sounds",f_readAloud:"Read aloud",opt_off:"Off",opt_on:"On",opt_dark:"Dark",opt_grayscale:"Grayscale",opt_low:"Low",opt_high:"High",opt_dim:"Dim",opt_tint:"Tint",opt_black:"Black",opt_white:"White",decrease:"Decrease",increase:"Increase",reset:"Reset all",note:"Changes affect your view only — they don't alter the website.",poweredBy:"Powered by",statement:"Accessibility statement",language:"Language",close:"Close",readAloudHint:"Click any text on the page to hear it read aloud."},es:{title:"Accesibilidad",subtitle:"Ajusta esta página a tus necesidades",quickProfiles:"Perfiles rápidos",profile_vision:"Visión reducida",profile_lowVision:"Baja visión",profile_dyslexia:"Dislexia",profile_adhd:"TDAH / Enfoque",profile_seizure:"Seguro para epilepsia",profile_senior:"Adulto mayor",profile_cognitive:"Cognitivo",profile_colorBlind:"Daltonismo",sec_content:"Contenido",sec_color:"Color",sec_nav:"Navegación",sec_audio:"Audio",sec_about:"Acerca de",f_textSize:"Tamaño de texto",f_lineSpacing:"Interlineado",f_contrast:"Contraste",f_stopMotion:"Pausar animaciones",f_readingRuler:"Regla de lectura",f_highlightLinks:"Resaltar enlaces",f_bigCursor:"Tamaño del cursor",f_readableFont:"Fuente legible",f_hideImages:"Ocultar imágenes",f_saturation:"Saturación de color",f_readingMask:"Máscara de lectura",f_highlightTitles:"Resaltar títulos",f_textAlign:"Alinear texto a la izquierda",f_muteSounds:"Silenciar sonidos",f_readAloud:"Leer en voz alta",opt_off:"Apagado",opt_on:"Encendido",opt_dark:"Oscuro",opt_grayscale:"Escala de grises",opt_low:"Bajo",opt_high:"Alto",opt_dim:"Tenue",opt_tint:"Tinte",opt_black:"Negro",opt_white:"Blanco",decrease:"Disminuir",increase:"Aumentar",reset:"Restablecer todo",note:"Los cambios solo afectan tu vista — no modifican el sitio web.",poweredBy:"Desarrollado por",statement:"Declaración de accesibilidad",language:"Idioma",close:"Cerrar",readAloudHint:"Haz clic en cualquier texto de la página para escucharlo."},fr:{title:"Accessibilité",subtitle:"Adaptez cette page à vos besoins",quickProfiles:"Profils rapides",profile_vision:"Déficience visuelle",profile_lowVision:"Basse vision",profile_dyslexia:"Dyslexie",profile_adhd:"TDAH / Concentration",profile_seizure:"Épilepsie",profile_senior:"Senior",profile_cognitive:"Cognitif",profile_colorBlind:"Daltonisme",sec_content:"Contenu",sec_color:"Couleur",sec_nav:"Navigation",sec_audio:"Audio",sec_about:"À propos",f_textSize:"Taille du texte",f_lineSpacing:"Interligne",f_contrast:"Contraste",f_stopMotion:"Pause animations",f_readingRuler:"Règle de lecture",f_highlightLinks:"Surligner les liens",f_bigCursor:"Taille du curseur",f_readableFont:"Police lisible",f_hideImages:"Masquer les images",f_saturation:"Saturation des couleurs",f_readingMask:"Masque de lecture",f_highlightTitles:"Surligner les titres",f_textAlign:"Aligner le texte à gauche",f_muteSounds:"Couper les sons",f_readAloud:"Lecture à voix haute",opt_off:"Désactivé",opt_on:"Activé",opt_dark:"Sombre",opt_grayscale:"Niveaux de gris",opt_low:"Faible",opt_high:"Élevé",opt_dim:"Tamisé",opt_tint:"Teinte",opt_black:"Noir",opt_white:"Blanc",decrease:"Diminuer",increase:"Augmenter",reset:"Tout réinitialiser",note:"Les modifications n'affectent que votre affichage — elles ne modifient pas le site.",poweredBy:"Propulsé par",statement:"Déclaration d'accessibilité",language:"Langue",close:"Fermer",readAloudHint:"Cliquez sur n'importe quel texte de la page pour l'entendre."},de:{title:"Barrierefreiheit",subtitle:"Passen Sie diese Seite Ihren Bedürfnissen an",quickProfiles:"Schnellprofile",profile_vision:"Sehbeeinträchtigung",profile_lowVision:"Schwachsichtigkeit",profile_dyslexia:"Legasthenie",profile_adhd:"ADHS / Fokus",profile_seizure:"Epilepsiesicher",profile_senior:"Senioren",profile_cognitive:"Kognitiv",profile_colorBlind:"Farbenblindheit",sec_content:"Inhalt",sec_color:"Farbe",sec_nav:"Navigation",sec_audio:"Audio",sec_about:"Über",f_textSize:"Textgröße",f_lineSpacing:"Zeilenabstand",f_contrast:"Kontrast",f_stopMotion:"Animationen anhalten",f_readingRuler:"Leselineal",f_highlightLinks:"Links hervorheben",f_bigCursor:"Zeigergröße",f_readableFont:"Lesbare Schrift",f_hideImages:"Bilder ausblenden",f_saturation:"Farbsättigung",f_readingMask:"Lesemaske",f_highlightTitles:"Überschriften hervorheben",f_textAlign:"Text linksbündig",f_muteSounds:"Töne stummschalten",f_readAloud:"Vorlesen",opt_off:"Aus",opt_on:"An",opt_dark:"Dunkel",opt_grayscale:"Graustufen",opt_low:"Niedrig",opt_high:"Hoch",opt_dim:"Gedämpft",opt_tint:"Tönung",opt_black:"Schwarz",opt_white:"Weiß",decrease:"Verringern",increase:"Erhöhen",reset:"Alles zurücksetzen",note:"Änderungen wirken sich nur auf Ihre Ansicht aus — die Website wird nicht verändert.",poweredBy:"Bereitgestellt von",statement:"Barrierefreiheitserklärung",language:"Sprache",close:"Schließen",readAloudHint:"Klicken Sie auf beliebigen Text auf der Seite, um ihn vorlesen zu lassen."}};function s(e,t){var o,i;return(i=(o=Q[e])==null?void 0:o[t])!=null?i:Q.en[t]}function p(e,t,o){const i=document.createElement("div");i.className="mky-row";const n=document.createElement("span");n.className="mky-label",n.innerHTML=e;const d=document.createElement("span");return d.textContent=t,n.appendChild(d),i.append(n,o),i}function y(e,t,o,i){const n=document.createElement("button");return n.className="mky-switch",n.type="button",n.setAttribute("role","switch"),n.setAttribute("aria-label",e),n.setAttribute("aria-pressed",String(t)),n.addEventListener("click",()=>{const r=!(n.getAttribute("aria-pressed")==="true");o(r),n.setAttribute("aria-pressed",String(r)),i()}),n}function R(e,t,o,i,n){const d=document.createElement("div");d.className="mky-seg",d.setAttribute("role","group"),d.setAttribute("aria-label",e);const r=[],a=l=>r.forEach(c=>c.setAttribute("aria-pressed",String(c.dataset.val===l)));for(const l of t){const c=document.createElement("button");c.type="button",c.textContent=l.label,c.dataset.val=l.value,c.setAttribute("aria-pressed",String(l.value===o)),c.addEventListener("click",()=>{i(l.value),a(l.value),n()}),r.push(c),d.appendChild(c)}return d}function ke(e,t,o,i,n,d){const r=document.createElement("div");r.className="mky-stepper";const a=document.createElement("button");a.className="mky-step",a.type="button",a.textContent="−",a.setAttribute("aria-label",`${s(e,"decrease")} ${t}`);const l=document.createElement("span");l.className="mky-stepval";const c=document.createElement("button");c.className="mky-step",c.type="button",c.textContent="+",c.setAttribute("aria-label",`${s(e,"increase")} ${t}`);let f=Math.max(0,Math.min(o.length-1,i));const w=()=>{l.textContent=o[f].label,a.disabled=f<=0,c.disabled=f>=o.length-1};return w(),a.addEventListener("click",()=>{f<=0||(f-=1,n(f),w(),d())}),c.addEventListener("click",()=>{f>=o.length-1||(f+=1,n(f),w(),d())}),r.append(a,l,c),r}const xe={textSize:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg>',lineSpacing:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',contrast:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/></svg>',stopMotion:'<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>',readingRuler:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="9" width="18" height="6" rx="1.5"/><path d="M7.5 9v3M12 9v3M16.5 9v3"/></svg>',highlightLinks:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.07 0l2-2a5 5 0 0 0-7.07-7.07l-1 1"/><path d="M14 11a5 5 0 0 0-7.07 0l-2 2A5 5 0 0 0 12 20.07l1-1"/></svg>',bigCursor:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M5 3l6.5 17 2.2-7.3L21 10.5 5 3z"/></svg>',readableFont:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 20l4-12 4 12M6.5 16h5M14 11c0-1.7 1.3-3 3-3s3 1.3 3 3v9"/></svg>',hideImages:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 16l5-5 3 3M3 3l18 18"/></svg>',saturation:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 3v9l6 3.5" stroke-width="1.5"/><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/></svg>',readingMask:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="5" rx="1" fill="currentColor" fill-opacity=".25"/><rect x="2" y="10" width="20" height="4" rx="1"/><rect x="2" y="16" width="20" height="5" rx="1" fill="currentColor" fill-opacity=".25"/></svg>',highlightTitles:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16M4 12h10"/><rect x="3" y="16" width="18" height="3" rx="1" fill="currentColor" fill-opacity=".3" stroke="none"/></svg>',textAlign:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M3 11h12M3 16h15"/></svg>',muteSounds:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H3v6h3l5 4V5z"/><path d="M17 9l4 4M21 9l-4 4"/></svg>',readAloud:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 10h.01M12 10h.01M16 10h.01"/></svg>'};function ye(e,t,o,i){var d;const n=(d=xe[e])!=null?d:"";switch(e){case"textSize":{const r=s(o,"f_textSize"),l=ke(o,r,[{label:"100%"},{label:"112%"},{label:"125%"},{label:"140%"}],t.text,c=>{t.text=c},i);return p(n,r,l)}case"contrast":{const r=s(o,"f_contrast"),a=R(r,[{value:"off",label:s(o,"opt_off")},{value:"on",label:s(o,"opt_on")},{value:"dark",label:s(o,"opt_dark")}],t.contrast,l=>{t.contrast=l},i);return p(n,r,a)}case"saturation":{const r=s(o,"f_saturation"),a=R(r,[{value:"off",label:s(o,"opt_off")},{value:"grayscale",label:s(o,"opt_grayscale")},{value:"low",label:s(o,"opt_low")},{value:"high",label:s(o,"opt_high")}],t.saturation,l=>{t.saturation=l},i);return p(n,r,a)}case"bigCursor":{const r=s(o,"f_bigCursor"),a=R(r,[{value:"off",label:s(o,"opt_off")},{value:"black",label:s(o,"opt_black")},{value:"white",label:s(o,"opt_white")}],t.cursor,l=>{t.cursor=l},i);return p(n,r,a)}case"readingMask":{const r=s(o,"f_readingMask"),a=R(r,[{value:"off",label:s(o,"opt_off")},{value:"dim",label:s(o,"opt_dim")},{value:"tint",label:s(o,"opt_tint")}],t.mask,l=>{t.mask=l},i);return p(n,r,a)}case"lineSpacing":{const r=s(o,"f_lineSpacing");return p(n,r,y(r,t.spacing,a=>{t.spacing=a},i))}case"highlightLinks":{const r=s(o,"f_highlightLinks");return p(n,r,y(r,t.links,a=>{t.links=a},i))}case"readableFont":{const r=s(o,"f_readableFont");return p(n,r,y(r,t.font,a=>{t.font=a},i))}case"hideImages":{const r=s(o,"f_hideImages");return p(n,r,y(r,t.images,a=>{t.images=a},i))}case"stopMotion":{const r=s(o,"f_stopMotion");return p(n,r,y(r,t.stopMotion,a=>{t.stopMotion=a},i))}case"readingRuler":{const r=s(o,"f_readingRuler");return p(n,r,y(r,t.ruler,a=>{t.ruler=a},i))}case"highlightTitles":{const r=s(o,"f_highlightTitles");return p(n,r,y(r,t.titles,a=>{t.titles=a},i))}case"textAlign":{const r=s(o,"f_textAlign");return p(n,r,y(r,t.align,a=>{t.align=a},i))}case"muteSounds":{const r=s(o,"f_muteSounds");return p(n,r,y(r,t.mute,a=>{t.mute=a},i))}case"readAloud":{const r=s(o,"f_readAloud");return p(n,r,y(r,t.readAloud,a=>{t.readAloud=a},i))}default:return null}}const ee=[{key:"vision",labelKey:"profile_vision",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>',apply:e=>{e.contrast="on",e.text=3,e.cursor="black"}},{key:"lowVision",labelKey:"profile_lowVision",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.4 1.4M17.6 17.6L19 19M19 5l-1.4 1.4M6.4 17.6L5 19"/></svg>',apply:e=>{e.text=2,e.spacing=!0,e.cursor="black",e.links=!0}},{key:"dyslexia",labelKey:"profile_dyslexia",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg>',apply:e=>{e.font=!0,e.spacing=!0,e.text=1}},{key:"adhd",labelKey:"profile_adhd",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/></svg>',apply:e=>{e.stopMotion=!0,e.spacing=!0,e.links=!0}},{key:"seizure",labelKey:"profile_seizure",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3l8 3v6c0 4-3 7-8 9-5-2-8-5-8-9V6z"/></svg>',apply:e=>{e.stopMotion=!0}},{key:"senior",labelKey:"profile_senior",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',apply:e=>{e.text=2,e.spacing=!0,e.cursor="black",e.font=!0}},{key:"cognitive",labelKey:"profile_cognitive",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24A2.5 2.5 0 0 1 9.5 2z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24A2.5 2.5 0 0 0 14.5 2z"/></svg>',apply:e=>{e.mask="dim",e.spacing=!0,e.images=!0,e.stopMotion=!0}},{key:"colorBlind",labelKey:"profile_colorBlind",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 3v9M12 12l7.5 4.5" stroke-width="1.5"/><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/></svg>',apply:e=>{e.saturation="high",e.titles=!0}}];function te(e,t){if(Object.assign(e,T),t==="none")return;const o=ee.find(i=>i.key===t);o==null||o.apply(e)}function ve(){let e=null;const t=o=>{e&&(e.style.top=`${o.clientY}px`)};return{on(){e||(e=document.createElement("div"),e.setAttribute("aria-hidden","true"),e.style.cssText=["position:fixed","left:0","top:0","width:100vw","height:28px","background:rgba(0,0,0,.06)","border-top:2px solid rgba(0,0,0,.45)","border-bottom:2px solid rgba(0,0,0,.45)","pointer-events:none","z-index:2147483646","transform:translateY(-14px)"].join(";"),document.documentElement.appendChild(e),window.addEventListener("mousemove",t))},off(){e&&(window.removeEventListener("mousemove",t),e==null||e.remove(),e=null)}}}function we(){let e=null,t=null,o=null,i="off";const n=120,d=l=>{t&&(t.style.top=`${l.clientY-n/2}px`)};function r(){window.removeEventListener("mousemove",d),e==null||e.remove(),t==null||t.remove(),o==null||o.remove(),e=null,t=null,o=null}function a(l){const c=document.createElement("div");return c.setAttribute("aria-hidden","true"),c.style.cssText=["position:fixed","left:0","top:0","width:100%","height:100%","pointer-events:none","z-index:2147483645",l].join(";"),c}return{set(l){if(l!==i&&(r(),i=l,l!=="off")){if(l==="dim"){e=a("background:rgba(0,0,0,.55)"),t=a([`height:${n}px`,"top:0","width:100%","background:transparent","z-index:2147483646"].join(";")),t.style.height=`${n}px`,document.documentElement.appendChild(e),document.documentElement.appendChild(t),window.addEventListener("mousemove",d),t.style.top=`${window.innerHeight/2-n/2}px`;return}if(l==="tint"){o=a(["background:rgba(255,250,200,.18)","z-index:2147483646"].join(";")),document.documentElement.appendChild(o);return}}}}}function _e(e){if(!("speechSynthesis"in window))return{enable(){},disable(){},setLang(n){}};let t=e,o=!1;const i=n=>{var d,r;try{const a=n.target;if(!a||(d=a.closest)!=null&&d.call(a,"#makoya-widget-root"))return;const l=(r=a.innerText)==null?void 0:r.trim();if(!l)return;window.speechSynthesis.cancel();const c=new SpeechSynthesisUtterance(l);try{const w=window.speechSynthesis.getVoices().find(j=>j.lang.startsWith(t));w&&(c.voice=w)}catch{}window.speechSynthesis.speak(c)}catch{}};return{enable(){o||(o=!0,document.addEventListener("click",i,!0))},disable(){if(o){o=!1;try{window.speechSynthesis.cancel()}catch{}document.removeEventListener("click",i,!0)}},setLang(n){t=n}}}function Se(){let e=!1;const t=i=>{const n=i.target;n instanceof HTMLMediaElement&&(n.muted=!0)};function o(){return Array.from(document.querySelectorAll("audio, video"))}return{enable(){if(!e){e=!0;for(const i of o())i.muted=!0;document.addEventListener("play",t,!0)}},disable(){if(e){e=!1,document.removeEventListener("play",t,!0);for(const i of o())i.muted=!1}}}}const oe="makoya_lang",Ee='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',ne={"bottom-right":"bottom:16px; right:16px;","bottom-left":"bottom:16px; left:16px;","top-right":"top:16px;    right:16px;","top-left":"top:16px;    left:16px;"},Ce={textSize:"sec_content",lineSpacing:"sec_content",readableFont:"sec_content",textAlign:"sec_content",highlightTitles:"sec_content",highlightLinks:"sec_content",hideImages:"sec_content",stopMotion:"sec_content",contrast:"sec_color",saturation:"sec_color",readingRuler:"sec_nav",readingMask:"sec_nav",bigCursor:"sec_nav",muteSounds:"sec_audio",readAloud:"sec_audio"},Ae=["sec_content","sec_color","sec_nav","sec_audio"];function Me(e){try{const t=localStorage.getItem(oe);if(t&&(t==="en"||t==="es"||t==="fr"||t==="de"))return t}catch{}return e}function Le(e){try{localStorage.setItem(oe,e)}catch{}}function Te(e){try{ze(e)}catch{}}function ze(e){var se,le;const t=document.createElement("div");t.id="makoya-widget-root";const o=t.attachShadow({mode:"open"});document.documentElement.appendChild(t);const i=document.createElement("style");i.textContent=ge(e.primaryColor,e.launcherSize),o.appendChild(i);let n=Me(e.defaultLanguage);const d=(()=>{try{return localStorage.getItem(P)!==null}catch{return!1}})(),r=X(),a=ve(),l=we(),c=_e(n),f=Se(),w=(se=ne[e.position])!=null?se:ne["bottom-right"],j=e.position.startsWith("bottom"),Ne=e.position.endsWith("right"),x=document.createElement("button");x.className="mky-btn",x.type="button",x.style.cssText=w,x.setAttribute("aria-label",s(n,"title")),x.setAttribute("aria-expanded","false"),x.innerHTML=(le=W[e.launcherIcon])!=null?le:W.accessibility;const v=document.createElement("div");v.className="mky-panel",v.setAttribute("role","dialog"),v.setAttribute("aria-modal","true"),v.setAttribute("aria-label",e.panelTitle||s(n,"title")),v.style.cssText=[w,j?"bottom: 84px;":"top: 84px;",Ne?"right: 16px;":"left: 16px;"].filter(Boolean).join(" ");function H(){try{J(r),r.ruler?a.on():a.off(),l.set(r.mask),r.readAloud?c.enable():c.disable(),c.setLang(n),r.mute?f.enable():f.disable(),me(r)}catch{}}const $=document.createElement("div");$.className="mky-head";const ie=document.createElement("div"),q=document.createElement("h2");q.className="mky-title";const V=document.createElement("p");V.className="mky-sub",ie.append(q,V);const E=document.createElement("select");E.className="mky-lang",E.setAttribute("aria-label",s(n,"language"));for(const[u,h]of Object.entries(be)){const g=document.createElement("option");g.value=u,g.textContent=h,g.selected=u===n,E.appendChild(g)}E.addEventListener("change",()=>{n=E.value,Le(n),c.setLang(n),ae(),I()});const C=document.createElement("button");C.className="mky-close",C.type="button",C.innerHTML=Ee,$.append(ie,E,C);const z=document.createElement("div");z.className="mky-body";const B=document.createElement("div");B.className="mky-foot";const N=document.createElement("button");N.className="mky-reset",N.type="button",N.addEventListener("click",()=>{Object.assign(r,T),H(),I()});const G=document.createElement("p");G.className="mky-note",B.append(N,G);let S=null;e.accessibilityStatementUrl&&(S=document.createElement("a"),S.className="mky-statement",S.href=e.accessibilityStatementUrl,S.target="_blank",S.rel="noopener",B.appendChild(S));let _=null;if(!e.hideBranding){_=document.createElement("p"),_.className="mky-brand";const u=document.createElement("a");u.href=e.brandingUrl,u.target="_blank",u.rel="noopener",u.textContent="Makoya",_.append("",u),B.appendChild(_)}function ae(){const u=e.panelTitle||s(n,"title");if(x.setAttribute("aria-label",u),v.setAttribute("aria-label",u),q.textContent=u,V.textContent=s(n,"subtitle"),C.setAttribute("aria-label",s(n,"close")),E.setAttribute("aria-label",s(n,"language")),N.textContent=s(n,"reset"),G.textContent=s(n,"note"),S&&(S.textContent=s(n,"statement")),_){const h=_.querySelector("a");h&&(_.textContent="",_.appendChild(document.createTextNode(`${s(n,"poweredBy")} `)),_.appendChild(h))}}function I(){z.innerHTML="";const u=document.createElement("div");u.className="mky-sec";const h=document.createElement("span");h.className="mky-sec-label",h.textContent=s(n,"quickProfiles");const g=document.createElement("div");g.className="mky-profiles";for(const b of ee){const m=document.createElement("button");m.type="button",m.className="mky-chip";const M=s(n,b.labelKey);m.innerHTML=`${b.icon}<span>${M}</span>`,m.addEventListener("click",()=>{te(r,b.key),H(),I()}),g.appendChild(m)}const O=document.createElement("div");O.className="mky-divider",u.append(h,g,O),z.appendChild(u);const A=new Map;for(const b of e.featuresEnabled){const m=Ce[b];m&&(A.has(m)||A.set(m,[]),A.get(m).push(b))}for(const b of Ae){const m=A.get(b);if(!m||m.length===0)continue;const M=document.createElement("div");M.className="mky-sec";const Y=document.createElement("span");Y.className="mky-sec-label",Y.textContent=s(n,b),M.appendChild(Y);for(const L of m){const ce=ye(L,r,n,H);ce&&M.appendChild(ce)}if(b==="sec_audio"&&e.featuresEnabled.includes("readAloud")){const L=document.createElement("p");L.className="mky-note",L.style.cssText="margin: 4px 8px 8px; text-align: left;",L.textContent=s(n,"readAloudHint"),M.appendChild(L)}z.appendChild(M)}}v.append($,z,B);let U=!1;const K=u=>{U=u,v.classList.toggle("open",u),x.setAttribute("aria-expanded",String(u)),u?requestAnimationFrame(()=>C.focus()):x.focus()};x.addEventListener("click",()=>K(!U)),C.addEventListener("click",()=>K(!1)),o.addEventListener("keydown",u=>{const h=u;if(U){if(h.key==="Escape"){K(!1);return}if(h.key==="Tab"){const g=Array.from(v.querySelectorAll('button:not([disabled]), a[href], select, input, [tabindex]:not([tabindex="-1"])'));if(g.length===0)return;const O=g[0],A=g[g.length-1],b=o.activeElement;h.shiftKey&&b===O?(h.preventDefault(),A.focus()):!h.shiftKey&&b===A&&(h.preventDefault(),O.focus())}}}),o.append(x,v),ae(),I(),!d&&e.defaultProfile!=="none"&&(te(r,e.defaultProfile),I()),H()}let re=!1;function Be(){const e=()=>J(X()),t=o=>{const i=history[o];history[o]=function(...n){const d=i.apply(this,n);return setTimeout(e,50),d}};t("pushState"),t("replaceState"),window.addEventListener("popstate",()=>setTimeout(e,50))}function F(e){if(re||document.getElementById("makoya-widget-root"))return;re=!0;const t=ue(e.siteId,e),o=()=>{Te(t),Be()};document.readyState==="loading"?document.addEventListener("DOMContentLoaded",o,{once:!0}):o()}return window.MakoyaWidget={init:F},function(){var t;try{const o=(t=document.currentScript)!=null?t:document.querySelector("script[data-site]");if(!o||o.hasAttribute("data-no-auto"))return;const i=o.dataset.site||"auto",n=o.dataset.color;F({siteId:i,...n?{primaryColor:n}:{}})}catch{}}(),D.init=F,Object.defineProperty(D,Symbol.toStringTag,{value:"Module"}),D}({});
