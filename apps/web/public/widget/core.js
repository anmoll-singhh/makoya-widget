var MakoyaCore=function(q){"use strict";const re={accessibility:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="4" r="2"/><path d="M21 9c0 .55-.45 1-1 1h-4v11a1 1 0 0 1-2 0v-5h-4v5a1 1 0 0 1-2 0V10H4a1 1 0 0 1 0-2h16c.55 0 1 .45 1 1z"/></svg>',person:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="7" r="4"/><path d="M4 21a8 8 0 0 1 16 0 1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/></svg>',eye:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 5c-5 0-9 4.5-10 7 1 2.5 5 7 10 7s9-4.5 10-7c-1-2.5-5-7-10-7zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8z"/><circle cx="12" cy="12" r="2"/></svg>',adjust:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 7h11a3 3 0 0 1 6 0h1a1 1 0 0 1 0 2h-1a3 3 0 0 1-6 0H3a1 1 0 0 1 0-2zm6 8a3 3 0 0 1 6 0h6a1 1 0 0 1 0 2h-6a3 3 0 0 1-6 0H3a1 1 0 0 1 0-2h6z"/></svg>'},Se={siteId:"unknown",primaryColor:"#2563eb",position:"bottom-right",launcherIcon:"accessibility",featuresEnabled:["textSize","lineSpacing","contrast","stopMotion","readingRuler","highlightLinks","bigCursor","readableFont","hideImages","saturation","readingMask","highlightTitles","textAlign","muteSounds","readAloud","highlightHover"],hideBranding:!1,brandingUrl:"https://makoya.example/scan",launcherSize:"md",defaultProfile:"none",accessibilityStatementUrl:"",defaultLanguage:"en",panelTitle:"",customTriggerSelector:"",domObserverEnabled:!0,inheritFonts:!1,mobileEnabled:!0};function Ce(e,t){return{...Se,...t!=null?t:{},siteId:e}}const ie="makoya-effects",Ae=`
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
`;function Me(){if(document.getElementById(ie))return;const e=document.createElement("style");e.id=ie,e.textContent=Ae,document.head.appendChild(e)}function k(e,t){const o=document.documentElement;t===null?o.removeAttribute(e):o.setAttribute(e,t)}const G="makoya_prefs",I={text:0,spacing:!1,contrast:"off",stopMotion:!1,ruler:!1,links:!1,cursor:"off",font:!1,images:!1,saturation:"off",mask:"off",titles:!1,align:!1,mute:!1,readAloud:!1,rulerColor:"#ffd400",hoverHighlight:!1};function ae(){try{const e=localStorage.getItem(G);return e?{...I,...JSON.parse(e)}:{...I}}catch{return{...I}}}function Le(e){try{localStorage.setItem(G,JSON.stringify(e))}catch{}}function se(e){Me(),k("data-mky-text",e.text===0?null:String(e.text)),k("data-mky-spacing",e.spacing?"on":null),k("data-mky-contrast",e.contrast==="off"?null:e.contrast),k("data-mky-motion",e.stopMotion?"off":null),k("data-mky-links",e.links?"on":null),k("data-mky-cursor",e.cursor==="off"?null:e.cursor),k("data-mky-font",e.font?"on":null),k("data-mky-images",e.images?"off":null),k("data-mky-sat",e.saturation==="off"?null:e.saturation),k("data-mky-titles",e.titles?"on":null),k("data-mky-align",e.align?"on":null)}const Te={sm:48,md:56,lg:64};function Be(e,t){const o=Te[t],i=Math.round(o*.5/2)*2;return`
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
  overscroll-behavior: contain;
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
/* Active / selected profile chip — colored border + inset ring */
.mky-chip[aria-pressed="true"] {
  border-color: ${e};
  box-shadow: inset 0 0 0 2px ${e};
  background: rgba(255,255,255,.95);
}
.mky-chip[aria-pressed="true"] svg {
  color: ${e};
}

/* ─────────────────────────────────────────────────────────────────────────
   COLOR PALETTE (ruler color picker)
   ───────────────────────────────────────────────────────────────────────── */
.mky-palette {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 2px 8px 10px;
}
.mky-palette-label {
  font-size: 12px;
  color: #475569;
  font-weight: 600;
  flex: 0 0 100%;
}
.mky-swatch {
  width: 26px;
  height: 26px;
  flex: none;
  border-radius: 50%;
  border: 2px solid rgba(15,23,42,.15);
  cursor: pointer;
  padding: 0;
  transition: transform .15s;
  -webkit-tap-highlight-color: transparent;
}
.mky-swatch:hover {
  transform: scale(1.1);
}
.mky-swatch[aria-pressed="true"] {
  border-color: #0f172a;
  box-shadow: 0 0 0 2px #fff, 0 0 0 4px ${e};
}
.mky-swatch:focus-visible {
  outline: 2px solid ${e};
  outline-offset: 2px;
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
    overscroll-behavior: contain;
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
`}const ze={en:"English",es:"Español",fr:"Français",de:"Deutsch"},le={en:{title:"Accessibility",subtitle:"Adjust this page to your needs",quickProfiles:"Quick profiles",profile_vision:"Vision impaired",profile_lowVision:"Low vision",profile_dyslexia:"Dyslexia",profile_adhd:"ADHD / Focus",profile_seizure:"Seizure safe",profile_senior:"Senior",profile_cognitive:"Cognitive",profile_colorBlind:"Color blind",sec_content:"Content",sec_color:"Color",sec_nav:"Navigation",sec_audio:"Audio",sec_about:"About",f_textSize:"Text size",f_lineSpacing:"Line spacing",f_contrast:"Contrast",f_stopMotion:"Pause animations",f_readingRuler:"Reading ruler",f_highlightLinks:"Highlight links",f_bigCursor:"Cursor size",f_readableFont:"Readable font",f_hideImages:"Hide images",f_saturation:"Color saturation",f_readingMask:"Reading mask",f_highlightTitles:"Highlight titles",f_textAlign:"Left-align text",f_muteSounds:"Mute sounds",f_readAloud:"Read aloud",f_highlightHover:"Highlight on hover",rulerColor:"Ruler color",opt_off:"Off",opt_on:"On",opt_dark:"Dark",opt_grayscale:"Grayscale",opt_low:"Low",opt_high:"High",opt_dim:"Dim",opt_tint:"Tint",opt_black:"Black",opt_white:"White",decrease:"Decrease",increase:"Increase",reset:"Reset all",note:"Changes affect your view only — they don't alter the website.",poweredBy:"Powered by",statement:"Accessibility statement",language:"Language",close:"Close",readAloudHint:"Click any text on the page to hear it read aloud."},es:{title:"Accesibilidad",subtitle:"Ajusta esta página a tus necesidades",quickProfiles:"Perfiles rápidos",profile_vision:"Visión reducida",profile_lowVision:"Baja visión",profile_dyslexia:"Dislexia",profile_adhd:"TDAH / Enfoque",profile_seizure:"Seguro para epilepsia",profile_senior:"Adulto mayor",profile_cognitive:"Cognitivo",profile_colorBlind:"Daltonismo",sec_content:"Contenido",sec_color:"Color",sec_nav:"Navegación",sec_audio:"Audio",sec_about:"Acerca de",f_textSize:"Tamaño de texto",f_lineSpacing:"Interlineado",f_contrast:"Contraste",f_stopMotion:"Pausar animaciones",f_readingRuler:"Regla de lectura",f_highlightLinks:"Resaltar enlaces",f_bigCursor:"Tamaño del cursor",f_readableFont:"Fuente legible",f_hideImages:"Ocultar imágenes",f_saturation:"Saturación de color",f_readingMask:"Máscara de lectura",f_highlightTitles:"Resaltar títulos",f_textAlign:"Alinear texto a la izquierda",f_muteSounds:"Silenciar sonidos",f_readAloud:"Leer en voz alta",f_highlightHover:"Resaltar al pasar el cursor",rulerColor:"Color de la regla",opt_off:"Apagado",opt_on:"Encendido",opt_dark:"Oscuro",opt_grayscale:"Escala de grises",opt_low:"Bajo",opt_high:"Alto",opt_dim:"Tenue",opt_tint:"Tinte",opt_black:"Negro",opt_white:"Blanco",decrease:"Disminuir",increase:"Aumentar",reset:"Restablecer todo",note:"Los cambios solo afectan tu vista — no modifican el sitio web.",poweredBy:"Desarrollado por",statement:"Declaración de accesibilidad",language:"Idioma",close:"Cerrar",readAloudHint:"Haz clic en cualquier texto de la página para escucharlo."},fr:{title:"Accessibilité",subtitle:"Adaptez cette page à vos besoins",quickProfiles:"Profils rapides",profile_vision:"Déficience visuelle",profile_lowVision:"Basse vision",profile_dyslexia:"Dyslexie",profile_adhd:"TDAH / Concentration",profile_seizure:"Épilepsie",profile_senior:"Senior",profile_cognitive:"Cognitif",profile_colorBlind:"Daltonisme",sec_content:"Contenu",sec_color:"Couleur",sec_nav:"Navigation",sec_audio:"Audio",sec_about:"À propos",f_textSize:"Taille du texte",f_lineSpacing:"Interligne",f_contrast:"Contraste",f_stopMotion:"Pause animations",f_readingRuler:"Règle de lecture",f_highlightLinks:"Surligner les liens",f_bigCursor:"Taille du curseur",f_readableFont:"Police lisible",f_hideImages:"Masquer les images",f_saturation:"Saturation des couleurs",f_readingMask:"Masque de lecture",f_highlightTitles:"Surligner les titres",f_textAlign:"Aligner le texte à gauche",f_muteSounds:"Couper les sons",f_readAloud:"Lecture à voix haute",f_highlightHover:"Surligner au survol",rulerColor:"Couleur de la règle",opt_off:"Désactivé",opt_on:"Activé",opt_dark:"Sombre",opt_grayscale:"Niveaux de gris",opt_low:"Faible",opt_high:"Élevé",opt_dim:"Tamisé",opt_tint:"Teinte",opt_black:"Noir",opt_white:"Blanc",decrease:"Diminuer",increase:"Augmenter",reset:"Tout réinitialiser",note:"Les modifications n'affectent que votre affichage — elles ne modifient pas le site.",poweredBy:"Propulsé par",statement:"Déclaration d'accessibilité",language:"Langue",close:"Fermer",readAloudHint:"Cliquez sur n'importe quel texte de la page pour l'entendre."},de:{title:"Barrierefreiheit",subtitle:"Passen Sie diese Seite Ihren Bedürfnissen an",quickProfiles:"Schnellprofile",profile_vision:"Sehbeeinträchtigung",profile_lowVision:"Schwachsichtigkeit",profile_dyslexia:"Legasthenie",profile_adhd:"ADHS / Fokus",profile_seizure:"Epilepsiesicher",profile_senior:"Senioren",profile_cognitive:"Kognitiv",profile_colorBlind:"Farbenblindheit",sec_content:"Inhalt",sec_color:"Farbe",sec_nav:"Navigation",sec_audio:"Audio",sec_about:"Über",f_textSize:"Textgröße",f_lineSpacing:"Zeilenabstand",f_contrast:"Kontrast",f_stopMotion:"Animationen anhalten",f_readingRuler:"Leselineal",f_highlightLinks:"Links hervorheben",f_bigCursor:"Zeigergröße",f_readableFont:"Lesbare Schrift",f_hideImages:"Bilder ausblenden",f_saturation:"Farbsättigung",f_readingMask:"Lesemaske",f_highlightTitles:"Überschriften hervorheben",f_textAlign:"Text linksbündig",f_muteSounds:"Töne stummschalten",f_readAloud:"Vorlesen",f_highlightHover:"Beim Überfahren hervorheben",rulerColor:"Linealfarbe",opt_off:"Aus",opt_on:"An",opt_dark:"Dunkel",opt_grayscale:"Graustufen",opt_low:"Niedrig",opt_high:"Hoch",opt_dim:"Gedämpft",opt_tint:"Tönung",opt_black:"Schwarz",opt_white:"Weiß",decrease:"Verringern",increase:"Erhöhen",reset:"Alles zurücksetzen",note:"Änderungen wirken sich nur auf Ihre Ansicht aus — die Website wird nicht verändert.",poweredBy:"Bereitgestellt von",statement:"Barrierefreiheitserklärung",language:"Sprache",close:"Schließen",readAloudHint:"Klicken Sie auf beliebigen Text auf der Seite, um ihn vorlesen zu lassen."}};function l(e,t){var o,i;return(i=(o=le[e])==null?void 0:o[t])!=null?i:le.en[t]}function f(e,t,o){const i=document.createElement("div");i.className="mky-row";const n=document.createElement("span");n.className="mky-label",n.innerHTML=e;const s=document.createElement("span");return s.textContent=t,n.appendChild(s),i.append(n,o),i}function y(e,t,o,i){const n=document.createElement("button");return n.className="mky-switch",n.type="button",n.setAttribute("role","switch"),n.setAttribute("aria-label",e),n.setAttribute("aria-pressed",String(t)),n.addEventListener("click",()=>{const r=!(n.getAttribute("aria-pressed")==="true");o(r),n.setAttribute("aria-pressed",String(r)),i()}),n}function P(e,t,o,i,n){const s=document.createElement("div");s.className="mky-seg",s.setAttribute("role","group"),s.setAttribute("aria-label",e);const r=[],a=c=>r.forEach(d=>d.setAttribute("aria-pressed",String(d.dataset.val===c)));for(const c of t){const d=document.createElement("button");d.type="button",d.textContent=c.label,d.dataset.val=c.value,d.setAttribute("aria-pressed",String(c.value===o)),d.addEventListener("click",()=>{i(c.value),a(c.value),n()}),r.push(d),s.appendChild(d)}return s}function Ne(e,t,o,i,n,s){const r=document.createElement("div");r.className="mky-stepper";const a=document.createElement("button");a.className="mky-step",a.type="button",a.textContent="−",a.setAttribute("aria-label",`${l(e,"decrease")} ${t}`);const c=document.createElement("span");c.className="mky-stepval";const d=document.createElement("button");d.className="mky-step",d.type="button",d.textContent="+",d.setAttribute("aria-label",`${l(e,"increase")} ${t}`);let u=Math.max(0,Math.min(o.length-1,i));const w=()=>{c.textContent=o[u].label,a.disabled=u<=0,d.disabled=u>=o.length-1};return w(),a.addEventListener("click",()=>{u<=0||(u-=1,n(u),w(),s())}),d.addEventListener("click",()=>{u>=o.length-1||(u+=1,n(u),w(),s())}),r.append(a,c,d),r}function Ie(e,t,o,i,n){const s=document.createElement("div");s.className="mky-palette",s.setAttribute("role","group"),s.setAttribute("aria-label",e);const r=document.createElement("span");r.className="mky-palette-label",r.textContent=e,s.appendChild(r);const a=[];function c(d){a.forEach(u=>u.setAttribute("aria-pressed",String(u.dataset.swatchValue===d)))}for(const d of o){const u=document.createElement("button");u.type="button",u.className="mky-swatch",u.style.background=d.value,u.dataset.swatchValue=d.value,u.setAttribute("aria-label",`${e}: ${d.name}`),u.setAttribute("aria-pressed",String(d.value===t)),u.addEventListener("click",()=>{i(d.value),c(d.value),n()}),a.push(u),s.appendChild(u)}return s}const Oe={textSize:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg>',lineSpacing:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',contrast:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/></svg>',stopMotion:'<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>',readingRuler:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="9" width="18" height="6" rx="1.5"/><path d="M7.5 9v3M12 9v3M16.5 9v3"/></svg>',highlightLinks:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.07 0l2-2a5 5 0 0 0-7.07-7.07l-1 1"/><path d="M14 11a5 5 0 0 0-7.07 0l-2 2A5 5 0 0 0 12 20.07l1-1"/></svg>',bigCursor:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M5 3l6.5 17 2.2-7.3L21 10.5 5 3z"/></svg>',readableFont:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 20l4-12 4 12M6.5 16h5M14 11c0-1.7 1.3-3 3-3s3 1.3 3 3v9"/></svg>',hideImages:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 16l5-5 3 3M3 3l18 18"/></svg>',saturation:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 3v9l6 3.5" stroke-width="1.5"/><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/></svg>',readingMask:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="5" rx="1" fill="currentColor" fill-opacity=".25"/><rect x="2" y="10" width="20" height="4" rx="1"/><rect x="2" y="16" width="20" height="5" rx="1" fill="currentColor" fill-opacity=".25"/></svg>',highlightTitles:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16M4 12h10"/><rect x="3" y="16" width="18" height="3" rx="1" fill="currentColor" fill-opacity=".3" stroke="none"/></svg>',textAlign:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M3 11h12M3 16h15"/></svg>',muteSounds:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H3v6h3l5 4V5z"/><path d="M17 9l4 4M21 9l-4 4"/></svg>',readAloud:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 10h.01M12 10h.01M16 10h.01"/></svg>',highlightHover:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/></svg>'};function He(e,t,o,i){var s;const n=(s=Oe[e])!=null?s:"";switch(e){case"textSize":{const r=l(o,"f_textSize"),c=Ne(o,r,[{label:"100%"},{label:"112%"},{label:"125%"},{label:"140%"}],t.text,d=>{t.text=d},i);return f(n,r,c)}case"contrast":{const r=l(o,"f_contrast"),a=P(r,[{value:"off",label:l(o,"opt_off")},{value:"on",label:l(o,"opt_on")},{value:"dark",label:l(o,"opt_dark")}],t.contrast,c=>{t.contrast=c},i);return f(n,r,a)}case"saturation":{const r=l(o,"f_saturation"),a=P(r,[{value:"off",label:l(o,"opt_off")},{value:"grayscale",label:l(o,"opt_grayscale")},{value:"low",label:l(o,"opt_low")},{value:"high",label:l(o,"opt_high")}],t.saturation,c=>{t.saturation=c},i);return f(n,r,a)}case"bigCursor":{const r=l(o,"f_bigCursor"),a=P(r,[{value:"off",label:l(o,"opt_off")},{value:"black",label:l(o,"opt_black")},{value:"white",label:l(o,"opt_white")}],t.cursor,c=>{t.cursor=c},i);return f(n,r,a)}case"readingMask":{const r=l(o,"f_readingMask"),a=P(r,[{value:"off",label:l(o,"opt_off")},{value:"dim",label:l(o,"opt_dim")},{value:"tint",label:l(o,"opt_tint")}],t.mask,c=>{t.mask=c},i);return f(n,r,a)}case"lineSpacing":{const r=l(o,"f_lineSpacing");return f(n,r,y(r,t.spacing,a=>{t.spacing=a},i))}case"highlightLinks":{const r=l(o,"f_highlightLinks");return f(n,r,y(r,t.links,a=>{t.links=a},i))}case"readableFont":{const r=l(o,"f_readableFont");return f(n,r,y(r,t.font,a=>{t.font=a},i))}case"hideImages":{const r=l(o,"f_hideImages");return f(n,r,y(r,t.images,a=>{t.images=a},i))}case"stopMotion":{const r=l(o,"f_stopMotion");return f(n,r,y(r,t.stopMotion,a=>{t.stopMotion=a},i))}case"readingRuler":{const r=l(o,"f_readingRuler"),a=f(n,r,y(r,t.ruler,u=>{t.ruler=u},i)),c=Ie(l(o,"rulerColor"),t.rulerColor,[{value:"#ffd400",name:"Yellow"},{value:"#22c55e",name:"Green"},{value:"#3b82f6",name:"Blue"},{value:"#ec4899",name:"Pink"},{value:"#111827",name:"Black"}],u=>{t.rulerColor=u},i),d=document.createElement("div");return d.append(a,c),d}case"highlightTitles":{const r=l(o,"f_highlightTitles");return f(n,r,y(r,t.titles,a=>{t.titles=a},i))}case"textAlign":{const r=l(o,"f_textAlign");return f(n,r,y(r,t.align,a=>{t.align=a},i))}case"muteSounds":{const r=l(o,"f_muteSounds");return f(n,r,y(r,t.mute,a=>{t.mute=a},i))}case"readAloud":{const r=l(o,"f_readAloud");return f(n,r,y(r,t.readAloud,a=>{t.readAloud=a},i))}case"highlightHover":{const r=l(o,"f_highlightHover");return f(n,r,y(r,t.hoverHighlight,a=>{t.hoverHighlight=a},i))}default:return null}}const ce=[{key:"vision",labelKey:"profile_vision",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>',apply:e=>{e.contrast="on",e.text=3,e.cursor="black"}},{key:"lowVision",labelKey:"profile_lowVision",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.4 1.4M17.6 17.6L19 19M19 5l-1.4 1.4M6.4 17.6L5 19"/></svg>',apply:e=>{e.text=2,e.spacing=!0,e.cursor="black",e.links=!0}},{key:"dyslexia",labelKey:"profile_dyslexia",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg>',apply:e=>{e.font=!0,e.spacing=!0,e.text=1}},{key:"adhd",labelKey:"profile_adhd",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/></svg>',apply:e=>{e.stopMotion=!0,e.spacing=!0,e.links=!0}},{key:"seizure",labelKey:"profile_seizure",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3l8 3v6c0 4-3 7-8 9-5-2-8-5-8-9V6z"/></svg>',apply:e=>{e.stopMotion=!0}},{key:"senior",labelKey:"profile_senior",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',apply:e=>{e.text=2,e.spacing=!0,e.cursor="black",e.font=!0}},{key:"cognitive",labelKey:"profile_cognitive",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24A2.5 2.5 0 0 1 9.5 2z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24A2.5 2.5 0 0 0 14.5 2z"/></svg>',apply:e=>{e.mask="dim",e.spacing=!0,e.images=!0,e.stopMotion=!0}},{key:"colorBlind",labelKey:"profile_colorBlind",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 3v9M12 12l7.5 4.5" stroke-width="1.5"/><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/></svg>',apply:e=>{e.saturation="high",e.titles=!0}}];function V(e,t){if(Object.assign(e,I),t==="none")return;const o=ce.find(i=>i.key===t);o==null||o.apply(e)}function Re(e,t){try{const o=e.trim().replace(/^#/,"");let i,n,s;if(o.length===3)i=parseInt(o[0]+o[0],16),n=parseInt(o[1]+o[1],16),s=parseInt(o[2]+o[2],16);else if(o.length===6)i=parseInt(o.slice(0,2),16),n=parseInt(o.slice(2,4),16),s=parseInt(o.slice(4,6),16);else return`rgba(0,0,0,${t})`;return isNaN(i)||isNaN(n)||isNaN(s)?`rgba(0,0,0,${t})`:`rgba(${i},${n},${s},${t})`}catch{return`rgba(0,0,0,${t})`}}function $e(){let e=null,t="#ffd400";const o=n=>{e&&(e.style.top=`${n.clientY}px`)};function i(n){e&&(e.style.background=Re(n,.18),e.style.borderTop=`2px solid ${n}`,e.style.borderBottom=`2px solid ${n}`)}return{on(){e||(e=document.createElement("div"),e.setAttribute("aria-hidden","true"),e.style.cssText=["position:fixed","left:0","top:0","width:100vw","height:28px","pointer-events:none","z-index:2147483646","transform:translateY(-14px)"].join(";"),i(t),document.documentElement.appendChild(e),window.addEventListener("mousemove",o))},off(){e&&(window.removeEventListener("mousemove",o),e==null||e.remove(),e=null)},setColor(n){t=n,i(n)}}}function De(){let e=null,t=null,o=null,i="off";const n=120,s=c=>{t&&(t.style.top=`${c.clientY-n/2}px`)};function r(){window.removeEventListener("mousemove",s),e==null||e.remove(),t==null||t.remove(),o==null||o.remove(),e=null,t=null,o=null}function a(c){const d=document.createElement("div");return d.setAttribute("aria-hidden","true"),d.style.cssText=["position:fixed","left:0","top:0","width:100%","height:100%","pointer-events:none","z-index:2147483645",c].join(";"),d}return{set(c){if(c!==i&&(r(),i=c,c!=="off")){if(c==="dim"){e=a("background:rgba(0,0,0,.55)"),t=a([`height:${n}px`,"top:0","width:100%","background:transparent","z-index:2147483646"].join(";")),t.style.height=`${n}px`,document.documentElement.appendChild(e),document.documentElement.appendChild(t),window.addEventListener("mousemove",s),t.style.top=`${window.innerHeight/2-n/2}px`;return}if(c==="tint"){o=a(["background:rgba(255,250,200,.18)","z-index:2147483646"].join(";")),document.documentElement.appendChild(o);return}}}}}function Pe(e){if(!("speechSynthesis"in window))return{enable(){},disable(){},setLang(n){}};let t=e,o=!1;const i=n=>{var s,r;try{const a=n.target;if(!a||(s=a.closest)!=null&&s.call(a,"#makoya-widget-root"))return;const c=(r=a.innerText)==null?void 0:r.trim();if(!c)return;window.speechSynthesis.cancel();const d=new SpeechSynthesisUtterance(c);try{const w=window.speechSynthesis.getVoices().find(j=>j.lang.startsWith(t));w&&(d.voice=w)}catch{}window.speechSynthesis.speak(d)}catch{}};return{enable(){o||(o=!0,document.addEventListener("click",i,!0))},disable(){if(o){o=!1;try{window.speechSynthesis.cancel()}catch{}document.removeEventListener("click",i,!0)}},setLang(n){t=n}}}function Fe(){let e=!1;const t=i=>{const n=i.target;n instanceof HTMLMediaElement&&(n.muted=!0)};function o(){return Array.from(document.querySelectorAll("audio, video"))}return{enable(){if(!e){e=!0;for(const i of o())i.muted=!0;document.addEventListener("play",t,!0)}},disable(){if(e){e=!1,document.removeEventListener("play",t,!0);for(const i of o())i.muted=!1}}}}function je(){let e=null,t=!1;const o=i=>{var n;try{const s=i.target;if(!s||!e)return;if((n=s.closest)!=null&&n.call(s,"#makoya-widget-root")){e.style.opacity="0";return}const r=s.getBoundingClientRect();e.style.left=`${r.left}px`,e.style.top=`${r.top}px`,e.style.width=`${r.width}px`,e.style.height=`${r.height}px`,e.style.opacity="1"}catch{}};return{enable(){t||(t=!0,e=document.createElement("div"),e.setAttribute("aria-hidden","true"),e.style.cssText=["position:fixed","left:0","top:0","width:0","height:0","border:2px solid #1e63ff","border-radius:3px","pointer-events:none","z-index:2147483646","opacity:0","transition:top .06s ease,left .06s ease,width .06s ease,height .06s ease"].join(";"),document.documentElement.appendChild(e),window.addEventListener("mousemove",o))},disable(){t&&(t=!1,window.removeEventListener("mousemove",o),e==null||e.remove(),e=null)}}}function de(){return window.MAKOYA_CONFIG_BASE||"https://makoya-gamma.vercel.app/api/config"}function Ue(){const e=window.MAKOYA_CONFIG_TIMEOUT_MS;return typeof e=="number"&&e>0?e:5e3}async function qe(e,t){const i=`${de()}/${encodeURIComponent(e)}`+(t?`?t=${encodeURIComponent(t)}`:""),n=typeof AbortController!="undefined"?new AbortController:null,s=n?setTimeout(()=>n.abort(),Ue()):null;try{const r=await fetch(i,{cache:"default",signal:n==null?void 0:n.signal});if(!r.ok)return{active:!0,config:{}};const a=await r.json(),{active:c,...d}=a;return{active:c!==!1,config:d}}catch{return{active:!0,config:{}}}finally{s&&clearTimeout(s)}}const Ge=5*60*1e3,Ve=2e3,K=50;let S=null,Y,B=!1,ue=0,C=[],z=null,pe=!1;function Ke(){try{const e=window.MAKOYA_API_ORIGIN;return typeof e=="string"&&e?e.replace(/\/+$/,""):new URL(de()).origin}catch{try{return location.origin}catch{return null}}}function Ye(){try{if(window.MAKOYA_NO_TELEMETRY)return!0}catch{}try{if(typeof document!="undefined"&&typeof document.querySelector=="function"&&document.querySelector("script[data-no-telemetry]"))return!0}catch{}return!1}function We(e){try{S=e.siteId||null,Y=e.token,B=!!S&&typeof fetch=="function"&&!Ye(),B&&Ze()}catch{B=!1}}function he(e,t){try{if(typeof fetch!="function")return;const o=Ke();if(!o)return;const i=fetch(o+e,{method:"POST",keepalive:!0,headers:{"content-type":"application/json"},body:JSON.stringify(t),mode:"cors"});i&&typeof i.catch=="function"&&i.catch(()=>{})}catch{}}function fe(){try{if(!B||!S)return;const e=Date.now();if(e-ue<Ge)return;ue=e;let t="";try{const o=new URL(location.href);t=o.origin+o.pathname}catch{t=""}he("/api/heartbeat",{siteId:S,token:Y,url:t})}catch{}}function me(e,t){try{if(!B||!S||C.length>=K)return;C.push(t?{event:e,featureKey:t,ts:Date.now()}:{event:e,ts:Date.now()}),Xe()}catch{}}function Xe(){try{if(z)return;z=setTimeout(()=>{z=null,W()},Ve)}catch{}}function W(){try{if(z&&(clearTimeout(z),z=null),!B||!S){C=[];return}if(C.length===0)return;const e=C.slice(0,K);C=C.slice(K),he("/api/widget-events",{siteId:S,token:Y,events:e})}catch{}}function Ze(){try{if(pe)return;typeof document!="undefined"&&typeof document.addEventListener=="function"&&document.addEventListener("visibilitychange",()=>{try{document.visibilityState==="hidden"&&W()}catch{}}),typeof window!="undefined"&&typeof window.addEventListener=="function"&&window.addEventListener("pagehide",()=>{try{W()}catch{}}),pe=!0}catch{}}function Je(e){const t=new Set;return e.text!==0&&t.add("textSize"),e.spacing&&t.add("lineSpacing"),e.contrast!=="off"&&t.add("contrast"),e.stopMotion&&t.add("stopMotion"),e.ruler&&t.add("readingRuler"),e.links&&t.add("highlightLinks"),e.cursor!=="off"&&t.add("bigCursor"),e.font&&t.add("readableFont"),e.images&&t.add("hideImages"),e.saturation!=="off"&&t.add("saturation"),e.mask!=="off"&&t.add("readingMask"),e.titles&&t.add("highlightTitles"),e.align&&t.add("textAlign"),e.mute&&t.add("muteSounds"),e.readAloud&&t.add("readAloud"),e.hoverHighlight&&t.add("highlightHover"),t}const ge="makoya_lang",Qe='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',be={"bottom-right":"bottom:16px; right:16px;","bottom-left":"bottom:16px; left:16px;","top-right":"top:16px;    right:16px;","top-left":"top:16px;    left:16px;"},et={textSize:"sec_content",lineSpacing:"sec_content",readableFont:"sec_content",textAlign:"sec_content",highlightTitles:"sec_content",highlightLinks:"sec_content",hideImages:"sec_content",stopMotion:"sec_content",contrast:"sec_color",saturation:"sec_color",readingRuler:"sec_nav",readingMask:"sec_nav",bigCursor:"sec_nav",highlightHover:"sec_nav",muteSounds:"sec_audio",readAloud:"sec_audio"},tt=["sec_content","sec_color","sec_nav","sec_audio"];function ot(e){try{const t=localStorage.getItem(ge);if(t&&(t==="en"||t==="es"||t==="fr"||t==="de"))return t}catch{}return e}function nt(e){try{localStorage.setItem(ge,e)}catch{}}function rt(e){try{it(e)}catch{}}function it(e){var we,_e;const t=document.createElement("div");t.id="makoya-widget-root";const o=t.attachShadow({mode:"open"});document.documentElement.appendChild(t);const i=document.createElement("style");i.textContent=Be(e.primaryColor,e.launcherSize),o.appendChild(i);let n=ot(e.defaultLanguage);const s=(()=>{try{return localStorage.getItem(G)!==null}catch{return!1}})(),r=ae();let a="none";const c=$e(),d=De(),u=Pe(n),w=Fe(),j=je(),ye=(we=be[e.position])!=null?we:be["bottom-right"],st=e.position.startsWith("bottom"),lt=e.position.endsWith("right"),x=document.createElement("button");x.className="mky-btn",x.type="button",x.style.cssText=ye,x.setAttribute("aria-label",l(n,"title")),x.setAttribute("aria-expanded","false"),x.innerHTML=(_e=re[e.launcherIcon])!=null?_e:re.accessibility;const v=document.createElement("div");v.className="mky-panel",v.setAttribute("role","dialog"),v.setAttribute("aria-modal","true"),v.setAttribute("aria-label",e.panelTitle||l(n,"title")),v.style.cssText=[ye,st?"bottom: 84px;":"top: 84px;",lt?"right: 16px;":"left: 16px;"].filter(Boolean).join(" ");let X=null;function U(){try{se(r),c.setColor(r.rulerColor),r.ruler?c.on():c.off(),d.set(r.mask),r.readAloud?u.enable():u.disable(),u.setLang(n),r.mute?w.enable():w.disable(),r.hoverHighlight?j.enable():j.disable(),Le(r);try{const p=Je(r);if(X)for(const h of p)X.has(h)||me("feature_activated",h);X=p}catch{}}catch{}}const Z=document.createElement("div");Z.className="mky-head";const xe=document.createElement("div"),J=document.createElement("h2");J.className="mky-title";const Q=document.createElement("p");Q.className="mky-sub",xe.append(J,Q);const A=document.createElement("select");A.className="mky-lang",A.setAttribute("aria-label",l(n,"language"));for(const[p,h]of Object.entries(ze)){const b=document.createElement("option");b.value=p,b.textContent=h,b.selected=p===n,A.appendChild(b)}A.addEventListener("change",()=>{n=A.value,nt(n),u.setLang(n),ve(),$()});const M=document.createElement("button");M.className="mky-close",M.type="button",M.innerHTML=Qe,Z.append(xe,A,M);const O=document.createElement("div");O.className="mky-body";const H=document.createElement("div");H.className="mky-foot";const R=document.createElement("button");R.className="mky-reset",R.type="button",R.addEventListener("click",()=>{Object.assign(r,I),a="none",U(),$()});const ee=document.createElement("p");ee.className="mky-note",H.append(R,ee);let E=null;e.accessibilityStatementUrl&&(E=document.createElement("a"),E.className="mky-statement",E.href=e.accessibilityStatementUrl,E.target="_blank",E.rel="noopener",H.appendChild(E));let _=null;if(!e.hideBranding){_=document.createElement("p"),_.className="mky-brand";const p=document.createElement("a");p.href=e.brandingUrl,p.target="_blank",p.rel="noopener",p.textContent="Makoya",_.append("",p),H.appendChild(_)}function ve(){const p=e.panelTitle||l(n,"title");if(x.setAttribute("aria-label",p),v.setAttribute("aria-label",p),J.textContent=p,Q.textContent=l(n,"subtitle"),M.setAttribute("aria-label",l(n,"close")),A.setAttribute("aria-label",l(n,"language")),R.textContent=l(n,"reset"),ee.textContent=l(n,"note"),E&&(E.textContent=l(n,"statement")),_){const h=_.querySelector("a");h&&(_.textContent="",_.appendChild(document.createTextNode(`${l(n,"poweredBy")} `)),_.appendChild(h))}}function $(){O.innerHTML="";const p=document.createElement("div");p.className="mky-sec";const h=document.createElement("span");h.className="mky-sec-label",h.textContent=l(n,"quickProfiles");const b=document.createElement("div");b.className="mky-profiles";for(const m of ce){const g=document.createElement("button");g.type="button",g.className="mky-chip",g.setAttribute("aria-pressed",String(a===m.key));const T=l(n,m.labelKey);g.innerHTML=`${m.icon}<span>${T}</span>`,g.addEventListener("click",()=>{a===m.key?(V(r,"none"),a="none"):(V(r,m.key),a=m.key),U(),$()}),b.appendChild(g)}const D=document.createElement("div");D.className="mky-divider",p.append(h,b,D),O.appendChild(p);const L=new Map;for(const m of e.featuresEnabled){const g=et[m];g&&(L.has(g)||L.set(g,[]),L.get(g).push(m))}for(const m of tt){const g=L.get(m);if(!g||g.length===0)continue;const T=document.createElement("div");T.className="mky-sec";const ne=document.createElement("span");ne.className="mky-sec-label",ne.textContent=l(n,m),T.appendChild(ne);for(const N of g){const Ee=He(N,r,n,U);Ee&&T.appendChild(Ee)}if(m==="sec_audio"&&e.featuresEnabled.includes("readAloud")){const N=document.createElement("p");N.className="mky-note",N.style.cssText="margin: 4px 8px 8px; text-align: left;",N.textContent=l(n,"readAloudHint"),T.appendChild(N)}O.appendChild(T)}}v.append(Z,O,H);let te=!1;const oe=p=>{te=p,v.classList.toggle("open",p),x.setAttribute("aria-expanded",String(p)),p?(me("open"),requestAnimationFrame(()=>M.focus())):x.focus()};x.addEventListener("click",()=>oe(!te)),M.addEventListener("click",()=>oe(!1)),o.addEventListener("keydown",p=>{const h=p;if(te){if(h.key==="Escape"){oe(!1);return}if(h.key==="Tab"){const b=Array.from(v.querySelectorAll('button:not([disabled]), a[href], select, input, [tabindex]:not([tabindex="-1"])'));if(b.length===0)return;const D=b[0],L=b[b.length-1],m=o.activeElement;h.shiftKey&&m===D?(h.preventDefault(),L.focus()):!h.shiftKey&&m===L&&(h.preventDefault(),D.focus())}}}),o.append(x,v),ve(),$(),!s&&e.defaultProfile!=="none"&&(V(r,e.defaultProfile),a=e.defaultProfile,$()),U()}let ke=!1;function at(){const e=()=>{se(ae()),fe()},t=o=>{const i=history[o];history[o]=function(...n){const s=i.apply(this,n);return setTimeout(e,50),s}};t("pushState"),t("replaceState"),window.addEventListener("popstate",()=>setTimeout(e,50))}function F(e){if(ke||document.getElementById("makoya-widget-root"))return;ke=!0;const t=Ce(e.siteId,e),o=()=>{rt(t),at(),We({siteId:t.siteId,token:e.token}),fe()};document.readyState==="loading"?document.addEventListener("DOMContentLoaded",o,{once:!0}):o()}return window.MakoyaWidget={init:F},async function(){var t;try{const o=(t=document.currentScript)!=null?t:document.querySelector("script[data-site]");if(!o||o.hasAttribute("data-no-auto"))return;const i=o.dataset.site||"auto",n=o.dataset.token,s=o.dataset.color,r=s?{primaryColor:s}:{};if(o.hasAttribute("data-demo")){F({siteId:i,...r});return}const{active:a,config:c}=await qe(i,n);if(a===!1)return;F({...c,siteId:i,...r,token:n})}catch{}}().catch(()=>{}),q.init=F,Object.defineProperty(q,Symbol.toStringTag,{value:"Module"}),q}({});
