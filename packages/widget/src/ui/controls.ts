/**
 * ui/controls.ts
 *
 * Primitive UI controls for the accessibility widget panel.
 * All controls live inside a Shadow DOM — no host page DOM is touched here.
 *
 * Exported helpers:
 *   makeSwitch        — accessible toggle button (role=switch, aria-pressed)
 *   makeSeg           — segmented control (role=group, aria-pressed per option)
 *   makeStepper       — +/– numeric stepper (continuous range)
 *   makeDiscreteStepper — +/– stepper over a fixed list of {value,label} items
 *   makeColorPalette  — swatch color-picker (role=group, aria-pressed per swatch)
 *   row               — icon + label + control layout row
 *
 * CSS class contract (must match PANEL_CSS in ui.ts):
 *   .mky-row      .mky-label
 *   .mky-switch
 *   .mky-seg
 *   .mky-stepper  .mky-step  .mky-stepval
 *   .mky-palette  .mky-palette-label  .mky-swatch
 */

import type { Lang } from "./i18n";
import { t } from "./i18n";

// ---------------------------------------------------------------------------
// row
// ---------------------------------------------------------------------------

/**
 * Wraps an icon SVG, a text label, and a control into a single `.mky-row` div.
 * Intentionally decoupled from FeatureKey — callers pass plain strings so this
 * module has no dependency on the features map.
 */
export function row(
  iconSvg: string,
  label: string,
  control: HTMLElement
): HTMLElement {
  const r = document.createElement("div");
  r.className = "mky-row";

  const lab = document.createElement("span");
  lab.className = "mky-label";
  // Inline SVG then text node — keeps it accessible (SVG is decorative, text
  // carries the label meaning).
  lab.innerHTML = iconSvg;
  const txt = document.createElement("span");
  txt.textContent = label;
  lab.appendChild(txt);

  r.append(lab, control);
  return r;
}

// ---------------------------------------------------------------------------
// makeSwitch
// ---------------------------------------------------------------------------

/**
 * Creates an accessible toggle button.
 *
 * @param label     - Visible / aria-label text for the toggle.
 * @param isOn      - Current boolean state at creation time.
 * @param set       - Setter called with the new value when the user clicks.
 * @param onChange  - Side-effect callback (apply + save prefs, re-render, …).
 *
 * The button tracks its own pressed state via `aria-pressed` so screen readers
 * announce the new state on each click. The caller owns the source-of-truth
 * (prefs object); `set` writes back to it.
 */
export function makeSwitch(
  label: string,
  isOn: boolean,
  set: (v: boolean) => void,
  onChange: () => void
): HTMLElement {
  const b = document.createElement("button");
  b.className = "mky-switch";
  b.type = "button";
  b.setAttribute("role", "switch");
  b.setAttribute("aria-label", label);
  b.setAttribute("aria-pressed", String(isOn));

  b.addEventListener("click", () => {
    // Read the current pressed state from the DOM so we stay in sync even if
    // the caller's pref object was mutated externally.
    const current = b.getAttribute("aria-pressed") === "true";
    const next = !current;
    set(next);
    b.setAttribute("aria-pressed", String(next));
    onChange();
  });

  return b;
}

// ---------------------------------------------------------------------------
// makeSeg
// ---------------------------------------------------------------------------

/**
 * Creates a segmented control (radio-style button group).
 *
 * @param groupLabel - Accessible label for the whole group (aria-label on the
 *                     container).
 * @param opts       - Array of `{ value, label }` — the selectable options.
 * @param current    - The currently-selected value.
 * @param set        - Setter called with the chosen value on click.
 * @param onChange   - Side-effect callback (apply + save prefs, …).
 *
 * Each option button carries `aria-pressed` so the group behaves as a set of
 * mutually-exclusive toggle buttons rather than a true `<select>`, giving
 * better touch UX while remaining accessible.
 */
