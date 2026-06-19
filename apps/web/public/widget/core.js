var MakoyaCore=function(b){"use strict";const L={accessibility:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="4" r="2"/><path d="M21 9c0 .55-.45 1-1 1h-4v11a1 1 0 0 1-2 0v-5h-4v5a1 1 0 0 1-2 0V10H4a1 1 0 0 1 0-2h16c.55 0 1 .45 1 1z"/></svg>',person:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="7" r="4"/><path d="M4 21a8 8 0 0 1 16 0 1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/></svg>',eye:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 5c-5 0-9 4.5-10 7 1 2.5 5 7 10 7s9-4.5 10-7c-1-2.5-5-7-10-7zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8z"/><circle cx="12" cy="12" r="2"/></svg>',adjust:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 7h11a3 3 0 0 1 6 0h1a1 1 0 0 1 0 2h-1a3 3 0 0 1-6 0H3a1 1 0 0 1 0-2zm6 8a3 3 0 0 1 6 0h6a1 1 0 0 1 0 2h-6a3 3 0 0 1-6 0H3a1 1 0 0 1 0-2h6z"/></svg>'},_={siteId:"unknown",primaryColor:"#2563eb",position:"bottom-right",launcherIcon:"accessibility",featuresEnabled:["textSize","lineSpacing","contrast","stopMotion","readingRuler","highlightLinks","bigCursor"],hideBranding:!1,brandingUrl:"https://makoya.example/scan"};function P(t,e){return{..._,...e!=null?e:{},siteId:t}}const A="makoya-effects",F=`
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
`;function U(){if(document.getElementById(A))return;const t=document.createElement("style");t.id=A,t.textContent=F,document.head.appendChild(t)}function u(t,e){const o=document.documentElement;e===null?o.removeAttribute(t):o.setAttribute(t,e)}const z="makoya_prefs",x={text:0,spacing:!1,contrast:"off",stopMotion:!1,ruler:!1,links:!1,cursor:!1};function N(){try{const t=localStorage.getItem(z);return t?{...x,...JSON.parse(t)}:{...x}}catch{return{...x}}}function D(t){try{localStorage.setItem(z,JSON.stringify(t))}catch{}}function B(t){U(),u("data-mky-text",t.text===0?null:String(t.text)),u("data-mky-spacing",t.spacing?"on":null),u("data-mky-contrast",t.contrast==="off"?null:t.contrast),u("data-mky-motion",t.stopMotion?"off":null),u("data-mky-links",t.links?"on":null),u("data-mky-cursor",t.cursor?"on":null)}const Y={textSize:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg>',lineSpacing:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',contrast:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/></svg>',stopMotion:'<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>',readingRuler:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="9" width="18" height="6" rx="1.5"/><path d="M7.5 9v3M12 9v3M16.5 9v3"/></svg>',highlightLinks:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.07 0l2-2a5 5 0 0 0-7.07-7.07l-1 1"/><path d="M14 11a5 5 0 0 0-7.07 0l-2 2A5 5 0 0 0 12 20.07l1-1"/></svg>',bigCursor:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M5 3l6.5 17 2.2-7.3L21 10.5 5 3z"/></svg>'},W={textSize:"Text size",lineSpacing:"More spacing",contrast:"Contrast",stopMotion:"Pause animations",readingRuler:"Reading ruler",highlightLinks:"Highlight links",bigCursor:"Big cursor"},V=["100%","112%","125%","140%"];function d(t,e){const o=document.createElement("div");o.className="mky-row";const i=document.createElement("span");return i.className="mky-label",i.innerHTML=`${Y[t]}<span>${W[t]}</span>`,o.append(i,e),o}function m(t,e,o,i){const n=document.createElement("button");return n.className="mky-switch",n.type="button",n.setAttribute("role","switch"),n.setAttribute("aria-label",t),n.setAttribute("aria-pressed",String(e())),n.addEventListener("click",()=>{o(!e()),n.setAttribute("aria-pressed",String(e())),i()}),n}function G(t,e){const o=document.createElement("div");o.className="mky-seg";const i=[],n=()=>i.forEach((r,a)=>r.setAttribute("aria-pressed",String(t[a].isActive())));return t.forEach(r=>{const a=document.createElement("button");a.type="button",a.textContent=r.label,a.setAttribute("aria-pressed",String(r.isActive())),a.addEventListener("click",()=>{r.set(),n(),e()}),i.push(a),o.appendChild(a)}),o}const J={textSize:(t,e)=>{const o=document.createElement("div");o.className="mky-stepper";const i=document.createElement("button");i.className="mky-step",i.type="button",i.textContent="A",i.style.fontSize="12px",i.setAttribute("aria-label","Decrease text size");const n=document.createElement("span");n.className="mky-stepval";const r=document.createElement("button");r.className="mky-step",r.type="button",r.textContent="A",r.style.fontSize="17px",r.setAttribute("aria-label","Increase text size");const a=()=>n.textContent=V[t.text];return a(),i.addEventListener("click",()=>{t.text=Math.max(0,t.text-1),a(),e()}),r.addEventListener("click",()=>{t.text=Math.min(3,t.text+1),a(),e()}),o.append(i,n,r),d("textSize",o)},lineSpacing:(t,e)=>d("lineSpacing",m("More spacing",()=>t.spacing,o=>t.spacing=o,e)),contrast:(t,e)=>d("contrast",G([{label:"Off",isActive:()=>t.contrast==="off",set:()=>t.contrast="off"},{label:"Boost",isActive:()=>t.contrast==="on",set:()=>t.contrast="on"},{label:"Dark",isActive:()=>t.contrast==="dark",set:()=>t.contrast="dark"}],e)),stopMotion:(t,e)=>d("stopMotion",m("Pause animations",()=>t.stopMotion,o=>t.stopMotion=o,e)),readingRuler:(t,e)=>d("readingRuler",m("Reading ruler",()=>t.ruler,o=>t.ruler=o,e)),highlightLinks:(t,e)=>d("highlightLinks",m("Highlight links",()=>t.links,o=>t.links=o,e)),bigCursor:(t,e)=>d("bigCursor",m("Big cursor",()=>t.cursor,o=>t.cursor=o,e))},X=t=>`
:host { all: initial; }
*, *::before, *::after { box-sizing: border-box; }
.mky-btn {
  position: fixed; z-index: 2147483647;
  width: 56px; height: 56px; border-radius: 50%;
  background: ${t}; color: #fff; border: none; cursor: pointer;
  display: grid; place-items: center;
  box-shadow: 0 10px 26px -8px rgba(0,0,0,.45), 0 2px 6px rgba(0,0,0,.18);
  transition: transform .18s cubic-bezier(.2,.8,.2,1), box-shadow .18s ease;
  -webkit-tap-highlight-color: transparent;
}
.mky-btn:hover { transform: scale(1.06); }
.mky-btn:active { transform: scale(.95); }
.mky-btn:focus-visible { outline: 3px solid #fff; outline-offset: 3px; }
.mky-btn svg { width: 28px; height: 28px; }

.mky-panel {
  position: fixed; z-index: 2147483647;
  width: 340px; max-width: calc(100vw - 24px);
  max-height: calc(100vh - 108px); overflow-y: auto;
  background: #fff; color: #0f172a;
  border-radius: 20px;
  border: 1px solid rgba(15,23,42,.08);
  box-shadow: 0 28px 64px -16px rgba(0,0,0,.32), 0 8px 24px -10px rgba(0,0,0,.2);
  font: 14px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, system-ui, sans-serif;
  opacity: 0; visibility: hidden; pointer-events: none;
  transform: translateY(10px) scale(.985);
  transition: opacity .2s ease, transform .2s cubic-bezier(.2,.8,.2,1), visibility .2s;
}
.mky-panel.open { opacity: 1; visibility: visible; pointer-events: auto; transform: none; }

.mky-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 16px 18px 14px; border-bottom: 1px solid rgba(15,23,42,.07); }
.mky-title { margin: 0; font-size: 15px; font-weight: 700; letter-spacing: -.01em; color: #0f172a; }
.mky-sub { margin: 2px 0 0; font-size: 12px; color: #64748b; }
.mky-close { width: 30px; height: 30px; flex: none; border: none; background: transparent; color: #64748b; border-radius: 9px; cursor: pointer; display: grid; place-items: center; transition: background .15s, color .15s; }
.mky-close:hover { background: #f1f5f9; color: #0f172a; }
.mky-close:focus-visible { outline: 2px solid ${t}; outline-offset: 1px; }
.mky-close svg { width: 18px; height: 18px; }

.mky-body { padding: 8px 10px; }
.mky-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 9px 8px; border-radius: 12px; transition: background .15s; }
.mky-row:hover { background: #f8fafc; }
.mky-label { display: flex; align-items: center; gap: 11px; font-weight: 500; color: #1e293b; }
.mky-label svg { width: 18px; height: 18px; color: #64748b; flex: none; }

.mky-switch { position: relative; width: 42px; height: 24px; flex: none; border: none; border-radius: 999px; background: #e2e8f0; cursor: pointer; padding: 0; transition: background .2s; }
.mky-switch::after { content: ""; position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.3); transition: transform .2s cubic-bezier(.2,.8,.2,1); }
.mky-switch[aria-pressed="true"] { background: ${t}; }
.mky-switch[aria-pressed="true"]::after { transform: translateX(18px); }
.mky-switch:focus-visible { outline: 2px solid ${t}; outline-offset: 2px; }

.mky-seg { display: inline-flex; background: #f1f5f9; border-radius: 11px; padding: 3px; gap: 2px; }
.mky-seg button { border: none; background: transparent; color: #475569; padding: 5px 11px; border-radius: 8px; cursor: pointer; font: inherit; font-weight: 500; transition: background .15s, color .15s; }
.mky-seg button[aria-pressed="true"] { background: #fff; color: ${t}; font-weight: 700; box-shadow: 0 1px 2px rgba(0,0,0,.12); }
.mky-seg button:focus-visible { outline: 2px solid ${t}; outline-offset: 1px; }

.mky-stepper { display: inline-flex; align-items: center; gap: 6px; }
.mky-step { width: 30px; height: 30px; flex: none; border: 1px solid #e2e8f0; border-radius: 9px; background: #fff; color: #1e293b; font: inherit; font-weight: 700; cursor: pointer; display: grid; place-items: center; transition: background .15s; }
.mky-step:hover { background: #f8fafc; }
.mky-step:focus-visible { outline: 2px solid ${t}; outline-offset: 1px; }
.mky-stepval { min-width: 46px; text-align: center; font-weight: 600; font-size: 13px; color: #475569; font-variant-numeric: tabular-nums; }

.mky-foot { padding: 12px 18px 16px; border-top: 1px solid rgba(15,23,42,.07); }
.mky-reset { width: 100%; padding: 9px; border: 1px solid #e2e8f0; border-radius: 11px; background: #fff; color: #334155; font: inherit; font-weight: 600; cursor: pointer; transition: background .15s; }
.mky-reset:hover { background: #f8fafc; }
.mky-reset:focus-visible { outline: 2px solid ${t}; outline-offset: 1px; }
.mky-note { margin: 11px 2px 0; font-size: 11px; line-height: 1.45; color: #94a3b8; text-align: center; }
.mky-brand { margin: 9px 0 0; font-size: 11px; color: #94a3b8; text-align: center; }
.mky-brand a { color: #64748b; text-decoration: none; font-weight: 600; }
.mky-brand a:hover { text-decoration: underline; }

@media (prefers-reduced-motion: reduce) { .mky-btn, .mky-panel, .mky-switch::after { transition: none !important; } }
`,q='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',T={"bottom-right":"bottom:16px; right:16px;","bottom-left":"bottom:16px; left:16px;","top-right":"top:16px; right:16px;","top-left":"top:16px; left:16px;"};function K(){let t=null;const e=o=>{t&&(t.style.top=`${o.clientY}px`)};return{on(){t||(t=document.createElement("div"),t.setAttribute("aria-hidden","true"),t.style.cssText="position:fixed;left:0;width:100vw;height:28px;background:rgba(0,0,0,.06);border-top:2px solid rgba(0,0,0,.45);border-bottom:2px solid rgba(0,0,0,.45);pointer-events:none;z-index:2147483646;transform:translateY(-14px);",document.body.appendChild(t),window.addEventListener("mousemove",e))},off(){window.removeEventListener("mousemove",e),t==null||t.remove(),t=null}}}function Z(t){var O,$;const e=document.createElement("div");e.id="makoya-widget-root";const o=e.attachShadow({mode:"open"});document.body.appendChild(e);const i=document.createElement("style");i.textContent=X(t.primaryColor),o.appendChild(i);const n=N(),r=K(),a=(O=T[t.position])!=null?O:T["bottom-right"],l=document.createElement("button");l.className="mky-btn",l.style.cssText=a,l.setAttribute("aria-label","Accessibility options"),l.setAttribute("aria-expanded","false"),l.innerHTML=($=L[t.launcherIcon])!=null?$:L.accessibility;const c=document.createElement("div");c.className="mky-panel",c.setAttribute("role","dialog"),c.setAttribute("aria-label","Accessibility options"),c.style.cssText=a,c.style.bottom=t.position.startsWith("bottom")?"84px":"",c.style.top=t.position.startsWith("top")?"84px":"";const k=()=>{B(n),n.ruler?r.on():r.off(),D(n)},v=document.createElement("div");v.className="mky-head";const R=document.createElement("div"),w=document.createElement("h2");w.className="mky-title",w.textContent="Accessibility";const E=document.createElement("p");E.className="mky-sub",E.textContent="Adjust this page to your needs",R.append(w,E);const p=document.createElement("button");p.className="mky-close",p.type="button",p.setAttribute("aria-label","Close"),p.innerHTML=q,v.append(R,p);const g=document.createElement("div");g.className="mky-body";const H=()=>{g.innerHTML="";for(const s of t.featuresEnabled){const j=J[s];j&&g.appendChild(j(n,k))}};H();const f=document.createElement("div");f.className="mky-foot";const h=document.createElement("button");h.className="mky-reset",h.type="button",h.textContent="Reset all",h.addEventListener("click",()=>{Object.assign(n,{text:0,spacing:!1,contrast:"off",stopMotion:!1,ruler:!1,links:!1,cursor:!1}),k(),H()});const C=document.createElement("p");if(C.className="mky-note",C.textContent="Changes affect your view only — they don't alter the website.",f.append(h,C),!t.hideBranding){const s=document.createElement("p");s.className="mky-brand",s.innerHTML=`Powered by <a href="${t.brandingUrl}" target="_blank" rel="noopener">Makoya</a>`,f.appendChild(s)}c.append(v,g,f);let S=!1;const M=s=>{S=s,c.classList.toggle("open",s),l.setAttribute("aria-expanded",String(s)),s?p.focus():l.focus()};l.addEventListener("click",()=>M(!S)),p.addEventListener("click",()=>M(!1)),o.addEventListener("keydown",s=>{s.key==="Escape"&&S&&M(!1)}),o.append(l,c),k()}let I=!1;function Q(){const t=()=>B(N()),e=o=>{const i=history[o];history[o]=function(...n){const r=i.apply(this,n);return setTimeout(t,50),r}};e("pushState"),e("replaceState"),window.addEventListener("popstate",()=>setTimeout(t,50))}function y(t){if(I||document.getElementById("makoya-widget-root"))return;I=!0;const e=P(t.siteId,t),o=()=>{Z(e),Q()};document.readyState==="loading"?document.addEventListener("DOMContentLoaded",o,{once:!0}):o()}return window.MakoyaWidget={init:y},function(){var e;try{const o=(e=document.currentScript)!=null?e:document.querySelector("script[data-site]");if(!o||o.hasAttribute("data-no-auto"))return;const i=o.dataset.site||"auto",n=o.dataset.color;y({siteId:i,...n?{primaryColor:n}:{}})}catch{}}(),b.init=y,Object.defineProperty(b,Symbol.toStringTag,{value:"Module"}),b}({});
