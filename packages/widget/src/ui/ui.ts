/**
 * ui.ts
 *
 * Builds the launcher button + settings panel inside a Shadow DOM root.
 * Shadow DOM = an isolated mini-document: the host site's CSS can't leak in
 * and break our panel, and our CSS can't leak out and break their site.
 *
 * Accessibility of the widget itself matters (a lot of widgets fail here):
 * the button is a real <button>, the panel toggles are real controls with
 * aria-pressed, Esc closes, focus moves into the panel on open and back to
 * the button on close.
 */

import { LAUNCHER_ICONS, type WidgetConfig, type FeatureKey } from "@makoya/shared";
import { Prefs, loadPrefs, savePrefs, applyPrefs } from "../core/state";

interface FeatureMeta {
  key: FeatureKey;
  label: string;
  /** Renders the control for this feature and wires it to prefs. */
  render: (prefs: Prefs, onChange: () => void) => HTMLElement;
}

/** Builds a simple on/off toggle button with aria-pressed. */
function toggle(
  label: string,
  isOn: () => boolean,
  set: (v: boolean) => void,
  onChange: () => void
): HTMLElement {
  const btn = document.createElement("button");
  btn.className = "mky-toggle";
  btn.type = "button";
  btn.textContent = label;
  btn.setAttribute("aria-pressed", String(isOn()));
  btn.addEventListener("click", () => {
    set(!isOn());
    btn.setAttribute("aria-pressed", String(isOn()));
    onChange();
  });
  return btn;
}

const FEATURES: Record<FeatureKey, FeatureMeta> = {
  textSize: {
    key: "textSize",
    label: "Text size",
    render: (prefs, onChange) => {
      const wrap = document.createElement("div");
      wrap.className = "mky-row";
      const lbl = document.createElement("span");
      lbl.textContent = "Text size";
      const dec = document.createElement("button");
      dec.className = "mky-step";
      dec.type = "button";
      dec.textContent = "A−";
      dec.setAttribute("aria-label", "Decrease text size");
      const inc = document.createElement("button");
      inc.className = "mky-step";
      inc.type = "button";
      inc.textContent = "A+";
      inc.setAttribute("aria-label", "Increase text size");
      dec.addEventListener("click", () => {
        prefs.text = Math.max(0, prefs.text - 1) as Prefs["text"];
        onChange();
      });
      inc.addEventListener("click", () => {
        prefs.text = Math.min(3, prefs.text + 1) as Prefs["text"];
        onChange();
      });
      wrap.append(lbl, dec, inc);
      return wrap;
    },
  },
  lineSpacing: {
    key: "lineSpacing",
    label: "More spacing",
    render: (prefs, onChange) =>
      toggle("More spacing", () => prefs.spacing, (v) => (prefs.spacing = v), onChange),
  },
  contrast: {
    key: "contrast",
    label: "Contrast",
    render: (prefs, onChange) => {
      const wrap = document.createElement("div");
      wrap.className = "mky-row";
      const lbl = document.createElement("span");
      lbl.textContent = "Contrast";
      const cycle = document.createElement("button");
      cycle.className = "mky-toggle";
      cycle.type = "button";
      const labels = { off: "Off", on: "Boost", dark: "Dark" } as const;
      const paint = () => (cycle.textContent = labels[prefs.contrast]);
      paint();
      cycle.addEventListener("click", () => {
        prefs.contrast =
          prefs.contrast === "off" ? "on" : prefs.contrast === "on" ? "dark" : "off";
        paint();
        onChange();
      });
      wrap.append(lbl, cycle);
      return wrap;
    },
  },
  stopMotion: {
    key: "stopMotion",
    label: "Stop motion",
    render: (prefs, onChange) =>
      toggle("Stop animations", () => prefs.stopMotion, (v) => (prefs.stopMotion = v), onChange),
  },
  readingRuler: {
    key: "readingRuler",
    label: "Reading ruler",
    render: (prefs, onChange) =>
      toggle("Reading ruler", () => prefs.ruler, (v) => (prefs.ruler = v), onChange),
  },
  highlightLinks: {
    key: "highlightLinks",
    label: "Highlight links",
    render: (prefs, onChange) =>
      toggle("Highlight links", () => prefs.links, (v) => (prefs.links = v), onChange),
  },
  bigCursor: {
    key: "bigCursor",
    label: "Big cursor",
    render: (prefs, onChange) =>
      toggle("Big cursor", () => prefs.cursor, (v) => (prefs.cursor = v), onChange),
  },
};