export function makeSeg(
  groupLabel: string,
  opts: { value: string; label: string }[],
  current: string,
  set: (v: string) => void,
  onChange: () => void
): HTMLElement {
  const seg = document.createElement("div");
  seg.className = "mky-seg";
  seg.setAttribute("role", "group");
  seg.setAttribute("aria-label", groupLabel);

  const btns: HTMLButtonElement[] = [];

  const paint = (selected: string) =>
    btns.forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.val === selected))
    );

  for (const opt of opts) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = opt.label;
    b.dataset.val = opt.value;
    b.setAttribute("aria-pressed", String(opt.value === current));

    b.addEventListener("click", () => {
      set(opt.value);
      paint(opt.value);
      onChange();
    });

    btns.push(b);
    seg.appendChild(b);
  }

  return seg;
}

// ---------------------------------------------------------------------------
// makeStepper
// ---------------------------------------------------------------------------

/**
 * Creates a numeric stepper: [–] [value] [+].
 *
 * @param lang     - Active language for translated aria-labels ("Decrease …" /
 *                   "Increase …" via i18n keys "decrease" and "increase").
 * @param label    - Accessible base label appended to the direction word.
 * @param current  - Starting numeric value.
 * @param min      - Inclusive lower bound.
 * @param max      - Inclusive upper bound.
 * @param step     - Increment / decrement amount.
 * @param set      - Setter called with the new value after clamping.
 * @param onChange - Side-effect callback.
 *
 * CSS class contract: `.mky-stepper` (wrapper), `.mky-step` (+/– buttons),
 * `.mky-stepval` (display span).
 */
export function makeStepper(
  lang: Lang,
  label: string,
  current: number,
  min: number,
  max: number,
  step: number,
  set: (v: number) => void,
  onChange: () => void
): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.className = "mky-stepper";

  const dec = document.createElement("button");
  dec.className = "mky-step";
  dec.type = "button";
  dec.textContent = "−";
  dec.setAttribute("aria-label", `${t(lang, "decrease")} ${label}`);

  const val = document.createElement("span");
  val.className = "mky-stepval";
  // Polite live region so AT announces the new value after each +/- press.
  val.setAttribute("role", "status");
  val.setAttribute("aria-live", "polite");

  const inc = document.createElement("button");
  inc.className = "mky-step";
  inc.type = "button";
  inc.textContent = "+";
  inc.setAttribute("aria-label", `${t(lang, "increase")} ${label}`);

  // Track internally so we don't need a closure over an external variable.
  let value = current;

  const paint = () => {
    val.textContent = `${value}%`;
    dec.disabled = value <= min;
    inc.disabled = value >= max;
  };
  paint();

  dec.addEventListener("click", () => {
    if (value <= min) return;
    value = Math.max(min, value - step);
    set(value);
    paint();
    onChange();
  });

  inc.addEventListener("click", () => {
    if (value >= max) return;
    value = Math.min(max, value + step);
    set(value);
    paint();
    onChange();
  });

  wrapper.append(dec, val, inc);
  return wrapper;
}

// ---------------------------------------------------------------------------
// makeDiscreteStepper
// ---------------------------------------------------------------------------

/**
 * Creates a discrete stepper that steps through a fixed list of labelled
 * levels: [–] [label] [+].
 *
 * Unlike `makeStepper` (which operates over a continuous numeric range),
 * this variant only ever displays labels that correspond to actually-applied
 * states, so there is never a mismatch between what the display shows and
 * what the effect applies.
 *
 * @param lang         - Active language for translated aria-labels.
 * @param groupLabel   - Accessible label for the stepper (base for aria-labels).
 * @param levels       - Ordered list of `{ label }` entries, index = level index.
 * @param currentIndex - Index of the currently-active level (0-based).
 * @param setIndex     - Called with the new index when the user steps.
 * @param onChange     - Side-effect callback (apply + save prefs, re-render, …).
 *
 * CSS class contract: `.mky-stepper` (wrapper), `.mky-step` (+/– buttons),
 * `.mky-stepval` (display span). Identical to `makeStepper` so the same CSS
 * styles both.
 */
