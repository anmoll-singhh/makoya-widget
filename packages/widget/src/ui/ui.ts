/**
 * ui.ts
 *
 * Launcher button + settings panel inside a Shadow DOM (CSS isolated).
 * First-class a11y: real <button>s, role="switch"/"group" + aria-pressed,
 * aria-modal dialog with a focus trap, Esc closes, focus management, and
 * prefers-reduced-motion respected.
 */

import { LAUNCHER_ICONS, type WidgetConfig, type FeatureKey } from "@makoya/shared";
import { Prefs, loadPrefs, savePrefs, applyPrefs, DEFAULT_PREFS } from "../core/state";

const ICON: Partial<Record<FeatureKey, string>> = {
  textSize: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg>`,
  lineSpacing: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>`,
  contrast: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/></svg>`,
  stopMotion: `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>`,
  readingRuler: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="9" width="18" height="6" rx="1.5"/><path d="M7.5 9v3M12 9v3M16.5 9v3"/></svg>`,
  highlightLinks: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.07 0l2-2a5 5 0 0 0-7.07-7.07l-1 1"/><path d="M14 11a5 5 0 0 0-7.07 0l-2 2A5 5 0 0 0 12 20.07l1-1"/></svg>`,
  bigCursor: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M5 3l6.5 17 2.2-7.3L21 10.5 5 3z"/></svg>`,
  readableFont: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 20l4-12 4 12M6.5 16h5M14 11c0-1.7 1.3-3 3-3s3 1.3 3 3v9"/></svg>`,
  hideImages: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 16l5-5 3 3M3 3l18 18"/></svg>`,
};

const LABELS: Partial<Record<FeatureKey, string>> = {
  textSize: "Text size",
  lineSpacing: "More spacing",
  contrast: "Contrast",
  stopMotion: "Pause animations",
  readingRuler: "Reading ruler",
  highlightLinks: "Highlight links",
  bigCursor: "Big cursor",
  readableFont: "Readable font",
  hideImages: "Hide images",
};

const TEXT_LEVELS = ["100%", "112%", "125%", "140%"];

