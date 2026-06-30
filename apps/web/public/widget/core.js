var MakoyaCore=function(be){"use strict";const Ne={accessibility:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="4" r="2"/><path d="M21 9c0 .55-.45 1-1 1h-4v11a1 1 0 0 1-2 0v-5h-4v5a1 1 0 0 1-2 0V10H4a1 1 0 0 1 0-2h16c.55 0 1 .45 1 1z"/></svg>',person:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="7" r="4"/><path d="M4 21a8 8 0 0 1 16 0 1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/></svg>',eye:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 5c-5 0-9 4.5-10 7 1 2.5 5 7 10 7s9-4.5 10-7c-1-2.5-5-7-10-7zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8z"/><circle cx="12" cy="12" r="2"/></svg>',adjust:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 7h11a3 3 0 0 1 6 0h1a1 1 0 0 1 0 2h-1a3 3 0 0 1-6 0H3a1 1 0 0 1 0-2zm6 8a3 3 0 0 1 6 0h6a1 1 0 0 1 0 2h-6a3 3 0 0 1-6 0H3a1 1 0 0 1 0-2h6z"/></svg>'},st={siteId:"unknown",primaryColor:"#2563eb",position:"bottom-right",launcherIcon:"accessibility",launcherShape:"circle",featuresEnabled:["contentScale","textSize","lineSpacing","letterSpacing","readableFont","textAlign","highlightTitles","highlightLinks","hideImages","stopMotion","contrast","saturation","textColor","titleColor","bgColor","readingMask","readingRuler","bigCursor","highlightHover","biggerTargets","focusIndicator","magnifier","readMode","usefulLinks","pageStructure","keyboardNav","virtualKeyboard","voiceNav","muteSounds","readAloud","dictionary","feedbackForm","hideInterface","userGuide","aiSimplify"],hideBranding:!1,brandingUrl:"https://makoya.example/scan",launcherSize:"md",defaultProfile:"none",accessibilityStatementUrl:"",defaultLanguage:"en",panelTitle:"",customTriggerSelector:"",domObserverEnabled:!0,inheritFonts:!1,mobileEnabled:!0,offsetX:0,offsetY:0,aiSimplifyEnabled:!1};function ze(e,t,o){return Math.max(t,Math.min(o,e))}function ct(e,t){const o={...st,...t!=null?t:{},siteId:e};return typeof o.offsetX=="number"&&(o.offsetX=ze(o.offsetX,-200,200)),typeof o.offsetY=="number"&&(o.offsetY=ze(o.offsetY,-200,200)),o}const Re="makoya-effects",dt=`
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
`;function ut(){if(document.getElementById(Re))return;const e=document.createElement("style");e.id=Re,e.textContent=dt,document.head.appendChild(e)}function C(e,t){const o=document.documentElement;t===null?o.removeAttribute(e):o.setAttribute(e,t)}function U(e,t){const o=document.documentElement;t===null?o.style.removeProperty(e):o.style.setProperty(e,t)}const ye="makoya_prefs",ie={contentScale:100,fontScale:100,lineHeightPct:100,letterSpacingPct:0,contrast:"off",stopMotion:!1,ruler:!1,links:!1,cursor:"off",font:"off",images:!1,saturation:"off",mask:"off",titles:!1,textAlign:"off",mute:!1,readAloud:!1,rulerColor:"#ffd400",hoverHighlight:!1,biggerTargets:!1,focusIndicator:!1,textColor:"",titleColor:"",bgColor:"",magnifier:!1,readMode:!1,usefulLinks:!1,pageStructure:!1,keyboardNav:!1,virtualKeyboard:!1,voiceNav:!1,dictionary:!1};function ft(e){if(!e||typeof e!="object")return{};const t={...e};return"text"in t&&(t.fontScale===void 0&&(t.text===1?t.fontScale=110:t.text===2?t.fontScale=130:t.text===3&&(t.fontScale=140)),delete t.text),"spacing"in t&&(t.spacing===!0&&(t.lineHeightPct===void 0&&(t.lineHeightPct=180),t.letterSpacingPct===void 0&&(t.letterSpacingPct=5)),delete t.spacing),"align"in t&&(t.align===!0&&t.textAlign===void 0&&(t.textAlign="left"),delete t.align),typeof t.font=="boolean"&&(t.font=t.font?"readable":"off"),t}function Ie(){try{const e=localStorage.getItem(ye);return e?{...ie,...ft(JSON.parse(e))}:{...ie}}catch{return{...ie}}}function pt(e){try{localStorage.setItem(ye,JSON.stringify(e))}catch{}}function Be(e){ut();const t=(h,M)=>typeof h=="number"&&Number.isFinite(h)?h:M,o=t(e.contentScale,100),i=t(e.fontScale,100),r=t(e.lineHeightPct,100),s=t(e.letterSpacingPct,0),n=o!==100;U("--mky-zoom",n?String(o/100):null),C("data-mky-zoom",n?"on":null);const a=i!==100;U("--mky-font-scale",a?String(i/100):null),C("data-mky-fontscale",a?"on":null);const l=r!==100;U("--mky-line-height",l?String(r/100):null),C("data-mky-lh",l?"on":null);const c=s!==0;U("--mky-letter-spacing",c?`${s*.01}em`:null),C("data-mky-ls",c?"on":null),C("data-mky-contrast",e.contrast==="off"?null:e.contrast),C("data-mky-sat",e.saturation==="off"?null:e.saturation);const u=e.contrast!=="dark"&&e.contrast!=="light",f=u&&e.textColor!=="";U("--mky-text-color",f?e.textColor:null),C("data-mky-textcolor",f?"on":null);const p=u&&e.titleColor!=="";U("--mky-title-color",p?e.titleColor:null),C("data-mky-titlecolor",p?"on":null);const b=u&&e.bgColor!=="";U("--mky-bg-color",b?e.bgColor:null),C("data-mky-bgcolor",b?"on":null),C("data-mky-motion",e.stopMotion?"off":null),C("data-mky-links",e.links?"on":null),C("data-mky-cursor",e.cursor==="off"?null:e.cursor),C("data-mky-font",e.font==="off"?null:e.font),C("data-mky-images",e.images?"off":null),C("data-mky-titles",e.titles?"on":null),C("data-mky-align",e.textAlign==="off"?null:e.textAlign),C("data-mky-targets",e.biggerTargets?"on":null),C("data-mky-focus",e.focusIndicator?"on":null)}const mt={sm:48,md:56,lg:64};function ht(e,t){const o=mt[t],i=Math.round(o*.5/2)*2;return`
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
`}const gt={en:"English",es:"Español",fr:"Français",de:"Deutsch"},He={en:{title:"Accessibility",subtitle:"Adjust this page to your needs",quickProfiles:"Quick profiles",profile_vision:"Vision impaired",profile_lowVision:"Low vision",profile_dyslexia:"Dyslexia",profile_adhd:"ADHD / Focus",profile_seizure:"Seizure safe",profile_senior:"Senior",profile_cognitive:"Cognitive",profile_colorBlind:"Color blind",profile_motorTremor:"Motor / tremor",profile_eslReading:"Easy reading",profile_keyboardNav:"Keyboard nav",profile_clearReading:"Clear reading",sec_content:"Content",sec_color:"Color",sec_nav:"Navigation",sec_audio:"Audio",sec_about:"About",f_contentScale:"Page zoom",f_textSize:"Text size",f_lineSpacing:"Line spacing",f_letterSpacing:"Letter spacing",f_contrast:"Contrast",f_stopMotion:"Pause animations",f_readingRuler:"Reading ruler",f_highlightLinks:"Highlight links",f_bigCursor:"Cursor size",f_readableFont:"Readable font",f_hideImages:"Hide images",f_saturation:"Color saturation",f_readingMask:"Reading mask",f_highlightTitles:"Highlight titles",f_textAlign:"Left-align text",f_muteSounds:"Mute sounds",f_readAloud:"Read aloud",f_highlightHover:"Highlight on hover",f_biggerTargets:"Bigger tap targets",f_focusIndicator:"Enhanced focus",f_readMode:"Reading mode",readModeEmpty:"We couldn't build a reading view for this page.",rulerColor:"Ruler color",opt_off:"Off",opt_on:"On",opt_light:"Light",opt_dark:"Dark",opt_grayscale:"Grayscale",opt_low:"Low",opt_high:"High",opt_dim:"Dim",opt_tint:"Tint",opt_black:"Black",opt_white:"White",opt_left:"Left",opt_center:"Center",opt_right:"Right",opt_justify:"Justify",opt_readable:"Readable",opt_dyslexic:"Dyslexic",decrease:"Decrease",increase:"Increase",reset:"Reset all",note:"Changes affect your view only — they don't alter the website.",poweredBy:"Powered by",statement:"Accessibility statement",language:"Language",close:"Close",readAloudHint:"Click any text on the page to hear it read aloud.",f_textColor:"Text color",f_titleColor:"Title color",f_bgColor:"Background color",f_magnifier:"Text magnifier",f_usefulLinks:"Useful links",f_pageStructure:"Page structure",f_keyboardNav:"Keyboard navigation",f_virtualKeyboard:"Virtual keyboard",f_voiceNav:"Voice navigation",f_dictionary:"Dictionary",f_feedbackForm:"Feedback",f_hideInterface:"Hide interface",f_userGuide:"User guide",f_aiSimplify:"Simplify text",sec_tools:"Tools",dict_loading:"Looking up…",dict_none:"No definition found.",nav_none:"Nothing found on this page.",kn_hint:"Use Alt + M / H / F / B / G to jump between regions.",guide_body:"Pick a quick profile, or turn on individual tools. Changes affect only your view of this page and are saved on your device. Press Esc to close any tool.",fb_open:"Report an issue",fb_msgLabel:"What's the problem?",fb_emailLabel:"Your email (optional)",fb_send:"Send",fb_sending:"Sending…",fb_sent:"Thanks — your feedback was sent.",fb_failed:"Couldn't send right now. Please try again later."},es:{title:"Accesibilidad",subtitle:"Ajusta esta página a tus necesidades",quickProfiles:"Perfiles rápidos",profile_vision:"Visión reducida",profile_lowVision:"Baja visión",profile_dyslexia:"Dislexia",profile_adhd:"TDAH / Enfoque",profile_seizure:"Seguro para epilepsia",profile_senior:"Adulto mayor",profile_cognitive:"Cognitivo",profile_colorBlind:"Daltonismo",profile_motorTremor:"Motor / temblor",profile_eslReading:"Lectura fácil",profile_keyboardNav:"Navegación teclado",profile_clearReading:"Lectura clara",sec_content:"Contenido",sec_color:"Color",sec_nav:"Navegación",sec_audio:"Audio",sec_about:"Acerca de",f_contentScale:"Zoom de página",f_textSize:"Tamaño de texto",f_lineSpacing:"Interlineado",f_letterSpacing:"Espaciado de letras",f_contrast:"Contraste",f_stopMotion:"Pausar animaciones",f_readingRuler:"Regla de lectura",f_highlightLinks:"Resaltar enlaces",f_bigCursor:"Tamaño del cursor",f_readableFont:"Fuente legible",f_hideImages:"Ocultar imágenes",f_saturation:"Saturación de color",f_readingMask:"Máscara de lectura",f_highlightTitles:"Resaltar títulos",f_textAlign:"Alinear texto a la izquierda",f_muteSounds:"Silenciar sonidos",f_readAloud:"Leer en voz alta",f_highlightHover:"Resaltar al pasar el cursor",f_biggerTargets:"Áreas táctiles más grandes",f_focusIndicator:"Foco mejorado",f_readMode:"Modo lectura",readModeEmpty:"No pudimos crear una vista de lectura para esta página.",rulerColor:"Color de la regla",opt_off:"Apagado",opt_on:"Encendido",opt_light:"Claro",opt_dark:"Oscuro",opt_grayscale:"Escala de grises",opt_low:"Bajo",opt_high:"Alto",opt_dim:"Tenue",opt_tint:"Tinte",opt_black:"Negro",opt_white:"Blanco",opt_left:"Izquierda",opt_center:"Centro",opt_right:"Derecha",opt_justify:"Justificado",opt_readable:"Legible",opt_dyslexic:"Disléxica",decrease:"Disminuir",increase:"Aumentar",reset:"Restablecer todo",note:"Los cambios solo afectan tu vista — no modifican el sitio web.",poweredBy:"Desarrollado por",statement:"Declaración de accesibilidad",language:"Idioma",close:"Cerrar",readAloudHint:"Haz clic en cualquier texto de la página para escucharlo.",f_textColor:"Color del texto",f_titleColor:"Color de títulos",f_bgColor:"Color de fondo",f_magnifier:"Lupa de texto",f_usefulLinks:"Enlaces útiles",f_pageStructure:"Estructura de la página",f_keyboardNav:"Navegación por teclado",f_virtualKeyboard:"Teclado virtual",f_voiceNav:"Navegación por voz",f_dictionary:"Diccionario",f_feedbackForm:"Comentarios",f_hideInterface:"Ocultar interfaz",f_userGuide:"Guía de uso",f_aiSimplify:"Simplificar texto",sec_tools:"Herramientas",dict_loading:"Buscando…",dict_none:"No se encontró definición.",nav_none:"No se encontró nada en esta página.",kn_hint:"Usa Alt + M / H / F / B / G para saltar entre regiones.",guide_body:"Elige un perfil rápido o activa herramientas individuales. Los cambios solo afectan a tu vista de esta página y se guardan en tu dispositivo. Pulsa Esc para cerrar cualquier herramienta.",fb_open:"Informar de un problema",fb_msgLabel:"¿Cuál es el problema?",fb_emailLabel:"Tu correo (opcional)",fb_send:"Enviar",fb_sending:"Enviando…",fb_sent:"Gracias — tus comentarios se enviaron.",fb_failed:"No se pudo enviar ahora. Inténtalo más tarde."},fr:{title:"Accessibilité",subtitle:"Adaptez cette page à vos besoins",quickProfiles:"Profils rapides",profile_vision:"Déficience visuelle",profile_lowVision:"Basse vision",profile_dyslexia:"Dyslexie",profile_adhd:"TDAH / Concentration",profile_seizure:"Épilepsie",profile_senior:"Senior",profile_cognitive:"Cognitif",profile_colorBlind:"Daltonisme",profile_motorTremor:"Moteur / tremblements",profile_eslReading:"Lecture facile",profile_keyboardNav:"Navigation clavier",profile_clearReading:"Lecture claire",sec_content:"Contenu",sec_color:"Couleur",sec_nav:"Navigation",sec_audio:"Audio",sec_about:"À propos",f_contentScale:"Zoom de la page",f_textSize:"Taille du texte",f_lineSpacing:"Interligne",f_letterSpacing:"Espacement des lettres",f_contrast:"Contraste",f_stopMotion:"Pause animations",f_readingRuler:"Règle de lecture",f_highlightLinks:"Surligner les liens",f_bigCursor:"Taille du curseur",f_readableFont:"Police lisible",f_hideImages:"Masquer les images",f_saturation:"Saturation des couleurs",f_readingMask:"Masque de lecture",f_highlightTitles:"Surligner les titres",f_textAlign:"Aligner le texte à gauche",f_muteSounds:"Couper les sons",f_readAloud:"Lecture à voix haute",f_highlightHover:"Surligner au survol",f_biggerTargets:"Zones tactiles agrandies",f_focusIndicator:"Focus amélioré",f_readMode:"Mode lecture",readModeEmpty:"Nous n'avons pas pu créer une vue de lecture pour cette page.",rulerColor:"Couleur de la règle",opt_off:"Désactivé",opt_on:"Activé",opt_light:"Clair",opt_dark:"Sombre",opt_grayscale:"Niveaux de gris",opt_low:"Faible",opt_high:"Élevé",opt_dim:"Tamisé",opt_tint:"Teinte",opt_black:"Noir",opt_white:"Blanc",opt_left:"Gauche",opt_center:"Centre",opt_right:"Droite",opt_justify:"Justifié",opt_readable:"Lisible",opt_dyslexic:"Dyslexique",decrease:"Diminuer",increase:"Augmenter",reset:"Tout réinitialiser",note:"Les modifications n'affectent que votre affichage — elles ne modifient pas le site.",poweredBy:"Propulsé par",statement:"Déclaration d'accessibilité",language:"Langue",close:"Fermer",readAloudHint:"Cliquez sur n'importe quel texte de la page pour l'entendre.",f_textColor:"Couleur du texte",f_titleColor:"Couleur des titres",f_bgColor:"Couleur de fond",f_magnifier:"Loupe de texte",f_usefulLinks:"Liens utiles",f_pageStructure:"Structure de la page",f_keyboardNav:"Navigation au clavier",f_virtualKeyboard:"Clavier virtuel",f_voiceNav:"Navigation vocale",f_dictionary:"Dictionnaire",f_feedbackForm:"Commentaires",f_hideInterface:"Masquer l'interface",f_userGuide:"Guide d'utilisation",f_aiSimplify:"Simplifier le texte",sec_tools:"Outils",dict_loading:"Recherche…",dict_none:"Aucune définition trouvée.",nav_none:"Rien trouvé sur cette page.",kn_hint:"Utilisez Alt + M / H / F / B / G pour passer d'une zone à l'autre.",guide_body:"Choisissez un profil rapide ou activez des outils individuels. Les changements n'affectent que votre affichage de cette page et sont enregistrés sur votre appareil. Appuyez sur Échap pour fermer un outil.",fb_open:"Signaler un problème",fb_msgLabel:"Quel est le problème ?",fb_emailLabel:"Votre e-mail (facultatif)",fb_send:"Envoyer",fb_sending:"Envoi…",fb_sent:"Merci — vos commentaires ont été envoyés.",fb_failed:"Envoi impossible pour le moment. Réessayez plus tard."},de:{title:"Barrierefreiheit",subtitle:"Passen Sie diese Seite Ihren Bedürfnissen an",quickProfiles:"Schnellprofile",profile_vision:"Sehbeeinträchtigung",profile_lowVision:"Schwachsichtigkeit",profile_dyslexia:"Legasthenie",profile_adhd:"ADHS / Fokus",profile_seizure:"Epilepsiesicher",profile_senior:"Senioren",profile_cognitive:"Kognitiv",profile_colorBlind:"Farbenblindheit",profile_motorTremor:"Motorik / Zittern",profile_eslReading:"Einfaches Lesen",profile_keyboardNav:"Tastaturnavigation",profile_clearReading:"Klares Lesen",sec_content:"Inhalt",sec_color:"Farbe",sec_nav:"Navigation",sec_audio:"Audio",sec_about:"Über",f_contentScale:"Seitenzoom",f_textSize:"Textgröße",f_lineSpacing:"Zeilenabstand",f_letterSpacing:"Zeichenabstand",f_contrast:"Kontrast",f_stopMotion:"Animationen anhalten",f_readingRuler:"Leselineal",f_highlightLinks:"Links hervorheben",f_bigCursor:"Zeigergröße",f_readableFont:"Lesbare Schrift",f_hideImages:"Bilder ausblenden",f_saturation:"Farbsättigung",f_readingMask:"Lesemaske",f_highlightTitles:"Überschriften hervorheben",f_textAlign:"Text linksbündig",f_muteSounds:"Töne stummschalten",f_readAloud:"Vorlesen",f_highlightHover:"Beim Überfahren hervorheben",f_biggerTargets:"Größere Tippziele",f_focusIndicator:"Verbesserter Fokus",f_readMode:"Lesemodus",readModeEmpty:"Für diese Seite konnte keine Leseansicht erstellt werden.",rulerColor:"Linealfarbe",opt_off:"Aus",opt_on:"An",opt_light:"Hell",opt_dark:"Dunkel",opt_grayscale:"Graustufen",opt_low:"Niedrig",opt_high:"Hoch",opt_dim:"Gedämpft",opt_tint:"Tönung",opt_black:"Schwarz",opt_white:"Weiß",opt_left:"Links",opt_center:"Zentriert",opt_right:"Rechts",opt_justify:"Blocksatz",opt_readable:"Lesbar",opt_dyslexic:"Legasthenie",decrease:"Verringern",increase:"Erhöhen",reset:"Alles zurücksetzen",note:"Änderungen wirken sich nur auf Ihre Ansicht aus — die Website wird nicht verändert.",poweredBy:"Bereitgestellt von",statement:"Barrierefreiheitserklärung",language:"Sprache",close:"Schließen",readAloudHint:"Klicken Sie auf beliebigen Text auf der Seite, um ihn vorlesen zu lassen.",f_textColor:"Textfarbe",f_titleColor:"Titelfarbe",f_bgColor:"Hintergrundfarbe",f_magnifier:"Textlupe",f_usefulLinks:"Nützliche Links",f_pageStructure:"Seitenstruktur",f_keyboardNav:"Tastaturnavigation",f_virtualKeyboard:"Bildschirmtastatur",f_voiceNav:"Sprachnavigation",f_dictionary:"Wörterbuch",f_feedbackForm:"Feedback",f_hideInterface:"Oberfläche ausblenden",f_userGuide:"Anleitung",f_aiSimplify:"Text vereinfachen",sec_tools:"Werkzeuge",dict_loading:"Wird gesucht…",dict_none:"Keine Definition gefunden.",nav_none:"Auf dieser Seite nichts gefunden.",kn_hint:"Mit Alt + M / H / F / B / G zwischen Bereichen springen.",guide_body:"Wählen Sie ein Schnellprofil oder aktivieren Sie einzelne Werkzeuge. Änderungen betreffen nur Ihre Ansicht dieser Seite und werden auf Ihrem Gerät gespeichert. Drücken Sie Esc, um ein Werkzeug zu schließen.",fb_open:"Problem melden",fb_msgLabel:"Was ist das Problem?",fb_emailLabel:"Ihre E-Mail (optional)",fb_send:"Senden",fb_sending:"Wird gesendet…",fb_sent:"Danke — Ihr Feedback wurde gesendet.",fb_failed:"Senden derzeit nicht möglich. Bitte später erneut versuchen."}};function d(e,t){var o,i;return(i=(o=He[e])==null?void 0:o[t])!=null?i:He.en[t]}function g(e,t,o){const i=document.createElement("div");i.className="mky-row";const r=document.createElement("span");r.className="mky-label",r.innerHTML=e;const s=document.createElement("span");return s.textContent=t,r.appendChild(s),i.append(r,o),i}function E(e,t,o,i){const r=document.createElement("button");return r.className="mky-switch",r.type="button",r.setAttribute("role","switch"),r.setAttribute("aria-label",e),r.setAttribute("aria-pressed",String(t)),r.addEventListener("click",()=>{const n=!(r.getAttribute("aria-pressed")==="true");o(n),r.setAttribute("aria-pressed",String(n)),i()}),r}function J(e,t,o,i,r){const s=document.createElement("div");s.className="mky-seg",s.setAttribute("role","group"),s.setAttribute("aria-label",e);const n=[],a=l=>n.forEach(c=>c.setAttribute("aria-pressed",String(c.dataset.val===l)));for(const l of t){const c=document.createElement("button");c.type="button",c.textContent=l.label,c.dataset.val=l.value,c.setAttribute("aria-pressed",String(l.value===o)),c.addEventListener("click",()=>{i(l.value),a(l.value),r()}),n.push(c),s.appendChild(c)}return s}function de(e,t,o,i,r,s,n,a){const l=document.createElement("div");l.className="mky-stepper";const c=document.createElement("button");c.className="mky-step",c.type="button",c.textContent="−",c.setAttribute("aria-label",`${d(e,"decrease")} ${t}`);const u=document.createElement("span");u.className="mky-stepval",u.setAttribute("role","status"),u.setAttribute("aria-live","polite");const f=document.createElement("button");f.className="mky-step",f.type="button",f.textContent="+",f.setAttribute("aria-label",`${d(e,"increase")} ${t}`);let p=o;const b=()=>{u.textContent=`${p}%`,c.disabled=p<=i,f.disabled=p>=r};return b(),c.addEventListener("click",()=>{p<=i||(p=Math.max(i,p-s),n(p),b(),a())}),f.addEventListener("click",()=>{p>=r||(p=Math.min(r,p+s),n(p),b(),a())}),l.append(c,u,f),l}function ue(e,t,o,i,r){const s=document.createElement("div");s.className="mky-palette",s.setAttribute("role","group"),s.setAttribute("aria-label",e);const n=document.createElement("span");n.className="mky-palette-label",n.textContent=e,s.appendChild(n);const a=[];function l(c){a.forEach(u=>u.setAttribute("aria-pressed",String(u.dataset.swatchValue===c)))}for(const c of o){const u=document.createElement("button");u.type="button",u.className="mky-swatch",u.style.background=c.value,u.dataset.swatchValue=c.value,u.setAttribute("aria-label",`${e}: ${c.name}`),u.setAttribute("aria-pressed",String(c.value===t)),u.addEventListener("click",()=>{i(c.value),l(c.value),r()}),a.push(u),s.appendChild(u)}return s}const bt={textSize:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg>',lineSpacing:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',contrast:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/></svg>',stopMotion:'<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>',readingRuler:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="9" width="18" height="6" rx="1.5"/><path d="M7.5 9v3M12 9v3M16.5 9v3"/></svg>',highlightLinks:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.07 0l2-2a5 5 0 0 0-7.07-7.07l-1 1"/><path d="M14 11a5 5 0 0 0-7.07 0l-2 2A5 5 0 0 0 12 20.07l1-1"/></svg>',bigCursor:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M5 3l6.5 17 2.2-7.3L21 10.5 5 3z"/></svg>',readableFont:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 20l4-12 4 12M6.5 16h5M14 11c0-1.7 1.3-3 3-3s3 1.3 3 3v9"/></svg>',hideImages:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 16l5-5 3 3M3 3l18 18"/></svg>',saturation:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 3v9l6 3.5" stroke-width="1.5"/><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/></svg>',readingMask:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="5" rx="1" fill="currentColor" fill-opacity=".25"/><rect x="2" y="10" width="20" height="4" rx="1"/><rect x="2" y="16" width="20" height="5" rx="1" fill="currentColor" fill-opacity=".25"/></svg>',highlightTitles:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16M4 12h10"/><rect x="3" y="16" width="18" height="3" rx="1" fill="currentColor" fill-opacity=".3" stroke="none"/></svg>',textAlign:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M3 11h12M3 16h15"/></svg>',muteSounds:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H3v6h3l5 4V5z"/><path d="M17 9l4 4M21 9l-4 4"/></svg>',readAloud:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 10h.01M12 10h.01M16 10h.01"/></svg>',highlightHover:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/></svg>',biggerTargets:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="12" cy="12" r="3" fill="currentColor" fill-opacity=".25"/><path d="M12 9v6M9 12h6" stroke-width="1.5"/></svg>',focusIndicator:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/></svg>'},Oe=[{value:"",name:"Off"},{value:"#000000",name:"Black"},{value:"#1f2937",name:"Dark gray"},{value:"#1e3a8a",name:"Navy"},{value:"#14532d",name:"Dark green"},{value:"#7f1d1d",name:"Maroon"},{value:"#581c87",name:"Purple"}],yt=[{value:"",name:"Off"},{value:"#ffffff",name:"White"},{value:"#fdf6e3",name:"Cream"},{value:"#f1f5f9",name:"Light gray"},{value:"#fefce8",name:"Pale yellow"},{value:"#eff6ff",name:"Pale blue"},{value:"#f0fdf4",name:"Pale green"}];function kt(e,t,o,i){var s;const r=(s=bt[e])!=null?s:"";switch(e){case"contentScale":{const n=d(o,"f_contentScale");return g(r,n,de(o,n,t.contentScale,70,150,10,a=>{t.contentScale=a},i))}case"textSize":{const n=d(o,"f_textSize");return g(r,n,de(o,n,t.fontScale,80,200,10,a=>{t.fontScale=a},i))}case"lineSpacing":{const n=d(o,"f_lineSpacing");return g(r,n,de(o,n,t.lineHeightPct,100,250,10,a=>{t.lineHeightPct=a},i))}case"letterSpacing":{const n=d(o,"f_letterSpacing");return g(r,n,de(o,n,t.letterSpacingPct,0,50,5,a=>{t.letterSpacingPct=a},i))}case"contrast":{const n=d(o,"f_contrast"),a=J(n,[{value:"off",label:d(o,"opt_off")},{value:"on",label:d(o,"opt_on")},{value:"light",label:d(o,"opt_light")},{value:"dark",label:d(o,"opt_dark")},{value:"high",label:d(o,"opt_high")}],t.contrast,l=>{t.contrast=l},i);return g(r,n,a)}case"textAlign":{const n=d(o,"f_textAlign"),a=J(n,[{value:"off",label:d(o,"opt_off")},{value:"left",label:d(o,"opt_left")},{value:"center",label:d(o,"opt_center")},{value:"right",label:d(o,"opt_right")},{value:"justify",label:d(o,"opt_justify")}],t.textAlign,l=>{t.textAlign=l},i);return g(r,n,a)}case"readableFont":{const n=d(o,"f_readableFont"),a=J(n,[{value:"off",label:d(o,"opt_off")},{value:"readable",label:d(o,"opt_readable")},{value:"dyslexic",label:d(o,"opt_dyslexic")}],t.font,l=>{t.font=l},i);return g(r,n,a)}case"saturation":{const n=d(o,"f_saturation"),a=J(n,[{value:"off",label:d(o,"opt_off")},{value:"grayscale",label:d(o,"opt_grayscale")},{value:"low",label:d(o,"opt_low")},{value:"high",label:d(o,"opt_high")}],t.saturation,l=>{t.saturation=l},i);return g(r,n,a)}case"bigCursor":{const n=d(o,"f_bigCursor"),a=J(n,[{value:"off",label:d(o,"opt_off")},{value:"black",label:d(o,"opt_black")},{value:"white",label:d(o,"opt_white")}],t.cursor,l=>{t.cursor=l},i);return g(r,n,a)}case"readingMask":{const n=d(o,"f_readingMask"),a=J(n,[{value:"off",label:d(o,"opt_off")},{value:"dim",label:d(o,"opt_dim")},{value:"tint",label:d(o,"opt_tint")}],t.mask,l=>{t.mask=l},i);return g(r,n,a)}case"highlightLinks":{const n=d(o,"f_highlightLinks");return g(r,n,E(n,t.links,a=>{t.links=a},i))}case"hideImages":{const n=d(o,"f_hideImages");return g(r,n,E(n,t.images,a=>{t.images=a},i))}case"stopMotion":{const n=d(o,"f_stopMotion");return g(r,n,E(n,t.stopMotion,a=>{t.stopMotion=a},i))}case"readingRuler":{const n=d(o,"f_readingRuler"),a=g(r,n,E(n,t.ruler,u=>{t.ruler=u},i)),l=ue(d(o,"rulerColor"),t.rulerColor,[{value:"#ffd400",name:"Yellow"},{value:"#22c55e",name:"Green"},{value:"#3b82f6",name:"Blue"},{value:"#ec4899",name:"Pink"},{value:"#111827",name:"Black"}],u=>{t.rulerColor=u},i),c=document.createElement("div");return c.append(a,l),c}case"highlightTitles":{const n=d(o,"f_highlightTitles");return g(r,n,E(n,t.titles,a=>{t.titles=a},i))}case"muteSounds":{const n=d(o,"f_muteSounds");return g(r,n,E(n,t.mute,a=>{t.mute=a},i))}case"readAloud":{const n=d(o,"f_readAloud");return g(r,n,E(n,t.readAloud,a=>{t.readAloud=a},i))}case"highlightHover":{const n=d(o,"f_highlightHover");return g(r,n,E(n,t.hoverHighlight,a=>{t.hoverHighlight=a},i))}case"biggerTargets":{const n=d(o,"f_biggerTargets");return g(r,n,E(n,t.biggerTargets,a=>{t.biggerTargets=a},i))}case"focusIndicator":{const n=d(o,"f_focusIndicator");return g(r,n,E(n,t.focusIndicator,a=>{t.focusIndicator=a},i))}case"textColor":{const n=d(o,"f_textColor");return ue(n,t.textColor,Oe,a=>{t.textColor=a},i)}case"titleColor":{const n=d(o,"f_titleColor");return ue(n,t.titleColor,Oe,a=>{t.titleColor=a},i)}case"bgColor":{const n=d(o,"f_bgColor");return ue(n,t.bgColor,yt,a=>{t.bgColor=a},i)}case"magnifier":{const n=d(o,"f_magnifier");return g(r,n,E(n,t.magnifier,a=>{t.magnifier=a},i))}case"readMode":{const n=d(o,"f_readMode");return g(r,n,E(n,t.readMode,a=>{t.readMode=a},i))}case"usefulLinks":{const n=d(o,"f_usefulLinks");return g(r,n,E(n,t.usefulLinks,a=>{t.usefulLinks=a},i))}case"pageStructure":{const n=d(o,"f_pageStructure");return g(r,n,E(n,t.pageStructure,a=>{t.pageStructure=a},i))}case"keyboardNav":{const n=d(o,"f_keyboardNav");return g(r,n,E(n,t.keyboardNav,a=>{t.keyboardNav=a},i))}case"virtualKeyboard":{const n=d(o,"f_virtualKeyboard");return g(r,n,E(n,t.virtualKeyboard,a=>{t.virtualKeyboard=a},i))}case"voiceNav":{const n=d(o,"f_voiceNav");return g(r,n,E(n,t.voiceNav,a=>{t.voiceNav=a},i))}case"dictionary":{const n=d(o,"f_dictionary");return g(r,n,E(n,t.dictionary,a=>{t.dictionary=a},i))}default:return null}}const Pe=[{key:"vision",labelKey:"profile_vision",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>',apply:e=>{e.contrast="on",e.fontScale=140,e.cursor="black"}},{key:"lowVision",labelKey:"profile_lowVision",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.4 1.4M17.6 17.6L19 19M19 5l-1.4 1.4M6.4 17.6L5 19"/></svg>',apply:e=>{e.fontScale=130,e.lineHeightPct=180,e.letterSpacingPct=5,e.cursor="black",e.links=!0}},{key:"dyslexia",labelKey:"profile_dyslexia",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg>',apply:e=>{e.font="dyslexic",e.lineHeightPct=180,e.letterSpacingPct=5,e.fontScale=110}},{key:"adhd",labelKey:"profile_adhd",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/></svg>',apply:e=>{e.stopMotion=!0,e.lineHeightPct=180,e.letterSpacingPct=5,e.links=!0}},{key:"seizure",labelKey:"profile_seizure",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3l8 3v6c0 4-3 7-8 9-5-2-8-5-8-9V6z"/></svg>',apply:e=>{e.stopMotion=!0}},{key:"senior",labelKey:"profile_senior",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',apply:e=>{e.fontScale=130,e.lineHeightPct=180,e.letterSpacingPct=5,e.cursor="black",e.font="readable"}},{key:"cognitive",labelKey:"profile_cognitive",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24A2.5 2.5 0 0 1 9.5 2z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24A2.5 2.5 0 0 0 14.5 2z"/></svg>',apply:e=>{e.mask="dim",e.lineHeightPct=180,e.letterSpacingPct=5,e.images=!0,e.stopMotion=!0}},{key:"colorBlind",labelKey:"profile_colorBlind",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 3v9M12 12l7.5 4.5" stroke-width="1.5"/><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/></svg>',apply:e=>{e.saturation="high",e.titles=!0}},{key:"motorTremor",labelKey:"profile_motorTremor",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>',apply:e=>{e.cursor="black",e.biggerTargets=!0,e.stopMotion=!0}},{key:"eslReading",labelKey:"profile_eslReading",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',apply:e=>{e.font="readable",e.lineHeightPct=180,e.letterSpacingPct=5,e.ruler=!0}},{key:"keyboardNav",labelKey:"profile_keyboardNav",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8"/></svg>',apply:e=>{e.keyboardNav=!0,e.focusIndicator=!0,e.biggerTargets=!0}},{key:"clearReading",labelKey:"profile_clearReading",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M9 7h7M9 11h5"/></svg>',apply:e=>{e.font="readable",e.titles=!0,e.links=!0}}];function ke(e,t){if(Object.assign(e,ie),t==="none")return;const o=Pe.find(i=>i.key===t);o==null||o.apply(e)}function xt(e,t){try{const o=e.trim().replace(/^#/,"");let i,r,s;if(o.length===3)i=parseInt(o[0]+o[0],16),r=parseInt(o[1]+o[1],16),s=parseInt(o[2]+o[2],16);else if(o.length===6)i=parseInt(o.slice(0,2),16),r=parseInt(o.slice(2,4),16),s=parseInt(o.slice(4,6),16);else return`rgba(0,0,0,${t})`;return isNaN(i)||isNaN(r)||isNaN(s)?`rgba(0,0,0,${t})`:`rgba(${i},${r},${s},${t})`}catch{return`rgba(0,0,0,${t})`}}function vt(){let e=null,t="#ffd400";const o=r=>{e&&(e.style.top=`${r.clientY}px`)};function i(r){e&&(e.style.background=xt(r,.18),e.style.borderTop=`2px solid ${r}`,e.style.borderBottom=`2px solid ${r}`)}return{on(){e||(e=document.createElement("div"),e.setAttribute("aria-hidden","true"),e.style.cssText=["position:fixed","left:0","top:0","width:100vw","height:28px","pointer-events:none","z-index:2147483646","transform:translateY(-14px)"].join(";"),i(t),document.documentElement.appendChild(e),window.addEventListener("mousemove",o))},off(){e&&(window.removeEventListener("mousemove",o),e==null||e.remove(),e=null)},setColor(r){t=r,i(r)}}}function wt(){let e=null,t=null,o=null,i="off";const r=120,s=l=>{t&&(t.style.top=`${l.clientY-r/2}px`)};function n(){window.removeEventListener("mousemove",s),e==null||e.remove(),t==null||t.remove(),o==null||o.remove(),e=null,t=null,o=null}function a(l){const c=document.createElement("div");return c.setAttribute("aria-hidden","true"),c.style.cssText=["position:fixed","left:0","top:0","width:100%","height:100%","pointer-events:none","z-index:2147483645",l].join(";"),c}return{set(l){if(l!==i&&(n(),i=l,l!=="off")){if(l==="dim"){e=a("background:rgba(0,0,0,.55)"),t=a([`height:${r}px`,"top:0","width:100%","background:transparent","z-index:2147483646"].join(";")),t.style.height=`${r}px`,document.documentElement.appendChild(e),document.documentElement.appendChild(t),window.addEventListener("mousemove",s),t.style.top=`${window.innerHeight/2-r/2}px`;return}if(l==="tint"){o=a(["background:rgba(255,250,200,.18)","z-index:2147483646"].join(";")),document.documentElement.appendChild(o);return}}}}}function _t(e){if(!("speechSynthesis"in window))return{enable(){},disable(){},setLang(r){}};let t=e,o=!1;const i=r=>{var s,n;try{const a=r.target;if(!a||(s=a.closest)!=null&&s.call(a,"#makoya-widget-root"))return;const l=(n=a.innerText)==null?void 0:n.trim();if(!l)return;window.speechSynthesis.cancel();const c=new SpeechSynthesisUtterance(l);try{const f=window.speechSynthesis.getVoices().find(p=>p.lang.startsWith(t));f&&(c.voice=f)}catch{}window.speechSynthesis.speak(c)}catch{}};return{enable(){o||(o=!0,document.addEventListener("click",i,!0))},disable(){if(o){o=!1;try{window.speechSynthesis.cancel()}catch{}document.removeEventListener("click",i,!0)}},setLang(r){t=r}}}function St(){let e=!1;const t=i=>{const r=i.target;r instanceof HTMLMediaElement&&(r.muted=!0)};function o(){return Array.from(document.querySelectorAll("audio, video"))}return{enable(){if(!e){e=!0;for(const i of o())i.muted=!0;document.addEventListener("play",t,!0)}},disable(){if(e){e=!1,document.removeEventListener("play",t,!0);for(const i of o())i.muted=!1}}}}function Ct(){let e=null,t=!1;const o=i=>{var r;try{const s=i.target;if(!s||!e)return;if((r=s.closest)!=null&&r.call(s,"#makoya-widget-root")){e.style.opacity="0";return}const n=s.getBoundingClientRect();e.style.left=`${n.left}px`,e.style.top=`${n.top}px`,e.style.width=`${n.width}px`,e.style.height=`${n.height}px`,e.style.opacity="1"}catch{}};return{enable(){t||(t=!0,e=document.createElement("div"),e.setAttribute("aria-hidden","true"),e.style.cssText=["position:fixed","left:0","top:0","width:0","height:0","border:2px solid #1e63ff","border-radius:3px","pointer-events:none","z-index:2147483646","opacity:0","transition:top .06s ease,left .06s ease,width .06s ease,height .06s ease"].join(";"),document.documentElement.appendChild(e),window.addEventListener("mousemove",o))},disable(){t&&(t=!1,window.removeEventListener("mousemove",o),e==null||e.remove(),e=null)}}}const $e=240,fe=24;function Et(){let e=null,t=!1;const o=i=>{var r;try{if(!e)return;const s=document.elementFromPoint(i.clientX,i.clientY);if(!s||(r=s.closest)!=null&&r.call(s,"#makoya-widget-root")){e.style.opacity="0";return}const n=(s.innerText||s.textContent||"").trim();if(!n){e.style.opacity="0";return}e.textContent=n.length>$e?`${n.slice(0,$e)}…`:n;const a=320;let l=i.clientX+fe,c=i.clientY+fe;l+a>window.innerWidth&&(l=i.clientX-a-fe),c+160>window.innerHeight&&(c=i.clientY-160-fe),e.style.left=`${Math.max(8,l)}px`,e.style.top=`${Math.max(8,c)}px`,e.style.opacity="1"}catch{}};return{enable(){t||(t=!0,e=document.createElement("div"),e.setAttribute("aria-hidden","true"),e.style.cssText=["position:fixed","left:0","top:0","max-width:320px","padding:12px 16px","background:#ffffff","color:#111111","font-size:26px","line-height:1.4","font-family:Verdana, Arial, sans-serif","border:2px solid #1e63ff","border-radius:10px","box-shadow:0 8px 30px rgba(0,0,0,.25)","pointer-events:none","z-index:2147483646","opacity:0","overflow:hidden","max-height:160px"].join(";"),document.documentElement.appendChild(e),window.addEventListener("mousemove",o))},disable(){t&&(t=!1,window.removeEventListener("mousemove",o),e==null||e.remove(),e=null)}}}const At=400,Lt=240;function Mt(){var s;const e=(document.title||"").trim(),t=document.querySelector("article")||document.querySelector("main")||document.querySelector("[role=main]")||document.body,o=[];let i=0,r=0;try{const n=t.querySelectorAll("h1, h2, h3, h4, p, li");for(const a of Array.from(n)){if(r>=At)break;r+=1;const l=a;if((s=l.closest)!=null&&s.call(l,"#makoya-widget-root"))continue;const c=(l.innerText||l.textContent||"").replace(/\s+/g," ").trim();if(!c)continue;const u=/^H[1-4]$/.test(l.tagName)?"h":"p";o.push({tag:u,text:c}),i+=c.length}}catch{}return{title:e,blocks:o,chars:i}}function Tt(e){let t=null,o=null,i=null;function r(s){var n,a,l,c;i&&(document.removeEventListener("keydown",i,!0),i=null),t==null||t.remove(),t=null;try{const u=(a=(n=e.getReturnFocus)==null?void 0:n.call(e))!=null?a:o;(c=(l=u&&document.contains(u)?u:document.body)==null?void 0:l.focus)==null||c.call(l)}catch{}if(o=null,s)try{e.onClose()}catch{}}return{open(s){var n;if(!t)try{o=(n=document.activeElement)!=null?n:null,t=document.createElement("div"),t.style.cssText="position:fixed;inset:0;z-index:2147483646;";const a=t.attachShadow({mode:"open"}),{title:l,blocks:c,chars:u}=Mt(),f=document.createElement("style");f.textContent=`
          .wrap{position:fixed;inset:0;background:#fbfaf7;color:#1a1a1a;overflow:auto;
            font-family:Georgia,'Times New Roman',serif;}
          .bar{position:sticky;top:0;display:flex;justify-content:flex-end;padding:12px;
            background:#fbfaf7;border-bottom:1px solid #e7e2d8;}
          .close{font:inherit;font-family:system-ui,sans-serif;font-size:15px;cursor:pointer;
            border:2px solid #1a1a1a;background:#fff;color:#1a1a1a;border-radius:8px;padding:8px 16px;}
          .close:focus-visible{outline:3px solid #1e63ff;outline-offset:2px;}
          .doc{max-width:720px;margin:0 auto;padding:24px 24px 96px;font-size:21px;line-height:1.7;}
          .doc h1{font-size:32px;line-height:1.25;margin:0 0 24px;}
          .doc h2,.doc h3,.doc h4{margin:32px 0 8px;line-height:1.3;}
          .doc p{margin:0 0 20px;}
          .empty{max-width:560px;margin:80px auto;text-align:center;font-size:20px;color:#555;}
        `,a.appendChild(f);const p=document.createElement("div");p.className="wrap",p.setAttribute("role","dialog"),p.setAttribute("aria-modal","true"),p.setAttribute("aria-label",d(s,"f_readMode"));const b=document.createElement("div");b.className="bar";const h=document.createElement("button");h.type="button",h.className="close",h.textContent=d(s,"close"),h.addEventListener("click",()=>r(!0)),b.appendChild(h);const M=document.createElement("div");if(M.className="doc",u<Lt){const x=document.createElement("p");x.className="empty",x.textContent=d(s,"readModeEmpty"),M.appendChild(x)}else{if(l){const x=document.createElement("h1");x.textContent=l,M.appendChild(x)}for(const x of c){const N=document.createElement(x.tag==="h"?"h2":"p");N.textContent=x.text,M.appendChild(N)}}p.append(b,M),a.appendChild(p),document.documentElement.appendChild(t),requestAnimationFrame(()=>h.focus()),i=x=>{t&&(x.key==="Escape"?(x.preventDefault(),r(!0)):x.key==="Tab"&&(x.preventDefault(),h.focus()))},document.addEventListener("keydown",i,!0)}catch{r(!1)}},close(){t&&r(!1)}}}const Nt={m:"main, [role=main]",h:"h1, h2, h3, h4, h5, h6",f:"input:not([type=hidden]), select, textarea",b:"button, [role=button], input[type=submit], input[type=button]",g:"img, svg, [role=img], picture"};function zt(e){const t=e;if(t.closest("#makoya-widget-root"))return!1;const o=t.getBoundingClientRect();return o.width>0||o.height>0}function Rt(e){try{e.scrollIntoView({behavior:"smooth",block:"center"}),e.hasAttribute("tabindex")||(e.setAttribute("tabindex","-1"),e.addEventListener("blur",()=>{try{e.removeAttribute("tabindex")}catch{}},{once:!0})),e.focus({preventScroll:!0})}catch{}}function It(){let e=!1;const t={},o=i=>{var r;try{if(!i.altKey||i.ctrlKey||i.metaKey)return;const s=i.key.toLowerCase(),n=Nt[s];if(!n)return;const a=Array.from(document.querySelectorAll(n)).filter(zt);if(a.length===0)return;i.preventDefault();const l=((r=t[s])!=null?r:-1)+1;t[s]=l>=a.length?0:l,Rt(a[t[s]])}catch{}};return{enable(){e||(e=!0,document.addEventListener("keydown",o))},disable(){if(e){e=!1,document.removeEventListener("keydown",o);for(const i of Object.keys(t))delete t[i]}}}}function Fe(e){if(!e)return!1;const t=e.tagName;if(t==="TEXTAREA")return!0;if(t==="INPUT"){const o=e.type;return!["checkbox","radio","button","submit","reset","file","range","color","image"].includes(o)}return!1}function Bt(e,t){var r;const o=e instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,i=(r=Object.getOwnPropertyDescriptor(o,"value"))==null?void 0:r.set;i?i.call(e,t):e.value=t}const Ht=[["1","2","3","4","5","6","7","8","9","0"],["q","w","e","r","t","y","u","i","o","p"],["a","s","d","f","g","h","j","k","l"],["z","x","c","v","b","n","m"]];function Ot(){let e=null,t=!1,o=null;const i=a=>{var c;const l=a.target;l&&!((c=l.closest)!=null&&c.call(l,"#makoya-vk-root"))&&Fe(l)&&(o=l)};function r(){const a=document.activeElement;return Fe(a)?a:o&&document.contains(o)?o:null}function s(a,l){var c;try{const u=r();if(!u)return;const f=(c=u.value)!=null?c:"";let p=f,b="insertText";l==="char"?p=f+a:l==="backspace"?(p=f.slice(0,-1),b="deleteContentBackward"):l==="clear"&&(p="",b="deleteContent"),Bt(u,p),u.dispatchEvent(new InputEvent("input",{bubbles:!0,inputType:b,data:l==="char"?a:null}))}catch{}}function n(a,l,c,u=!1){const f=document.createElement("button");return f.type="button",f.className=u?"vk-key vk-wide":"vk-key",f.textContent=a,f.setAttribute("aria-label",l),f.addEventListener("mousedown",p=>p.preventDefault()),f.addEventListener("click",c),f}return{enable(){if(t)return;t=!0,document.addEventListener("focusin",i,!0),e=document.createElement("div"),e.id="makoya-vk-root",e.style.cssText="position:fixed;left:0;right:0;bottom:0;z-index:2147483645;";const a=e.attachShadow({mode:"open"}),l=document.createElement("style");l.textContent=`
        .vk{background:#1f2430;padding:10px;display:flex;flex-direction:column;gap:8px;
          box-shadow:0 -6px 24px rgba(0,0,0,.3);font-family:system-ui,sans-serif;}
        .vk-row{display:flex;gap:6px;justify-content:center;}
        .vk-key{min-width:40px;height:44px;border:0;border-radius:8px;background:#3a4150;color:#fff;
          font-size:17px;cursor:pointer;flex:1;max-width:64px;}
        .vk-key:hover{background:#4a5365;}
        .vk-key:focus-visible{outline:3px solid #1e63ff;outline-offset:2px;}
        .vk-wide{max-width:none;flex:2;}
        .vk-space{flex:6;}
      `,a.appendChild(l);const c=document.createElement("div");c.className="vk",c.setAttribute("role","group"),c.setAttribute("aria-label","On-screen keyboard");for(const p of Ht){const b=document.createElement("div");b.className="vk-row";for(const h of p)b.appendChild(n(h,h,()=>s(h,"char")));c.appendChild(b)}const u=document.createElement("div");u.className="vk-row";const f=n("Space","Space",()=>s(" ","char"),!0);f.classList.add("vk-space"),u.append(n("⌫","Backspace",()=>s("","backspace"),!0),f,n("Clear","Clear field",()=>s("","clear"),!0)),c.appendChild(u),a.appendChild(c),document.documentElement.appendChild(e)},disable(){t&&(t=!1,document.removeEventListener("focusin",i,!0),e==null||e.remove(),e=null,o=null)}}}function Pt(){var t,o;const e=window;return(o=(t=e.SpeechRecognition)!=null?t:e.webkitSpeechRecognition)!=null?o:null}function De(e){const t=e;if(t.closest("#makoya-widget-root")||t.closest("[aria-hidden='true']")||t.disabled)return!1;const o=t.getBoundingClientRect();return o.width>0||o.height>0}function je(e){try{e.focus({preventScroll:!1}),e.click()}catch{}}function $t(e){const t=Pt();if(!t)return{enable(){},disable(){}};let o=null,i=!1;function r(s){const n=s.toLowerCase().trim();try{const a=window.innerHeight||600;if(n.includes("scroll down"))return void window.scrollBy({top:a*.8,behavior:"smooth"});if(n.includes("scroll up"))return void window.scrollBy({top:-a*.8,behavior:"smooth"});if(/\btop\b/.test(n))return void window.scrollTo({top:0,behavior:"smooth"});if(/\bbottom\b/.test(n))return void window.scrollTo({top:document.body.scrollHeight,behavior:"smooth"});if(n.includes("open menu")){const c=document.querySelector("nav a, [role=menu] a, [role=navigation] a, header a");c&&De(c)&&je(c);return}const l=n.match(/(?:click|open|press)\s+(.+)/);if(l){const c=l[1].trim(),u=Array.from(document.querySelectorAll("a, button, [role=button]")).filter(De),f=h=>(h.innerText||h.textContent||"").toLowerCase().replace(/\s+/g," ").trim(),p=u.filter(h=>f(h)===c),b=p.length?p:u.filter(h=>f(h).includes(c));b.length===1&&je(b[0])}}catch{}}return{enable(){if(!i){i=!0;try{o=new t,o.continuous=!0,o.interimResults=!1,o.lang=e.getLang(),o.onresult=s=>{var n,a;try{const l=s.results[s.results.length-1],c=(a=(n=l==null?void 0:l[0])==null?void 0:n.transcript)!=null?a:"";c&&r(c)}catch{}},o.onend=()=>{if(i)try{o==null||o.start()}catch{}},o.onerror=s=>{var a;const n=(a=s==null?void 0:s.error)!=null?a:"";if(n==="not-allowed"||n==="service-not-allowed"){i=!1;try{o==null||o.stop()}catch{}}},o.start()}catch{i=!1,o=null}}},disable(){if(i){i=!1;try{o==null||o.stop()}catch{}o=null}}}}const Ft="https://api.dictionaryapi.dev/api/v2/entries";async function Dt(e,t){var i,r,s,n;const o=e.trim().toLowerCase();if(!o||/\s/.test(o)||o.length>40)return{ok:!1,word:e};try{const a=await fetch(`${Ft}/${encodeURIComponent(t)}/${encodeURIComponent(o)}`);if(!a.ok)return{ok:!1,word:o};const l=await a.json(),c=(r=(i=l==null?void 0:l[0])==null?void 0:i.meanings)==null?void 0:r[0],u=(n=(s=c==null?void 0:c.definitions)==null?void 0:s[0])==null?void 0:n.definition;return u?{ok:!0,word:o,partOfSpeech:c==null?void 0:c.partOfSpeech,definition:u}:{ok:!1,word:o}}catch{return{ok:!1,word:o}}}function jt(e){return/^[A-Za-zÀ-ÿ'’-]{1,40}$/.test(e)}function Kt(e){let t=!1,o=0;const i=()=>{var r,s;try{const n=(r=window.getSelection)==null?void 0:r.call(window);if(!n)return;const a=n.anchorNode,l=a&&(a.nodeType===1?a:a.parentElement);if((s=l==null?void 0:l.closest)!=null&&s.call(l,"#makoya-widget-root"))return;const c=(n.toString()||"").trim();if(!jt(c))return;const u=++o;e.onResult({status:"loading",word:c}),Dt(c,e.getLang()).then(f=>{u!==o||!t||(f.ok&&f.definition?e.onResult({status:"ok",word:f.word,partOfSpeech:f.partOfSpeech,definition:f.definition}):e.onResult({status:"none",word:f.word}))})}catch{}};return{enable(){t||(t=!0,document.addEventListener("mouseup",i))},disable(){t&&(t=!1,o++,document.removeEventListener("mouseup",i))}}}const Ke=100;function qe(e){try{if(e.closest("#makoya-widget-root"))return!1;const t=e.getBoundingClientRect();if(t.width===0&&t.height===0)return!1;const o=window.getComputedStyle(e);return o.visibility!=="hidden"&&o.display!=="none"}catch{return!1}}function qt(){const e=[],t=new Set;try{const o=document.querySelectorAll("a[href]");for(const i of Array.from(o)){if(e.length>=Ke)break;if(!qe(i))continue;const r=(i.innerText||i.textContent||"").replace(/\s+/g," ").trim();if(!r)continue;const s=`${r}|${i.getAttribute("href")}`;t.has(s)||(t.add(s),e.push({label:r.length>80?`${r.slice(0,80)}…`:r,el:i}))}}catch{}return e}function Gt(){const e=[];try{const t=document.querySelectorAll("h1, h2, h3, h4, h5, h6");for(const o of Array.from(t)){if(e.length>=Ke)break;if(!qe(o))continue;const i=(o.innerText||o.textContent||"").replace(/\s+/g," ").trim();i&&e.push({label:i.length>80?`${i.slice(0,80)}…`:i,el:o,level:Number(o.tagName.charAt(1))||1})}}catch{}return e}function Ge(e){let t=null,o=null,i=null;function r(n){return Array.from(n.querySelectorAll("button"))}function s(n,a=!0){var l,c,u,f;if(i&&(document.removeEventListener("keydown",i,!0),i=null),t==null||t.remove(),t=null,a)try{const p=(c=(l=e.getReturnFocus)==null?void 0:l.call(e))!=null?c:o;(f=(u=p&&document.contains(p)?p:document.body)==null?void 0:u.focus)==null||f.call(u)}catch{}if(o=null,n)try{e.onClose()}catch{}}return{open(){var n;if(!t)try{o=(n=document.activeElement)!=null?n:null;const a=e.collect(),l=e.getTitle(),c=e.getCloseLabel(),u=e.getEmptyLabel();t=document.createElement("div"),t.style.cssText="position:fixed;inset:0;z-index:2147483646;";const f=t.attachShadow({mode:"open"}),p=document.createElement("style");p.textContent=`
          .scrim{position:fixed;inset:0;background:rgba(0,0,0,.35);}
          .panel{position:fixed;top:0;right:0;height:100%;width:min(360px,90vw);background:#fff;color:#1a1a1a;
            box-shadow:-8px 0 30px rgba(0,0,0,.25);display:flex;flex-direction:column;font-family:system-ui,sans-serif;}
          .hd{display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border-bottom:1px solid #eee;}
          .hd h2{margin:0;font-size:17px;}
          .x{border:2px solid #1a1a1a;background:#fff;border-radius:8px;padding:6px 12px;cursor:pointer;font:inherit;}
          .x:focus-visible{outline:3px solid #1e63ff;outline-offset:2px;}
          ul{list-style:none;margin:0;padding:8px;overflow:auto;flex:1;}
          li button{display:block;width:100%;text-align:left;border:0;background:transparent;padding:10px 12px;
            border-radius:8px;cursor:pointer;font:inherit;font-size:15px;color:#1a1a1a;}
          li button:hover{background:#f1f3f6;}
          li button:focus-visible{outline:3px solid #1e63ff;outline-offset:-2px;}
          .empty{padding:24px 16px;color:#666;}
        `,f.appendChild(p);const b=document.createElement("div");b.className="scrim",b.addEventListener("click",()=>s(!0));const h=document.createElement("div");h.className="panel",h.setAttribute("role","dialog"),h.setAttribute("aria-modal","true"),h.setAttribute("aria-label",l);const M=document.createElement("div");M.className="hd";const x=document.createElement("h2");x.textContent=l;const N=document.createElement("button");N.className="x",N.type="button",N.textContent=c,N.addEventListener("click",()=>s(!0)),M.append(x,N);const te=document.createElement("ul");if(a.length===0){const v=document.createElement("li");v.className="empty",v.textContent=u,te.appendChild(v)}else for(const v of a){const A=document.createElement("li"),O=document.createElement("button");O.type="button",O.textContent=v.level?`${"— ".repeat(Math.max(0,v.level-1))}${v.label}`:v.label,O.addEventListener("click",()=>{s(!0,!1),Ut(v.el)}),A.appendChild(O),te.appendChild(A)}h.append(M,te),f.append(b,h),document.documentElement.appendChild(t),requestAnimationFrame(()=>N.focus()),i=v=>{if(t){if(v.key==="Escape"){v.preventDefault(),s(!0);return}if(v.key==="Tab"){const A=r(f);if(A.length===0)return;const O=A[0],me=A[A.length-1],ae=f.activeElement;v.shiftKey&&ae===O?(v.preventDefault(),me.focus()):!v.shiftKey&&ae===me&&(v.preventDefault(),O.focus())}}},document.addEventListener("keydown",i,!0)}catch{s(!1)}},close(){t&&s(!1)}}}function Ut(e){try{e.scrollIntoView({behavior:"smooth",block:"start"}),e.hasAttribute("tabindex")||(e.setAttribute("tabindex","-1"),e.addEventListener("blur",()=>{try{e.removeAttribute("tabindex")}catch{}},{once:!0})),e.focus({preventScroll:!0})}catch{}}function xe(){return window.MAKOYA_CONFIG_BASE||"https://makoya-gamma.vercel.app/api/config"}function Vt(){const e=window.MAKOYA_CONFIG_TIMEOUT_MS;return typeof e=="number"&&e>0?e:5e3}async function Wt(e,t){const i=`${xe()}/${encodeURIComponent(e)}`+(t?`?t=${encodeURIComponent(t)}`:""),r=typeof AbortController!="undefined"?new AbortController:null,s=r?setTimeout(()=>r.abort(),Vt()):null;try{const n=await fetch(i,{cache:"default",signal:r==null?void 0:r.signal});if(!n.ok)return{active:!0,config:{}};const a=await n.json(),{active:l,...c}=a;return{active:l!==!1,config:c}}catch{return{active:!0,config:{}}}finally{s&&clearTimeout(s)}}function Yt(){try{return new URL(xe()).origin}catch{return null}}async function Xt(e){try{const t=Yt();return!t||typeof fetch=="undefined"?!1:(await fetch(`${t}/api/widget-feedback`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(e)})).ok}catch{return!1}}const Zt=5*60*1e3,Jt=2e3,ve=50;let V=null,we,Q=!1,Ue=0,W=[],ee=null,Ve=!1;function Qt(){try{const e=window.MAKOYA_API_ORIGIN;return typeof e=="string"&&e?e.replace(/\/+$/,""):new URL(xe()).origin}catch{try{return location.origin}catch{return null}}}function eo(){try{if(window.MAKOYA_NO_TELEMETRY)return!0}catch{}try{if(typeof document!="undefined"&&typeof document.querySelector=="function"&&document.querySelector("script[data-no-telemetry]"))return!0}catch{}return!1}function to(e){try{V=e.siteId||null,we=e.token,Q=!!V&&typeof fetch=="function"&&!eo(),Q&&no()}catch{Q=!1}}function We(e,t){try{if(typeof fetch!="function")return;const o=Qt();if(!o)return;const i=fetch(o+e,{method:"POST",keepalive:!0,headers:{"content-type":"application/json"},body:JSON.stringify(t),mode:"cors"});i&&typeof i.catch=="function"&&i.catch(()=>{})}catch{}}function Ye(){try{if(!Q||!V)return;const e=Date.now();if(e-Ue<Zt)return;Ue=e;let t="";try{const o=new URL(location.href);t=o.origin+o.pathname}catch{t=""}We("/api/heartbeat",{siteId:V,token:we,url:t})}catch{}}function Xe(e,t){try{if(!Q||!V||W.length>=ve)return;W.push(t?{event:e,featureKey:t,ts:Date.now()}:{event:e,ts:Date.now()}),oo()}catch{}}function oo(){try{if(ee)return;ee=setTimeout(()=>{ee=null,_e()},Jt)}catch{}}function _e(){try{if(ee&&(clearTimeout(ee),ee=null),!Q||!V){W=[];return}if(W.length===0)return;const e=W.slice(0,ve);W=W.slice(ve),We("/api/widget-events",{siteId:V,token:we,events:e})}catch{}}function no(){try{if(Ve)return;typeof document!="undefined"&&typeof document.addEventListener=="function"&&document.addEventListener("visibilitychange",()=>{try{document.visibilityState==="hidden"&&_e()}catch{}}),typeof window!="undefined"&&typeof window.addEventListener=="function"&&window.addEventListener("pagehide",()=>{try{_e()}catch{}}),Ve=!0}catch{}}function ro(e){const t=new Set;return e.contentScale!==100&&t.add("contentScale"),e.fontScale!==100&&t.add("textSize"),e.lineHeightPct!==100&&t.add("lineSpacing"),e.letterSpacingPct!==0&&t.add("letterSpacing"),e.contrast!=="off"&&t.add("contrast"),e.stopMotion&&t.add("stopMotion"),e.ruler&&t.add("readingRuler"),e.links&&t.add("highlightLinks"),e.cursor!=="off"&&t.add("bigCursor"),e.font!=="off"&&t.add("readableFont"),e.images&&t.add("hideImages"),e.saturation!=="off"&&t.add("saturation"),e.mask!=="off"&&t.add("readingMask"),e.titles&&t.add("highlightTitles"),e.textAlign!=="off"&&t.add("textAlign"),e.mute&&t.add("muteSounds"),e.readAloud&&t.add("readAloud"),e.hoverHighlight&&t.add("highlightHover"),e.biggerTargets&&t.add("biggerTargets"),e.focusIndicator&&t.add("focusIndicator"),e.textColor!==""&&t.add("textColor"),e.titleColor!==""&&t.add("titleColor"),e.bgColor!==""&&t.add("bgColor"),e.magnifier&&t.add("magnifier"),e.readMode&&t.add("readMode"),e.usefulLinks&&t.add("usefulLinks"),e.pageStructure&&t.add("pageStructure"),e.keyboardNav&&t.add("keyboardNav"),e.virtualKeyboard&&t.add("virtualKeyboard"),e.voiceNav&&t.add("voiceNav"),e.dictionary&&t.add("dictionary"),t}const Ze="makoya_lang",io='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',ao={contentScale:"sec_content",textSize:"sec_content",lineSpacing:"sec_content",letterSpacing:"sec_content",readableFont:"sec_content",textAlign:"sec_content",highlightTitles:"sec_content",highlightLinks:"sec_content",hideImages:"sec_content",stopMotion:"sec_content",contrast:"sec_color",saturation:"sec_color",textColor:"sec_color",titleColor:"sec_color",bgColor:"sec_color",readingMask:"sec_color",readingRuler:"sec_nav",bigCursor:"sec_nav",highlightHover:"sec_nav",biggerTargets:"sec_nav",focusIndicator:"sec_nav",magnifier:"sec_nav",readMode:"sec_nav",usefulLinks:"sec_nav",pageStructure:"sec_nav",keyboardNav:"sec_nav",virtualKeyboard:"sec_nav",voiceNav:"sec_nav",muteSounds:"sec_audio",readAloud:"sec_audio",dictionary:"sec_tools"},lo=["sec_content","sec_color","sec_nav","sec_audio","sec_tools"];function so(e){try{const t=localStorage.getItem(Ze);if(t&&(t==="en"||t==="es"||t==="fr"||t==="de"))return t}catch{}return e}function co(e){try{localStorage.setItem(Ze,e)}catch{}}function uo(e){try{fo(e)}catch{}}function fo(e){var ot,nt,rt;try{if(sessionStorage.getItem("makoya_hidden")==="1")return}catch{}const t=document.createElement("div");t.id="makoya-widget-root";const o=t.attachShadow({mode:"open"});document.documentElement.appendChild(t);const i=document.createElement("style");i.textContent=ht(e.primaryColor,e.launcherSize),o.appendChild(i);let r=so(e.defaultLanguage);const s=(()=>{try{return localStorage.getItem(ye)!==null}catch{return!1}})(),n=Ie();let a="none";const l=vt(),c=wt(),u=_t(r),f=St(),p=Ct(),b=Et(),h=It(),M=Ot(),x=$t({getLang:()=>r}),N=Tt({onClose:()=>{n.readMode=!1,Y(),G()},getReturnFocus:()=>$}),te=Ge({collect:qt,getTitle:()=>d(r,"f_usefulLinks"),getCloseLabel:()=>d(r,"close"),getEmptyLabel:()=>d(r,"nav_none"),onClose:()=>{n.usefulLinks=!1,Y(),G()},getReturnFocus:()=>$}),v=Ge({collect:Gt,getTitle:()=>d(r,"f_pageStructure"),getCloseLabel:()=>d(r,"close"),getEmptyLabel:()=>d(r,"nav_none"),onClose:()=>{n.pageStructure=!1,Y(),G()},getReturnFocus:()=>$});let A=null;function O(){A==null||A.remove(),A=null}function me(m){try{if(!A){A=document.createElement("div"),A.style.cssText="position:fixed;left:50%;bottom:84px;transform:translateX(-50%);z-index:2147483646;";const _=A.attachShadow({mode:"open"}),B=document.createElement("style");B.textContent=".box{position:relative;max-width:min(420px,92vw);background:#fff;color:#1a1a1a;border:2px solid #1e63ff;border-radius:12px;padding:14px 32px 14px 16px;box-shadow:0 8px 30px rgba(0,0,0,.25);font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;}.w{font-weight:700;}.pos{color:#666;font-style:italic;margin-left:6px;}.x{position:absolute;top:6px;right:8px;border:0;background:transparent;font-size:18px;cursor:pointer;color:#666;}.x:focus-visible{outline:3px solid #1e63ff;outline-offset:2px;}";const L=document.createElement("div");L.className="box",L.setAttribute("role","status"),L.setAttribute("aria-live","polite");const I=document.createElement("button");I.className="x",I.type="button",I.textContent="×",I.setAttribute("aria-label",d(r,"close")),I.addEventListener("click",O);const ce=document.createElement("div");ce.className="content",L.append(I,ce),_.append(B,L),document.documentElement.appendChild(A)}const y=A.shadowRoot.querySelector(".content");if(!y)return;if(y.innerHTML="",m.status==="loading")y.textContent=d(r,"dict_loading");else if(m.status==="none")y.textContent=`“${m.word}” — ${d(r,"dict_none")}`;else if(m.status==="ok"){const _=document.createElement("span");if(_.className="w",_.textContent=m.word,y.appendChild(_),m.partOfSpeech){const L=document.createElement("span");L.className="pos",L.textContent=m.partOfSpeech,y.appendChild(L)}const B=document.createElement("div");B.textContent=m.definition,y.appendChild(B)}}catch{}}const ae=Kt({getLang:()=>r,onResult:me}),j=typeof e.offsetX=="number"?e.offsetX:0,K=typeof e.offsetY=="number"?e.offsetY:0,Qe=e.position.startsWith("bottom"),he=e.position.endsWith("right"),z=16,ho=Qe?he?`bottom:${z-K}px; right:${z-j}px;`:`bottom:${z-K}px; left:${z+j}px;`:he?`top:${z+K}px; right:${z-j}px;`:`top:${z+K}px; left:${z+j}px;`,R=document.createElement("button");R.className="mky-btn",R.type="button",R.style.cssText=ho;const go=(nt={circle:"50%",rounded:"16px",square:"8px"}[(ot=e.launcherShape)!=null?ot:"circle"])!=null?nt:"50%";R.style.borderRadius=go,R.setAttribute("aria-label",d(r,"title")),R.setAttribute("aria-expanded","false"),R.innerHTML=(rt=Ne[e.launcherIcon])!=null?rt:Ne.accessibility;const P=document.createElement("div");P.className="mky-panel",P.setAttribute("role","dialog"),P.setAttribute("aria-modal","true"),P.setAttribute("aria-label",e.panelTitle||d(r,"title"));const ge=84,bo=Qe?he?`bottom:${ge-K}px; right:${z-j}px;`:`bottom:${ge-K}px; left:${z+j}px;`:he?`top:${ge+K}px; right:${z-j}px;`:`top:${ge+K}px; left:${z+j}px;`;P.style.cssText=bo;let Se=null;function Y(){try{Be(n),l.setColor(n.rulerColor),n.ruler?l.on():l.off(),c.set(n.mask),n.readAloud?u.enable():u.disable(),u.setLang(r),n.mute?f.enable():f.disable(),n.hoverHighlight?p.enable():p.disable(),n.magnifier?b.enable():b.disable(),n.keyboardNav?h.enable():h.disable(),n.virtualKeyboard?M.enable():M.disable(),n.voiceNav?x.enable():x.disable(),n.readMode?N.open(r):N.close(),n.usefulLinks?te.open():te.close(),n.pageStructure?v.open():v.close(),n.dictionary?ae.enable():(ae.disable(),O()),pt(n);try{const m=ro(n);if(Se)for(const y of m)Se.has(y)||Xe("feature_activated",y);Se=m}catch{}}catch{}}const Ce=document.createElement("div");Ce.className="mky-head";const et=document.createElement("div"),Ee=document.createElement("h2");Ee.className="mky-title";const Ae=document.createElement("p");Ae.className="mky-sub",et.append(Ee,Ae);const X=document.createElement("select");X.className="mky-lang",X.setAttribute("aria-label",d(r,"language"));for(const[m,y]of Object.entries(gt)){const _=document.createElement("option");_.value=m,_.textContent=y,_.selected=m===r,X.appendChild(_)}X.addEventListener("change",()=>{r=X.value,co(r),u.setLang(r),tt(),G()});const $=document.createElement("button");$.className="mky-close",$.type="button",$.innerHTML=io,Ce.append(et,X,$);const oe=document.createElement("div");oe.className="mky-body";const le=document.createElement("div");le.className="mky-foot";const se=document.createElement("button");se.className="mky-reset",se.type="button",se.addEventListener("click",()=>{Object.assign(n,ie),a="none",Y(),G()});const Le=document.createElement("p");Le.className="mky-note",le.append(se,Le);let q=null;e.accessibilityStatementUrl&&(q=document.createElement("a"),q.className="mky-statement",q.href=e.accessibilityStatementUrl,q.target="_blank",q.rel="noopener",le.appendChild(q));let D=null;if(!e.hideBranding){D=document.createElement("p"),D.className="mky-brand";const m=document.createElement("a");m.href=e.brandingUrl,m.target="_blank",m.rel="noopener",m.textContent="Makoya",D.append("",m),le.appendChild(D)}function tt(){const m=e.panelTitle||d(r,"title");if(R.setAttribute("aria-label",m),P.setAttribute("aria-label",m),Ee.textContent=m,Ae.textContent=d(r,"subtitle"),$.setAttribute("aria-label",d(r,"close")),X.setAttribute("aria-label",d(r,"language")),se.textContent=d(r,"reset"),Le.textContent=d(r,"note"),q&&(q.textContent=d(r,"statement")),D){const y=D.querySelector("a");y&&(D.textContent="",D.appendChild(document.createTextNode(`${d(r,"poweredBy")} `)),D.appendChild(y))}}function G(){oe.innerHTML="";const m=document.createElement("div");m.className="mky-sec";const y=document.createElement("span");y.className="mky-sec-label",y.textContent=d(r,"quickProfiles");const _=document.createElement("div");_.className="mky-profiles";for(const w of Pe){const S=document.createElement("button");S.type="button",S.className="mky-chip",S.setAttribute("aria-pressed",String(a===w.key));const k=d(r,w.labelKey);S.innerHTML=`${w.icon}<span>${k}</span>`,S.addEventListener("click",()=>{a===w.key?(ke(n,"none"),a="none"):(ke(n,w.key),a=w.key),Y(),G()}),_.appendChild(S)}const B=document.createElement("div");B.className="mky-divider",m.append(y,_,B),oe.appendChild(m);const L=new Map;for(const w of e.featuresEnabled){const S=ao[w];S&&(L.has(S)||L.set(S,[]),L.get(S).push(w))}for(const w of lo){const S=L.get(w);if(!S||S.length===0)continue;const k=document.createElement("div");k.className="mky-sec";const H=document.createElement("span");H.className="mky-sec-label",H.textContent=d(r,w),k.appendChild(H);for(const T of S){const F=kt(T,n,r,Y);F&&k.appendChild(F)}if(w==="sec_audio"&&e.featuresEnabled.includes("readAloud")){const T=document.createElement("p");T.className="mky-note",T.style.cssText="margin: 4px 8px 8px; text-align: left;",T.textContent=d(r,"readAloudHint"),k.appendChild(T)}oe.appendChild(k)}const I=e.featuresEnabled.includes("userGuide"),ce=e.featuresEnabled.includes("feedbackForm"),it=e.featuresEnabled.includes("hideInterface");if(I||ce||it){const w=document.createElement("div");w.className="mky-sec";const S=document.createElement("span");if(S.className="mky-sec-label",S.textContent=d(r,"sec_about"),w.appendChild(S),I){const k=document.createElement("details");k.style.cssText="margin:4px 8px;";const H=document.createElement("summary");H.textContent=d(r,"f_userGuide"),H.style.cssText="cursor:pointer;font-size:14px;padding:6px 0;";const T=document.createElement("p");T.textContent=d(r,"guide_body"),T.style.cssText="margin:6px 0;font-size:13px;line-height:1.5;",k.append(H,T),w.appendChild(k)}if(ce){const k="width:100%;box-sizing:border-box;margin:4px 0;padding:8px;font:inherit;border:1px solid #ccc;border-radius:6px;",H=document.createElement("details");H.style.cssText="margin:4px 8px;";const T=document.createElement("summary");T.textContent=d(r,"fb_open"),T.style.cssText="cursor:pointer;font-size:14px;padding:6px 0;";const F=document.createElement("textarea");F.setAttribute("aria-label",d(r,"fb_msgLabel")),F.placeholder=d(r,"fb_msgLabel"),F.rows=3,F.style.cssText=k;const ne=document.createElement("input");ne.type="email",ne.setAttribute("aria-label",d(r,"fb_emailLabel")),ne.placeholder=d(r,"fb_emailLabel"),ne.style.cssText=k;const Z=document.createElement("button");Z.type="button",Z.className="mky-reset",Z.textContent=d(r,"fb_send");const re=document.createElement("p");re.setAttribute("role","status"),re.setAttribute("aria-live","polite"),re.style.cssText="margin:6px 0;font-size:13px;",Z.addEventListener("click",()=>{const at=F.value.trim();at&&(Z.disabled=!0,re.textContent=d(r,"fb_sending"),Xt({siteId:e.siteId,message:at,email:ne.value.trim()||void 0,url:location.href}).then(lt=>{re.textContent=lt?d(r,"fb_sent"):d(r,"fb_failed"),Z.disabled=!1,lt&&(F.value="")}))}),H.append(T,F,ne,Z,re),w.appendChild(H)}if(it){const k=document.createElement("button");k.type="button",k.className="mky-reset",k.style.cssText="margin:8px;",k.textContent=d(r,"f_hideInterface"),k.addEventListener("click",()=>{try{sessionStorage.setItem("makoya_hidden","1")}catch{}t.style.display="none"}),w.appendChild(k)}oe.appendChild(w)}}P.append(Ce,oe,le);let Me=!1;const Te=m=>{Me=m,P.classList.toggle("open",m),R.setAttribute("aria-expanded",String(m)),m?(Xe("open"),requestAnimationFrame(()=>$.focus())):R.focus()};R.addEventListener("click",()=>Te(!Me)),$.addEventListener("click",()=>Te(!1)),o.addEventListener("keydown",m=>{const y=m;if(Me){if(y.key==="Escape"){Te(!1);return}if(y.key==="Tab"){const _=Array.from(P.querySelectorAll('button:not([disabled]), a[href], select, input, [tabindex]:not([tabindex="-1"])'));if(_.length===0)return;const B=_[0],L=_[_.length-1],I=o.activeElement;y.shiftKey&&I===B?(y.preventDefault(),L.focus()):!y.shiftKey&&I===L&&(y.preventDefault(),B.focus())}}}),o.append(R,P),tt(),G(),!s&&e.defaultProfile!=="none"&&(ke(n,e.defaultProfile),a=e.defaultProfile,G()),Y()}let Je=!1;function po(){const e=()=>{Be(Ie()),Ye()},t=o=>{const i=history[o];history[o]=function(...r){const s=i.apply(this,r);return setTimeout(e,50),s}};t("pushState"),t("replaceState"),window.addEventListener("popstate",()=>setTimeout(e,50))}function pe(e){if(Je||document.getElementById("makoya-widget-root"))return;Je=!0;const t=ct(e.siteId,e),o=()=>{uo(t),po(),to({siteId:t.siteId,token:e.token}),Ye()};document.readyState==="loading"?document.addEventListener("DOMContentLoaded",o,{once:!0}):o()}window.MakoyaWidget={init:pe};function mo(){return!1}return async function(){var t;try{const o=(t=document.currentScript)!=null?t:document.querySelector("script[data-site]");if(!o||o.hasAttribute("data-no-auto"))return;const i=o.dataset.site||"auto",r=o.dataset.token,s=o.dataset.color,n=s?{primaryColor:s}:{};if(mo()&&o.hasAttribute("data-demo")){pe({siteId:i,...n});return}const{active:a,config:l}=await Wt(i,r);if(a===!1)return;pe({...l,siteId:i,...n,token:r})}catch{}}().catch(()=>{}),be.init=pe,Object.defineProperty(be,Symbol.toStringTag,{value:"Module"}),be}({});