export function makeDiscreteStepper(
  lang: Lang,
  groupLabel: string,
  levels: { label: string }[],
  currentIndex: number,
  setIndex: (i: number) => void,
  onChange: () => void
): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.className = "mky-stepper";

  const dec = document.createElement("button");
  dec.className = "mky-step";
  dec.type = "button";
  dec.textContent = "−";
  dec.setAttribute("aria-label", `${t(lang, "decrease")} ${groupLabel}`);

  const val = document.createElement("span");
  val.className = "mky-stepval";
  // Polite live region so AT announces the new value after each +/- press.
  val.setAttribute("role", "status");
  val.setAttribute("aria-live", "polite");

  const inc = document.createElement("button");
  inc.className = "mky-step";
  inc.type = "button";
  inc.textContent = "+";
  inc.setAttribute("aria-label", `${t(lang, "increase")} ${groupLabel}`);

  let idx = Math.max(0, Math.min(levels.length - 1, currentIndex));

  const paint = () => {
    // The displayed label is always exactly the label for the current index —
    // there is no interpolated or continuous value that could diverge.
    val.textContent = levels[idx].label;
    dec.disabled = idx <= 0;
    inc.disabled = idx >= levels.length - 1;
  };
  paint();

  dec.addEventListener("click", () => {
    if (idx <= 0) return;
    idx -= 1;
    setIndex(idx);
    paint();
    onChange();
  });

  inc.addEventListener("click", () => {
    if (idx >= levels.length - 1) return;
    idx += 1;
    setIndex(idx);
    paint();
    onChange();
  });

  wrapper.append(dec, val, inc);
  return wrapper;
}

// ---------------------------------------------------------------------------
// makeColorPalette
// ---------------------------------------------------------------------------

/**
 * Creates a color swatch palette (role=group, aria-pressed per swatch).
 *
 * @param groupLabel - Accessible label for the group + prefix in swatch labels.
 * @param current    - The currently-selected color value.
 * @param swatches   - Array of `{ value, name }` — one circular swatch button
 *                     per entry.  `value` is used as the button's background
 *                     color and as the value passed to `set`.
 * @param set        - Setter called with the chosen value when a swatch is clicked.
 * @param onChange   - Side-effect callback (apply + save prefs, …).
 *
 * CSS class contract: `.mky-palette` (wrapper), `.mky-palette-label` (label
 * span), `.mky-swatch` (each circular swatch button).
 */
export function makeColorPalette(
  groupLabel: string,
  current: string,
  swatches: { value: string; name: string }[],
  set: (v: string) => void,
  onChange: () => void
): HTMLElement {
  const palette = document.createElement("div");
  palette.className = "mky-palette";
  palette.setAttribute("role", "group");
  palette.setAttribute("aria-label", groupLabel);

  const labelEl = document.createElement("span");
  labelEl.className = "mky-palette-label";
  labelEl.textContent = groupLabel;
  palette.appendChild(labelEl);

  const btns: HTMLButtonElement[] = [];

  function repaint(selectedValue: string): void {
    btns.forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.swatchValue === selectedValue))
    );
  }

  for (const swatch of swatches) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = swatch.value ? "mky-swatch" : "mky-swatch mky-swatch-off";
    btn.style.background = swatch.value || "#ffffff";
    btn.dataset.swatchValue = swatch.value;
    btn.setAttribute("aria-label", `${groupLabel}: ${swatch.name}`);
    btn.setAttribute("aria-pressed", String(swatch.value === current));

    btn.addEventListener("click", () => {
      set(swatch.value);
      repaint(swatch.value);
      onChange();
    });

    btns.push(btn);
    palette.appendChild(btn);
  }

  return palette;
}

// ---------------------------------------------------------------------------
// makeSelect
// ---------------------------------------------------------------------------

/**
 * A native <select> styled to look minimal/modern. Replaces makeSeg for
 * single-choice enum features (contrast, saturation, text-align, …). Native
 * gives full keyboard (type-ahead, arrows, Home/End, Esc), correct screen-reader
 * announcement, and the OS mobile picker — for free, and it can't break inside
 * Shadow DOM. We only style the CLOSED control (all the user ever sees).
 *
 * CSS class contract: `.mky-select`.
 */
