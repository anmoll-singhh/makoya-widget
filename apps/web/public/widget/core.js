var MakoyaCore=function(h){"use strict";const x={accessibility:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="4" r="2"/><path d="M21 9c0 .55-.45 1-1 1h-4v11a1 1 0 0 1-2 0v-5h-4v5a1 1 0 0 1-2 0V10H4a1 1 0 0 1 0-2h16c.55 0 1 .45 1 1z"/></svg>',person:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="7" r="4"/><path d="M4 21a8 8 0 0 1 16 0 1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/></svg>',eye:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 5c-5 0-9 4.5-10 7 1 2.5 5 7 10 7s9-4.5 10-7c-1-2.5-5-7-10-7zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8z"/><circle cx="12" cy="12" r="2"/></svg>',adjust:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 7h11a3 3 0 0 1 6 0h1a1 1 0 0 1 0 2h-1a3 3 0 0 1-6 0H3a1 1 0 0 1 0-2zm6 8a3 3 0 0 1 6 0h6a1 1 0 0 1 0 2h-6a3 3 0 0 1-6 0H3a1 1 0 0 1 0-2h6z"/></svg>'},B={siteId:"unknown",primaryColor:"#2563eb",position:"bottom-right",launcherIcon:"accessibility",featuresEnabled:["textSize","lineSpacing","contrast","stopMotion","readingRuler","highlightLinks","bigCursor"],hideBranding:!1,brandingUrl:"https://makoya.example/scan"};function H(t,e){return{...B,...e!=null?e:{},siteId:t}}const v="makoya-effects",R=`
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
`;function O(){if(document.getElementById(v))return;const t=document.createElement("style");t.id=v,t.textContent=R,document.head.appendChild(t)}function c(t,e){const n=document.documentElement;e===null?n.removeAttribute(t):n.setAttribute(t,e)}const E="makoya_prefs",f={text:0,spacing:!1,contrast:"off",stopMotion:!1,ruler:!1,links:!1,cursor:!1};function w(){try{const t=localStorage.getItem(E);return t?{...f,...JSON.parse(t)}:{...f}}catch{return{...f}}}function _(t){try{localStorage.setItem(E,JSON.stringify(t))}catch{}}function C(t){O(),c("data-mky-text",t.text===0?null:String(t.text)),c("data-mky-spacing",t.spacing?"on":null),c("data-mky-contrast",t.contrast==="off"?null:t.contrast),c("data-mky-motion",t.stopMotion?"off":null),c("data-mky-links",t.links?"on":null),c("data-mky-cursor",t.cursor?"on":null)}function p(t,e,n,i){const o=document.createElement("button");return o.className="mky-toggle",o.type="button",o.textContent=t,o.setAttribute("aria-pressed",String(e())),o.addEventListener("click",()=>{n(!e()),o.setAttribute("aria-pressed",String(e())),i()}),o}const S={textSize:{key:"textSize",label:"Text size",render:(t,e)=>{const n=document.createElement("div");n.className="mky-row";const i=document.createElement("span");i.textContent="Text size";const o=document.createElement("button");o.className="mky-step",o.type="button",o.textContent="A−",o.setAttribute("aria-label","Decrease text size");const s=document.createElement("button");return s.className="mky-step",s.type="button",s.textContent="A+",s.setAttribute("aria-label","Increase text size"),o.addEventListener("click",()=>{t.text=Math.max(0,t.text-1),e()}),s.addEventListener("click",()=>{t.text=Math.min(3,t.text+1),e()}),n.append(i,o,s),n}},lineSpacing:{key:"lineSpacing",label:"More spacing",render:(t,e)=>p("More spacing",()=>t.spacing,n=>t.spacing=n,e)},contrast:{key:"contrast",label:"Contrast",render:(t,e)=>{const n=document.createElement("div");n.className="mky-row";const i=document.createElement("span");i.textContent="Contrast";const o=document.createElement("button");o.className="mky-toggle",o.type="button";const s={off:"Off",on:"Boost",dark:"Dark"},l=()=>o.textContent=s[t.contrast];return l(),o.addEventListener("click",()=>{t.contrast=t.contrast==="off"?"on":t.contrast==="on"?"dark":"off",l(),e()}),n.append(i,o),n}},stopMotion:{key:"stopMotion",label:"Stop motion",render:(t,e)=>p("Stop animations",()=>t.stopMotion,n=>t.stopMotion=n,e)},readingRuler:{key:"readingRuler",label:"Reading ruler",render:(t,e)=>p("Reading ruler",()=>t.ruler,n=>t.ruler=n,e)},highlightLinks:{key:"highlightLinks",label:"Highlight links",render:(t,e)=>p("Highlight links",()=>t.links,n=>t.links=n,e)},bigCursor:{key:"bigCursor",label:"Big cursor",render:(t,e)=>p("Big cursor",()=>t.cursor,n=>t.cursor=n,e)}},P=t=>`
:host { all: initial; }
.mky-btn {
  position: fixed; z-index: 2147483647;
  width: 52px; height: 52px; border-radius: 50%;
  background: ${t}; color: #fff; border: none; cursor: pointer;
  box-shadow: 0 2px 10px rgba(0,0,0,.25);
  font: 600 13px system-ui, sans-serif; display: grid; place-items: center;
}
.mky-btn:focus-visible { outline: 3px solid #fff; outline-offset: 2px; }
.mky-btn svg { width: 28px; height: 28px; }
.mky-panel {
  position: fixed; z-index: 2147483647;
  width: 280px; max-width: calc(100vw - 24px);
  background: #fff; color: #111; border-radius: 12px;
  box-shadow: 0 8px 30px rgba(0,0,0,.25);
  font: 14px system-ui, sans-serif; padding: 14px; display: none;
}
.mky-panel.open { display: block; }
.mky-panel h2 { font-size: 14px; margin: 0 0 10px; }
.mky-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin: 6px 0; }
.mky-toggle, .mky-step {
  border: 1px solid #d1d5db; background: #f9fafb; color: #111;
  border-radius: 8px; padding: 6px 10px; cursor: pointer; font: inherit;
}
.mky-toggle[aria-pressed="true"] { background: ${t}; color: #fff; border-color: ${t}; }
.mky-toggle:focus-visible, .mky-step:focus-visible { outline: 2px solid ${t}; outline-offset: 2px; }
.mky-reset { width: 100%; margin-top: 10px; padding: 8px; border: none; border-radius: 8px; background: #111; color: #fff; cursor: pointer; font: inherit; }
.mky-brand { margin-top: 10px; font-size: 11px; color: #6b7280; text-align: center; }
.mky-brand a { color: #6b7280; }
.mky-note { font-size: 11px; color: #6b7280; margin: 8px 0 0; }
@media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
`,u={"bottom-right":"bottom:16px; right:16px;","bottom-left":"bottom:16px; left:16px;","top-right":"top:16px; right:16px;","top-left":"top:16px; left:16px;"};function U(){let t=null;const e=n=>{t&&(t.style.top=`${n.clientY}px`)};return{on(){t||(t=document.createElement("div"),t.setAttribute("aria-hidden","true"),t.style.cssText="position:fixed;left:0;width:100vw;height:28px;background:rgba(0,0,0,.08);border-top:2px solid rgba(0,0,0,.4);border-bottom:2px solid rgba(0,0,0,.4);pointer-events:none;z-index:2147483646;transform:translateY(-14px);",document.body.appendChild(t),window.addEventListener("mousemove",e))},off(){window.removeEventListener("mousemove",e),t==null||t.remove(),t=null}}}function F(t){var z,N,T;const e=document.createElement("div");e.id="makoya-widget-root";const n=e.attachShadow({mode:"open"});document.body.appendChild(e);const i=document.createElement("style");i.textContent=P(t.primaryColor),n.appendChild(i);const o=w(),s=U(),l=document.createElement("button");l.className="mky-btn",l.style.cssText=(z=u[t.position])!=null?z:u["bottom-right"],l.setAttribute("aria-label","Accessibility options"),l.setAttribute("aria-expanded","false"),l.innerHTML=(N=x[t.launcherIcon])!=null?N:x.accessibility;const a=document.createElement("div");a.className="mky-panel",a.setAttribute("role","dialog"),a.setAttribute("aria-label","Accessibility options"),a.style.cssText=(T=u[t.position])!=null?T:u["bottom-right"],a.style.bottom=t.position.startsWith("bottom")?"80px":"",a.style.top=t.position.startsWith("top")?"80px":"";const M=document.createElement("h2");M.textContent="Accessibility options",a.appendChild(M);const y=()=>{C(o),o.ruler?s.on():s.off(),_(o)};for(const r of t.featuresEnabled){const d=S[r];d&&a.appendChild(d.render(o,y))}const m=document.createElement("button");m.className="mky-reset",m.type="button",m.textContent="Reset all",m.addEventListener("click",()=>{Object.assign(o,{text:0,spacing:!1,contrast:"off",stopMotion:!1,ruler:!1,links:!1,cursor:!1}),y(),D()}),a.appendChild(m);const b=document.createElement("p");if(b.className="mky-note",b.textContent="Adjusts your view only. It does not change the website's code.",a.appendChild(b),!t.hideBranding){const r=document.createElement("p");r.className="mky-brand",r.innerHTML=`Powered by <a href="${t.brandingUrl}" target="_blank" rel="noopener">Makoya</a>`,a.appendChild(r)}let k=!1;const A=r=>{var d;k=r,a.classList.toggle("open",r),l.setAttribute("aria-expanded",String(r)),r?(d=a.querySelector("button"))==null||d.focus():l.focus()};l.addEventListener("click",()=>A(!k)),n.addEventListener("keydown",r=>{r.key==="Escape"&&k&&A(!1)});function D(){const r=a.querySelector("h2");a.innerHTML="",r&&a.appendChild(r);for(const d of t.featuresEnabled){const I=S[d];I&&a.appendChild(I.render(o,y))}if(a.appendChild(m),a.appendChild(b),!t.hideBranding){const d=document.createElement("p");d.className="mky-brand",d.innerHTML=`Powered by <a href="${t.brandingUrl}" target="_blank" rel="noopener">Makoya</a>`,a.appendChild(d)}}n.append(l,a),y()}let L=!1;function $(){const t=()=>C(w()),e=n=>{const i=history[n];history[n]=function(...o){const s=i.apply(this,o);return setTimeout(t,50),s}};e("pushState"),e("replaceState"),window.addEventListener("popstate",()=>setTimeout(t,50))}function g(t){if(L||document.getElementById("makoya-widget-root"))return;L=!0;const e=H(t.siteId,t),n=()=>{F(e),$()};document.readyState==="loading"?document.addEventListener("DOMContentLoaded",n,{once:!0}):n()}return window.MakoyaWidget={init:g},function(){var e;try{const n=(e=document.currentScript)!=null?e:document.querySelector("script[data-site]");if(!n||n.hasAttribute("data-no-auto"))return;const i=n.dataset.site||"auto",o=n.dataset.color;g({siteId:i,...o?{primaryColor:o}:{}})}catch{}}(),h.init=g,Object.defineProperty(h,Symbol.toStringTag,{value:"Module"}),h}({});
