var MakoyaCore=function(be){"use strict";const ze={accessibility:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="4" r="2"/><path d="M21 9c0 .55-.45 1-1 1h-4v11a1 1 0 0 1-2 0v-5h-4v5a1 1 0 0 1-2 0V10H4a1 1 0 0 1 0-2h16c.55 0 1 .45 1 1z"/></svg>',person:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="7" r="4"/><path d="M4 21a8 8 0 0 1 16 0 1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/></svg>',eye:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 5c-5 0-9 4.5-10 7 1 2.5 5 7 10 7s9-4.5 10-7c-1-2.5-5-7-10-7zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8z"/><circle cx="12" cy="12" r="2"/></svg>',adjust:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 7h11a3 3 0 0 1 6 0h1a1 1 0 0 1 0 2h-1a3 3 0 0 1-6 0H3a1 1 0 0 1 0-2zm6 8a3 3 0 0 1 6 0h6a1 1 0 0 1 0 2h-6a3 3 0 0 1-6 0H3a1 1 0 0 1 0-2h6z"/></svg>'},ye={siteId:"unknown",primaryColor:"#2563eb",position:"bottom-right",launcherIcon:"accessibility",launcherShape:"circle",featuresEnabled:["contentScale","textSize","lineSpacing","letterSpacing","readableFont","textAlign","highlightTitles","highlightLinks","hideImages","stopMotion","contrast","saturation","textColor","titleColor","bgColor","readingMask","readingRuler","bigCursor","highlightHover","biggerTargets","focusIndicator","magnifier","readMode","usefulLinks","pageStructure","keyboardNav","virtualKeyboard","voiceNav","muteSounds","readAloud","dictionary","feedbackForm","hideInterface","userGuide","aiSimplify"],hideBranding:!1,brandingUrl:"https://makoya.example/scan",launcherSize:"md",defaultProfile:"none",accessibilityStatementUrl:"",defaultLanguage:"en",panelTitle:"",customTriggerSelector:"",domObserverEnabled:!0,inheritFonts:!1,mobileEnabled:!0,offsetX:0,offsetY:0,aiSimplifyEnabled:!1};function Re(e,t,o){return Math.max(t,Math.min(o,e))}const Ie=new Set(["textSize","lineSpacing","contrast","stopMotion","readingRuler","highlightLinks","bigCursor","readableFont","hideImages","saturation","readingMask","highlightTitles","textAlign","muteSounds","readAloud","highlightHover","biggerTargets","focusIndicator"]);function pt(e){return!Array.isArray(e)||e.length===0?[...ye.featuresEnabled]:e.every(o=>Ie.has(o))?ye.featuresEnabled.filter(o=>e.includes(o)||!Ie.has(o)):e}function mt(e,t){const o={...ye,...t!=null?t:{},siteId:e};return typeof o.offsetX=="number"&&(o.offsetX=Re(o.offsetX,-200,200)),typeof o.offsetY=="number"&&(o.offsetY=Re(o.offsetY,-200,200)),o.featuresEnabled=pt(o.featuresEnabled),o}const Be="makoya-effects",ht=`
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
   widget host is mounted on html (outside body) and is Shadow-DOM isolated,
   so 'body *' can't reach it — no #id guard is needed (and an id inside :not()
   would out-specify the title-color rule, masking title colour when both are on). */
html[data-mky-textcolor] body * { color: var(--mky-text-color) !important; }
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
`;function gt(){if(document.getElementById(Be))return;const e=document.createElement("style");e.id=Be,e.textContent=ht,document.head.appendChild(e)}function L(e,t){const o=document.documentElement;t===null?o.removeAttribute(e):o.setAttribute(e,t)}function V(e,t){const o=document.documentElement;t===null?o.style.removeProperty(e):o.style.setProperty(e,t)}const xe="makoya_prefs",ie={contentScale:100,fontScale:100,lineHeightPct:100,letterSpacingPct:0,contrast:"off",stopMotion:!1,ruler:!1,links:!1,cursor:"off",font:"off",images:!1,saturation:"off",mask:"off",titles:!1,textAlign:"off",mute:!1,readAloud:!1,rulerColor:"#ffd400",hoverHighlight:!1,biggerTargets:!1,focusIndicator:!1,textColor:"",titleColor:"",bgColor:"",magnifier:!1,readMode:!1,usefulLinks:!1,pageStructure:!1,keyboardNav:!1,virtualKeyboard:!1,voiceNav:!1,dictionary:!1,aiSimplify:!1};function bt(e){if(!e||typeof e!="object")return{};const t={...e};return"text"in t&&(t.fontScale===void 0&&(t.text===1?t.fontScale=110:t.text===2?t.fontScale=130:t.text===3&&(t.fontScale=140)),delete t.text),"spacing"in t&&(t.spacing===!0&&(t.lineHeightPct===void 0&&(t.lineHeightPct=180),t.letterSpacingPct===void 0&&(t.letterSpacingPct=5)),delete t.spacing),"align"in t&&(t.align===!0&&t.textAlign===void 0&&(t.textAlign="left"),delete t.align),typeof t.font=="boolean"&&(t.font=t.font?"readable":"off"),t}function He(){try{const e=localStorage.getItem(xe);return e?{...ie,...bt(JSON.parse(e))}:{...ie}}catch{return{...ie}}}function yt(e){try{localStorage.setItem(xe,JSON.stringify(e))}catch{}}function Oe(e){gt();const t=(h,m)=>typeof h=="number"&&Number.isFinite(h)?h:m,o=t(e.contentScale,100),i=t(e.fontScale,100),r=t(e.lineHeightPct,100),c=t(e.letterSpacingPct,0),n=o!==100;V("--mky-zoom",n?String(o/100):null),L("data-mky-zoom",n?"on":null);const a=i!==100;V("--mky-font-scale",a?String(i/100):null),L("data-mky-fontscale",a?"on":null);const s=r!==100;V("--mky-line-height",s?String(r/100):null),L("data-mky-lh",s?"on":null);const d=c!==0;V("--mky-letter-spacing",d?`${c*.01}em`:null),L("data-mky-ls",d?"on":null),L("data-mky-contrast",e.contrast==="off"?null:e.contrast),L("data-mky-sat",e.saturation==="off"?null:e.saturation);const f=e.contrast!=="dark"&&e.contrast!=="light",u=f&&e.textColor!=="";V("--mky-text-color",u?e.textColor:null),L("data-mky-textcolor",u?"on":null);const p=f&&e.titleColor!=="";V("--mky-title-color",p?e.titleColor:null),L("data-mky-titlecolor",p?"on":null);const b=f&&e.bgColor!=="";V("--mky-bg-color",b?e.bgColor:null),L("data-mky-bgcolor",b?"on":null),L("data-mky-motion",e.stopMotion?"off":null),L("data-mky-links",e.links?"on":null),L("data-mky-cursor",e.cursor==="off"?null:e.cursor),L("data-mky-font",e.font==="off"?null:e.font),L("data-mky-images",e.images?"off":null),L("data-mky-titles",e.titles?"on":null),L("data-mky-align",e.textAlign==="off"?null:e.textAlign),L("data-mky-targets",e.biggerTargets?"on":null),L("data-mky-focus",e.focusIndicator?"on":null)}const xt={sm:48,md:56,lg:64};function kt(e,t){const o=xt[t],i=Math.round(o*.5/2)*2;return`
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
   DROPDOWN — native <select> styled minimal (replaces segmented buttons)
   ───────────────────────────────────────────────────────────────────────── */
.mky-select {
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  min-width: 116px;
  max-width: 168px;
  min-height: 36px;
  border: 1px solid rgba(15,23,42,.12);
  border-radius: 10px;
  background-color: rgba(255,255,255,.9);
  color: #1e293b;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  padding: 7px 32px 7px 12px;
  cursor: pointer;
  white-space: nowrap;
  text-overflow: ellipsis;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%2364748b' stroke-width='1.5' stroke-linecap='round' fill='none'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 11px center;
  transition: border-color .15s, background-color .15s;
}
.mky-select:hover { border-color: ${e}; background-color: #fff; }
.mky-select:focus-visible { outline: 2px solid ${e}; outline-offset: 1px; border-color: ${e}; }
.mky-select option { color: #1e293b; background: #fff; }

/* ─────────────────────────────────────────────────────────────────────────
   COLOR CONTROL — native <input type=color> swatch + hex + clear
   ───────────────────────────────────────────────────────────────────────── */
.mky-color { display: inline-flex; align-items: center; gap: 8px; }
.mky-swatch-wrap { position: relative; width: 30px; height: 30px; flex: none; }
.mky-color-input {
  width: 30px; height: 30px; padding: 0;
  border: 2px solid rgba(15,23,42,.15);
  border-radius: 50%;
  background: none; cursor: pointer;
  -webkit-appearance: none; appearance: none;
  transition: transform .15s, border-color .15s;
}
.mky-color-input::-webkit-color-swatch-wrapper { padding: 0; }
.mky-color-input::-webkit-color-swatch { border: none; border-radius: 50%; }
.mky-color-input::-moz-color-swatch { border: none; border-radius: 50%; }
.mky-color-input:hover { transform: scale(1.08); }
.mky-color-input:focus-visible { outline: 2px solid ${e}; outline-offset: 2px; }
.mky-hex {
  width: 84px; min-height: 30px;
  border: 1px solid rgba(15,23,42,.12);
  border-radius: 9px;
  background: rgba(255,255,255,.9);
  color: #1e293b;
  font: inherit; font-size: 13px; font-weight: 600;
  font-variant-numeric: tabular-nums; letter-spacing: .02em;
  text-transform: uppercase;
  padding: 6px 9px;
  transition: border-color .15s;
}
.mky-hex::placeholder { color: #94a3b8; font-weight: 500; text-transform: none; }
.mky-hex:hover { border-color: ${e}; }
.mky-hex:focus-visible { outline: 2px solid ${e}; outline-offset: 1px; border-color: ${e}; }
.mky-hex-bad { border-color: #ef4444 !important; }
.mky-color-clear {
  width: 30px; height: 30px; flex: none;
  border: 1px solid rgba(15,23,42,.12);
  border-radius: 9px;
  background: rgba(255,255,255,.9);
  color: #64748b; cursor: pointer;
  display: grid; place-items: center;
  transition: background .15s, color .15s, border-color .15s;
}
.mky-color-clear:hover { color: #0f172a; border-color: ${e}; background: #fff; }
.mky-color-clear:focus-visible { outline: 2px solid ${e}; outline-offset: 1px; }
.mky-color-clear svg { width: 14px; height: 14px; pointer-events: none; }
/* OFF state — white swatch + red slash so it reads as "no override" */
.mky-color[data-off="true"] .mky-color-input::-webkit-color-swatch { background: #fff !important; }
.mky-color[data-off="true"] .mky-color-input::-moz-color-swatch { background: #fff !important; }
.mky-color[data-off="true"] .mky-swatch-wrap::after {
  content: ""; position: absolute; left: 50%; top: 3px; bottom: 3px; width: 2px;
  background: #ef4444; transform: translateX(-50%) rotate(45deg);
  border-radius: 2px; pointer-events: none;
}

/* ─────────────────────────────────────────────────────────────────────────
   DIVIDER
   ───────────────────────────────────────────────────────────────────────── */
.mky-divider {
  height: 1px;
  background: rgba(15,23,42,.07);
  margin: 10px 4px 4px;
}

/* ─────────────────────────────────────────────────────────────────────────
   FEATURE ROWS
   ───────────────────────────────────────────────────────────────────────── */
.mky-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 10px;
  border-radius: 12px;
  transition: background .15s;
  min-height: 44px;
}
.mky-row:hover {
  background: rgba(15,23,42,.035);
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
  /* Bump the new controls to 44px touch targets on mobile. */
  .mky-select { min-height: 44px; }
  .mky-swatch-wrap, .mky-color-input { width: 36px; height: 36px; }
  .mky-hex, .mky-color-clear { min-height: 44px; }
  .mky-color-clear { width: 44px; }

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
`}const vt={en:"English",es:"Español",fr:"Français",de:"Deutsch"},$e={en:{title:"Accessibility",subtitle:"Adjust this page to your needs",quickProfiles:"Quick profiles",profile_vision:"Vision impaired",profile_lowVision:"Low vision",profile_dyslexia:"Dyslexia",profile_adhd:"ADHD / Focus",profile_seizure:"Seizure safe",profile_senior:"Senior",profile_cognitive:"Cognitive",profile_colorBlind:"Color blind",profile_motorTremor:"Motor / tremor",profile_eslReading:"Easy reading",profile_keyboardNav:"Keyboard nav",profile_clearReading:"Clear reading",sec_content:"Content",sec_color:"Color",sec_nav:"Navigation",sec_audio:"Audio",sec_about:"About",f_contentScale:"Page zoom",f_textSize:"Text size",f_lineSpacing:"Line spacing",f_letterSpacing:"Letter spacing",f_contrast:"Contrast",f_stopMotion:"Pause animations",f_readingRuler:"Reading ruler",f_highlightLinks:"Highlight links",f_bigCursor:"Cursor size",f_readableFont:"Readable font",f_hideImages:"Hide images",f_saturation:"Color saturation",f_readingMask:"Reading mask",f_highlightTitles:"Highlight titles",f_textAlign:"Left-align text",f_muteSounds:"Mute sounds",f_readAloud:"Read aloud",f_highlightHover:"Highlight on hover",f_biggerTargets:"Bigger tap targets",f_focusIndicator:"Enhanced focus",f_readMode:"Reading mode",readModeEmpty:"We couldn't build a reading view for this page.",rulerColor:"Ruler color",opt_off:"Off",opt_on:"On",opt_light:"Light",opt_dark:"Dark",opt_grayscale:"Grayscale",opt_low:"Low",opt_high:"High",opt_dim:"Dim",opt_tint:"Tint",opt_black:"Black",opt_white:"White",opt_left:"Left",opt_center:"Center",opt_right:"Right",opt_justify:"Justify",opt_readable:"Readable",opt_dyslexic:"Dyslexic",decrease:"Decrease",increase:"Increase",reset:"Reset all",note:"Changes affect your view only — they don't alter the website.",poweredBy:"Powered by",statement:"Accessibility statement",language:"Language",close:"Close",readAloudHint:"Click any text on the page to hear it read aloud.",f_textColor:"Text color",f_titleColor:"Title color",f_bgColor:"Background color",f_magnifier:"Text magnifier",f_usefulLinks:"Useful links",f_pageStructure:"Page structure",f_keyboardNav:"Keyboard navigation",f_virtualKeyboard:"Virtual keyboard",f_voiceNav:"Voice navigation",f_dictionary:"Dictionary",f_feedbackForm:"Feedback",f_hideInterface:"Hide interface",f_userGuide:"User guide",f_aiSimplify:"Simplify text",sec_tools:"Tools",dict_loading:"Looking up…",dict_none:"No definition found.",nav_none:"Nothing found on this page.",kn_hint:"Use Alt + M / H / F / B / G to jump between regions.",guide_body:"Pick a quick profile, or turn on individual tools. Changes affect only your view of this page and are saved on your device. Press Esc to close any tool.",fb_open:"Report an issue",fb_msgLabel:"What's the problem?",fb_emailLabel:"Your email (optional)",fb_send:"Send",fb_sending:"Sending…",fb_sent:"Thanks — your feedback was sent.",fb_failed:"Couldn't send right now. Please try again later.",as_action:"Simplify",as_loading:"Simplifying…",as_failed:"Couldn't simplify this text.",clear:"Clear color"},es:{title:"Accesibilidad",subtitle:"Ajusta esta página a tus necesidades",quickProfiles:"Perfiles rápidos",profile_vision:"Visión reducida",profile_lowVision:"Baja visión",profile_dyslexia:"Dislexia",profile_adhd:"TDAH / Enfoque",profile_seizure:"Seguro para epilepsia",profile_senior:"Adulto mayor",profile_cognitive:"Cognitivo",profile_colorBlind:"Daltonismo",profile_motorTremor:"Motor / temblor",profile_eslReading:"Lectura fácil",profile_keyboardNav:"Navegación teclado",profile_clearReading:"Lectura clara",sec_content:"Contenido",sec_color:"Color",sec_nav:"Navegación",sec_audio:"Audio",sec_about:"Acerca de",f_contentScale:"Zoom de página",f_textSize:"Tamaño de texto",f_lineSpacing:"Interlineado",f_letterSpacing:"Espaciado de letras",f_contrast:"Contraste",f_stopMotion:"Pausar animaciones",f_readingRuler:"Regla de lectura",f_highlightLinks:"Resaltar enlaces",f_bigCursor:"Tamaño del cursor",f_readableFont:"Fuente legible",f_hideImages:"Ocultar imágenes",f_saturation:"Saturación de color",f_readingMask:"Máscara de lectura",f_highlightTitles:"Resaltar títulos",f_textAlign:"Alinear texto a la izquierda",f_muteSounds:"Silenciar sonidos",f_readAloud:"Leer en voz alta",f_highlightHover:"Resaltar al pasar el cursor",f_biggerTargets:"Áreas táctiles más grandes",f_focusIndicator:"Foco mejorado",f_readMode:"Modo lectura",readModeEmpty:"No pudimos crear una vista de lectura para esta página.",rulerColor:"Color de la regla",opt_off:"Apagado",opt_on:"Encendido",opt_light:"Claro",opt_dark:"Oscuro",opt_grayscale:"Escala de grises",opt_low:"Bajo",opt_high:"Alto",opt_dim:"Tenue",opt_tint:"Tinte",opt_black:"Negro",opt_white:"Blanco",opt_left:"Izquierda",opt_center:"Centro",opt_right:"Derecha",opt_justify:"Justificado",opt_readable:"Legible",opt_dyslexic:"Disléxica",decrease:"Disminuir",increase:"Aumentar",reset:"Restablecer todo",note:"Los cambios solo afectan tu vista — no modifican el sitio web.",poweredBy:"Desarrollado por",statement:"Declaración de accesibilidad",language:"Idioma",close:"Cerrar",readAloudHint:"Haz clic en cualquier texto de la página para escucharlo.",f_textColor:"Color del texto",f_titleColor:"Color de títulos",f_bgColor:"Color de fondo",f_magnifier:"Lupa de texto",f_usefulLinks:"Enlaces útiles",f_pageStructure:"Estructura de la página",f_keyboardNav:"Navegación por teclado",f_virtualKeyboard:"Teclado virtual",f_voiceNav:"Navegación por voz",f_dictionary:"Diccionario",f_feedbackForm:"Comentarios",f_hideInterface:"Ocultar interfaz",f_userGuide:"Guía de uso",f_aiSimplify:"Simplificar texto",sec_tools:"Herramientas",dict_loading:"Buscando…",dict_none:"No se encontró definición.",nav_none:"No se encontró nada en esta página.",kn_hint:"Usa Alt + M / H / F / B / G para saltar entre regiones.",guide_body:"Elige un perfil rápido o activa herramientas individuales. Los cambios solo afectan a tu vista de esta página y se guardan en tu dispositivo. Pulsa Esc para cerrar cualquier herramienta.",fb_open:"Informar de un problema",fb_msgLabel:"¿Cuál es el problema?",fb_emailLabel:"Tu correo (opcional)",fb_send:"Enviar",fb_sending:"Enviando…",fb_sent:"Gracias — tus comentarios se enviaron.",fb_failed:"No se pudo enviar ahora. Inténtalo más tarde.",as_action:"Simplificar",as_loading:"Simplificando…",as_failed:"No se pudo simplificar este texto.",clear:"Quitar color"},fr:{title:"Accessibilité",subtitle:"Adaptez cette page à vos besoins",quickProfiles:"Profils rapides",profile_vision:"Déficience visuelle",profile_lowVision:"Basse vision",profile_dyslexia:"Dyslexie",profile_adhd:"TDAH / Concentration",profile_seizure:"Épilepsie",profile_senior:"Senior",profile_cognitive:"Cognitif",profile_colorBlind:"Daltonisme",profile_motorTremor:"Moteur / tremblements",profile_eslReading:"Lecture facile",profile_keyboardNav:"Navigation clavier",profile_clearReading:"Lecture claire",sec_content:"Contenu",sec_color:"Couleur",sec_nav:"Navigation",sec_audio:"Audio",sec_about:"À propos",f_contentScale:"Zoom de la page",f_textSize:"Taille du texte",f_lineSpacing:"Interligne",f_letterSpacing:"Espacement des lettres",f_contrast:"Contraste",f_stopMotion:"Pause animations",f_readingRuler:"Règle de lecture",f_highlightLinks:"Surligner les liens",f_bigCursor:"Taille du curseur",f_readableFont:"Police lisible",f_hideImages:"Masquer les images",f_saturation:"Saturation des couleurs",f_readingMask:"Masque de lecture",f_highlightTitles:"Surligner les titres",f_textAlign:"Aligner le texte à gauche",f_muteSounds:"Couper les sons",f_readAloud:"Lecture à voix haute",f_highlightHover:"Surligner au survol",f_biggerTargets:"Zones tactiles agrandies",f_focusIndicator:"Focus amélioré",f_readMode:"Mode lecture",readModeEmpty:"Nous n'avons pas pu créer une vue de lecture pour cette page.",rulerColor:"Couleur de la règle",opt_off:"Désactivé",opt_on:"Activé",opt_light:"Clair",opt_dark:"Sombre",opt_grayscale:"Niveaux de gris",opt_low:"Faible",opt_high:"Élevé",opt_dim:"Tamisé",opt_tint:"Teinte",opt_black:"Noir",opt_white:"Blanc",opt_left:"Gauche",opt_center:"Centre",opt_right:"Droite",opt_justify:"Justifié",opt_readable:"Lisible",opt_dyslexic:"Dyslexique",decrease:"Diminuer",increase:"Augmenter",reset:"Tout réinitialiser",note:"Les modifications n'affectent que votre affichage — elles ne modifient pas le site.",poweredBy:"Propulsé par",statement:"Déclaration d'accessibilité",language:"Langue",close:"Fermer",readAloudHint:"Cliquez sur n'importe quel texte de la page pour l'entendre.",f_textColor:"Couleur du texte",f_titleColor:"Couleur des titres",f_bgColor:"Couleur de fond",f_magnifier:"Loupe de texte",f_usefulLinks:"Liens utiles",f_pageStructure:"Structure de la page",f_keyboardNav:"Navigation au clavier",f_virtualKeyboard:"Clavier virtuel",f_voiceNav:"Navigation vocale",f_dictionary:"Dictionnaire",f_feedbackForm:"Commentaires",f_hideInterface:"Masquer l'interface",f_userGuide:"Guide d'utilisation",f_aiSimplify:"Simplifier le texte",sec_tools:"Outils",dict_loading:"Recherche…",dict_none:"Aucune définition trouvée.",nav_none:"Rien trouvé sur cette page.",kn_hint:"Utilisez Alt + M / H / F / B / G pour passer d'une zone à l'autre.",guide_body:"Choisissez un profil rapide ou activez des outils individuels. Les changements n'affectent que votre affichage de cette page et sont enregistrés sur votre appareil. Appuyez sur Échap pour fermer un outil.",fb_open:"Signaler un problème",fb_msgLabel:"Quel est le problème ?",fb_emailLabel:"Votre e-mail (facultatif)",fb_send:"Envoyer",fb_sending:"Envoi…",fb_sent:"Merci — vos commentaires ont été envoyés.",fb_failed:"Envoi impossible pour le moment. Réessayez plus tard.",as_action:"Simplifier",as_loading:"Simplification…",as_failed:"Impossible de simplifier ce texte.",clear:"Effacer la couleur"},de:{title:"Barrierefreiheit",subtitle:"Passen Sie diese Seite Ihren Bedürfnissen an",quickProfiles:"Schnellprofile",profile_vision:"Sehbeeinträchtigung",profile_lowVision:"Schwachsichtigkeit",profile_dyslexia:"Legasthenie",profile_adhd:"ADHS / Fokus",profile_seizure:"Epilepsiesicher",profile_senior:"Senioren",profile_cognitive:"Kognitiv",profile_colorBlind:"Farbenblindheit",profile_motorTremor:"Motorik / Zittern",profile_eslReading:"Einfaches Lesen",profile_keyboardNav:"Tastaturnavigation",profile_clearReading:"Klares Lesen",sec_content:"Inhalt",sec_color:"Farbe",sec_nav:"Navigation",sec_audio:"Audio",sec_about:"Über",f_contentScale:"Seitenzoom",f_textSize:"Textgröße",f_lineSpacing:"Zeilenabstand",f_letterSpacing:"Zeichenabstand",f_contrast:"Kontrast",f_stopMotion:"Animationen anhalten",f_readingRuler:"Leselineal",f_highlightLinks:"Links hervorheben",f_bigCursor:"Zeigergröße",f_readableFont:"Lesbare Schrift",f_hideImages:"Bilder ausblenden",f_saturation:"Farbsättigung",f_readingMask:"Lesemaske",f_highlightTitles:"Überschriften hervorheben",f_textAlign:"Text linksbündig",f_muteSounds:"Töne stummschalten",f_readAloud:"Vorlesen",f_highlightHover:"Beim Überfahren hervorheben",f_biggerTargets:"Größere Tippziele",f_focusIndicator:"Verbesserter Fokus",f_readMode:"Lesemodus",readModeEmpty:"Für diese Seite konnte keine Leseansicht erstellt werden.",rulerColor:"Linealfarbe",opt_off:"Aus",opt_on:"An",opt_light:"Hell",opt_dark:"Dunkel",opt_grayscale:"Graustufen",opt_low:"Niedrig",opt_high:"Hoch",opt_dim:"Gedämpft",opt_tint:"Tönung",opt_black:"Schwarz",opt_white:"Weiß",opt_left:"Links",opt_center:"Zentriert",opt_right:"Rechts",opt_justify:"Blocksatz",opt_readable:"Lesbar",opt_dyslexic:"Legasthenie",decrease:"Verringern",increase:"Erhöhen",reset:"Alles zurücksetzen",note:"Änderungen wirken sich nur auf Ihre Ansicht aus — die Website wird nicht verändert.",poweredBy:"Bereitgestellt von",statement:"Barrierefreiheitserklärung",language:"Sprache",close:"Schließen",readAloudHint:"Klicken Sie auf beliebigen Text auf der Seite, um ihn vorlesen zu lassen.",f_textColor:"Textfarbe",f_titleColor:"Titelfarbe",f_bgColor:"Hintergrundfarbe",f_magnifier:"Textlupe",f_usefulLinks:"Nützliche Links",f_pageStructure:"Seitenstruktur",f_keyboardNav:"Tastaturnavigation",f_virtualKeyboard:"Bildschirmtastatur",f_voiceNav:"Sprachnavigation",f_dictionary:"Wörterbuch",f_feedbackForm:"Feedback",f_hideInterface:"Oberfläche ausblenden",f_userGuide:"Anleitung",f_aiSimplify:"Text vereinfachen",sec_tools:"Werkzeuge",dict_loading:"Wird gesucht…",dict_none:"Keine Definition gefunden.",nav_none:"Auf dieser Seite nichts gefunden.",kn_hint:"Mit Alt + M / H / F / B / G zwischen Bereichen springen.",guide_body:"Wählen Sie ein Schnellprofil oder aktivieren Sie einzelne Werkzeuge. Änderungen betreffen nur Ihre Ansicht dieser Seite und werden auf Ihrem Gerät gespeichert. Drücken Sie Esc, um ein Werkzeug zu schließen.",fb_open:"Problem melden",fb_msgLabel:"Was ist das Problem?",fb_emailLabel:"Ihre E-Mail (optional)",fb_send:"Senden",fb_sending:"Wird gesendet…",fb_sent:"Danke — Ihr Feedback wurde gesendet.",fb_failed:"Senden derzeit nicht möglich. Bitte später erneut versuchen.",as_action:"Vereinfachen",as_loading:"Wird vereinfacht…",as_failed:"Dieser Text konnte nicht vereinfacht werden.",clear:"Farbe entfernen"}};function l(e,t){var o,i;return(i=(o=$e[e])==null?void 0:o[t])!=null?i:$e.en[t]}function x(e,t,o){const i=document.createElement("div");i.className="mky-row";const r=document.createElement("span");r.className="mky-label",r.innerHTML=e;const c=document.createElement("span");return c.textContent=t,r.appendChild(c),i.append(r,o),i}function S(e,t,o,i){const r=document.createElement("button");return r.className="mky-switch",r.type="button",r.setAttribute("role","switch"),r.setAttribute("aria-label",e),r.setAttribute("aria-pressed",String(t)),r.addEventListener("click",()=>{const n=!(r.getAttribute("aria-pressed")==="true");o(n),r.setAttribute("aria-pressed",String(n)),i()}),r}function de(e,t,o,i,r,c,n,a){const s=document.createElement("div");s.className="mky-stepper";const d=document.createElement("button");d.className="mky-step",d.type="button",d.textContent="−",d.setAttribute("aria-label",`${l(e,"decrease")} ${t}`);const f=document.createElement("span");f.className="mky-stepval",f.setAttribute("role","status"),f.setAttribute("aria-live","polite");const u=document.createElement("button");u.className="mky-step",u.type="button",u.textContent="+",u.setAttribute("aria-label",`${l(e,"increase")} ${t}`);let p=o;const b=()=>{f.textContent=`${p}%`,d.disabled=p<=i,u.disabled=p>=r};return b(),d.addEventListener("click",()=>{p<=i||(p=Math.max(i,p-c),n(p),b(),a())}),u.addEventListener("click",()=>{p>=r||(p=Math.min(r,p+c),n(p),b(),a())}),s.append(d,f,u),s}function Q(e,t,o,i,r){const c=document.createElement("select");c.className="mky-select",c.setAttribute("aria-label",e);for(const n of t){const a=document.createElement("option");a.value=n.value,a.textContent=n.label,n.value===o&&(a.selected=!0),c.appendChild(a)}return c.addEventListener("change",()=>{i(c.value),r()}),c}const wt='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';function ue(e,t,o,i,r){const c="#000000",n=/^#?[0-9a-fA-F]{6}$/,a=m=>(m[0]==="#"?m:"#"+m).toUpperCase(),s=document.createElement("div");s.className="mky-color",s.setAttribute("role","group"),s.setAttribute("aria-label",e),s.dataset.off=String(!t);const d=document.createElement("span");d.className="mky-swatch-wrap";const f=document.createElement("input");f.type="color",f.className="mky-color-input",f.value=t||c,f.setAttribute("aria-label",e),d.appendChild(f);const u=document.createElement("input");u.type="text",u.className="mky-hex",u.maxLength=7,u.spellcheck=!1,u.autocapitalize="none",u.placeholder="#000000",u.value=t?t.toUpperCase():"",u.setAttribute("aria-label",`${e} hex`);const p=document.createElement("button");p.type="button",p.className="mky-color-clear",p.setAttribute("aria-label",r),p.innerHTML=wt;const b=m=>{s.dataset.off="false",o(m),i()},h=()=>{s.dataset.off="true",f.value=c,o(""),i()};return f.addEventListener("input",()=>{const m=f.value.toUpperCase();u.value=m,u.classList.remove("mky-hex-bad"),b(m)}),u.addEventListener("input",()=>{const m=u.value.trim();if(m!=="")if(n.test(m)){const y=a(m);f.value=y,u.classList.remove("mky-hex-bad"),b(y)}else u.classList.add("mky-hex-bad")}),u.addEventListener("blur",()=>{const m=u.value.trim();m===""?(u.value="",h()):n.test(m)||(u.classList.remove("mky-hex-bad"),u.value=s.dataset.off==="true"?"":f.value.toUpperCase())}),p.addEventListener("click",()=>{u.value="",h()}),s.append(d,u,p),s}const _t={textSize:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg>',lineSpacing:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',contrast:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/></svg>',stopMotion:'<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>',readingRuler:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="9" width="18" height="6" rx="1.5"/><path d="M7.5 9v3M12 9v3M16.5 9v3"/></svg>',highlightLinks:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.07 0l2-2a5 5 0 0 0-7.07-7.07l-1 1"/><path d="M14 11a5 5 0 0 0-7.07 0l-2 2A5 5 0 0 0 12 20.07l1-1"/></svg>',bigCursor:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M5 3l6.5 17 2.2-7.3L21 10.5 5 3z"/></svg>',readableFont:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 20l4-12 4 12M6.5 16h5M14 11c0-1.7 1.3-3 3-3s3 1.3 3 3v9"/></svg>',hideImages:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 16l5-5 3 3M3 3l18 18"/></svg>',saturation:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 3v9l6 3.5" stroke-width="1.5"/><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/></svg>',readingMask:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="5" rx="1" fill="currentColor" fill-opacity=".25"/><rect x="2" y="10" width="20" height="4" rx="1"/><rect x="2" y="16" width="20" height="5" rx="1" fill="currentColor" fill-opacity=".25"/></svg>',highlightTitles:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16M4 12h10"/><rect x="3" y="16" width="18" height="3" rx="1" fill="currentColor" fill-opacity=".3" stroke="none"/></svg>',textAlign:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M3 11h12M3 16h15"/></svg>',muteSounds:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H3v6h3l5 4V5z"/><path d="M17 9l4 4M21 9l-4 4"/></svg>',readAloud:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 10h.01M12 10h.01M16 10h.01"/></svg>',highlightHover:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/></svg>',biggerTargets:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="12" cy="12" r="3" fill="currentColor" fill-opacity=".25"/><path d="M12 9v6M9 12h6" stroke-width="1.5"/></svg>',focusIndicator:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/></svg>'};function St(e,t,o,i){var c;const r=(c=_t[e])!=null?c:"";switch(e){case"contentScale":{const n=l(o,"f_contentScale");return x(r,n,de(o,n,t.contentScale,70,150,10,a=>{t.contentScale=a},i))}case"textSize":{const n=l(o,"f_textSize");return x(r,n,de(o,n,t.fontScale,80,200,10,a=>{t.fontScale=a},i))}case"lineSpacing":{const n=l(o,"f_lineSpacing");return x(r,n,de(o,n,t.lineHeightPct,100,250,10,a=>{t.lineHeightPct=a},i))}case"letterSpacing":{const n=l(o,"f_letterSpacing");return x(r,n,de(o,n,t.letterSpacingPct,0,50,5,a=>{t.letterSpacingPct=a},i))}case"contrast":{const n=l(o,"f_contrast"),a=Q(n,[{value:"off",label:l(o,"opt_off")},{value:"on",label:l(o,"opt_on")},{value:"light",label:l(o,"opt_light")},{value:"dark",label:l(o,"opt_dark")},{value:"high",label:l(o,"opt_high")}],t.contrast,s=>{t.contrast=s},i);return x(r,n,a)}case"textAlign":{const n=l(o,"f_textAlign"),a=Q(n,[{value:"off",label:l(o,"opt_off")},{value:"left",label:l(o,"opt_left")},{value:"center",label:l(o,"opt_center")},{value:"right",label:l(o,"opt_right")},{value:"justify",label:l(o,"opt_justify")}],t.textAlign,s=>{t.textAlign=s},i);return x(r,n,a)}case"readableFont":{const n=l(o,"f_readableFont"),a=Q(n,[{value:"off",label:l(o,"opt_off")},{value:"readable",label:l(o,"opt_readable")},{value:"dyslexic",label:l(o,"opt_dyslexic")}],t.font,s=>{t.font=s},i);return x(r,n,a)}case"saturation":{const n=l(o,"f_saturation"),a=Q(n,[{value:"off",label:l(o,"opt_off")},{value:"grayscale",label:l(o,"opt_grayscale")},{value:"low",label:l(o,"opt_low")},{value:"high",label:l(o,"opt_high")}],t.saturation,s=>{t.saturation=s},i);return x(r,n,a)}case"bigCursor":{const n=l(o,"f_bigCursor"),a=Q(n,[{value:"off",label:l(o,"opt_off")},{value:"black",label:l(o,"opt_black")},{value:"white",label:l(o,"opt_white")}],t.cursor,s=>{t.cursor=s},i);return x(r,n,a)}case"readingMask":{const n=l(o,"f_readingMask"),a=Q(n,[{value:"off",label:l(o,"opt_off")},{value:"dim",label:l(o,"opt_dim")},{value:"tint",label:l(o,"opt_tint")}],t.mask,s=>{t.mask=s},i);return x(r,n,a)}case"highlightLinks":{const n=l(o,"f_highlightLinks");return x(r,n,S(n,t.links,a=>{t.links=a},i))}case"hideImages":{const n=l(o,"f_hideImages");return x(r,n,S(n,t.images,a=>{t.images=a},i))}case"stopMotion":{const n=l(o,"f_stopMotion");return x(r,n,S(n,t.stopMotion,a=>{t.stopMotion=a},i))}case"readingRuler":{const n=l(o,"f_readingRuler"),a=x(r,n,S(n,t.ruler,f=>{t.ruler=f},i)),s=x("",l(o,"rulerColor"),ue(l(o,"rulerColor"),t.rulerColor,f=>{t.rulerColor=f},i,l(o,"clear"))),d=document.createElement("div");return d.append(a,s),d}case"highlightTitles":{const n=l(o,"f_highlightTitles");return x(r,n,S(n,t.titles,a=>{t.titles=a},i))}case"muteSounds":{const n=l(o,"f_muteSounds");return x(r,n,S(n,t.mute,a=>{t.mute=a},i))}case"readAloud":{const n=l(o,"f_readAloud");return x(r,n,S(n,t.readAloud,a=>{t.readAloud=a},i))}case"highlightHover":{const n=l(o,"f_highlightHover");return x(r,n,S(n,t.hoverHighlight,a=>{t.hoverHighlight=a},i))}case"biggerTargets":{const n=l(o,"f_biggerTargets");return x(r,n,S(n,t.biggerTargets,a=>{t.biggerTargets=a},i))}case"focusIndicator":{const n=l(o,"f_focusIndicator");return x(r,n,S(n,t.focusIndicator,a=>{t.focusIndicator=a},i))}case"textColor":{const n=l(o,"f_textColor");return x(r,n,ue(n,t.textColor,a=>{t.textColor=a},i,l(o,"clear")))}case"titleColor":{const n=l(o,"f_titleColor");return x(r,n,ue(n,t.titleColor,a=>{t.titleColor=a},i,l(o,"clear")))}case"bgColor":{const n=l(o,"f_bgColor");return x(r,n,ue(n,t.bgColor,a=>{t.bgColor=a},i,l(o,"clear")))}case"magnifier":{const n=l(o,"f_magnifier");return x(r,n,S(n,t.magnifier,a=>{t.magnifier=a},i))}case"readMode":{const n=l(o,"f_readMode");return x(r,n,S(n,t.readMode,a=>{t.readMode=a},i))}case"usefulLinks":{const n=l(o,"f_usefulLinks");return x(r,n,S(n,t.usefulLinks,a=>{t.usefulLinks=a},i))}case"pageStructure":{const n=l(o,"f_pageStructure");return x(r,n,S(n,t.pageStructure,a=>{t.pageStructure=a},i))}case"keyboardNav":{const n=l(o,"f_keyboardNav");return x(r,n,S(n,t.keyboardNav,a=>{t.keyboardNav=a},i))}case"virtualKeyboard":{const n=l(o,"f_virtualKeyboard");return x(r,n,S(n,t.virtualKeyboard,a=>{t.virtualKeyboard=a},i))}case"voiceNav":{const n=l(o,"f_voiceNav");return x(r,n,S(n,t.voiceNav,a=>{t.voiceNav=a},i))}case"dictionary":{const n=l(o,"f_dictionary");return x(r,n,S(n,t.dictionary,a=>{t.dictionary=a},i))}case"aiSimplify":{const n=l(o,"f_aiSimplify");return x(r,n,S(n,t.aiSimplify,a=>{t.aiSimplify=a},i))}default:return null}}const Pe=[{key:"vision",labelKey:"profile_vision",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>',apply:e=>{e.contrast="on",e.fontScale=140,e.cursor="black"}},{key:"lowVision",labelKey:"profile_lowVision",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.4 1.4M17.6 17.6L19 19M19 5l-1.4 1.4M6.4 17.6L5 19"/></svg>',apply:e=>{e.fontScale=130,e.lineHeightPct=180,e.letterSpacingPct=5,e.cursor="black",e.links=!0}},{key:"dyslexia",labelKey:"profile_dyslexia",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg>',apply:e=>{e.font="dyslexic",e.lineHeightPct=180,e.letterSpacingPct=5,e.fontScale=110}},{key:"adhd",labelKey:"profile_adhd",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/></svg>',apply:e=>{e.stopMotion=!0,e.lineHeightPct=180,e.letterSpacingPct=5,e.links=!0}},{key:"seizure",labelKey:"profile_seizure",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3l8 3v6c0 4-3 7-8 9-5-2-8-5-8-9V6z"/></svg>',apply:e=>{e.stopMotion=!0}},{key:"senior",labelKey:"profile_senior",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',apply:e=>{e.fontScale=130,e.lineHeightPct=180,e.letterSpacingPct=5,e.cursor="black",e.font="readable"}},{key:"cognitive",labelKey:"profile_cognitive",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24A2.5 2.5 0 0 1 9.5 2z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24A2.5 2.5 0 0 0 14.5 2z"/></svg>',apply:e=>{e.mask="dim",e.lineHeightPct=180,e.letterSpacingPct=5,e.images=!0,e.stopMotion=!0}},{key:"colorBlind",labelKey:"profile_colorBlind",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 3v9M12 12l7.5 4.5" stroke-width="1.5"/><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/></svg>',apply:e=>{e.saturation="high",e.titles=!0}},{key:"motorTremor",labelKey:"profile_motorTremor",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>',apply:e=>{e.cursor="black",e.biggerTargets=!0,e.stopMotion=!0}},{key:"eslReading",labelKey:"profile_eslReading",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',apply:e=>{e.font="readable",e.lineHeightPct=180,e.letterSpacingPct=5,e.ruler=!0}},{key:"keyboardNav",labelKey:"profile_keyboardNav",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8"/></svg>',apply:e=>{e.keyboardNav=!0,e.focusIndicator=!0,e.biggerTargets=!0}},{key:"clearReading",labelKey:"profile_clearReading",icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M9 7h7M9 11h5"/></svg>',apply:e=>{e.font="readable",e.titles=!0,e.links=!0}}];function ke(e,t){if(Object.assign(e,ie),t==="none")return;const o=Pe.find(i=>i.key===t);o==null||o.apply(e)}function Ct(e,t){try{const o=e.trim().replace(/^#/,"");let i,r,c;if(o.length===3)i=parseInt(o[0]+o[0],16),r=parseInt(o[1]+o[1],16),c=parseInt(o[2]+o[2],16);else if(o.length===6)i=parseInt(o.slice(0,2),16),r=parseInt(o.slice(2,4),16),c=parseInt(o.slice(4,6),16);else return`rgba(0,0,0,${t})`;return isNaN(i)||isNaN(r)||isNaN(c)?`rgba(0,0,0,${t})`:`rgba(${i},${r},${c},${t})`}catch{return`rgba(0,0,0,${t})`}}function Et(){let e=null,t="#ffd400";const o=r=>{e&&(e.style.top=`${r.clientY}px`)};function i(r){e&&(e.style.background=Ct(r,.18),e.style.borderTop=`2px solid ${r}`,e.style.borderBottom=`2px solid ${r}`)}return{on(){e||(e=document.createElement("div"),e.setAttribute("aria-hidden","true"),e.style.cssText=["position:fixed","left:0","top:0","width:100vw","height:28px","pointer-events:none","z-index:2147483646","transform:translateY(-14px)"].join(";"),i(t),document.documentElement.appendChild(e),window.addEventListener("mousemove",o))},off(){e&&(window.removeEventListener("mousemove",o),e==null||e.remove(),e=null)},setColor(r){t=r,i(r)}}}function Lt(){let e=null,t=null,o=null,i="off";const r=120,c=s=>{t&&(t.style.top=`${s.clientY-r/2}px`)};function n(){window.removeEventListener("mousemove",c),e==null||e.remove(),t==null||t.remove(),o==null||o.remove(),e=null,t=null,o=null}function a(s){const d=document.createElement("div");return d.setAttribute("aria-hidden","true"),d.style.cssText=["position:fixed","left:0","top:0","width:100%","height:100%","pointer-events:none","z-index:2147483645",s].join(";"),d}return{set(s){if(s!==i&&(n(),i=s,s!=="off")){if(s==="dim"){e=a("background:rgba(0,0,0,.55)"),t=a([`height:${r}px`,"top:0","width:100%","background:transparent","z-index:2147483646"].join(";")),t.style.height=`${r}px`,document.documentElement.appendChild(e),document.documentElement.appendChild(t),window.addEventListener("mousemove",c),t.style.top=`${window.innerHeight/2-r/2}px`;return}if(s==="tint"){o=a(["background:rgba(255,250,200,.18)","z-index:2147483646"].join(";")),document.documentElement.appendChild(o);return}}}}}function At(e){if(!("speechSynthesis"in window))return{enable(){},disable(){},setLang(r){}};let t=e,o=!1;const i=r=>{var c,n;try{const a=r.target;if(!a||(c=a.closest)!=null&&c.call(a,"#makoya-widget-root"))return;const s=(n=a.innerText)==null?void 0:n.trim();if(!s)return;window.speechSynthesis.cancel();const d=new SpeechSynthesisUtterance(s);try{const u=window.speechSynthesis.getVoices().find(p=>p.lang.startsWith(t));u&&(d.voice=u)}catch{}window.speechSynthesis.speak(d)}catch{}};return{enable(){o||(o=!0,document.addEventListener("click",i,!0))},disable(){if(o){o=!1;try{window.speechSynthesis.cancel()}catch{}document.removeEventListener("click",i,!0)}},setLang(r){t=r}}}function Mt(){let e=!1;const t=i=>{const r=i.target;r instanceof HTMLMediaElement&&(r.muted=!0)};function o(){return Array.from(document.querySelectorAll("audio, video"))}return{enable(){if(!e){e=!0;for(const i of o())i.muted=!0;document.addEventListener("play",t,!0)}},disable(){if(e){e=!1,document.removeEventListener("play",t,!0);for(const i of o())i.muted=!1}}}}function Tt(){let e=null,t=!1;const o=i=>{var r;try{const c=i.target;if(!c||!e)return;if((r=c.closest)!=null&&r.call(c,"#makoya-widget-root")){e.style.opacity="0";return}const n=c.getBoundingClientRect();e.style.left=`${n.left}px`,e.style.top=`${n.top}px`,e.style.width=`${n.width}px`,e.style.height=`${n.height}px`,e.style.opacity="1"}catch{}};return{enable(){t||(t=!0,e=document.createElement("div"),e.setAttribute("aria-hidden","true"),e.style.cssText=["position:fixed","left:0","top:0","width:0","height:0","border:2px solid #1e63ff","border-radius:3px","pointer-events:none","z-index:2147483646","opacity:0","transition:top .06s ease,left .06s ease,width .06s ease,height .06s ease"].join(";"),document.documentElement.appendChild(e),window.addEventListener("mousemove",o))},disable(){t&&(t=!1,window.removeEventListener("mousemove",o),e==null||e.remove(),e=null)}}}const Fe=240,fe=24;function Nt(){let e=null,t=!1;const o=i=>{var r;try{if(!e)return;const c=document.elementFromPoint(i.clientX,i.clientY);if(!c||(r=c.closest)!=null&&r.call(c,"#makoya-widget-root")){e.style.opacity="0";return}const n=(c.innerText||c.textContent||"").trim();if(!n){e.style.opacity="0";return}e.textContent=n.length>Fe?`${n.slice(0,Fe)}…`:n;const a=320;let s=i.clientX+fe,d=i.clientY+fe;s+a>window.innerWidth&&(s=i.clientX-a-fe),d+160>window.innerHeight&&(d=i.clientY-160-fe),e.style.left=`${Math.max(8,s)}px`,e.style.top=`${Math.max(8,d)}px`,e.style.opacity="1"}catch{}};return{enable(){t||(t=!0,e=document.createElement("div"),e.setAttribute("aria-hidden","true"),e.style.cssText=["position:fixed","left:0","top:0","max-width:320px","padding:12px 16px","background:#ffffff","color:#111111","font-size:26px","line-height:1.4","font-family:Verdana, Arial, sans-serif","border:2px solid #1e63ff","border-radius:10px","box-shadow:0 8px 30px rgba(0,0,0,.25)","pointer-events:none","z-index:2147483646","opacity:0","overflow:hidden","max-height:160px"].join(";"),document.documentElement.appendChild(e),window.addEventListener("mousemove",o))},disable(){t&&(t=!1,window.removeEventListener("mousemove",o),e==null||e.remove(),e=null)}}}const zt=400,Rt=240;function It(){var c;const e=(document.title||"").trim(),t=document.querySelector("article")||document.querySelector("main")||document.querySelector("[role=main]")||document.body,o=[];let i=0,r=0;try{const n=t.querySelectorAll("h1, h2, h3, h4, p, li");for(const a of Array.from(n)){if(r>=zt)break;r+=1;const s=a;if((c=s.closest)!=null&&c.call(s,"#makoya-widget-root"))continue;const d=(s.innerText||s.textContent||"").replace(/\s+/g," ").trim();if(!d)continue;const f=/^H[1-4]$/.test(s.tagName)?"h":"p";o.push({tag:f,text:d}),i+=d.length}}catch{}return{title:e,blocks:o,chars:i}}function Bt(e){let t=null,o=null,i=null;function r(c){var n,a,s,d;i&&(document.removeEventListener("keydown",i,!0),i=null),t==null||t.remove(),t=null;try{const f=(n=e.getReturnFocus)==null?void 0:n.call(e);f?(a=f.focus)==null||a.call(f):(d=(s=o&&document.contains(o)?o:document.body)==null?void 0:s.focus)==null||d.call(s)}catch{}if(o=null,c)try{e.onClose()}catch{}}return{open(c){var n;if(!t)try{o=(n=document.activeElement)!=null?n:null,t=document.createElement("div"),t.style.cssText="position:fixed;inset:0;z-index:2147483647;";const a=t.attachShadow({mode:"open"}),{title:s,blocks:d,chars:f}=It(),u=document.createElement("style");u.textContent=`
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
        `,a.appendChild(u);const p=document.createElement("div");p.className="wrap",p.setAttribute("role","dialog"),p.setAttribute("aria-modal","true"),p.setAttribute("aria-label",l(c,"f_readMode"));const b=document.createElement("div");b.className="bar";const h=document.createElement("button");h.type="button",h.className="close",h.textContent=l(c,"close"),h.addEventListener("click",()=>r(!0)),b.appendChild(h);const m=document.createElement("div");if(m.className="doc",f<Rt){const y=document.createElement("p");y.className="empty",y.textContent=l(c,"readModeEmpty"),m.appendChild(y)}else{if(s){const y=document.createElement("h1");y.textContent=s,m.appendChild(y)}for(const y of d){const T=document.createElement(y.tag==="h"?"h2":"p");T.textContent=y.text,m.appendChild(T)}}p.append(b,m),a.appendChild(p),document.documentElement.appendChild(t),requestAnimationFrame(()=>h.focus()),i=y=>{t&&(y.key==="Escape"?(y.preventDefault(),r(!0)):y.key==="Tab"&&(y.preventDefault(),h.focus()))},document.addEventListener("keydown",i,!0)}catch{r(!1)}},close(){t&&r(!1)}}}const Ht={m:"main, [role=main]",h:"h1, h2, h3, h4, h5, h6",f:"input:not([type=hidden]), select, textarea",b:"button, [role=button], input[type=submit], input[type=button]",g:"img, svg, [role=img], picture"};function Ot(e){const t=e;if(t.closest("#makoya-widget-root"))return!1;const o=t.getBoundingClientRect();return o.width>0||o.height>0}function $t(e){try{e.scrollIntoView({behavior:"smooth",block:"center"}),e.hasAttribute("tabindex")||(e.setAttribute("tabindex","-1"),e.addEventListener("blur",()=>{try{e.removeAttribute("tabindex")}catch{}},{once:!0})),e.focus({preventScroll:!0})}catch{}}function Pt(){let e=!1;const t={},o=i=>{var r;try{if(!i.altKey||i.ctrlKey||i.metaKey)return;const c=i.key.toLowerCase(),n=Ht[c];if(!n)return;const a=Array.from(document.querySelectorAll(n)).filter(Ot);if(a.length===0)return;i.preventDefault();const s=((r=t[c])!=null?r:-1)+1;t[c]=s>=a.length?0:s,$t(a[t[c]])}catch{}};return{enable(){e||(e=!0,document.addEventListener("keydown",o))},disable(){if(e){e=!1,document.removeEventListener("keydown",o);for(const i of Object.keys(t))delete t[i]}}}}function De(e){if(!e)return!1;const t=e.tagName;if(t==="TEXTAREA")return!0;if(t==="INPUT"){const o=e.type;return!["checkbox","radio","button","submit","reset","file","range","color","image"].includes(o)}return!1}function Ft(e,t){var r;const o=e instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,i=(r=Object.getOwnPropertyDescriptor(o,"value"))==null?void 0:r.set;i?i.call(e,t):e.value=t}const Dt=[["1","2","3","4","5","6","7","8","9","0"],["q","w","e","r","t","y","u","i","o","p"],["a","s","d","f","g","h","j","k","l"],["z","x","c","v","b","n","m"]];function jt(){let e=null,t=!1,o=null;const i=a=>{var d;const s=a.target;s&&!((d=s.closest)!=null&&d.call(s,"#makoya-vk-root"))&&De(s)&&(o=s)};function r(){const a=document.activeElement;return De(a)?a:o&&document.contains(o)?o:null}function c(a,s){var d;try{const f=r();if(!f)return;const u=(d=f.value)!=null?d:"";let p=u,b="insertText";s==="char"?p=u+a:s==="backspace"?(p=u.slice(0,-1),b="deleteContentBackward"):s==="clear"&&(p="",b="deleteContent"),Ft(f,p),f.dispatchEvent(new InputEvent("input",{bubbles:!0,inputType:b,data:s==="char"?a:null}))}catch{}}function n(a,s,d,f=!1){const u=document.createElement("button");return u.type="button",u.className=f?"vk-key vk-wide":"vk-key",u.textContent=a,u.setAttribute("aria-label",s),u.addEventListener("mousedown",p=>p.preventDefault()),u.addEventListener("click",d),u}return{enable(){if(t)return;t=!0,document.addEventListener("focusin",i,!0),e=document.createElement("div"),e.id="makoya-vk-root",e.style.cssText="position:fixed;left:0;right:0;bottom:0;z-index:2147483645;";const a=e.attachShadow({mode:"open"}),s=document.createElement("style");s.textContent=`
        .vk{background:#1f2430;padding:10px;display:flex;flex-direction:column;gap:8px;
          box-shadow:0 -6px 24px rgba(0,0,0,.3);font-family:system-ui,sans-serif;}
        .vk-row{display:flex;gap:6px;justify-content:center;}
        .vk-key{min-width:40px;height:44px;border:0;border-radius:8px;background:#3a4150;color:#fff;
          font-size:17px;cursor:pointer;flex:1;max-width:64px;}
        .vk-key:hover{background:#4a5365;}
        .vk-key:focus-visible{outline:3px solid #1e63ff;outline-offset:2px;}
        .vk-wide{max-width:none;flex:2;}
        .vk-space{flex:6;}
      `,a.appendChild(s);const d=document.createElement("div");d.className="vk",d.setAttribute("role","group"),d.setAttribute("aria-label","On-screen keyboard");for(const p of Dt){const b=document.createElement("div");b.className="vk-row";for(const h of p)b.appendChild(n(h,h,()=>c(h,"char")));d.appendChild(b)}const f=document.createElement("div");f.className="vk-row";const u=n("Space","Space",()=>c(" ","char"),!0);u.classList.add("vk-space"),f.append(n("⌫","Backspace",()=>c("","backspace"),!0),u,n("Clear","Clear field",()=>c("","clear"),!0)),d.appendChild(f),a.appendChild(d),document.documentElement.appendChild(e)},disable(){t&&(t=!1,document.removeEventListener("focusin",i,!0),e==null||e.remove(),e=null,o=null)}}}function Kt(){var t,o;const e=window;return(o=(t=e.SpeechRecognition)!=null?t:e.webkitSpeechRecognition)!=null?o:null}function je(e){const t=e;if(t.closest("#makoya-widget-root")||t.closest("[aria-hidden='true']")||t.disabled)return!1;const o=t.getBoundingClientRect();return o.width>0||o.height>0}function Ke(e){try{e.focus({preventScroll:!1}),e.click()}catch{}}function qt(e){const t=Kt();if(!t)return{enable(){},disable(){}};let o=null,i=!1;function r(c){const n=c.toLowerCase().trim();try{const a=window.innerHeight||600;if(n.includes("scroll down"))return void window.scrollBy({top:a*.8,behavior:"smooth"});if(n.includes("scroll up"))return void window.scrollBy({top:-a*.8,behavior:"smooth"});if(/\btop\b/.test(n))return void window.scrollTo({top:0,behavior:"smooth"});if(/\bbottom\b/.test(n))return void window.scrollTo({top:document.body.scrollHeight,behavior:"smooth"});if(n.includes("open menu")){const d=document.querySelector("nav a, [role=menu] a, [role=navigation] a, header a");d&&je(d)&&Ke(d);return}const s=n.match(/(?:click|open|press)\s+(.+)/);if(s){const d=s[1].trim(),f=Array.from(document.querySelectorAll("a, button, [role=button]")).filter(je),u=h=>(h.innerText||h.textContent||"").toLowerCase().replace(/\s+/g," ").trim(),p=f.filter(h=>u(h)===d),b=p.length?p:f.filter(h=>u(h).includes(d));b.length===1&&Ke(b[0])}}catch{}}return{enable(){if(!i){i=!0;try{o=new t,o.continuous=!0,o.interimResults=!1,o.lang=e.getLang(),o.onresult=c=>{var n,a;try{const s=c.results[c.results.length-1],d=(a=(n=s==null?void 0:s[0])==null?void 0:n.transcript)!=null?a:"";d&&r(d)}catch{}},o.onend=()=>{if(i)try{o==null||o.start()}catch{}},o.onerror=c=>{var a;const n=(a=c==null?void 0:c.error)!=null?a:"";if(n==="not-allowed"||n==="service-not-allowed"){i=!1;try{o==null||o.stop()}catch{}}},o.start()}catch{i=!1,o=null}}},disable(){if(i){i=!1;try{o==null||o.stop()}catch{}o=null}}}}const Ut="https://api.dictionaryapi.dev/api/v2/entries";async function Gt(e,t){var i,r,c,n;const o=e.trim().toLowerCase();if(!o||/\s/.test(o)||o.length>40)return{ok:!1,word:e};try{const a=await fetch(`${Ut}/${encodeURIComponent(t)}/${encodeURIComponent(o)}`);if(!a.ok)return{ok:!1,word:o};const s=await a.json(),d=(r=(i=s==null?void 0:s[0])==null?void 0:i.meanings)==null?void 0:r[0],f=(n=(c=d==null?void 0:d.definitions)==null?void 0:c[0])==null?void 0:n.definition;return f?{ok:!0,word:o,partOfSpeech:d==null?void 0:d.partOfSpeech,definition:f}:{ok:!1,word:o}}catch{return{ok:!1,word:o}}}function Vt(e){return/^[A-Za-zÀ-ÿ'’-]{1,40}$/.test(e)}function Wt(e){let t=!1,o=0;const i=()=>{var r,c;try{const n=(r=window.getSelection)==null?void 0:r.call(window);if(!n)return;const a=n.anchorNode,s=a&&(a.nodeType===1?a:a.parentElement);if((c=s==null?void 0:s.closest)!=null&&c.call(s,"#makoya-widget-root"))return;const d=(n.toString()||"").trim();if(!Vt(d))return;const f=++o;e.onResult({status:"loading",word:d}),Gt(d,e.getLang()).then(u=>{f!==o||!t||(u.ok&&u.definition?e.onResult({status:"ok",word:u.word,partOfSpeech:u.partOfSpeech,definition:u.definition}):e.onResult({status:"none",word:u.word}))})}catch{}};return{enable(){t||(t=!0,document.addEventListener("mouseup",i))},disable(){t&&(t=!1,o++,document.removeEventListener("mouseup",i))}}}function ve(){return window.MAKOYA_CONFIG_BASE||"https://makoya-gamma.vercel.app/api/config"}function Yt(){const e=window.MAKOYA_CONFIG_TIMEOUT_MS;return typeof e=="number"&&e>0?e:5e3}async function Xt(e,t){const i=`${ve()}/${encodeURIComponent(e)}`+(t?`?t=${encodeURIComponent(t)}`:""),r=typeof AbortController!="undefined"?new AbortController:null,c=r?setTimeout(()=>r.abort(),Yt()):null;try{const n=await fetch(i,{cache:"default",signal:r==null?void 0:r.signal});if(!n.ok)return{active:!0,config:{}};const a=await n.json(),{active:s,...d}=a;return{active:s!==!1,config:d}}catch{return{active:!0,config:{}}}finally{c&&clearTimeout(c)}}function qe(){try{return new URL(ve()).origin}catch{return null}}async function Zt(e){try{const t=qe();return!t||typeof fetch=="undefined"?!1:(await fetch(`${t}/api/widget-feedback`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(e)})).ok}catch{return!1}}async function Jt(e){try{const t=qe();if(!t||typeof fetch=="undefined")return null;const o=await fetch(`${t}/api/widget-simplify`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(e)});if(!o.ok)return null;const i=await o.json();return i!=null&&i.ok&&typeof i.text=="string"?i.text:null}catch{return null}}const Qt=40,eo=2e3;function to(e){let t=!1,o=null;function i(){o==null||o.remove(),o=null}function r(){var s;try{const d=(s=window.getSelection)==null?void 0:s.call(window);if(!d||d.rangeCount===0)return null;const f=d.getRangeAt(0).getBoundingClientRect();return f&&(f.width||f.height)?f:null}catch{return null}}function c(s){i();const d=e.getStrings();o=document.createElement("div");const f=r(),u=f?Math.min(window.innerHeight-60,f.bottom+8):window.innerHeight-80,p=f?Math.max(8,Math.min(window.innerWidth-340,f.left)):16;o.style.cssText=`position:fixed;top:${u}px;left:${p}px;z-index:2147483646;`;const b=o.attachShadow({mode:"open"}),h=document.createElement("style");h.textContent=".box{position:relative;max-width:340px;background:#fff;color:#1a1a1a;border:2px solid #1e63ff;border-radius:12px;padding:12px 14px;box-shadow:0 8px 30px rgba(0,0,0,.25);font-family:system-ui,sans-serif;font-size:14px;line-height:1.5;}.act{font:inherit;font-weight:600;cursor:pointer;border:0;background:#1e63ff;color:#fff;border-radius:8px;padding:8px 14px;}.act:focus-visible,.x:focus-visible{outline:3px solid #1a1a1a;outline-offset:2px;}.x{position:absolute;top:4px;right:6px;border:0;background:transparent;font-size:18px;cursor:pointer;color:#666;}.out{margin-top:4px;}";const m=document.createElement("div");m.className="box",m.setAttribute("role","status"),m.setAttribute("aria-live","polite");const y=document.createElement("button");y.className="x",y.type="button",y.textContent="×",y.setAttribute("aria-label",d.close),y.addEventListener("click",i);const T=document.createElement("div");T.textContent=s,m.append(y,T),b.append(h,m),document.documentElement.appendChild(o),o._body=T}function n(s){if(!o)return;const d=o._body;d&&(typeof s=="string"?d.textContent=s:(d.textContent="",d.appendChild(s)))}const a=()=>{var s,d;try{const f=(s=window.getSelection)==null?void 0:s.call(window);if(!f)return;const u=f.anchorNode&&(f.anchorNode.nodeType===1?f.anchorNode:f.anchorNode.parentElement);if((d=u==null?void 0:u.closest)!=null&&d.call(u,"#makoya-widget-root"))return;const p=(f.toString()||"").trim();if(p.length<Qt){i();return}const b=p.slice(0,eo),h=e.getStrings();c("");const m=document.createElement("button");m.className="act",m.type="button",m.textContent=h.action,m.addEventListener("click",()=>{n(h.loading),Jt({siteId:e.getSiteId(),text:b,lang:e.getLang()}).then(y=>{o&&n(y!=null?y:h.failed)})}),n(m),requestAnimationFrame(()=>m.focus())}catch{}};return{enable(){t||(t=!0,document.addEventListener("mouseup",a))},disable(){t&&(t=!1,document.removeEventListener("mouseup",a),i())}}}const Ue=100;function Ge(e){try{if(e.closest("#makoya-widget-root"))return!1;const t=e.getBoundingClientRect();if(t.width===0&&t.height===0)return!1;const o=window.getComputedStyle(e);return o.visibility!=="hidden"&&o.display!=="none"}catch{return!1}}function oo(){const e=[],t=new Set;try{const o=document.querySelectorAll("a[href]");for(const i of Array.from(o)){if(e.length>=Ue)break;if(!Ge(i))continue;const r=(i.innerText||i.textContent||"").replace(/\s+/g," ").trim();if(!r)continue;const c=`${r}|${i.getAttribute("href")}`;t.has(c)||(t.add(c),e.push({label:r.length>80?`${r.slice(0,80)}…`:r,el:i}))}}catch{}return e}function no(){const e=[];try{const t=document.querySelectorAll("h1, h2, h3, h4, h5, h6");for(const o of Array.from(t)){if(e.length>=Ue)break;if(!Ge(o))continue;const i=(o.innerText||o.textContent||"").replace(/\s+/g," ").trim();i&&e.push({label:i.length>80?`${i.slice(0,80)}…`:i,el:o,level:Number(o.tagName.charAt(1))||1})}}catch{}return e}function Ve(e){let t=null,o=null,i=null;function r(n){return Array.from(n.querySelectorAll("button"))}function c(n,a=!0){var s,d,f,u;if(i&&(document.removeEventListener("keydown",i,!0),i=null),t==null||t.remove(),t=null,a)try{const p=(s=e.getReturnFocus)==null?void 0:s.call(e);p?(d=p.focus)==null||d.call(p):(u=(f=o&&document.contains(o)?o:document.body)==null?void 0:f.focus)==null||u.call(f)}catch{}if(o=null,n)try{e.onClose()}catch{}}return{open(){var n;if(!t)try{o=(n=document.activeElement)!=null?n:null;const a=e.collect(),s=e.getTitle(),d=e.getCloseLabel(),f=e.getEmptyLabel();t=document.createElement("div"),t.style.cssText="position:fixed;inset:0;z-index:2147483647;";const u=t.attachShadow({mode:"open"}),p=document.createElement("style");p.textContent=`
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
        `,u.appendChild(p);const b=document.createElement("div");b.className="scrim",b.addEventListener("click",()=>c(!0));const h=document.createElement("div");h.className="panel",h.setAttribute("role","dialog"),h.setAttribute("aria-modal","true"),h.setAttribute("aria-label",s);const m=document.createElement("div");m.className="hd";const y=document.createElement("h2");y.textContent=s;const T=document.createElement("button");T.className="x",T.type="button",T.textContent=d,T.addEventListener("click",()=>c(!0)),m.append(y,T);const oe=document.createElement("ul");if(a.length===0){const _=document.createElement("li");_.className="empty",_.textContent=f,oe.appendChild(_)}else for(const _ of a){const O=document.createElement("li"),A=document.createElement("button");A.type="button",A.textContent=_.level?`${"— ".repeat(Math.max(0,_.level-1))}${_.label}`:_.label,A.addEventListener("click",()=>{c(!0,!1),ro(_.el)}),O.appendChild(A),oe.appendChild(O)}h.append(m,oe),u.append(b,h),document.documentElement.appendChild(t),requestAnimationFrame(()=>T.focus()),i=_=>{if(t){if(_.key==="Escape"){_.preventDefault(),c(!0);return}if(_.key==="Tab"){const O=r(u);if(O.length===0)return;const A=O[0],ae=O[O.length-1],me=u.activeElement;_.shiftKey&&me===A?(_.preventDefault(),ae.focus()):!_.shiftKey&&me===ae&&(_.preventDefault(),A.focus())}}},document.addEventListener("keydown",i,!0)}catch{c(!1)}},close(){t&&c(!1)}}}function ro(e){try{e.scrollIntoView({behavior:"smooth",block:"start"}),e.hasAttribute("tabindex")||(e.setAttribute("tabindex","-1"),e.addEventListener("blur",()=>{try{e.removeAttribute("tabindex")}catch{}},{once:!0})),e.focus({preventScroll:!0})}catch{}}const io=5*60*1e3,ao=2e3,we=50;let W=null,_e,ee=!1,We=0,Y=[],te=null,Ye=!1;function so(){try{const e=window.MAKOYA_API_ORIGIN;return typeof e=="string"&&e?e.replace(/\/+$/,""):new URL(ve()).origin}catch{try{return location.origin}catch{return null}}}function lo(){try{if(window.MAKOYA_NO_TELEMETRY)return!0}catch{}try{if(typeof document!="undefined"&&typeof document.querySelector=="function"&&document.querySelector("script[data-no-telemetry]"))return!0}catch{}return!1}function co(e){try{W=e.siteId||null,_e=e.token,ee=!!W&&typeof fetch=="function"&&!lo(),ee&&fo()}catch{ee=!1}}function Xe(e,t){try{if(typeof fetch!="function")return;const o=so();if(!o)return;const i=fetch(o+e,{method:"POST",keepalive:!0,headers:{"content-type":"application/json"},body:JSON.stringify(t),mode:"cors"});i&&typeof i.catch=="function"&&i.catch(()=>{})}catch{}}function Ze(){try{if(!ee||!W)return;const e=Date.now();if(e-We<io)return;We=e;let t="";try{const o=new URL(location.href);t=o.origin+o.pathname}catch{t=""}Xe("/api/heartbeat",{siteId:W,token:_e,url:t})}catch{}}function Je(e,t){try{if(!ee||!W||Y.length>=we)return;Y.push(t?{event:e,featureKey:t,ts:Date.now()}:{event:e,ts:Date.now()}),uo()}catch{}}function uo(){try{if(te)return;te=setTimeout(()=>{te=null,Se()},ao)}catch{}}function Se(){try{if(te&&(clearTimeout(te),te=null),!ee||!W){Y=[];return}if(Y.length===0)return;const e=Y.slice(0,we);Y=Y.slice(we),Xe("/api/widget-events",{siteId:W,token:_e,events:e})}catch{}}function fo(){try{if(Ye)return;typeof document!="undefined"&&typeof document.addEventListener=="function"&&document.addEventListener("visibilitychange",()=>{try{document.visibilityState==="hidden"&&Se()}catch{}}),typeof window!="undefined"&&typeof window.addEventListener=="function"&&window.addEventListener("pagehide",()=>{try{Se()}catch{}}),Ye=!0}catch{}}function po(e){const t=new Set;return e.contentScale!==100&&t.add("contentScale"),e.fontScale!==100&&t.add("textSize"),e.lineHeightPct!==100&&t.add("lineSpacing"),e.letterSpacingPct!==0&&t.add("letterSpacing"),e.contrast!=="off"&&t.add("contrast"),e.stopMotion&&t.add("stopMotion"),e.ruler&&t.add("readingRuler"),e.links&&t.add("highlightLinks"),e.cursor!=="off"&&t.add("bigCursor"),e.font!=="off"&&t.add("readableFont"),e.images&&t.add("hideImages"),e.saturation!=="off"&&t.add("saturation"),e.mask!=="off"&&t.add("readingMask"),e.titles&&t.add("highlightTitles"),e.textAlign!=="off"&&t.add("textAlign"),e.mute&&t.add("muteSounds"),e.readAloud&&t.add("readAloud"),e.hoverHighlight&&t.add("highlightHover"),e.biggerTargets&&t.add("biggerTargets"),e.focusIndicator&&t.add("focusIndicator"),e.textColor!==""&&t.add("textColor"),e.titleColor!==""&&t.add("titleColor"),e.bgColor!==""&&t.add("bgColor"),e.magnifier&&t.add("magnifier"),e.readMode&&t.add("readMode"),e.usefulLinks&&t.add("usefulLinks"),e.pageStructure&&t.add("pageStructure"),e.keyboardNav&&t.add("keyboardNav"),e.virtualKeyboard&&t.add("virtualKeyboard"),e.voiceNav&&t.add("voiceNav"),e.dictionary&&t.add("dictionary"),e.aiSimplify&&t.add("aiSimplify"),t}const Qe="makoya_lang",mo='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',ho={contentScale:"sec_content",textSize:"sec_content",lineSpacing:"sec_content",letterSpacing:"sec_content",readableFont:"sec_content",textAlign:"sec_content",highlightTitles:"sec_content",highlightLinks:"sec_content",hideImages:"sec_content",stopMotion:"sec_content",contrast:"sec_color",saturation:"sec_color",textColor:"sec_color",titleColor:"sec_color",bgColor:"sec_color",readingMask:"sec_color",readingRuler:"sec_nav",bigCursor:"sec_nav",highlightHover:"sec_nav",biggerTargets:"sec_nav",focusIndicator:"sec_nav",magnifier:"sec_nav",readMode:"sec_nav",usefulLinks:"sec_nav",pageStructure:"sec_nav",keyboardNav:"sec_nav",virtualKeyboard:"sec_nav",voiceNav:"sec_nav",muteSounds:"sec_audio",readAloud:"sec_audio",dictionary:"sec_tools",aiSimplify:"sec_tools"},go=["sec_content","sec_color","sec_nav","sec_audio","sec_tools"];function bo(e){try{const t=localStorage.getItem(Qe);if(t&&(t==="en"||t==="es"||t==="fr"||t==="de"))return t}catch{}return e}function yo(e){try{localStorage.setItem(Qe,e)}catch{}}function xo(e){try{ko(e)}catch{}}function ko(e){var at,st,lt;try{if(sessionStorage.getItem("makoya_hidden")==="1")return}catch{}const t=document.createElement("div");t.id="makoya-widget-root";const o=t.attachShadow({mode:"open"});document.documentElement.appendChild(t);const i=document.createElement("style");i.textContent=kt(e.primaryColor,e.launcherSize),o.appendChild(i);let r=bo(e.defaultLanguage);const c=(()=>{try{return localStorage.getItem(xe)!==null}catch{return!1}})(),n=He();let a="none";const s={},d=Et(),f=Lt(),u=At(r),p=Mt(),b=Tt(),h=Nt(),m=Pt(),y=jt(),T=qt({getLang:()=>r}),oe=Bt({onClose:()=>{n.readMode=!1,X(),G()},getReturnFocus:()=>P}),_=Ve({collect:oo,getTitle:()=>l(r,"f_usefulLinks"),getCloseLabel:()=>l(r,"close"),getEmptyLabel:()=>l(r,"nav_none"),onClose:()=>{n.usefulLinks=!1,X(),G()},getReturnFocus:()=>P}),O=Ve({collect:no,getTitle:()=>l(r,"f_pageStructure"),getCloseLabel:()=>l(r,"close"),getEmptyLabel:()=>l(r,"nav_none"),onClose:()=>{n.pageStructure=!1,X(),G()},getReturnFocus:()=>P});let A=null;function ae(){A==null||A.remove(),A=null}function me(g){try{if(!A){A=document.createElement("div"),A.style.cssText="position:fixed;left:50%;bottom:84px;transform:translateX(-50%);z-index:2147483646;";const C=A.attachShadow({mode:"open"}),B=document.createElement("style");B.textContent=".box{position:relative;max-width:min(420px,92vw);background:#fff;color:#1a1a1a;border:2px solid #1e63ff;border-radius:12px;padding:14px 32px 14px 16px;box-shadow:0 8px 30px rgba(0,0,0,.25);font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;}.w{font-weight:700;}.pos{color:#666;font-style:italic;margin-left:6px;}.x{position:absolute;top:6px;right:8px;border:0;background:transparent;font-size:18px;cursor:pointer;color:#666;}.x:focus-visible{outline:3px solid #1e63ff;outline-offset:2px;}";const M=document.createElement("div");M.className="box",M.setAttribute("role","status"),M.setAttribute("aria-live","polite");const I=document.createElement("button");I.className="x",I.type="button",I.textContent="×",I.setAttribute("aria-label",l(r,"close")),I.addEventListener("click",ae);const ce=document.createElement("div");ce.className="content",M.append(I,ce),C.append(B,M),document.documentElement.appendChild(A)}const k=A.shadowRoot.querySelector(".content");if(!k)return;if(k.innerHTML="",g.status==="loading")k.textContent=l(r,"dict_loading");else if(g.status==="none")k.textContent=`“${g.word}” — ${l(r,"dict_none")}`;else if(g.status==="ok"){const C=document.createElement("span");if(C.className="w",C.textContent=g.word,k.appendChild(C),g.partOfSpeech){const M=document.createElement("span");M.className="pos",M.textContent=g.partOfSpeech,k.appendChild(M)}const B=document.createElement("div");B.textContent=g.definition,k.appendChild(B)}}catch{}}const tt=Wt({getLang:()=>r,onResult:me}),ot=to({getLang:()=>r,getSiteId:()=>e.siteId,getStrings:()=>({action:l(r,"as_action"),loading:l(r,"as_loading"),failed:l(r,"as_failed"),close:l(r,"close")})}),K=typeof e.offsetX=="number"?e.offsetX:0,q=typeof e.offsetY=="number"?e.offsetY:0,nt=e.position.startsWith("bottom"),he=e.position.endsWith("right"),z=16,_o=nt?he?`bottom:${z-q}px; right:${z-K}px;`:`bottom:${z-q}px; left:${z+K}px;`:he?`top:${z+q}px; right:${z-K}px;`:`top:${z+q}px; left:${z+K}px;`,R=document.createElement("button");R.className="mky-btn",R.type="button",R.style.cssText=_o;const So=(st={circle:"50%",rounded:"16px",square:"8px"}[(at=e.launcherShape)!=null?at:"circle"])!=null?st:"50%";R.style.borderRadius=So,R.setAttribute("aria-label",l(r,"title")),R.setAttribute("aria-expanded","false"),R.innerHTML=(lt=ze[e.launcherIcon])!=null?lt:ze.accessibility;const $=document.createElement("div");$.className="mky-panel",$.setAttribute("role","dialog"),$.setAttribute("aria-modal","true"),$.setAttribute("aria-label",e.panelTitle||l(r,"title"));const ge=84,Co=nt?he?`bottom:${ge-q}px; right:${z-K}px;`:`bottom:${ge-q}px; left:${z+K}px;`:he?`top:${ge+q}px; right:${z-K}px;`:`top:${ge+q}px; left:${z+K}px;`;$.style.cssText=Co;let Ce=null;function X(){try{Oe(n),d.setColor(n.rulerColor),n.ruler?d.on():d.off(),f.set(n.mask),n.readAloud?u.enable():u.disable(),u.setLang(r),n.mute?p.enable():p.disable(),n.hoverHighlight?b.enable():b.disable(),n.magnifier?h.enable():h.disable(),n.keyboardNav?m.enable():m.disable(),n.virtualKeyboard?y.enable():y.disable(),n.voiceNav?T.enable():T.disable(),n.readMode?oe.open(r):oe.close(),n.usefulLinks?_.open():_.close(),n.pageStructure?O.open():O.close(),n.dictionary?tt.enable():(tt.disable(),ae()),n.aiSimplify?ot.enable():ot.disable(),yt(n);try{const g=po(n);if(Ce)for(const k of g)Ce.has(k)||Je("feature_activated",k);Ce=g}catch{}}catch{}}const Ee=document.createElement("div");Ee.className="mky-head";const rt=document.createElement("div"),Le=document.createElement("h2");Le.className="mky-title";const Ae=document.createElement("p");Ae.className="mky-sub",rt.append(Le,Ae);const Z=document.createElement("select");Z.className="mky-lang",Z.setAttribute("aria-label",l(r,"language"));for(const[g,k]of Object.entries(vt)){const C=document.createElement("option");C.value=g,C.textContent=k,C.selected=g===r,Z.appendChild(C)}Z.addEventListener("change",()=>{r=Z.value,yo(r),u.setLang(r),it(),G()});const P=document.createElement("button");P.className="mky-close",P.type="button",P.innerHTML=mo,Ee.append(rt,Z,P);const ne=document.createElement("div");ne.className="mky-body";const se=document.createElement("div");se.className="mky-foot";const le=document.createElement("button");le.className="mky-reset",le.type="button",le.addEventListener("click",()=>{Object.assign(n,ie),a="none",X(),G()});const Me=document.createElement("p");Me.className="mky-note",se.append(le,Me);let U=null;e.accessibilityStatementUrl&&(U=document.createElement("a"),U.className="mky-statement",U.href=e.accessibilityStatementUrl,U.target="_blank",U.rel="noopener",se.appendChild(U));let D=null;if(!e.hideBranding){D=document.createElement("p"),D.className="mky-brand";const g=document.createElement("a");g.href=e.brandingUrl,g.target="_blank",g.rel="noopener",g.textContent="Makoya",D.append("",g),se.appendChild(D)}function it(){const g=e.panelTitle||l(r,"title");if(R.setAttribute("aria-label",g),$.setAttribute("aria-label",g),Le.textContent=g,Ae.textContent=l(r,"subtitle"),P.setAttribute("aria-label",l(r,"close")),Z.setAttribute("aria-label",l(r,"language")),le.textContent=l(r,"reset"),Me.textContent=l(r,"note"),U&&(U.textContent=l(r,"statement")),D){const k=D.querySelector("a");k&&(D.textContent="",D.appendChild(document.createTextNode(`${l(r,"poweredBy")} `)),D.appendChild(k))}}function G(){var dt;ne.innerHTML="";const g=document.createElement("div");g.className="mky-sec";const k=document.createElement("span");k.className="mky-sec-label",k.textContent=l(r,"quickProfiles");const C=document.createElement("div");C.className="mky-profiles";for(const v of Pe){const E=document.createElement("button");E.type="button",E.className="mky-chip",E.setAttribute("aria-pressed",String(a===v.key));const w=l(r,v.labelKey);E.innerHTML=`${v.icon}<span>${w}</span>`,E.addEventListener("click",()=>{a===v.key?(ke(n,"none"),a="none"):(ke(n,v.key),a=v.key),X(),G()}),C.appendChild(E)}const B=document.createElement("div");B.className="mky-divider",g.append(k,C,B),ne.appendChild(g);const M=new Map;for(const v of e.featuresEnabled){const E=ho[v];E&&(M.has(E)||M.set(E,[]),M.get(E).push(v))}for(const v of go){const E=M.get(v);if(!E||E.length===0)continue;const w=document.createElement("details");w.className="mky-sec";const F=s[v];w.open=F!==void 0?F:v==="sec_content",w.addEventListener("toggle",()=>{s[v]=w.open});const H=document.createElement("summary");H.className="mky-sec-label",H.textContent=l(r,v),w.appendChild(H);for(const N of E){const j=St(N,n,r,X);j&&w.appendChild(j)}if(v==="sec_audio"&&e.featuresEnabled.includes("readAloud")){const N=document.createElement("p");N.className="mky-note",N.style.cssText="margin: 4px 8px 8px; text-align: left;",N.textContent=l(r,"readAloudHint"),w.appendChild(N)}ne.appendChild(w)}const I=e.featuresEnabled.includes("userGuide"),ce=e.featuresEnabled.includes("feedbackForm"),ct=e.featuresEnabled.includes("hideInterface");if(I||ce||ct){const v=document.createElement("details");v.className="mky-sec",v.open=(dt=s.sec_about)!=null?dt:!1,v.addEventListener("toggle",()=>{s.sec_about=v.open});const E=document.createElement("summary");if(E.className="mky-sec-label",E.textContent=l(r,"sec_about"),v.appendChild(E),I){const w=document.createElement("details");w.style.cssText="margin:4px 8px;";const F=document.createElement("summary");F.textContent=l(r,"f_userGuide"),F.style.cssText="cursor:pointer;font-size:14px;padding:6px 0;";const H=document.createElement("p");H.textContent=l(r,"guide_body"),H.style.cssText="margin:6px 0;font-size:13px;line-height:1.5;",w.append(F,H),v.appendChild(w)}if(ce){const w="width:100%;box-sizing:border-box;margin:4px 0;padding:8px;font:inherit;border:1px solid #ccc;border-radius:6px;",F=document.createElement("details");F.style.cssText="margin:4px 8px;";const H=document.createElement("summary");H.textContent=l(r,"fb_open"),H.style.cssText="cursor:pointer;font-size:14px;padding:6px 0;";const N=document.createElement("textarea");N.setAttribute("aria-label",l(r,"fb_msgLabel")),N.placeholder=l(r,"fb_msgLabel"),N.rows=3,N.style.cssText=w;const j=document.createElement("input");j.type="email",j.setAttribute("aria-label",l(r,"fb_emailLabel")),j.placeholder=l(r,"fb_emailLabel"),j.style.cssText=w;const J=document.createElement("button");J.type="button",J.className="mky-reset",J.textContent=l(r,"fb_send");const re=document.createElement("p");re.setAttribute("role","status"),re.setAttribute("aria-live","polite"),re.style.cssText="margin:6px 0;font-size:13px;",J.addEventListener("click",()=>{const ut=N.value.trim();ut&&(J.disabled=!0,re.textContent=l(r,"fb_sending"),Zt({siteId:e.siteId,message:ut,email:j.value.trim()||void 0,url:location.href}).then(ft=>{re.textContent=ft?l(r,"fb_sent"):l(r,"fb_failed"),J.disabled=!1,ft&&(N.value="")}))}),F.append(H,N,j,J,re),v.appendChild(F)}if(ct){const w=document.createElement("button");w.type="button",w.className="mky-reset",w.style.cssText="margin:8px;",w.textContent=l(r,"f_hideInterface"),w.addEventListener("click",()=>{try{sessionStorage.setItem("makoya_hidden","1")}catch{}t.style.display="none"}),v.appendChild(w)}ne.appendChild(v)}}$.append(Ee,ne,se);let Te=!1;const Ne=g=>{Te=g,$.classList.toggle("open",g),R.setAttribute("aria-expanded",String(g)),g?(Je("open"),requestAnimationFrame(()=>P.focus())):R.focus()};R.addEventListener("click",()=>Ne(!Te)),P.addEventListener("click",()=>Ne(!1)),o.addEventListener("keydown",g=>{const k=g;if(Te){if(k.key==="Escape"){Ne(!1);return}if(k.key==="Tab"){const C=Array.from($.querySelectorAll('button:not([disabled]), a[href], select, input, [tabindex]:not([tabindex="-1"])'));if(C.length===0)return;const B=C[0],M=C[C.length-1],I=o.activeElement;k.shiftKey&&I===B?(k.preventDefault(),M.focus()):!k.shiftKey&&I===M&&(k.preventDefault(),B.focus())}}}),o.append(R,$),it(),G(),!c&&e.defaultProfile!=="none"&&(ke(n,e.defaultProfile),a=e.defaultProfile,G()),X()}let et=!1;function vo(){const e=()=>{Oe(He()),Ze()},t=o=>{const i=history[o];history[o]=function(...r){const c=i.apply(this,r);return setTimeout(e,50),c}};t("pushState"),t("replaceState"),window.addEventListener("popstate",()=>setTimeout(e,50))}function pe(e){if(et||document.getElementById("makoya-widget-root"))return;et=!0;const t=mt(e.siteId,e),o=()=>{xo(t),vo(),co({siteId:t.siteId,token:e.token}),Ze()};document.readyState==="loading"?document.addEventListener("DOMContentLoaded",o,{once:!0}):o()}window.MakoyaWidget={init:pe};function wo(){return!1}return async function(){var t;try{const o=(t=document.currentScript)!=null?t:document.querySelector("script[data-site]");if(!o||o.hasAttribute("data-no-auto"))return;const i=o.dataset.site||"auto",r=o.dataset.token,c=o.dataset.color,n=c?{primaryColor:c}:{};if(wo()&&o.hasAttribute("data-demo")){pe({siteId:i,...n});return}const{active:a,config:s}=await Xt(i,r);if(a===!1)return;pe({...s,siteId:i,...n,token:r})}catch{}}().catch(()=>{}),be.init=pe,Object.defineProperty(be,Symbol.toStringTag,{value:"Module"}),be}({});