export function makeSelect(
  groupLabel: string,
  opts: { value: string; label: string }[],
  current: string,
  set: (v: string) => void,
  onChange: () => void
): HTMLElement {
  const sel = document.createElement("select");
  sel.className = "mky-select";
  sel.setAttribute("aria-label", groupLabel);

  for (const opt of opts) {
    const o = document.createElement("option");
    o.value = opt.value;
    o.textContent = opt.label;
    if (opt.value === current) o.selected = true;
    sel.appendChild(o);
  }

  sel.addEventListener("change", () => {
    set(sel.value);
    onChange();
  });

  return sel;
}

// ---------------------------------------------------------------------------
// makeColorInput
// ---------------------------------------------------------------------------

const CLEAR_ICON =
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>`;

/**
 * Color control: a styled native `<input type="color">` swatch (the native
 * picker INCLUDES an eyedropper on Chromium/Firefox/Safari-iOS, for free) +
 * a hex text field for manual entry/paste + a clear button for the "off" state.
 * Three real native inputs — no ARIA gymnastics, fully accessible.
 *
 * value contract: "" = off (no override), otherwise "#RRGGBB".
 *
 * CSS class contract: `.mky-color` (group), `.mky-swatch-wrap`,
 * `.mky-color-input`, `.mky-hex`, `.mky-color-clear`; off state via the group's
 * `data-off="true"`.
 */
export function makeColorInput(
  label: string,
  current: string,
  set: (v: string) => void,
  onChange: () => void,
  clearLabel: string
): HTMLElement {
  const FALLBACK = "#000000";
  const HEX_RE = /^#?[0-9a-fA-F]{6}$/;
  const norm = (v: string) => (v[0] === "#" ? v : "#" + v).toUpperCase();

  const group = document.createElement("div");
  group.className = "mky-color";
  group.setAttribute("role", "group");
  group.setAttribute("aria-label", label);
  group.dataset.off = String(!current);

  const swatchWrap = document.createElement("span");
  swatchWrap.className = "mky-swatch-wrap";

  const swatch = document.createElement("input");
  swatch.type = "color";
  swatch.className = "mky-color-input";
  swatch.value = current || FALLBACK;
  swatch.setAttribute("aria-label", label);
  swatchWrap.appendChild(swatch);

  const hex = document.createElement("input");
  hex.type = "text";
  hex.className = "mky-hex";
  hex.maxLength = 7;
  hex.spellcheck = false;
  hex.autocapitalize = "none";
  hex.placeholder = "#000000";
  hex.value = current ? current.toUpperCase() : "";
  hex.setAttribute("aria-label", `${label} hex`);

  const clear = document.createElement("button");
  clear.type = "button";
  clear.className = "mky-color-clear";
  clear.setAttribute("aria-label", clearLabel);
  clear.innerHTML = CLEAR_ICON;

  const commit = (v: string) => { group.dataset.off = "false"; set(v); onChange(); };
  const off = () => { group.dataset.off = "true"; swatch.value = FALLBACK; set(""); onChange(); };

  // Native picker / drag / eyedropper → fires "input".
  swatch.addEventListener("input", () => {
    const v = swatch.value.toUpperCase();
    hex.value = v;
    hex.classList.remove("mky-hex-bad");
    commit(v);
  });

  // Typed/pasted hex — commit live only when valid.
  hex.addEventListener("input", () => {
    const raw = hex.value.trim();
    if (raw === "") return; // resolved on blur
    if (HEX_RE.test(raw)) {
      const v = norm(raw);
      swatch.value = v;
      hex.classList.remove("mky-hex-bad");
      commit(v);
    } else {
      hex.classList.add("mky-hex-bad");
    }
  });

  // Blur resolves edge cases: empty → off; invalid → revert.
  hex.addEventListener("blur", () => {
    const raw = hex.value.trim();
    if (raw === "") {
      hex.value = "";
      off();
    } else if (!HEX_RE.test(raw)) {
      hex.classList.remove("mky-hex-bad");
      hex.value = group.dataset.off === "true" ? "" : swatch.value.toUpperCase();
    }
  });

  clear.addEventListener("click", () => { hex.value = ""; off(); });

  group.append(swatchWrap, hex, clear);
  return group;
}