interface Profile {
  label: string;
  icon: string;
  apply: (p: Prefs) => void;
}
const PROFILES: Profile[] = [
  {
    label: "Vision impaired",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>`,
    apply: (p) => { p.text = 2; p.contrast = "on"; p.font = true; },
  },
  {
    label: "Low vision",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.4 1.4M17.6 17.6L19 19M19 5l-1.4 1.4M6.4 17.6L5 19"/></svg>`,
    apply: (p) => { p.text = 3; p.contrast = "dark"; p.cursor = true; p.links = true; },
  },
  {
    label: "Dyslexia",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg>`,
    apply: (p) => { p.font = true; p.spacing = true; p.ruler = true; },
  },
  {
    label: "ADHD / Focus",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/></svg>`,
    apply: (p) => { p.ruler = true; p.stopMotion = true; p.images = true; },
  },
  {
    label: "Seizure safe",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3l8 3v6c0 4-3 7-8 9-5-2-8-5-8-9V6z"/></svg>`,
    apply: (p) => { p.stopMotion = true; p.contrast = "on"; },
  },
  {
    label: "Senior",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>`,
    apply: (p) => { p.text = 2; p.spacing = true; p.cursor = true; },
  },
];

function row(key: FeatureKey, control: HTMLElement): HTMLElement {
  const r = document.createElement("div");
  r.className = "mky-row";
  const lab = document.createElement("span");
  lab.className = "mky-label";
  lab.innerHTML = `${ICON[key] ?? ""}<span>${LABELS[key] ?? ""}</span>`;
  r.append(lab, control);
  return r;
}

function makeSwitch(label: string, isOn: () => boolean, set: (v: boolean) => void, onChange: () => void): HTMLElement {
  const b = document.createElement("button");
  b.className = "mky-switch";
  b.type = "button";
  b.setAttribute("role", "switch");
  b.setAttribute("aria-label", label);
  b.setAttribute("aria-pressed", String(isOn()));
  b.addEventListener("click", () => {
    set(!isOn());
    b.setAttribute("aria-pressed", String(isOn()));
    onChange();
  });
  return b;
}

function makeSeg(
  groupLabel: string,
  opts: { label: string; isActive: () => boolean; set: () => void }[],
  onChange: () => void
): HTMLElement {
  const seg = document.createElement("div");
  seg.className = "mky-seg";
  seg.setAttribute("role", "group");
  seg.setAttribute("aria-label", groupLabel);
  const btns: HTMLButtonElement[] = [];
  const paint = () => btns.forEach((b, i) => b.setAttribute("aria-pressed", String(opts[i].isActive())));
  opts.forEach((o) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = o.label;
    b.setAttribute("aria-pressed", String(o.isActive()));
    b.addEventListener("click", () => {
      o.set();
      paint();
      onChange();
    });
    btns.push(b);
    seg.appendChild(b);
  });
  return seg;
}

const FEATURES: Partial<Record<FeatureKey, (prefs: Prefs, onChange: () => void) => HTMLElement>> = {
  textSize: (prefs, onChange) => {
    const stepper = document.createElement("div");
    stepper.className = "mky-stepper";
    const dec = document.createElement("button");
    dec.className = "mky-step"; dec.type = "button"; dec.textContent = "A"; dec.style.fontSize = "12px";
    dec.setAttribute("aria-label", "Decrease text size");
    const val = document.createElement("span"); val.className = "mky-stepval";
    const inc = document.createElement("button");
    inc.className = "mky-step"; inc.type = "button"; inc.textContent = "A"; inc.style.fontSize = "17px";
    inc.setAttribute("aria-label", "Increase text size");
    const paint = () => (val.textContent = TEXT_LEVELS[prefs.text]);
    paint();
    dec.addEventListener("click", () => { prefs.text = Math.max(0, prefs.text - 1) as Prefs["text"]; paint(); onChange(); });
    inc.addEventListener("click", () => { prefs.text = Math.min(3, prefs.text + 1) as Prefs["text"]; paint(); onChange(); });
    stepper.append(dec, val, inc);
    return row("textSize", stepper);
  },
  lineSpacing: (prefs, onChange) =>
    row("lineSpacing", makeSwitch("More spacing", () => prefs.spacing, (v) => (prefs.spacing = v), onChange)),
  contrast: (prefs, onChange) =>
    row("contrast", makeSeg("Contrast mode", [
      { label: "Off", isActive: () => prefs.contrast === "off", set: () => (prefs.contrast = "off") },
      { label: "Boost", isActive: () => prefs.contrast === "on", set: () => (prefs.contrast = "on") },
      { label: "Dark", isActive: () => prefs.contrast === "dark", set: () => (prefs.contrast = "dark") },
    ], onChange)),
  stopMotion: (prefs, onChange) =>
    row("stopMotion", makeSwitch("Pause animations", () => prefs.stopMotion, (v) => (prefs.stopMotion = v), onChange)),
  readingRuler: (prefs, onChange) =>
    row("readingRuler", makeSwitch("Reading ruler", () => prefs.ruler, (v) => (prefs.ruler = v), onChange)),
  highlightLinks: (prefs, onChange) =>
    row("highlightLinks", makeSwitch("Highlight links", () => prefs.links, (v) => (prefs.links = v), onChange)),
  bigCursor: (prefs, onChange) =>
    row("bigCursor", makeSwitch("Big cursor", () => prefs.cursor, (v) => (prefs.cursor = v), onChange)),
  readableFont: (prefs, onChange) =>
    row("readableFont", makeSwitch("Readable font", () => prefs.font, (v) => (prefs.font = v), onChange)),
  hideImages: (prefs, onChange) =>
    row("hideImages", makeSwitch("Hide images", () => prefs.images, (v) => (prefs.images = v), onChange)),
};

const PANEL_CSS = (color: string) => `
:host { all: initial; }
*, *::before, *::after { box-sizing: border-box; }
.mky-btn {
  position: fixed; z-index: 2147483647;
  width: 56px; height: 56px; border-radius: 50%;
  background: ${color}; color: #fff; border: none; cursor: pointer;
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
  width: 348px; max-width: calc(100vw - 24px);
  max-height: calc(100vh - 108px); overflow-y: auto;
  background: #fff; color: #0f172a;
  border-radius: 20px; border: 1px solid rgba(15,23,42,.08);
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
.mky-close:focus-visible { outline: 2px solid ${color}; outline-offset: 1px; }
.mky-close svg { width: 18px; height: 18px; }

.mky-body { padding: 10px; }
.mky-sec-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: #94a3b8; margin: 4px 8px 9px; }
.mky-profiles { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.mky-chip { display: flex; align-items: center; gap: 9px; padding: 10px 11px; border: 1px solid #e2e8f0; border-radius: 13px; background: #fff; cursor: pointer; font: inherit; font-weight: 600; font-size: 13px; color: #334155; text-align: left; transition: border-color .15s, background .15s, transform .15s; }
.mky-chip:hover { border-color: ${color}; background: #f8fafc; transform: translateY(-1px); }
.mky-chip:focus-visible { outline: 2px solid ${color}; outline-offset: 1px; }
.mky-chip svg { width: 18px; height: 18px; color: ${color}; flex: none; }
.mky-divider { height: 1px; background: rgba(15,23,42,.07); margin: 14px 4px 6px; }

.mky-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 9px 8px; border-radius: 12px; transition: background .15s; }
.mky-row:hover { background: #f8fafc; }
.mky-label { display: flex; align-items: center; gap: 11px; font-weight: 500; color: #1e293b; }
.mky-label svg { width: 18px; height: 18px; color: #64748b; flex: none; }

.mky-switch { position: relative; width: 42px; height: 24px; flex: none; border: none; border-radius: 999px; background: #e2e8f0; cursor: pointer; padding: 0; transition: background .2s; }
.mky-switch::after { content: ""; position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.3); transition: transform .2s cubic-bezier(.2,.8,.2,1); }
.mky-switch[aria-pressed="true"] { background: ${color}; }
.mky-switch[aria-pressed="true"]::after { transform: translateX(18px); }
.mky-switch:focus-visible { outline: 2px solid ${color}; outline-offset: 2px; }

.mky-seg { display: inline-flex; background: #f1f5f9; border-radius: 11px; padding: 3px; gap: 2px; }
.mky-seg button { border: none; background: transparent; color: #475569; padding: 5px 11px; border-radius: 8px; cursor: pointer; font: inherit; font-weight: 500; transition: background .15s, color .15s; }
.mky-seg button[aria-pressed="true"] { background: #fff; color: ${color}; font-weight: 700; box-shadow: 0 1px 2px rgba(0,0,0,.12); }
.mky-seg button:focus-visible { outline: 2px solid ${color}; outline-offset: 1px; }

.mky-stepper { display: inline-flex; align-items: center; gap: 6px; }
.mky-step { width: 30px; height: 30px; flex: none; border: 1px solid #e2e8f0; border-radius: 9px; background: #fff; color: #1e293b; font: inherit; font-weight: 700; cursor: pointer; display: grid; place-items: center; transition: background .15s; }
.mky-step:hover { background: #f8fafc; }
.mky-step:focus-visible { outline: 2px solid ${color}; outline-offset: 1px; }
.mky-stepval { min-width: 46px; text-align: center; font-weight: 600; font-size: 13px; color: #475569; font-variant-numeric: tabular-nums; }

.mky-foot { padding: 12px 18px 16px; border-top: 1px solid rgba(15,23,42,.07); }
.mky-reset { width: 100%; padding: 9px; border: 1px solid #e2e8f0; border-radius: 11px; background: #fff; color: #334155; font: inherit; font-weight: 600; cursor: pointer; transition: background .15s; }
.mky-reset:hover { background: #f8fafc; }
.mky-reset:focus-visible { outline: 2px solid ${color}; outline-offset: 1px; }
.mky-note { margin: 11px 2px 0; font-size: 11px; line-height: 1.45; color: #64748b; text-align: center; }
.mky-brand { margin: 9px 0 0; font-size: 11px; color: #64748b; text-align: center; }
.mky-brand a { color: #475569; text-decoration: underline; font-weight: 600; }

@media (prefers-reduced-motion: reduce) { .mky-btn, .mky-panel, .mky-switch::after, .mky-chip { transition: none !important; } }
`;

const CLOSE_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>`;

const POSITIONS: Record<string, string> = {
  "bottom-right": "bottom:16px; right:16px;",
  "bottom-left": "bottom:16px; left:16px;",
  "top-right": "top:16px; right:16px;",
  "top-left": "top:16px; left:16px;",
};

/** Live reading ruler that follows the cursor. */
function makeRuler(): { on: () => void; off: () => void } {
  let el: HTMLDivElement | null = null;
  const move = (e: MouseEvent) => {
    if (el) el.style.top = `${e.clientY}px`;
  };
  return {
    on() {
      if (el) return;
      el = document.createElement("div");
      el.setAttribute("aria-hidden", "true");
      el.style.cssText =
        "position:fixed;left:0;width:100vw;height:28px;background:rgba(0,0,0,.06);border-top:2px solid rgba(0,0,0,.45);border-bottom:2px solid rgba(0,0,0,.45);pointer-events:none;z-index:2147483646;transform:translateY(-14px);";
      document.documentElement.appendChild(el);
      window.addEventListener("mousemove", move);
    },
    off() {
      window.removeEventListener("mousemove", move);
      el?.remove();
      el = null;
    },
  };
}

/** Mounts the full widget UI (self-contained). */
export function mountUI(config: WidgetConfig): void {
  const host = document.createElement("div");
  host.id = "makoya-widget-root";
  const shadow = host.attachShadow({ mode: "open" });
  // Mount on <html> (not body) so a page contrast/dark filter on body can't
  // re-anchor or hide the widget's fixed-position button/panel.
  document.documentElement.appendChild(host);

  const style = document.createElement("style");
  style.textContent = PANEL_CSS(config.primaryColor);
  shadow.appendChild(style);

  const prefs = loadPrefs();
  const ruler = makeRuler();
  const corner = POSITIONS[config.position] ?? POSITIONS["bottom-right"];

  const btn = document.createElement("button");
  btn.className = "mky-btn";
  btn.style.cssText = corner;
  btn.setAttribute("aria-label", "Accessibility options");
  btn.setAttribute("aria-expanded", "false");
  btn.innerHTML = LAUNCHER_ICONS[config.launcherIcon] ?? LAUNCHER_ICONS.accessibility;

  const panel = document.createElement("div");
  panel.className = "mky-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-label", "Accessibility options");
  panel.style.cssText = corner;
  panel.style.bottom = config.position.startsWith("bottom") ? "84px" : "";
  panel.style.top = config.position.startsWith("top") ? "84px" : "";

  const apply = () => {
    applyPrefs(prefs);
    prefs.ruler ? ruler.on() : ruler.off();
    savePrefs(prefs);
  };

  // header
  const head = document.createElement("div");
  head.className = "mky-head";
  const titleWrap = document.createElement("div");
  const h2 = document.createElement("h2");
  h2.className = "mky-title";
  h2.textContent = "Accessibility";
  const sub = document.createElement("p");
  sub.className = "mky-sub";
  sub.textContent = "Adjust this page to your needs";
  titleWrap.append(h2, sub);
  const close = document.createElement("button");
  close.className = "mky-close";
  close.type = "button";
  close.setAttribute("aria-label", "Close accessibility options");
  close.innerHTML = CLOSE_ICON;
  head.append(titleWrap, close);

  // body — profiles + features
  const body = document.createElement("div");
  body.className = "mky-body";

  function applyProfile(profile: Profile) {
    Object.assign(prefs, DEFAULT_PREFS);
    profile.apply(prefs);
    apply();
    renderBody();
  }

  function renderBody() {
    body.innerHTML = "";
    // Profiles
    const pLabel = document.createElement("div");
    pLabel.className = "mky-sec-label";
    pLabel.textContent = "Quick profiles";
    const grid = document.createElement("div");
    grid.className = "mky-profiles";
    for (const pr of PROFILES) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "mky-chip";
      chip.innerHTML = `${pr.icon}<span>${pr.label}</span>`;
      chip.addEventListener("click", () => applyProfile(pr));
      grid.appendChild(chip);
    }
    const divider = document.createElement("div");
    divider.className = "mky-divider";
    body.append(pLabel, grid, divider);
    // Individual controls (only the ones this site enabled, in order)
    for (const key of config.featuresEnabled) {
      const build = FEATURES[key];
      if (build) body.appendChild(build(prefs, apply));
    }
  }
  renderBody();

  // footer
  const foot = document.createElement("div");
  foot.className = "mky-foot";
  const reset = document.createElement("button");
  reset.className = "mky-reset";
  reset.type = "button";
  reset.textContent = "Reset all";
  reset.addEventListener("click", () => {
    Object.assign(prefs, DEFAULT_PREFS);
    apply();
    renderBody();
  });
  const note = document.createElement("p");
  note.className = "mky-note";
  note.textContent = "Changes affect your view only — they don't alter the website.";
  foot.append(reset, note);
  if (!config.hideBranding) {
    const brand = document.createElement("p");
    brand.className = "mky-brand";
    brand.innerHTML = `Powered by <a href="${config.brandingUrl}" target="_blank" rel="noopener">Makoya</a>`;
    foot.appendChild(brand);
  }

  panel.append(head, body, foot);

  // open/close + focus management + focus trap
  let open = false;
  const setOpen = (v: boolean) => {
    open = v;
    panel.classList.toggle("open", v);
    btn.setAttribute("aria-expanded", String(v));
    if (v) close.focus();
    else btn.focus();
  };
  btn.addEventListener("click", () => setOpen(!open));
  close.addEventListener("click", () => setOpen(false));
  shadow.addEventListener("keydown", (e) => {
    const ev = e as KeyboardEvent;
    if (!open) return;
    if (ev.key === "Escape") {
      setOpen(false);
      return;
    }
    if (ev.key === "Tab") {
      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>('button, a[href], [tabindex]:not([tabindex="-1"])')
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = shadow.activeElement as HTMLElement | null;
      if (ev.shiftKey && active === first) {
        ev.preventDefault();
        last.focus();
      } else if (!ev.shiftKey && active === last) {
        ev.preventDefault();
        first.focus();
      }
    }
  });

  shadow.append(btn, panel);
  apply();
}
