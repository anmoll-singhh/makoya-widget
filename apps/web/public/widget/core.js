var MakoyaCore=function(be){"use strict";const ze={accessibility:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="4" r="2"/><path d="M21 9c0 .55-.45 1-1 1h-4v11a1 1 0 0 1-2 0v-5h-4v5a1 1 0 0 1-2 0V10H4a1 1 0 0 1 0-2h16c.55 0 1 .45 1 1z"/></svg>',person:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="7" r="4"/><path d="M4 21a8 8 0 0 1 16 0 1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/></svg>',eye:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 5c-5 0-9 4.5-10 7 1 2.5 5 7 10 7s9-4.5 10-7c-1-2.5-5-7-10-7zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8z"/><circle cx="12" cy="12" r="2"/></svg>',adjust:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 7h11a3 3 0 0 1 6 0h1a1 1 0 0 1 0 2h-1a3 3 0 0 1-6 0H3a1 1 0 0 1 0-2zm6 8a3 3 0 0 1 6 0h6a1 1 0 0 1 0 2h-6a3 3 0 0 1-6 0H3a1 1 0 0 1 0-2h6z"/></svg>'},ye={siteId:"unknown",primaryColor:"#2563eb",position:"bottom-right",launcherIcon:"accessibility",launcherShape:"circle",featuresEnabled:["contentScale","textSize","lineSpacing","letterSpacing","readableFont","textAlign","highlightTitles","highlightLinks","hideImages","stopMotion","contrast","saturation","textColor","titleColor","bgColor","readingMask","readingRuler","bigCursor","highlightHover","biggerTargets","focusIndicator","magnifier","readMode","usefulLinks","pageStructure","keyboardNav","virtualKeyboard","voiceNav","muteSounds","readAloud","dictionary","feedbackForm","hideInterface","userGuide","aiSimplify"],hideBranding:!1,brandingUrl:"https://makoya.example/scan",launcherSize:"md",defaultProfile:"none",accessibilityStatementUrl:"",defaultLanguage:"en",panelTitle:"",customTriggerSelector:"",domObserverEnabled:!0,inheritFonts:!1,mobileEnabled:!0,offsetX:0,offsetY:0,aiSimplifyEnabled:!1};function Re(e,t,o){return Math.max(t,Math.min(o,e))}const Ie=new Set(["textSize","lineSpacing","contrast","stopMotion","readingRuler","highlightLinks","bigCursor","readableFont","hideImages","saturation","readingMask","highlightTitles","textAlign","muteSounds","readAloud","highlightHover","biggerTargets","focusIndicator"]);function mt(e){return!Array.isArray(e)||e.length===0?[...ye.featuresEnabled]:e.every(o=>Ie.has(o))?ye.featuresEnabled.filter(o=>e.includes(o)||!Ie.has(o)):e}function ht(e,t){const o={...ye,...t!=null?t:{},siteId:e};return typeof o.offsetX=="number"&&(o.offsetX=Re(o.offsetX,-200,200)),typeof o.offsetY=="number"&&(o.offsetY=Re(o.offsetY,-200,200)),o.featuresEnabled=mt(o.featuresEnabled),o}const Be="makoya-effects",gt=`
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
`;function bt(){if(document.getElementById(Be))return;const e=document.createElement("style");e.id=Be,e.textContent=gt,document.head.appendChild(e)}function A(e,t){const o=document.documentElement;t===null?o.removeAttribute(e):o.setAttribute(e,t)}function V(e,t){const o=document.documentElement;t===null?o.style.removeProperty(e):o.style.setProperty(e,t)}const xe="makoya_prefs",re={contentScale:100,fontScale:100,lineHeightPct:100,letterSpacingPct:0,contrast:"off",stopMotion:!1,ruler:!1,links:!1,cursor:"off",font:"off",images:!1,saturation:"off",mask:"off",titles:!1,textAlign:"off",mute:!1,readAloud:!1,rulerColor:"#ffd400",hoverHighlight:!1,biggerTargets:!1,focusIndicator:!1,textColor:"",titleColor:"",bgColor:"",magnifier:!1,readMode:!1,usefulLinks:!1,pageStructure:!1,keyboardNav:!1,virtualKeyboard:!1,voiceNav:!1,dictionary:!1,aiSimplify:!1};function yt(e){if(!e||typeof e!="object")return{};const t={...e};return"text"in t&&(t.fontScale===void 0&&(t.text===1?t.fontScale=110:t.text===2?t.fontScale=130:t.text===3&&(t.fontScale=140)),delete t.text),"spacing"in t&&(t.spacing===!0&&(t.lineHeightPct===void 0&&(t.lineHeightPct=180),t.letterSpacingPct===void 0&&(t.letterSpacingPct=5)),delete t.spacing),"align"in t&&(t.align===!0&&t.textAlign===void 0&&(t.textAlign="left"),delete t.align),typeof t.font=="boolean"&&(t.font=t.font?"readable":"off"),t}function He(){try{const e=localStorage.getItem(xe);return e?{...re,...yt(JSON.parse(e))}:{...re}}catch{return{...re}}}function xt(e){try{localStorage.setItem(xe,JSON.stringify(e))}catch{}}function Oe(e){bt();const t=(m,x)=>typeof m=="number"&&Number.isFinite(m)?m:x,o=t(e.contentScale,100),r=t(e.fontScale,100),i=t(e.lineHeightPct,100),c=t(e.letterSpacingPct,0),n=o!==100;V("--mky-zoom",n?String(o/100):null),A("data-mky-zoom",n?"on":null);const a=r!==100;V("--mky-font-scale",a?String(r/100):null),A("data-mky-fontscale",a?"on":null);const s=i!==100;V("--mky-line-height",s?String(i/100):null),A("data-mky-lh",s?"on":null);const l=c!==0;V("--mky-letter-spacing",l?`${c*.01}em`:null),A("data-mky-ls",l?"on":null),A("data-mky-contrast",e.contrast==="off"?null:e.contrast),A("data-mky-sat",e.saturation==="off"?null:e.saturation);const u=e.contrast!=="dark"&&e.contrast!=="light",f=u&&e.textColor!=="";V("--mky-text-color",f?e.textColor:null),A("data-mky-textcolor",f?"on":null);const p=u&&e.titleColor!=="";V("--mky-title-color",p?e.titleColor:null),A("data-mky-titlecolor",p?"on":null);const g=u&&e.bgColor!=="";V("--mky-bg-color",g?e.bgColor:null),A("data-mky-bgcolor",g?"on":null),A("data-mky-motion",e.stopMotion?"off":null),A("data-mky-links",e.links?"on":null),A("data-mky-cursor",e.cursor==="off"?null:e.cursor),A("data-mky-font",e.font==="off"?null:e.font),A("data-mky-images",e.images?"off":null),A("data-mky-titles",e.titles?"on":null),A("data-mky-align",e.textAlign==="off"?null:e.textAlign),A("data-mky-targets",e.biggerTargets?"on":null),A("data-mky-focus",e.focusIndicator?"on":null)}const kt={sm:48,md:56,lg:64};function vt(e,t){const o=kt[t],r=Math.round(o*.5/2)*2;return`
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
  width: ${r}px;
  height: ${r}px;
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

/* Collapsible sections (<details>) — keep the panel uncluttered when there are
   many tools. The label becomes a clickable disclosure with a rotating caret. */
details.mky-sec > summary.mky-sec-label {
  cursor: pointer;
  list-style: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 36px;
  margin: 2px 4px 4px;
  padding: 6px 8px;
  border-radius: 9px;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}
details.mky-sec > summary.mky-sec-label::-webkit-details-marker { display: none; }
details.mky-sec > summary.mky-sec-label::after {
  content: "\\25B8"; /* ▸ */
  font-size: 12px;
  color: #94a3b8;
  transition: transform .15s ease;
}
details.mky-sec[open] > summary.mky-sec-label::after { transform: rotate(90deg); }
details.mky-sec > summary.mky-sec-label:hover { background: rgba(15,23,42,.045); }
details.mky-sec > summary.mky-sec-label:focus-visible {
  outline: 2px solid ${e};
  outline-offset: 1px;
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
/* "Off" swatch — a white circle with a diagonal slash so it reads as "none". */
.mky-swatch-off {
  position: relative;
  background: #fff !important;
}
.mky-swatch-off::after {
  content: "";
  position: absolute;
  left: 50%;
  top: 2px;
  bottom: 2px;
  width: 2px;
  background: #ef4444;
  transform: translateX(-50%) rotate(45deg);
  border-radius: 2px;
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
`}const wt={en:"English",es:"Español",fr:"Français",de:"Deutsch"},$e={en:{title:"Accessibility",subtitle:"Adjust this page to your needs",quickProfiles:"Quick profiles",profile_vision:"Vision impaired",profile_lowVision:"Low vision",profile_dyslexia:"Dyslexia",profile_adhd:"ADHD / Focus",profile_seizure:"Seizure safe",profile_senior:"Senior",profile_cognitive:"Cognitive",profile_colorBlind:"Color blind",profile_motorTremor:"Motor / tremor",profile_eslReading:"Easy reading",profile_keyboardNav:"Keyboard nav",profile_clearReading:"Clear reading",sec_content:"Content",sec_color:"Color",sec_nav:"Navigation",sec_audio:"Audio",sec_about:"About",f_contentScale:"Page zoom",f_textSize:"Text size",f_lineSpacing:"Line spacing",f_letterSpacing:"Letter spacing",f_contrast:"Contrast",f_stopMotion:"Pause animations",f_readingRuler:"Reading ruler",f_highlightLinks:"Highlight links",f_bigCursor:"Cursor size",f_readableFont:"Readable font",f_hideImages:"Hide images",f_saturation:"Color saturation",f_readingMask:"Reading mask",f_highlightTitles:"Highlight titles",f_textAlign:"Left-align text",f_muteSounds:"Mute sounds",f_readAloud:"Read aloud",f_highlightHover:"Highlight on hover",f_biggerTargets:"Bigger tap targets",f_focusIndicator:"Enhanced focus",f_readMode:"Reading mode",readModeEmpty:"We couldn't build a reading view for this page.",rulerColor:"Ruler color",opt_off:"Off",opt_on:"On",opt_light:"Light",opt_dark:"Dark",opt_grayscale:"Grayscale",opt_low:"Low",opt_high:"High",opt_dim:"Dim",opt_tint:"Tint",opt_black:"Black",opt_white:"White",opt_left:"Left",opt_center:"Center",opt_right:"Right",opt_justify:"Justify",opt_readable:"Readable",opt_dyslexic:"Dyslexic",decrease:"Decrease",increase:"Increase",reset:"Reset all",note:"Changes affect your view only — they don't alter the website.",poweredBy:"Powered by",statement:"Accessibility statement",language:"Language",close:"Close",readAloudHint:"Click any text on the page to hear it read aloud.",f_textColor:"Text color",f_titleColor:"Title color",f_bgColor:"Background color",f_magnifier:"Text magnifier",f_usefulLinks:"Useful links",f_pageStructure:"Page structure",f_keyboardNav:"Keyboard navigation",f_virtualKeyboard:"Virtual keyboard",f_voiceNav:"Voice navigation",f_dictionary:"Dictionary",f_feedbackForm:"Feedback",f_hideInterface:"Hide interface",f_userGuide:"User guide",f_aiSimplify:"Simplify text",sec_tools:"Tools",dict_loading:"Looking up…",dict_none:"No definition found.",nav_none:"Nothing found on this page.",kn_hint:"Use Alt + M / H / F / B / G to jump between regions.",guide_body:"Pick a quick profile, or turn on individual tools. Changes affect only your view of this page and are saved on your device. Press Esc to close any tool.",fb_open:"Report an issue",fb_msgLabel:"What's the problem?",fb_emailLabel:"Your email (optional)",fb_send:"Send",fb_sending:"Sending…",fb_sent:"Thanks — your feedback was sent.",fb_failed:"Couldn't send right now. Please try again later.",as_action:"Simplify",as_loading:"Simplifying…",as_failed:"Couldn't simplify this text."},es:{title:"Accesibilidad",subtitle:"Ajusta esta página a tus necesidades",quickProfiles:"Perfiles rápidos",profile_vision:"Visión reducida",profile_lowVision:"Baja visión",profile_dyslexia:"Dislexia",profile_adhd:"TDAH / Enfoque",profile_seizure:"Seguro para epilepsia",profile_senior:"Adulto mayor",profile_cognitive:"Cognitivo",profile_colorBlind:"Daltonismo",profile_motorTremor:"Motor / temblor",profile_eslReading:"Lectura fácil",profile_keyboardNav:"Navegación teclado",profile_clearReading:"Lectura clara",sec_content:"Contenido",sec_color:"Color",sec_nav:"Navegación",sec_audio:"Audio",sec_about:"Acerca de",f_contentScale:"Zoom de página",f_textSize:"Tamaño de texto",f_lineSpacing:"Interlineado",f_letterSpacing:"Espaciado de letras",f_contrast:"Contraste",f_stopMotion:"Pausar animaciones",f_readingRuler:"Regla de lectura",f_highlightLinks:"Resaltar enlaces",f_bigCursor:"Tamaño del cursor",f_readableFont:"Fuente legible",f_hideImages:"Ocultar imágenes",f_saturation:"Saturación de color",f_readingMask:"Máscara de lectura",f_highlightTitles:"Resaltar títulos",f_textAlign:"Alinear texto a la izquierda",f_muteSounds:"Silenciar sonidos",f_readAloud:"Leer en voz alta",f_highlightHover:"Resaltar al pasar el cursor",f_biggerTargets:"Áreas táctiles más grandes",f_focusIndicator:"Foco mejorado",f_readMode:"Modo lectura",readModeEmpty:"No pudimos crear una vista de lectura para esta página.",rulerColor:"Color de la regla",opt_off:"Apagado",opt_on:"Encendido",opt_light:"Claro",opt_dark:"Oscuro",opt_grayscale:"Escala de grises",opt_low:"Bajo",opt_high:"Alto",opt_dim:"Tenue",opt_tint:"Tinte",opt_black:"Negro",opt_white:"Blanco",opt_left:"Izquierda",opt_center:"Centro",opt_right:"Derecha",opt_justify:"Justificado",opt_readable:"Legible",opt_dyslexic:"Disléxica",decrease:"Disminuir",increase:"Aumentar",reset:"Restablecer todo",note:"Los cambios solo afectan tu vista — no modifican el sitio web.",poweredBy:"Desarrollado por",statement:"Declaración de accesibilidad",language:"Idioma",close:"Cerrar",readAloudHint:"Haz clic en cualquier texto de la página para escucharlo.",f_textColor:"Color del texto",f_titleColor:"Color de títulos",f_bgColor:"Color de fondo",f_magnifier:"Lupa de texto",f_usefulLinks:"Enlaces útiles",f_pageStructure:"Estructura de la página",f_keyboardNav:"Navegación por teclado",f_virtualKeyboard:"Teclado virtual",f_voiceNav:"Navegación por voz",f_dictionary:"Diccionario",f_feedbackForm:"Comentarios",f_hideInterface:"Ocultar interfaz",f_userGuide:"Guía de uso",f_aiSimplify:"Simplificar texto",sec_tools:"Herramientas",dict_loading:"Buscando…",dict_none:"No se encontró definición.",nav_none:"No se encontró nada en esta página.",kn_hint:"Usa Alt + M / H / F / B / G para saltar entre regiones.",guide_body:"Elige un perfil rápido o activa herramientas individuales. Los cambios solo afectan a tu vista de esta página y se guardan en tu dispositivo. Pulsa Esc para cerrar cualquier herramienta.",fb_open:"Informar de un problema",fb_msgLabel:"¿Cuál es el problema?",fb_emailLabel:"Tu correo (opcional)",fb_send:"Enviar",fb_sending:"Enviando…",fb_sent:"Gracias — tus comentarios se enviaron.",fb_failed:"No se pudo enviar ahora. Inténtalo más tarde.",as_action:"Simplificar",as_loading:"Simplificando…",as_failed:"No se pudo simplificar este texto."},fr:{title:"Accessibilité",subtitle:"Adaptez cette page à vos besoins",quickProfiles:"Profils rapides",profile_vision:"Déficience visuelle",profile_lowVision:"Basse vision",profile_dyslexia:"Dyslexie",profile_adhd:"TDAH / Concentration",profile_seizure:"Épilepsie",profile_senior:"Senior",profile_cognitive:"Cognitif",profile_colorBlind:"Daltonisme",profile_motorTremor:"Moteur / tremblements",profile_eslReading:"Lecture facile",profile_keyboardNav:"Navigation clavier",profile_clearReading:"Lecture claire",sec_content:"Contenu",sec_color:"Couleur",sec_nav:"Navigation",sec_audio:"Audio",sec_about:"À propos",f_contentScale:"Zoom de la page",f_textSize:"Taille du texte",f_lineSpacing:"Interligne",f_letterSpacing:"Espacement des lettres",f_contrast:"Contraste",f_stopMotion:"Pause animations",f_readingRuler:"Règle de lecture",f_highlightLinks:"Surligner les liens",f_bigCursor:"Taille du curseur",f_readableFont:"Police lisible",f_hideImages:"Masquer les images",f_saturation:"Saturation des couleurs",f_readingMask:"Masque de lecture",f_highlightTitles:"Surligner les titres",f_textAlign:"Aligner le texte à gauche",f_muteSounds:"Couper les sons",f_readAloud:"Lecture à voix haute",f_highlightHover:"Surligner au survol",f_biggerTargets:"Zones tactiles agrandies",f_focusIndicator:"Focus amélioré",f_readMode:"Mode lecture",readModeEmpty:"Nous n'avons pas pu créer une vue de lecture pour cette page.",rulerColor:"Couleur de la règle",opt_off:"Désactivé",opt_on:"Activé",opt_light:"Clair",opt_dark:"Sombre",opt_grayscale:"Niveaux de gris",opt_low:"Faible",opt_high:"Élevé",opt_dim:"Tamisé",opt_tint:"Teinte",opt_black:"Noir",opt_white:"Blanc",opt_left:"Gauche",opt_center:"Centre",opt_right:"Droite",opt_justify:"Justifié",opt_readable:"Lisible",opt_dyslexic:"Dyslexique",decrease:"Diminuer",increase:"Augmenter",reset:"Tout réinitialiser",note:"Les modifications n'affectent que votre affichage — elles ne modifient pas le site.",poweredBy:"Propulsé par",statement:"Déclaration d'accessibilité",language:"Langue",close:"Fermer",readAloudHint:"Cliquez sur n'importe quel texte de la page pour l'entendre.",f_textColor:"Couleur du texte",f_titleColor:"Couleur des titres",f_bgColor:"Couleur de fond",f_magnifier:"Loupe de texte",f_usefulLinks:"Liens utiles",f_pageStructure:"Structure de la page",f_keyboardNav:"Navigation au clavier",f_virtualKeyboard:"Clavier virtuel",f_voiceNav:"Navigation vocale",f_dictionary:"Dictionnaire",f_feedbackForm:"Commentaires",f_hideInterface:"Masquer l'interface",f_userGuide:"Guide d'utilisation",f_aiSimplify:"Simplifier le texte",sec_tools:"Outils",dict_loading:"Recherche…",dict_none:"Aucune définition trouvée.",nav_none:"Rien trouvé sur cette page.",kn_hint:"Utilisez Alt + M / H / F / B / G pour passer d'une zone à l'autre.",guide_body:"Choisissez un profil rapide ou activez des outils individuels. Les changements n'affectent que votre affichage de cette page et sont enregistrés sur votre appareil. Appuyez sur Échap pour fermer un outil.",fb_open:"Signaler un problème",fb_msgLabel:"Quel est le problème ?",fb_emailLabel:"Votre e-mail (facultatif)",fb_send:"Envoyer",fb_sending:"Envoi…",fb_sent:"Merci — vos commentaires ont été envoyés.",fb_failed:"Envoi impossible pour le moment. Réessayez plus tard.",as_action:"Simplifier",as_loading:"Simplification…",as_failed:"Impossible de simplifier ce texte."},de:{title:"Barrierefreiheit",subtitle:"Passen Sie diese Seite Ihren Bedürfnissen an",quickProfiles:"Schnellprofile",profile_vision:"Sehbeeinträchtigung",profile_lowVision:"Schwachsichtigkeit",profile_dyslexia:"Legasthenie",profile_adhd:"ADHS / Fokus",profile_seizure:"Epilepsiesicher",profile_senior:"Senioren",profile_cognitive:"Kognitiv",profile_colorBlind:"Farbenblindheit",profile_motorTremor:"Motorik / Zittern",profile_eslReading:"Einfaches Lesen",profile_keyboardNav:"Tastaturnavigation",profile_clearReading:"Klares Lesen",sec_content:"Inhalt",sec_color:"Farbe",sec_nav:"Navigation",sec_audio:"Audio",sec_about:"Über",f_contentScale:"Seitenzoom",f_textSize:"Textgröße",f_lineSpacing:"Zeilenabstand",f_letterSpacing:"Zeichenabstand",f_contrast:"Kontrast",f_stopMotion:"Animationen anhalten",f_readingRuler:"Leselineal",f_highlightLinks:"Links hervorheben",f_bigCursor:"Zeigergröße",f_readableFont:"Lesbare Schrift",f_hideImages:"Bilder ausblenden",f_saturation:"Farbsättigung",f_readingMask:"Lesemaske",f_highlightTitles:"Überschriften hervorheben",f_textAlign:"Text linksbündig",f_muteSounds:"Töne stummschalten",f_readAloud:"Vorlesen",f_highlightHover:"Beim Überfahren hervorheben",f_biggerTargets:"Größere Tippziele",f_focusIndicator:"Verbesserter Fokus",f_readMode:"Lesemodus",readModeEmpty:"Für diese Seite konnte keine Leseansicht erstellt werden.",rulerColor:"Linealfarbe",opt_off:"Aus",opt_on:"An",opt_light:"Hell",opt_dark:"Dunkel",opt_grayscale:"Graustufen",opt_low:"Niedrig",opt_high:"Hoch",opt_dim:"Gedämpft",opt_tint:"Tönung",opt_black:"Schwarz",opt_white:"Weiß",opt_left:"Links",opt_center:"Zentriert",opt_right:"Rechts",opt_justify:"Blocksatz",opt_readable:"Lesbar",opt_dyslexic:"Legasthenie",decrease:"Verringern",increase:"Erhöhen",reset:"Alles zurücksetzen",note:"Änderungen wirken sich nur auf Ihre Ansicht aus — die Website wird nicht verändert.",poweredBy:"Bereitgestellt von",statement:"Barrierefreiheitserklärung",language:"Sprache",close:"Schließen",readAloudHint:"Klicken Sie auf beliebigen Text auf der Seite, um ihn vorlesen zu lassen.",f_textColor:"Textfarbe",f_titleColor:"Titelfarbe",f_bgColor:"Hintergrundfarbe",f_magnifier:"Textlupe",f_usefulLinks:"Nützliche Links",f_pageStructure:"Seitenstruktur",f_keyboardNav:"Tastaturnavigation",f_virtualKeyboard:"Bildschirmtastatur",f_voiceNav:"Sprachnavigation",f_dictionary:"Wörterbuch",f_feedbackForm:"Feedback",f_hideInterface:"Oberfläche ausblenden",f_userGuide:"Anleitung",f_aiSimplify:"Text vereinfachen",sec_tools:"Werkzeuge",dict_loading:"Wird gesucht…",dict_none:"Keine Definition gefunden.",nav_none:"Auf dieser Seite nichts gefunden.",kn_hint:"Mit Alt + M / H / F / B / G zwischen Bereichen springen.",guide_body:"Wählen Sie ein Schnellprofil oder aktivieren Sie einzelne Werkzeuge. Änderungen betreffen nur Ihre Ansicht dieser Seite und werden auf Ihrem Gerät gespeichert. Drücken Sie Esc, um ein Werkzeug zu schließen.",fb_open:"Problem melden",fb_msgLabel:"Was ist das Problem?",fb_emailLabel:"Ihre E-Mail (optional)",fb_send:"Senden",fb_sending:"Wird gesendet…",fb_sent:"Danke — Ihr Feedback wurde gesendet.",fb_failed:"Senden derzeit nicht möglich. Bitte später erneut versuchen.",as_action:"Vereinfachen",as_loading:"Wird vereinfacht…",as_failed:"Dieser Text konnte nicht vereinfacht werden."}};function d(e,t){var o,r;return(r=(o=$e[e])==null?void 0:o[t])!=null?r:$e.en[t]}function y(e,t,o){const r=document.createElement("div");r.className="mky-row";const i=document.createElement("span");i.className="mky-label",i.innerHTML=e;const c=document.createElement("span");return c.textContent=t,i.appendChild(c),r.append(i,o),r}function S(e,t,o,r){const i=document.createElement("button");return i.className="mky-switch",i.type="button",i.setAttribute("role","switch"),i.setAttribute("aria-label",e),i.setAttribute("aria-pressed",String(t)),i.addEventListener("click",()=>{const n=!(i.getAttribute("aria-pressed")==="true");o(n),i.setAttribute("aria-pressed",String(n)),r()}),i}function Q(e,t,o,r,i){const c=document.createElement("div");c.className="mky-seg",c.setAttribute("role","group"),c.setAttribute("aria-label",e);const n=[],a=s=>n.forEach(l=>l.setAttribute("aria-pressed",String(l.dataset.val===s)));for(const s of t){const l=document.createElement("button");l.type="button",l.textContent=s.label,l.dataset.val=s.value,l.setAttribute("aria-pressed",String(s.value===o)),l.addEventListener("click",()=>{r(s.value),a(s.value),i()}),n.push(l),c.appendChild(l)}return c}function de(e,t,o,r,i,c,n,a){const s=document.createElement("div");s.className="mky-stepper";const l=document.createElement("button");l.className="mky-step",l.type="button",l.textContent="−",l.setAttribute("aria-label",`${d(e,"decrease")} ${t}`);const u=document.createElement("span");u.className="mky-stepval",u.setAttribute("role","status"),u.setAttribute("aria-live","polite");const f=document.createElement("button");f.className="mky-step",f.type="button",f.textContent="+",f.setAttribute("aria-label",`${d(e,"increase")} ${t}`);let p=o;const g=()=>{u.textContent=`${p}%`,l.disabled=p<=r,f.disabled=p>=i};return g(),l.addEventListener("click",()=>{p<=r||(p=Math.max(r,p-c),n(p),g(),a())}),f.addEventListener("click",()=>{p>=i||(p=Math.min(i,p+c),n(p),g(),a())}),s.append(l,u,f),s}function ue(e,t,o,r,i){const c=document.createElement("div");c.className="mky-palette",c.setAttribute("role","group"),c.setAttribute("aria-label",e);const n=document.createElement("span");n.className="mky-palette-label",n.textContent=e,c.appendChild(n);const a=[];function s(l){a.forEach(u=>u.setAttribute("aria-pressed",String(u.dataset.swatchValue===l)))}for(const l of o){const u=document.createElement("button");u.type="button",u.className=l.value?"mky-swatch":"mky-swatch mky-swatch-off",u.style.background=l.value||"#ffffff",u.dataset.swatchValue=l.value,u.setAttribute("aria-label",`${e}: ${l.name}`),u.setAttribute("aria-pressed",String(l.value===t)),u.addEventListener("click",()=>{r(l.value),s(l.value),i()}),a.push(u),c.appendChild(u)}return c}const _t={textSize:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg>',lineSpacing:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',contrast:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/></svg>',stopMotion:'<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>',readingRuler:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="9" width="18" height="6" rx="1.5"/><path d="M7.5 9v3M12 9v3M16.5 9v3"/></svg>',highlightLinks:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.07 0l2-2a5 5 0 0 0-7.07-7.07l-1 1"/><path d="M14 11a5 5 0 0 0-7.07 0l-2 2A5 5 0 0 0 12 20.07l1-1"/></svg>',bigCursor:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M5 3l6.5 17 2.2-7.3L21 10.5 5 3z"/></svg>',readableFont:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 20l4-12 4 12M6.5 16h5M14 11c0-1.7 1.3-3 3-3s3 1.3 3 3v9"/></svg>',hideImages:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 16l5-5 3 3M3 3l18 18"/></svg>',saturation:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 3v9l6 3.5" stroke-width="1.5"/><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/></svg>',readingMask:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="5" rx="1" fill="currentColor" fill-opacity=".25"/><rect x="2" y="10" width="20" height="4" rx="1"/><rect x="2" y="16" width="20" height="5" rx="1" fill="currentColor" fill-opacity=".25"/></svg>',highlightTitles:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16M4 12h10"/><rect x="3" y="16" width="18" height="3" rx="1" fill="currentColor" fill-opacity=".3" stroke="none"/></svg>',textAlign:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M3 11h12M3 16h15"/></svg>',muteSounds:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H3v6h3l5 4V5z"/><path d="M17 9l4 4M21 9l-4 4"/></svg>',readAloud:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 10h.01M12 10h.01M16 10h.01"/></svg>',highlightHover:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/></svg>',biggerTargets:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="12" cy="12" r="3" fill="currentColor" fill-opacity=".25"/><path d="M12 9v6M9 12h6" stroke-width="1.5"/></svg>',focusIndicator:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/></svg>'},Pe=[{value:"",name:"Off"},{value:"#000000",name:"Black"},{value:"#1f2937",name:"Dark gray"},{value:"#1e3a8a",name:"Navy"},{value:"#14532d",name:"Dark green"},{value:"#7f1d1d",name:"Maroon"},{value:"#581c87",name:"Purple"}],St=[{value:"",name:"Off"},{value:"#ffffff",name:"White"},{value:"#fdf6e3",name:"Cream"},{value:"#f1f5f9",name:"Light gray"},{value:"#fefce8",name:"Pale yellow"},{value:"#eff6ff",name:"Pale blue"},{value:"#f0fdf4",name:"Pale green"}];function Ct(e,t,o,r){var c;const i=(c=_t[e])!=null?c:"";switch(e){case"contentScale":{const n=d(o,"f_contentScale");return y(i,n,de(o,n,t.contentScale,70,150,10,a=>{t.contentScale=a},r))}case"textSize":{const n=d(o,"f_textSize");return y(i,n,de(o,n,t.fontScale,80,200,10,a=>{t.fontScale=a},r))}case"lineSpacing":{const n=d(o,"f_lineSpacing");return y(i,n,de(o,n,t.lineHeightPct,100,250,10,a=>{t.lineHeightPct=a},r))}case"letterSpacing":{const n=d(o,"f_letterSpacing");return y(i,n,de(o,n,t.letterSpacingPct,0,50,5,a=>{t.letterSpacingPct=a},r))}case"contrast":{const n=d(o,"f_contrast"),a=Q(n,[{value:"off",label:d(o,"opt_off")},{value:"on",label:d(o,"opt_on")},{value:"light",label:d(o,"opt_light")},{value:"dark",label:d(o,"opt_dark")},{value:"high",label:d(o,"opt_high")}],t.contrast,s=>{t.contrast=s},r);return y(i,n,a)}case"textAlign":{const n=d(o,"f_textAlign"),a=Q(n,[{value:"off",label:d(o,"opt_off")},{value:"left",label:d(o,"opt_left")},{value:"center",label:d(o,"opt_center")},{value:"right",label:d(o,"opt_right")},{value:"justify",label:d(o,"opt_justify")}],t.textAlign,s=>{t.textAlign=s},r);return y(i,n,a)}case"readableFont":{const n=d(o,"f_readableFont"),a=Q(n,[{value:"off",label:d(o,"opt_off")},{value:"readable",label:d(o,"opt_readable")},{value:"dyslexic",label:d(o,"opt_dyslexic")}],t.font,s=>{t.font=s},r);return y(i,n,a)}case"saturation":{const n=d(o,"f_saturation"),a=Q(n,[{value:"off",label:d(o,"opt_off")},{value:"grayscale",label:d(o,"opt_grayscale")},{value:"low",label:d(o,"opt_low")},{value:"high",label:d(o,"opt_high")}],t.saturation,s=>{t.saturation=s},r);return y(i,n,a)}case"bigCursor":{const n=d(o,"f_bigCursor"),a=Q(n,[{value:"off",label:d(o,"opt_off")},{value:"black",label:d(o,"opt_black")},{value:"white",label:d(o,"opt_white")}],t.cursor,s=>{t.cursor=s},r);return y(i,n,a)}case"readingMask":{const n=d(o,"f_readingMask"),a=Q(n,[{value:"off",label:d(o,"opt_off")},{value:"dim",label:d(o,"opt_dim")},{value:"tint",label:d(o,"opt_tint")}],t.mask,s=>{t.mask=s},r);return y(i,n,a)}case"highlightLinks":{const n=d(o,"f_highlightLinks");return y(i,n,S(n,t.links,a=>{t.links=a},r))}case"hideImages":{const n=d(o,"f_hideImages");return y(i,n,S(n,t.images,a=>{t.images=a},r))}case"stopMotion":{const n=d(o,"f_stopMotion");return y(i,n,S(n,t.stopMotion,a=>{t.stopMotion=a},r))}case"readingRuler":{const n=d(o,"f_readingRuler"),a=y(i,n,S(n,t.ruler,u=>{t.ruler=u},r)),s=ue(d(o,"rulerColor"),t.rulerColor,[{value:"#ffd400",name:"Yellow"},{value:"#22c55e",name:"Green"},{value:"#3b82f6",name:"Blue"},{value:"#ec4899",name:"Pink"},{value:"#111827",name:"Black"}],u=>{t.rulerColor=u},r),l=document.createElement("div");return l.append(a,s),l}case"highlightTitles":{const n=d(o,"f_highlightTitles");return y(i,n,S(n,t.titles,a=>{t.titles=a},r))}case"muteSounds":{const n=d(o,"f_muteSounds");return y(i,n,S(n,t.mute,a=>{t.mute=a},r))}case"readAloud":{const n=d(o,"f_readAloud");return y(i,n,S(n,t.readAloud,a=>{t.readAloud=a},r))}case"highlightHover":{const n=d(o,"f_highlightHover");return y(i,n,S(n,t.hoverHighlight,a=>{t.hoverHighlight=a},r))}case"biggerTargets":{const n=d(o,"f_biggerTargets");return y(i,n,S(n,t.biggerTargets,a=>{t.biggerTargets=a},r))}case"focusIndicator":{const n=d(o,"f_focusIndicator");return y(i,n,S(n,t.focusIndicator,a=>{t.focusIndicator=a},r))}case"textColor":{const n=d(o,"f_textColor");return ue(n,t.textColor,Pe,a=>{t.textColor=a},r)}case"titleColor":{const n=d(o,"f_titleColor");return ue(n,t.titleColor,Pe,a=>{t.titleColor=a},r)}case"bgColor":{const n=d(o,"f_bgColor");return ue(n,t.bgColor,St,a=>{t.bgColor=a},r)}case"magnifier":{const n=d(o,"f_magnifier");return y(i,n,S(n,t.magnifier,a=>{t.magnifier=a},r))}case"readMode":{const n=d(o,"f_readMode");return y(i,n,S(n,t.readMode,a=>{t.readMode=a},r))}case"usefulLinks":{const n=d(o,"f_usefulLinks");return y(i,n,S(n,t.usefulLinks,a=>{t.usefulLinks=a},r))}case"pageStructure":{const n=d(o,"f_pageStructure");return y(i,n,S(n,t.pageStructure,a=>{t.pageStructure=a},r))}case"keyboardNav":{const n=d(o,"f_keyboardNav");return y(i,n,S(n,t.keyboardNav,a=>{t.keyboardNav=a},r))}case"virtualKeyboard":{const n=d(o,"f_virtualKeyboard");return y(i,n,S(n,t.virtualKeyboard,a=>{t.virtualKeyboard=a},r))}case"voiceNav":{const n=d(o,"f_voiceNav");return y(i,n,S(n,t.voiceNav,a=>{t.voiceNav=a},r))}case"dictionary":{const n=d(o,"f_dictionary");return y(i,n,S(n,t.dictionary,a=>{t.dictionary=a},r))}case"aiSimplify":{const n=d(o,"f_aiSimplify");return y(i,n,S(n,t.aiSimplify,a=>{t.aiSimplify=a},r))}default:return null}}const Fe=[{key:"vision",labelKey:"profile_vision",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>',apply:e=>{e.contrast="on",e.fontScale=140,e.cursor="black"}},{key:"lowVision",labelKey:"profile_lowVision",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.4 1.4M17.6 17.6L19 19M19 5l-1.4 1.4M6.4 17.6L5 19"/></svg>',apply:e=>{e.fontScale=130,e.lineHeightPct=180,e.letterSpacingPct=5,e.cursor="black",e.links=!0}},{key:"dyslexia",labelKey:"profile_dyslexia",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg>',apply:e=>{e.font="dyslexic",e.lineHeightPct=180,e.letterSpacingPct=5,e.fontScale=110}},{key:"adhd",labelKey:"profile_adhd",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/></svg>',apply:e=>{e.stopMotion=!0,e.lineHeightPct=180,e.letterSpacingPct=5,e.links=!0}},{key:"seizure",labelKey:"profile_seizure",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3l8 3v6c0 4-3 7-8 9-5-2-8-5-8-9V6z"/></svg>',apply:e=>{e.stopMotion=!0}},{key:"senior",labelKey:"profile_senior",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',apply:e=>{e.fontScale=130,e.lineHeightPct=180,e.letterSpacingPct=5,e.cursor="black",e.font="readable"}},{key:"cognitive",labelKey:"profile_cognitive",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24A2.5 2.5 0 0 1 9.5 2z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24A2.5 2.5 0 0 0 14.5 2z"/></svg>',apply:e=>{e.mask="dim",e.lineHeightPct=180,e.letterSpacingPct=5,e.images=!0,e.stopMotion=!0}},{key:"colorBlind",labelKey:"profile_colorBlind",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 3v9M12 12l7.5 4.5" stroke-width="1.5"/><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/></svg>',apply:e=>{e.saturation="high",e.titles=!0}},{key:"motorTremor",labelKey:"profile_motorTremor",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>',apply:e=>{e.cursor="black",e.biggerTargets=!0,e.stopMotion=!0}},{key:"eslReading",labelKey:"profile_eslReading",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',apply:e=>{e.font="readable",e.lineHeightPct=180,e.letterSpacingPct=5,e.ruler=!0}},{key:"keyboardNav",labelKey:"profile_keyboardNav",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8"/></svg>',apply:e=>{e.keyboardNav=!0,e.focusIndicator=!0,e.biggerTargets=!0}},{key:"clearReading",labelKey:"profile_clearReading",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M9 7h7M9 11h5"/></svg>',apply:e=>{e.font="readable",e.titles=!0,e.links=!0}}];function ke(e,t){if(Object.assign(e,re),t==="none")return;const o=Fe.find(r=>r.key===t);o==null||o.apply(e)}function Et(e,t){try{const o=e.trim().replace(/^#/,"");let r,i,c;if(o.length===3)r=parseInt(o[0]+o[0],16),i=parseInt(o[1]+o[1],16),c=parseInt(o[2]+o[2],16);else if(o.length===6)r=parseInt(o.slice(0,2),16),i=parseInt(o.slice(2,4),16),c=parseInt(o.slice(4,6),16);else return`rgba(0,0,0,${t})`;return isNaN(r)||isNaN(i)||isNaN(c)?`rgba(0,0,0,${t})`:`rgba(${r},${i},${c},${t})`}catch{return`rgba(0,0,0,${t})`}}function At(){let e=null,t="#ffd400";const o=i=>{e&&(e.style.top=`${i.clientY}px`)};function r(i){e&&(e.style.background=Et(i,.18),e.style.borderTop=`2px solid ${i}`,e.style.borderBottom=`2px solid ${i}`)}return{on(){e||(e=document.createElement("div"),e.setAttribute("aria-hidden","true"),e.style.cssText=["position:fixed","left:0","top:0","width:100vw","height:28px","pointer-events:none","z-index:2147483646","transform:translateY(-14px)"].join(";"),r(t),document.documentElement.appendChild(e),window.addEventListener("mousemove",o))},off(){e&&(window.removeEventListener("mousemove",o),e==null||e.remove(),e=null)},setColor(i){t=i,r(i)}}}function Lt(){let e=null,t=null,o=null,r="off";const i=120,c=s=>{t&&(t.style.top=`${s.clientY-i/2}px`)};function n(){window.removeEventListener("mousemove",c),e==null||e.remove(),t==null||t.remove(),o==null||o.remove(),e=null,t=null,o=null}function a(s){const l=document.createElement("div");return l.setAttribute("aria-hidden","true"),l.style.cssText=["position:fixed","left:0","top:0","width:100%","height:100%","pointer-events:none","z-index:2147483645",s].join(";"),l}return{set(s){if(s!==r&&(n(),r=s,s!=="off")){if(s==="dim"){e=a("background:rgba(0,0,0,.55)"),t=a([`height:${i}px`,"top:0","width:100%","background:transparent","z-index:2147483646"].join(";")),t.style.height=`${i}px`,document.documentElement.appendChild(e),document.documentElement.appendChild(t),window.addEventListener("mousemove",c),t.style.top=`${window.innerHeight/2-i/2}px`;return}if(s==="tint"){o=a(["background:rgba(255,250,200,.18)","z-index:2147483646"].join(";")),document.documentElement.appendChild(o);return}}}}}function Mt(e){if(!("speechSynthesis"in window))return{enable(){},disable(){},setLang(i){}};let t=e,o=!1;const r=i=>{var c,n;try{const a=i.target;if(!a||(c=a.closest)!=null&&c.call(a,"#makoya-widget-root"))return;const s=(n=a.innerText)==null?void 0:n.trim();if(!s)return;window.speechSynthesis.cancel();const l=new SpeechSynthesisUtterance(s);try{const f=window.speechSynthesis.getVoices().find(p=>p.lang.startsWith(t));f&&(l.voice=f)}catch{}window.speechSynthesis.speak(l)}catch{}};return{enable(){o||(o=!0,document.addEventListener("click",r,!0))},disable(){if(o){o=!1;try{window.speechSynthesis.cancel()}catch{}document.removeEventListener("click",r,!0)}},setLang(i){t=i}}}function Tt(){let e=!1;const t=r=>{const i=r.target;i instanceof HTMLMediaElement&&(i.muted=!0)};function o(){return Array.from(document.querySelectorAll("audio, video"))}return{enable(){if(!e){e=!0;for(const r of o())r.muted=!0;document.addEventListener("play",t,!0)}},disable(){if(e){e=!1,document.removeEventListener("play",t,!0);for(const r of o())r.muted=!1}}}}function Nt(){let e=null,t=!1;const o=r=>{var i;try{const c=r.target;if(!c||!e)return;if((i=c.closest)!=null&&i.call(c,"#makoya-widget-root")){e.style.opacity="0";return}const n=c.getBoundingClientRect();e.style.left=`${n.left}px`,e.style.top=`${n.top}px`,e.style.width=`${n.width}px`,e.style.height=`${n.height}px`,e.style.opacity="1"}catch{}};return{enable(){t||(t=!0,e=document.createElement("div"),e.setAttribute("aria-hidden","true"),e.style.cssText=["position:fixed","left:0","top:0","width:0","height:0","border:2px solid #1e63ff","border-radius:3px","pointer-events:none","z-index:2147483646","opacity:0","transition:top .06s ease,left .06s ease,width .06s ease,height .06s ease"].join(";"),document.documentElement.appendChild(e),window.addEventListener("mousemove",o))},disable(){t&&(t=!1,window.removeEventListener("mousemove",o),e==null||e.remove(),e=null)}}}const De=240,fe=24;function zt(){let e=null,t=!1;const o=r=>{var i;try{if(!e)return;const c=document.elementFromPoint(r.clientX,r.clientY);if(!c||(i=c.closest)!=null&&i.call(c,"#makoya-widget-root")){e.style.opacity="0";return}const n=(c.innerText||c.textContent||"").trim();if(!n){e.style.opacity="0";return}e.textContent=n.length>De?`${n.slice(0,De)}…`:n;const a=320;let s=r.clientX+fe,l=r.clientY+fe;s+a>window.innerWidth&&(s=r.clientX-a-fe),l+160>window.innerHeight&&(l=r.clientY-160-fe),e.style.left=`${Math.max(8,s)}px`,e.style.top=`${Math.max(8,l)}px`,e.style.opacity="1"}catch{}};return{enable(){t||(t=!0,e=document.createElement("div"),e.setAttribute("aria-hidden","true"),e.style.cssText=["position:fixed","left:0","top:0","max-width:320px","padding:12px 16px","background:#ffffff","color:#111111","font-size:26px","line-height:1.4","font-family:Verdana, Arial, sans-serif","border:2px solid #1e63ff","border-radius:10px","box-shadow:0 8px 30px rgba(0,0,0,.25)","pointer-events:none","z-index:2147483646","opacity:0","overflow:hidden","max-height:160px"].join(";"),document.documentElement.appendChild(e),window.addEventListener("mousemove",o))},disable(){t&&(t=!1,window.removeEventListener("mousemove",o),e==null||e.remove(),e=null)}}}const Rt=400,It=240;function Bt(){var c;const e=(document.title||"").trim(),t=document.querySelector("article")||document.querySelector("main")||document.querySelector("[role=main]")||document.body,o=[];let r=0,i=0;try{const n=t.querySelectorAll("h1, h2, h3, h4, p, li");for(const a of Array.from(n)){if(i>=Rt)break;i+=1;const s=a;if((c=s.closest)!=null&&c.call(s,"#makoya-widget-root"))continue;const l=(s.innerText||s.textContent||"").replace(/\s+/g," ").trim();if(!l)continue;const u=/^H[1-4]$/.test(s.tagName)?"h":"p";o.push({tag:u,text:l}),r+=l.length}}catch{}return{title:e,blocks:o,chars:r}}function Ht(e){let t=null,o=null,r=null;function i(c){var n,a,s,l;r&&(document.removeEventListener("keydown",r,!0),r=null),t==null||t.remove(),t=null;try{const u=(a=(n=e.getReturnFocus)==null?void 0:n.call(e))!=null?a:o;(l=(s=u&&document.contains(u)?u:document.body)==null?void 0:s.focus)==null||l.call(s)}catch{}if(o=null,c)try{e.onClose()}catch{}}return{open(c){var n;if(!t)try{o=(n=document.activeElement)!=null?n:null,t=document.createElement("div"),t.style.cssText="position:fixed;inset:0;z-index:2147483646;";const a=t.attachShadow({mode:"open"}),{title:s,blocks:l,chars:u}=Bt(),f=document.createElement("style");f.textContent=`
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
        `,a.appendChild(f);const p=document.createElement("div");p.className="wrap",p.setAttribute("role","dialog"),p.setAttribute("aria-modal","true"),p.setAttribute("aria-label",d(c,"f_readMode"));const g=document.createElement("div");g.className="bar";const m=document.createElement("button");m.type="button",m.className="close",m.textContent=d(c,"close"),m.addEventListener("click",()=>i(!0)),g.appendChild(m);const x=document.createElement("div");if(x.className="doc",u<It){const b=document.createElement("p");b.className="empty",b.textContent=d(c,"readModeEmpty"),x.appendChild(b)}else{if(s){const b=document.createElement("h1");b.textContent=s,x.appendChild(b)}for(const b of l){const T=document.createElement(b.tag==="h"?"h2":"p");T.textContent=b.text,x.appendChild(T)}}p.append(g,x),a.appendChild(p),document.documentElement.appendChild(t),requestAnimationFrame(()=>m.focus()),r=b=>{t&&(b.key==="Escape"?(b.preventDefault(),i(!0)):b.key==="Tab"&&(b.preventDefault(),m.focus()))},document.addEventListener("keydown",r,!0)}catch{i(!1)}},close(){t&&i(!1)}}}const Ot={m:"main, [role=main]",h:"h1, h2, h3, h4, h5, h6",f:"input:not([type=hidden]), select, textarea",b:"button, [role=button], input[type=submit], input[type=button]",g:"img, svg, [role=img], picture"};function $t(e){const t=e;if(t.closest("#makoya-widget-root"))return!1;const o=t.getBoundingClientRect();return o.width>0||o.height>0}function Pt(e){try{e.scrollIntoView({behavior:"smooth",block:"center"}),e.hasAttribute("tabindex")||(e.setAttribute("tabindex","-1"),e.addEventListener("blur",()=>{try{e.removeAttribute("tabindex")}catch{}},{once:!0})),e.focus({preventScroll:!0})}catch{}}function Ft(){let e=!1;const t={},o=r=>{var i;try{if(!r.altKey||r.ctrlKey||r.metaKey)return;const c=r.key.toLowerCase(),n=Ot[c];if(!n)return;const a=Array.from(document.querySelectorAll(n)).filter($t);if(a.length===0)return;r.preventDefault();const s=((i=t[c])!=null?i:-1)+1;t[c]=s>=a.length?0:s,Pt(a[t[c]])}catch{}};return{enable(){e||(e=!0,document.addEventListener("keydown",o))},disable(){if(e){e=!1,document.removeEventListener("keydown",o);for(const r of Object.keys(t))delete t[r]}}}}function je(e){if(!e)return!1;const t=e.tagName;if(t==="TEXTAREA")return!0;if(t==="INPUT"){const o=e.type;return!["checkbox","radio","button","submit","reset","file","range","color","image"].includes(o)}return!1}function Dt(e,t){var i;const o=e instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,r=(i=Object.getOwnPropertyDescriptor(o,"value"))==null?void 0:i.set;r?r.call(e,t):e.value=t}const jt=[["1","2","3","4","5","6","7","8","9","0"],["q","w","e","r","t","y","u","i","o","p"],["a","s","d","f","g","h","j","k","l"],["z","x","c","v","b","n","m"]];function Kt(){let e=null,t=!1,o=null;const r=a=>{var l;const s=a.target;s&&!((l=s.closest)!=null&&l.call(s,"#makoya-vk-root"))&&je(s)&&(o=s)};function i(){const a=document.activeElement;return je(a)?a:o&&document.contains(o)?o:null}function c(a,s){var l;try{const u=i();if(!u)return;const f=(l=u.value)!=null?l:"";let p=f,g="insertText";s==="char"?p=f+a:s==="backspace"?(p=f.slice(0,-1),g="deleteContentBackward"):s==="clear"&&(p="",g="deleteContent"),Dt(u,p),u.dispatchEvent(new InputEvent("input",{bubbles:!0,inputType:g,data:s==="char"?a:null}))}catch{}}function n(a,s,l,u=!1){const f=document.createElement("button");return f.type="button",f.className=u?"vk-key vk-wide":"vk-key",f.textContent=a,f.setAttribute("aria-label",s),f.addEventListener("mousedown",p=>p.preventDefault()),f.addEventListener("click",l),f}return{enable(){if(t)return;t=!0,document.addEventListener("focusin",r,!0),e=document.createElement("div"),e.id="makoya-vk-root",e.style.cssText="position:fixed;left:0;right:0;bottom:0;z-index:2147483645;";const a=e.attachShadow({mode:"open"}),s=document.createElement("style");s.textContent=`
        .vk{background:#1f2430;padding:10px;display:flex;flex-direction:column;gap:8px;
          box-shadow:0 -6px 24px rgba(0,0,0,.3);font-family:system-ui,sans-serif;}
        .vk-row{display:flex;gap:6px;justify-content:center;}
        .vk-key{min-width:40px;height:44px;border:0;border-radius:8px;background:#3a4150;color:#fff;
          font-size:17px;cursor:pointer;flex:1;max-width:64px;}
        .vk-key:hover{background:#4a5365;}
        .vk-key:focus-visible{outline:3px solid #1e63ff;outline-offset:2px;}
        .vk-wide{max-width:none;flex:2;}
        .vk-space{flex:6;}
      `,a.appendChild(s);const l=document.createElement("div");l.className="vk",l.setAttribute("role","group"),l.setAttribute("aria-label","On-screen keyboard");for(const p of jt){const g=document.createElement("div");g.className="vk-row";for(const m of p)g.appendChild(n(m,m,()=>c(m,"char")));l.appendChild(g)}const u=document.createElement("div");u.className="vk-row";const f=n("Space","Space",()=>c(" ","char"),!0);f.classList.add("vk-space"),u.append(n("⌫","Backspace",()=>c("","backspace"),!0),f,n("Clear","Clear field",()=>c("","clear"),!0)),l.appendChild(u),a.appendChild(l),document.documentElement.appendChild(e)},disable(){t&&(t=!1,document.removeEventListener("focusin",r,!0),e==null||e.remove(),e=null,o=null)}}}function qt(){var t,o;const e=window;return(o=(t=e.SpeechRecognition)!=null?t:e.webkitSpeechRecognition)!=null?o:null}function Ke(e){const t=e;if(t.closest("#makoya-widget-root")||t.closest("[aria-hidden='true']")||t.disabled)return!1;const o=t.getBoundingClientRect();return o.width>0||o.height>0}function qe(e){try{e.focus({preventScroll:!1}),e.click()}catch{}}function Gt(e){const t=qt();if(!t)return{enable(){},disable(){}};let o=null,r=!1;function i(c){const n=c.toLowerCase().trim();try{const a=window.innerHeight||600;if(n.includes("scroll down"))return void window.scrollBy({top:a*.8,behavior:"smooth"});if(n.includes("scroll up"))return void window.scrollBy({top:-a*.8,behavior:"smooth"});if(/\btop\b/.test(n))return void window.scrollTo({top:0,behavior:"smooth"});if(/\bbottom\b/.test(n))return void window.scrollTo({top:document.body.scrollHeight,behavior:"smooth"});if(n.includes("open menu")){const l=document.querySelector("nav a, [role=menu] a, [role=navigation] a, header a");l&&Ke(l)&&qe(l);return}const s=n.match(/(?:click|open|press)\s+(.+)/);if(s){const l=s[1].trim(),u=Array.from(document.querySelectorAll("a, button, [role=button]")).filter(Ke),f=m=>(m.innerText||m.textContent||"").toLowerCase().replace(/\s+/g," ").trim(),p=u.filter(m=>f(m)===l),g=p.length?p:u.filter(m=>f(m).includes(l));g.length===1&&qe(g[0])}}catch{}}return{enable(){if(!r){r=!0;try{o=new t,o.continuous=!0,o.interimResults=!1,o.lang=e.getLang(),o.onresult=c=>{var n,a;try{const s=c.results[c.results.length-1],l=(a=(n=s==null?void 0:s[0])==null?void 0:n.transcript)!=null?a:"";l&&i(l)}catch{}},o.onend=()=>{if(r)try{o==null||o.start()}catch{}},o.onerror=c=>{var a;const n=(a=c==null?void 0:c.error)!=null?a:"";if(n==="not-allowed"||n==="service-not-allowed"){r=!1;try{o==null||o.stop()}catch{}}},o.start()}catch{r=!1,o=null}}},disable(){if(r){r=!1;try{o==null||o.stop()}catch{}o=null}}}}const Ut="https://api.dictionaryapi.dev/api/v2/entries";async function Vt(e,t){var r,i,c,n;const o=e.trim().toLowerCase();if(!o||/\s/.test(o)||o.length>40)return{ok:!1,word:e};try{const a=await fetch(`${Ut}/${encodeURIComponent(t)}/${encodeURIComponent(o)}`);if(!a.ok)return{ok:!1,word:o};const s=await a.json(),l=(i=(r=s==null?void 0:s[0])==null?void 0:r.meanings)==null?void 0:i[0],u=(n=(c=l==null?void 0:l.definitions)==null?void 0:c[0])==null?void 0:n.definition;return u?{ok:!0,word:o,partOfSpeech:l==null?void 0:l.partOfSpeech,definition:u}:{ok:!1,word:o}}catch{return{ok:!1,word:o}}}function Wt(e){return/^[A-Za-zÀ-ÿ'’-]{1,40}$/.test(e)}function Yt(e){let t=!1,o=0;const r=()=>{var i,c;try{const n=(i=window.getSelection)==null?void 0:i.call(window);if(!n)return;const a=n.anchorNode,s=a&&(a.nodeType===1?a:a.parentElement);if((c=s==null?void 0:s.closest)!=null&&c.call(s,"#makoya-widget-root"))return;const l=(n.toString()||"").trim();if(!Wt(l))return;const u=++o;e.onResult({status:"loading",word:l}),Vt(l,e.getLang()).then(f=>{u!==o||!t||(f.ok&&f.definition?e.onResult({status:"ok",word:f.word,partOfSpeech:f.partOfSpeech,definition:f.definition}):e.onResult({status:"none",word:f.word}))})}catch{}};return{enable(){t||(t=!0,document.addEventListener("mouseup",r))},disable(){t&&(t=!1,o++,document.removeEventListener("mouseup",r))}}}function ve(){return window.MAKOYA_CONFIG_BASE||"https://makoya-gamma.vercel.app/api/config"}function Xt(){const e=window.MAKOYA_CONFIG_TIMEOUT_MS;return typeof e=="number"&&e>0?e:5e3}async function Zt(e,t){const r=`${ve()}/${encodeURIComponent(e)}`+(t?`?t=${encodeURIComponent(t)}`:""),i=typeof AbortController!="undefined"?new AbortController:null,c=i?setTimeout(()=>i.abort(),Xt()):null;try{const n=await fetch(r,{cache:"default",signal:i==null?void 0:i.signal});if(!n.ok)return{active:!0,config:{}};const a=await n.json(),{active:s,...l}=a;return{active:s!==!1,config:l}}catch{return{active:!0,config:{}}}finally{c&&clearTimeout(c)}}function Ge(){try{return new URL(ve()).origin}catch{return null}}async function Jt(e){try{const t=Ge();return!t||typeof fetch=="undefined"?!1:(await fetch(`${t}/api/widget-feedback`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(e)})).ok}catch{return!1}}async function Qt(e){try{const t=Ge();if(!t||typeof fetch=="undefined")return null;const o=await fetch(`${t}/api/widget-simplify`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(e)});if(!o.ok)return null;const r=await o.json();return r!=null&&r.ok&&typeof r.text=="string"?r.text:null}catch{return null}}const eo=40,to=2e3;function oo(e){let t=!1,o=null;function r(){o==null||o.remove(),o=null}function i(){var s;try{const l=(s=window.getSelection)==null?void 0:s.call(window);if(!l||l.rangeCount===0)return null;const u=l.getRangeAt(0).getBoundingClientRect();return u&&(u.width||u.height)?u:null}catch{return null}}function c(s){r();const l=e.getStrings();o=document.createElement("div");const u=i(),f=u?Math.min(window.innerHeight-60,u.bottom+8):window.innerHeight-80,p=u?Math.max(8,Math.min(window.innerWidth-340,u.left)):16;o.style.cssText=`position:fixed;top:${f}px;left:${p}px;z-index:2147483646;`;const g=o.attachShadow({mode:"open"}),m=document.createElement("style");m.textContent=".box{position:relative;max-width:340px;background:#fff;color:#1a1a1a;border:2px solid #1e63ff;border-radius:12px;padding:12px 14px;box-shadow:0 8px 30px rgba(0,0,0,.25);font-family:system-ui,sans-serif;font-size:14px;line-height:1.5;}.act{font:inherit;font-weight:600;cursor:pointer;border:0;background:#1e63ff;color:#fff;border-radius:8px;padding:8px 14px;}.act:focus-visible,.x:focus-visible{outline:3px solid #1a1a1a;outline-offset:2px;}.x{position:absolute;top:4px;right:6px;border:0;background:transparent;font-size:18px;cursor:pointer;color:#666;}.out{margin-top:4px;}";const x=document.createElement("div");x.className="box",x.setAttribute("role","status"),x.setAttribute("aria-live","polite");const b=document.createElement("button");b.className="x",b.type="button",b.textContent="×",b.setAttribute("aria-label",l.close),b.addEventListener("click",r);const T=document.createElement("div");T.textContent=s,x.append(b,T),g.append(m,x),document.documentElement.appendChild(o),o._body=T}function n(s){if(!o)return;const l=o._body;l&&(typeof s=="string"?l.textContent=s:(l.textContent="",l.appendChild(s)))}const a=()=>{var s,l;try{const u=(s=window.getSelection)==null?void 0:s.call(window);if(!u)return;const f=u.anchorNode&&(u.anchorNode.nodeType===1?u.anchorNode:u.anchorNode.parentElement);if((l=f==null?void 0:f.closest)!=null&&l.call(f,"#makoya-widget-root"))return;const p=(u.toString()||"").trim();if(p.length<eo){r();return}const g=p.slice(0,to),m=e.getStrings();c("");const x=document.createElement("button");x.className="act",x.type="button",x.textContent=m.action,x.addEventListener("click",()=>{n(m.loading),Qt({siteId:e.getSiteId(),text:g,lang:e.getLang()}).then(b=>{o&&n(b!=null?b:m.failed)})}),n(x),requestAnimationFrame(()=>x.focus())}catch{}};return{enable(){t||(t=!0,document.addEventListener("mouseup",a))},disable(){t&&(t=!1,document.removeEventListener("mouseup",a),r())}}}const Ue=100;function Ve(e){try{if(e.closest("#makoya-widget-root"))return!1;const t=e.getBoundingClientRect();if(t.width===0&&t.height===0)return!1;const o=window.getComputedStyle(e);return o.visibility!=="hidden"&&o.display!=="none"}catch{return!1}}function no(){const e=[],t=new Set;try{const o=document.querySelectorAll("a[href]");for(const r of Array.from(o)){if(e.length>=Ue)break;if(!Ve(r))continue;const i=(r.innerText||r.textContent||"").replace(/\s+/g," ").trim();if(!i)continue;const c=`${i}|${r.getAttribute("href")}`;t.has(c)||(t.add(c),e.push({label:i.length>80?`${i.slice(0,80)}…`:i,el:r}))}}catch{}return e}function io(){const e=[];try{const t=document.querySelectorAll("h1, h2, h3, h4, h5, h6");for(const o of Array.from(t)){if(e.length>=Ue)break;if(!Ve(o))continue;const r=(o.innerText||o.textContent||"").replace(/\s+/g," ").trim();r&&e.push({label:r.length>80?`${r.slice(0,80)}…`:r,el:o,level:Number(o.tagName.charAt(1))||1})}}catch{}return e}function We(e){let t=null,o=null,r=null;function i(n){return Array.from(n.querySelectorAll("button"))}function c(n,a=!0){var s,l,u,f;if(r&&(document.removeEventListener("keydown",r,!0),r=null),t==null||t.remove(),t=null,a)try{const p=(l=(s=e.getReturnFocus)==null?void 0:s.call(e))!=null?l:o;(f=(u=p&&document.contains(p)?p:document.body)==null?void 0:u.focus)==null||f.call(u)}catch{}if(o=null,n)try{e.onClose()}catch{}}return{open(){var n;if(!t)try{o=(n=document.activeElement)!=null?n:null;const a=e.collect(),s=e.getTitle(),l=e.getCloseLabel(),u=e.getEmptyLabel();t=document.createElement("div"),t.style.cssText="position:fixed;inset:0;z-index:2147483646;";const f=t.attachShadow({mode:"open"}),p=document.createElement("style");p.textContent=`
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
        `,f.appendChild(p);const g=document.createElement("div");g.className="scrim",g.addEventListener("click",()=>c(!0));const m=document.createElement("div");m.className="panel",m.setAttribute("role","dialog"),m.setAttribute("aria-modal","true"),m.setAttribute("aria-label",s);const x=document.createElement("div");x.className="hd";const b=document.createElement("h2");b.textContent=s;const T=document.createElement("button");T.className="x",T.type="button",T.textContent=l,T.addEventListener("click",()=>c(!0)),x.append(b,T);const oe=document.createElement("ul");if(a.length===0){const _=document.createElement("li");_.className="empty",_.textContent=u,oe.appendChild(_)}else for(const _ of a){const O=document.createElement("li"),L=document.createElement("button");L.type="button",L.textContent=_.level?`${"— ".repeat(Math.max(0,_.level-1))}${_.label}`:_.label,L.addEventListener("click",()=>{c(!0,!1),ro(_.el)}),O.appendChild(L),oe.appendChild(O)}m.append(x,oe),f.append(g,m),document.documentElement.appendChild(t),requestAnimationFrame(()=>T.focus()),r=_=>{if(t){if(_.key==="Escape"){_.preventDefault(),c(!0);return}if(_.key==="Tab"){const O=i(f);if(O.length===0)return;const L=O[0],ae=O[O.length-1],me=f.activeElement;_.shiftKey&&me===L?(_.preventDefault(),ae.focus()):!_.shiftKey&&me===ae&&(_.preventDefault(),L.focus())}}},document.addEventListener("keydown",r,!0)}catch{c(!1)}},close(){t&&c(!1)}}}function ro(e){try{e.scrollIntoView({behavior:"smooth",block:"start"}),e.hasAttribute("tabindex")||(e.setAttribute("tabindex","-1"),e.addEventListener("blur",()=>{try{e.removeAttribute("tabindex")}catch{}},{once:!0})),e.focus({preventScroll:!0})}catch{}}const ao=5*60*1e3,so=2e3,we=50;let W=null,_e,ee=!1,Ye=0,Y=[],te=null,Xe=!1;function lo(){try{const e=window.MAKOYA_API_ORIGIN;return typeof e=="string"&&e?e.replace(/\/+$/,""):new URL(ve()).origin}catch{try{return location.origin}catch{return null}}}function co(){try{if(window.MAKOYA_NO_TELEMETRY)return!0}catch{}try{if(typeof document!="undefined"&&typeof document.querySelector=="function"&&document.querySelector("script[data-no-telemetry]"))return!0}catch{}return!1}function uo(e){try{W=e.siteId||null,_e=e.token,ee=!!W&&typeof fetch=="function"&&!co(),ee&&po()}catch{ee=!1}}function Ze(e,t){try{if(typeof fetch!="function")return;const o=lo();if(!o)return;const r=fetch(o+e,{method:"POST",keepalive:!0,headers:{"content-type":"application/json"},body:JSON.stringify(t),mode:"cors"});r&&typeof r.catch=="function"&&r.catch(()=>{})}catch{}}function Je(){try{if(!ee||!W)return;const e=Date.now();if(e-Ye<ao)return;Ye=e;let t="";try{const o=new URL(location.href);t=o.origin+o.pathname}catch{t=""}Ze("/api/heartbeat",{siteId:W,token:_e,url:t})}catch{}}function Qe(e,t){try{if(!ee||!W||Y.length>=we)return;Y.push(t?{event:e,featureKey:t,ts:Date.now()}:{event:e,ts:Date.now()}),fo()}catch{}}function fo(){try{if(te)return;te=setTimeout(()=>{te=null,Se()},so)}catch{}}function Se(){try{if(te&&(clearTimeout(te),te=null),!ee||!W){Y=[];return}if(Y.length===0)return;const e=Y.slice(0,we);Y=Y.slice(we),Ze("/api/widget-events",{siteId:W,token:_e,events:e})}catch{}}function po(){try{if(Xe)return;typeof document!="undefined"&&typeof document.addEventListener=="function"&&document.addEventListener("visibilitychange",()=>{try{document.visibilityState==="hidden"&&Se()}catch{}}),typeof window!="undefined"&&typeof window.addEventListener=="function"&&window.addEventListener("pagehide",()=>{try{Se()}catch{}}),Xe=!0}catch{}}function mo(e){const t=new Set;return e.contentScale!==100&&t.add("contentScale"),e.fontScale!==100&&t.add("textSize"),e.lineHeightPct!==100&&t.add("lineSpacing"),e.letterSpacingPct!==0&&t.add("letterSpacing"),e.contrast!=="off"&&t.add("contrast"),e.stopMotion&&t.add("stopMotion"),e.ruler&&t.add("readingRuler"),e.links&&t.add("highlightLinks"),e.cursor!=="off"&&t.add("bigCursor"),e.font!=="off"&&t.add("readableFont"),e.images&&t.add("hideImages"),e.saturation!=="off"&&t.add("saturation"),e.mask!=="off"&&t.add("readingMask"),e.titles&&t.add("highlightTitles"),e.textAlign!=="off"&&t.add("textAlign"),e.mute&&t.add("muteSounds"),e.readAloud&&t.add("readAloud"),e.hoverHighlight&&t.add("highlightHover"),e.biggerTargets&&t.add("biggerTargets"),e.focusIndicator&&t.add("focusIndicator"),e.textColor!==""&&t.add("textColor"),e.titleColor!==""&&t.add("titleColor"),e.bgColor!==""&&t.add("bgColor"),e.magnifier&&t.add("magnifier"),e.readMode&&t.add("readMode"),e.usefulLinks&&t.add("usefulLinks"),e.pageStructure&&t.add("pageStructure"),e.keyboardNav&&t.add("keyboardNav"),e.virtualKeyboard&&t.add("virtualKeyboard"),e.voiceNav&&t.add("voiceNav"),e.dictionary&&t.add("dictionary"),e.aiSimplify&&t.add("aiSimplify"),t}const et="makoya_lang",ho='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',go={contentScale:"sec_content",textSize:"sec_content",lineSpacing:"sec_content",letterSpacing:"sec_content",readableFont:"sec_content",textAlign:"sec_content",highlightTitles:"sec_content",highlightLinks:"sec_content",hideImages:"sec_content",stopMotion:"sec_content",contrast:"sec_color",saturation:"sec_color",textColor:"sec_color",titleColor:"sec_color",bgColor:"sec_color",readingMask:"sec_color",readingRuler:"sec_nav",bigCursor:"sec_nav",highlightHover:"sec_nav",biggerTargets:"sec_nav",focusIndicator:"sec_nav",magnifier:"sec_nav",readMode:"sec_nav",usefulLinks:"sec_nav",pageStructure:"sec_nav",keyboardNav:"sec_nav",virtualKeyboard:"sec_nav",voiceNav:"sec_nav",muteSounds:"sec_audio",readAloud:"sec_audio",dictionary:"sec_tools",aiSimplify:"sec_tools"},bo=["sec_content","sec_color","sec_nav","sec_audio","sec_tools"];function yo(e){try{const t=localStorage.getItem(et);if(t&&(t==="en"||t==="es"||t==="fr"||t==="de"))return t}catch{}return e}function xo(e){try{localStorage.setItem(et,e)}catch{}}function ko(e){try{vo(e)}catch{}}function vo(e){var st,lt,ct;try{if(sessionStorage.getItem("makoya_hidden")==="1")return}catch{}const t=document.createElement("div");t.id="makoya-widget-root";const o=t.attachShadow({mode:"open"});document.documentElement.appendChild(t);const r=document.createElement("style");r.textContent=vt(e.primaryColor,e.launcherSize),o.appendChild(r);let i=yo(e.defaultLanguage);const c=(()=>{try{return localStorage.getItem(xe)!==null}catch{return!1}})(),n=He();let a="none";const s={},l=At(),u=Lt(),f=Mt(i),p=Tt(),g=Nt(),m=zt(),x=Ft(),b=Kt(),T=Gt({getLang:()=>i}),oe=Ht({onClose:()=>{n.readMode=!1,X(),U()},getReturnFocus:()=>P}),_=We({collect:no,getTitle:()=>d(i,"f_usefulLinks"),getCloseLabel:()=>d(i,"close"),getEmptyLabel:()=>d(i,"nav_none"),onClose:()=>{n.usefulLinks=!1,X(),U()},getReturnFocus:()=>P}),O=We({collect:io,getTitle:()=>d(i,"f_pageStructure"),getCloseLabel:()=>d(i,"close"),getEmptyLabel:()=>d(i,"nav_none"),onClose:()=>{n.pageStructure=!1,X(),U()},getReturnFocus:()=>P});let L=null;function ae(){L==null||L.remove(),L=null}function me(h){try{if(!L){L=document.createElement("div"),L.style.cssText="position:fixed;left:50%;bottom:84px;transform:translateX(-50%);z-index:2147483646;";const C=L.attachShadow({mode:"open"}),B=document.createElement("style");B.textContent=".box{position:relative;max-width:min(420px,92vw);background:#fff;color:#1a1a1a;border:2px solid #1e63ff;border-radius:12px;padding:14px 32px 14px 16px;box-shadow:0 8px 30px rgba(0,0,0,.25);font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;}.w{font-weight:700;}.pos{color:#666;font-style:italic;margin-left:6px;}.x{position:absolute;top:6px;right:8px;border:0;background:transparent;font-size:18px;cursor:pointer;color:#666;}.x:focus-visible{outline:3px solid #1e63ff;outline-offset:2px;}";const M=document.createElement("div");M.className="box",M.setAttribute("role","status"),M.setAttribute("aria-live","polite");const I=document.createElement("button");I.className="x",I.type="button",I.textContent="×",I.setAttribute("aria-label",d(i,"close")),I.addEventListener("click",ae);const ce=document.createElement("div");ce.className="content",M.append(I,ce),C.append(B,M),document.documentElement.appendChild(L)}const v=L.shadowRoot.querySelector(".content");if(!v)return;if(v.innerHTML="",h.status==="loading")v.textContent=d(i,"dict_loading");else if(h.status==="none")v.textContent=`“${h.word}” — ${d(i,"dict_none")}`;else if(h.status==="ok"){const C=document.createElement("span");if(C.className="w",C.textContent=h.word,v.appendChild(C),h.partOfSpeech){const M=document.createElement("span");M.className="pos",M.textContent=h.partOfSpeech,v.appendChild(M)}const B=document.createElement("div");B.textContent=h.definition,v.appendChild(B)}}catch{}}const ot=Yt({getLang:()=>i,onResult:me}),nt=oo({getLang:()=>i,getSiteId:()=>e.siteId,getStrings:()=>({action:d(i,"as_action"),loading:d(i,"as_loading"),failed:d(i,"as_failed"),close:d(i,"close")})}),K=typeof e.offsetX=="number"?e.offsetX:0,q=typeof e.offsetY=="number"?e.offsetY:0,it=e.position.startsWith("bottom"),he=e.position.endsWith("right"),z=16,So=it?he?`bottom:${z-q}px; right:${z-K}px;`:`bottom:${z-q}px; left:${z+K}px;`:he?`top:${z+q}px; right:${z-K}px;`:`top:${z+q}px; left:${z+K}px;`,R=document.createElement("button");R.className="mky-btn",R.type="button",R.style.cssText=So;const Co=(lt={circle:"50%",rounded:"16px",square:"8px"}[(st=e.launcherShape)!=null?st:"circle"])!=null?lt:"50%";R.style.borderRadius=Co,R.setAttribute("aria-label",d(i,"title")),R.setAttribute("aria-expanded","false"),R.innerHTML=(ct=ze[e.launcherIcon])!=null?ct:ze.accessibility;const $=document.createElement("div");$.className="mky-panel",$.setAttribute("role","dialog"),$.setAttribute("aria-modal","true"),$.setAttribute("aria-label",e.panelTitle||d(i,"title"));const ge=84,Eo=it?he?`bottom:${ge-q}px; right:${z-K}px;`:`bottom:${ge-q}px; left:${z+K}px;`:he?`top:${ge+q}px; right:${z-K}px;`:`top:${ge+q}px; left:${z+K}px;`;$.style.cssText=Eo;let Ce=null;function X(){try{Oe(n),l.setColor(n.rulerColor),n.ruler?l.on():l.off(),u.set(n.mask),n.readAloud?f.enable():f.disable(),f.setLang(i),n.mute?p.enable():p.disable(),n.hoverHighlight?g.enable():g.disable(),n.magnifier?m.enable():m.disable(),n.keyboardNav?x.enable():x.disable(),n.virtualKeyboard?b.enable():b.disable(),n.voiceNav?T.enable():T.disable(),n.readMode?oe.open(i):oe.close(),n.usefulLinks?_.open():_.close(),n.pageStructure?O.open():O.close(),n.dictionary?ot.enable():(ot.disable(),ae()),n.aiSimplify?nt.enable():nt.disable(),xt(n);try{const h=mo(n);if(Ce)for(const v of h)Ce.has(v)||Qe("feature_activated",v);Ce=h}catch{}}catch{}}const Ee=document.createElement("div");Ee.className="mky-head";const rt=document.createElement("div"),Ae=document.createElement("h2");Ae.className="mky-title";const Le=document.createElement("p");Le.className="mky-sub",rt.append(Ae,Le);const Z=document.createElement("select");Z.className="mky-lang",Z.setAttribute("aria-label",d(i,"language"));for(const[h,v]of Object.entries(wt)){const C=document.createElement("option");C.value=h,C.textContent=v,C.selected=h===i,Z.appendChild(C)}Z.addEventListener("change",()=>{i=Z.value,xo(i),f.setLang(i),at(),U()});const P=document.createElement("button");P.className="mky-close",P.type="button",P.innerHTML=ho,Ee.append(rt,Z,P);const ne=document.createElement("div");ne.className="mky-body";const se=document.createElement("div");se.className="mky-foot";const le=document.createElement("button");le.className="mky-reset",le.type="button",le.addEventListener("click",()=>{Object.assign(n,re),a="none",X(),U()});const Me=document.createElement("p");Me.className="mky-note",se.append(le,Me);let G=null;e.accessibilityStatementUrl&&(G=document.createElement("a"),G.className="mky-statement",G.href=e.accessibilityStatementUrl,G.target="_blank",G.rel="noopener",se.appendChild(G));let D=null;if(!e.hideBranding){D=document.createElement("p"),D.className="mky-brand";const h=document.createElement("a");h.href=e.brandingUrl,h.target="_blank",h.rel="noopener",h.textContent="Makoya",D.append("",h),se.appendChild(D)}function at(){const h=e.panelTitle||d(i,"title");if(R.setAttribute("aria-label",h),$.setAttribute("aria-label",h),Ae.textContent=h,Le.textContent=d(i,"subtitle"),P.setAttribute("aria-label",d(i,"close")),Z.setAttribute("aria-label",d(i,"language")),le.textContent=d(i,"reset"),Me.textContent=d(i,"note"),G&&(G.textContent=d(i,"statement")),D){const v=D.querySelector("a");v&&(D.textContent="",D.appendChild(document.createTextNode(`${d(i,"poweredBy")} `)),D.appendChild(v))}}function U(){var ut;ne.innerHTML="";const h=document.createElement("div");h.className="mky-sec";const v=document.createElement("span");v.className="mky-sec-label",v.textContent=d(i,"quickProfiles");const C=document.createElement("div");C.className="mky-profiles";for(const k of Fe){const E=document.createElement("button");E.type="button",E.className="mky-chip",E.setAttribute("aria-pressed",String(a===k.key));const w=d(i,k.labelKey);E.innerHTML=`${k.icon}<span>${w}</span>`,E.addEventListener("click",()=>{a===k.key?(ke(n,"none"),a="none"):(ke(n,k.key),a=k.key),X(),U()}),C.appendChild(E)}const B=document.createElement("div");B.className="mky-divider",h.append(v,C,B),ne.appendChild(h);const M=new Map;for(const k of e.featuresEnabled){const E=go[k];E&&(M.has(E)||M.set(E,[]),M.get(E).push(k))}for(const k of bo){const E=M.get(k);if(!E||E.length===0)continue;const w=document.createElement("details");w.className="mky-sec";const F=s[k];w.open=F!==void 0?F:k==="sec_content"||k==="sec_color",w.addEventListener("toggle",()=>{s[k]=w.open});const H=document.createElement("summary");H.className="mky-sec-label",H.textContent=d(i,k),w.appendChild(H);for(const N of E){const j=Ct(N,n,i,X);j&&w.appendChild(j)}if(k==="sec_audio"&&e.featuresEnabled.includes("readAloud")){const N=document.createElement("p");N.className="mky-note",N.style.cssText="margin: 4px 8px 8px; text-align: left;",N.textContent=d(i,"readAloudHint"),w.appendChild(N)}ne.appendChild(w)}const I=e.featuresEnabled.includes("userGuide"),ce=e.featuresEnabled.includes("feedbackForm"),dt=e.featuresEnabled.includes("hideInterface");if(I||ce||dt){const k=document.createElement("details");k.className="mky-sec",k.open=(ut=s.sec_about)!=null?ut:!1,k.addEventListener("toggle",()=>{s.sec_about=k.open});const E=document.createElement("summary");if(E.className="mky-sec-label",E.textContent=d(i,"sec_about"),k.appendChild(E),I){const w=document.createElement("details");w.style.cssText="margin:4px 8px;";const F=document.createElement("summary");F.textContent=d(i,"f_userGuide"),F.style.cssText="cursor:pointer;font-size:14px;padding:6px 0;";const H=document.createElement("p");H.textContent=d(i,"guide_body"),H.style.cssText="margin:6px 0;font-size:13px;line-height:1.5;",w.append(F,H),k.appendChild(w)}if(ce){const w="width:100%;box-sizing:border-box;margin:4px 0;padding:8px;font:inherit;border:1px solid #ccc;border-radius:6px;",F=document.createElement("details");F.style.cssText="margin:4px 8px;";const H=document.createElement("summary");H.textContent=d(i,"fb_open"),H.style.cssText="cursor:pointer;font-size:14px;padding:6px 0;";const N=document.createElement("textarea");N.setAttribute("aria-label",d(i,"fb_msgLabel")),N.placeholder=d(i,"fb_msgLabel"),N.rows=3,N.style.cssText=w;const j=document.createElement("input");j.type="email",j.setAttribute("aria-label",d(i,"fb_emailLabel")),j.placeholder=d(i,"fb_emailLabel"),j.style.cssText=w;const J=document.createElement("button");J.type="button",J.className="mky-reset",J.textContent=d(i,"fb_send");const ie=document.createElement("p");ie.setAttribute("role","status"),ie.setAttribute("aria-live","polite"),ie.style.cssText="margin:6px 0;font-size:13px;",J.addEventListener("click",()=>{const ft=N.value.trim();ft&&(J.disabled=!0,ie.textContent=d(i,"fb_sending"),Jt({siteId:e.siteId,message:ft,email:j.value.trim()||void 0,url:location.href}).then(pt=>{ie.textContent=pt?d(i,"fb_sent"):d(i,"fb_failed"),J.disabled=!1,pt&&(N.value="")}))}),F.append(H,N,j,J,ie),k.appendChild(F)}if(dt){const w=document.createElement("button");w.type="button",w.className="mky-reset",w.style.cssText="margin:8px;",w.textContent=d(i,"f_hideInterface"),w.addEventListener("click",()=>{try{sessionStorage.setItem("makoya_hidden","1")}catch{}t.style.display="none"}),k.appendChild(w)}ne.appendChild(k)}}$.append(Ee,ne,se);let Te=!1;const Ne=h=>{Te=h,$.classList.toggle("open",h),R.setAttribute("aria-expanded",String(h)),h?(Qe("open"),requestAnimationFrame(()=>P.focus())):R.focus()};R.addEventListener("click",()=>Ne(!Te)),P.addEventListener("click",()=>Ne(!1)),o.addEventListener("keydown",h=>{const v=h;if(Te){if(v.key==="Escape"){Ne(!1);return}if(v.key==="Tab"){const C=Array.from($.querySelectorAll('button:not([disabled]), a[href], select, input, [tabindex]:not([tabindex="-1"])'));if(C.length===0)return;const B=C[0],M=C[C.length-1],I=o.activeElement;v.shiftKey&&I===B?(v.preventDefault(),M.focus()):!v.shiftKey&&I===M&&(v.preventDefault(),B.focus())}}}),o.append(R,$),at(),U(),!c&&e.defaultProfile!=="none"&&(ke(n,e.defaultProfile),a=e.defaultProfile,U()),X()}let tt=!1;function wo(){const e=()=>{Oe(He()),Je()},t=o=>{const r=history[o];history[o]=function(...i){const c=r.apply(this,i);return setTimeout(e,50),c}};t("pushState"),t("replaceState"),window.addEventListener("popstate",()=>setTimeout(e,50))}function pe(e){if(tt||document.getElementById("makoya-widget-root"))return;tt=!0;const t=ht(e.siteId,e),o=()=>{ko(t),wo(),uo({siteId:t.siteId,token:e.token}),Je()};document.readyState==="loading"?document.addEventListener("DOMContentLoaded",o,{once:!0}):o()}window.MakoyaWidget={init:pe};function _o(){return!1}return async function(){var t;try{const o=(t=document.currentScript)!=null?t:document.querySelector("script[data-site]");if(!o||o.hasAttribute("data-no-auto"))return;const r=o.dataset.site||"auto",i=o.dataset.token,c=o.dataset.color,n=c?{primaryColor:c}:{};if(_o()&&o.hasAttribute("data-demo")){pe({siteId:r,...n});return}const{active:a,config:s}=await Zt(r,i);if(a===!1)return;pe({...s,siteId:r,...n,token:i})}catch{}}().catch(()=>{}),be.init=pe,Object.defineProperty(be,Symbol.toStringTag,{value:"Module"}),be}({});