const PANEL_CSS = (color: string) => `
:host { all: initial; }
.mky-btn {
  position: fixed; z-index: 2147483647;
  width: 52px; height: 52px; border-radius: 50%;
  background: ${color}; color: #fff; border: none; cursor: pointer;
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
.mky-toggle[aria-pressed="true"] { background: ${color}; color: #fff; border-color: ${color}; }
.mky-toggle:focus-visible, .mky-step:focus-visible { outline: 2px solid ${color}; outline-offset: 2px; }
.mky-reset { width: 100%; margin-top: 10px; padding: 8px; border: none; border-radius: 8px; background: #111; color: #fff; cursor: pointer; font: inherit; }
.mky-brand { margin-top: 10px; font-size: 11px; color: #6b7280; text-align: center; }
.mky-brand a { color: #6b7280; }
.mky-note { font-size: 11px; color: #6b7280; margin: 8px 0 0; }
@media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
`;

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
        "position:fixed;left:0;width:100vw;height:28px;background:rgba(0,0,0,.08);border-top:2px solid rgba(0,0,0,.4);border-bottom:2px solid rgba(0,0,0,.4);pointer-events:none;z-index:2147483646;transform:translateY(-14px);";
      document.body.appendChild(el);
      window.addEventListener("mousemove", move);
    },
    off() {
      window.removeEventListener("mousemove", move);
      el?.remove();
      el = null;
    },
  };
}

/** Mounts the full widget UI and returns nothing (self-contained). */
export function mountUI(config: WidgetConfig): void {
  const host = document.createElement("div");
  host.id = "makoya-widget-root";
  const shadow = host.attachShadow({ mode: "open" });
  document.body.appendChild(host);

  const style = document.createElement("style");
  style.textContent = PANEL_CSS(config.primaryColor);
  shadow.appendChild(style);

  const prefs = loadPrefs();
  const ruler = makeRuler();

  // Launcher button
  const btn = document.createElement("button");
  btn.className = "mky-btn";
  btn.style.cssText = POSITIONS[config.position] ?? POSITIONS["bottom-right"];
  btn.setAttribute("aria-label", "Accessibility options");
  btn.setAttribute("aria-expanded", "false");
  btn.innerHTML = LAUNCHER_ICONS[config.launcherIcon] ?? LAUNCHER_ICONS.accessibility;

  // Panel
  const panel = document.createElement("div");
  panel.className = "mky-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Accessibility options");
  panel.style.cssText = POSITIONS[config.position] ?? POSITIONS["bottom-right"];
  // nudge the panel above the button
  panel.style.bottom = config.position.startsWith("bottom") ? "80px" : "";
  panel.style.top = config.position.startsWith("top") ? "80px" : "";

  const heading = document.createElement("h2");
  heading.textContent = "Accessibility options";
  panel.appendChild(heading);

  const apply = () => {
    applyPrefs(prefs);
    prefs.ruler ? ruler.on() : ruler.off();
    savePrefs(prefs);
  };

  // Render only the features this site enabled, in order.
  for (const key of config.featuresEnabled) {
    const meta = FEATURES[key];
    if (meta) panel.appendChild(meta.render(prefs, apply));
  }

  const reset = document.createElement("button");
  reset.className = "mky-reset";
  reset.type = "button";
  reset.textContent = "Reset all";
  reset.addEventListener("click", () => {
    Object.assign(prefs, {
      text: 0, spacing: false, contrast: "off", stopMotion: false,
      ruler: false, links: false, cursor: false,
    });
    apply();
    // re-render toggle states cheaply by reloading the panel
    rebuild();
  });
  panel.appendChild(reset);

  const note = document.createElement("p");
  note.className = "mky-note";
  note.textContent = "Adjusts your view only. It does not change the website's code.";
  panel.appendChild(note);

  if (!config.hideBranding) {
    const brand = document.createElement("p");
    brand.className = "mky-brand";
    brand.innerHTML = `Powered by <a href="${config.brandingUrl}" target="_blank" rel="noopener">Makoya</a>`;
    panel.appendChild(brand);
  }

  // Open/close logic with focus management
  let open = false;
  const setOpen = (v: boolean) => {
    open = v;
    panel.classList.toggle("open", v);
    btn.setAttribute("aria-expanded", String(v));
    if (v) (panel.querySelector("button") as HTMLButtonElement)?.focus();
    else btn.focus();
  };
  btn.addEventListener("click", () => setOpen(!open));
  shadow.addEventListener("keydown", (e) => {
    if ((e as KeyboardEvent).key === "Escape" && open) setOpen(false);
  });

  // Rebuild panel contents (used after Reset) without remounting host.
  function rebuild() {
    // Re-sync aria-pressed by re-rendering feature controls.
    const heading2 = panel.querySelector("h2");
    panel.innerHTML = "";
    if (heading2) panel.appendChild(heading2);
    for (const key of config.featuresEnabled) {
      const meta = FEATURES[key];
      if (meta) panel.appendChild(meta.render(prefs, apply));
    }
    panel.appendChild(reset);
    panel.appendChild(note);
    if (!config.hideBranding) {
      const brand = document.createElement("p");
      brand.className = "mky-brand";
      brand.innerHTML = `Powered by <a href="${config.brandingUrl}" target="_blank" rel="noopener">Makoya</a>`;
      panel.appendChild(brand);
    }
  }

  shadow.append(btn, panel);

  // Apply saved prefs immediately on load.
  apply();
}
