/**
 * ui/ui.ts
 *
 * Slim orchestrator — assembles the Makoya accessibility widget UI by wiring
 * together all of the focused sub-modules:
 *
 *   styles.ts   → PANEL_CSS, LAUNCHER_SIZES
 *   i18n.ts     → Lang, LANG_LABELS, StringKey, t()
 *   controls.ts → makeSwitch, makeSeg, makeStepper, row  (used by features.ts)
 *   features.ts → ICON, buildFeature()
 *   profiles.ts → Profile, PROFILES, applyProfileByKey()
 *   live.ts     → makeRuler, makeMask, makeReadAloud, makeMute
 *
 * This file creates and mounts the host element + Shadow DOM, builds all DOM
 * structure (launcher, panel, header, body sections, footer), wires event
 * listeners, and exposes the single apply() callback that is the source of
 * truth for syncing prefs to the page and to live controllers.
 *
 * Non-negotiable widget rules honoured here:
 *   1. Always render with fallback — every external call is guarded; this
 *      function never throws.
 *   2. Effects via attributes + ONE stylesheet only (effects.ts + live.ts) —
 *      no host-DOM rewriting.
 *   3. Widget UI lives in Shadow DOM (host attached to <html>, not body).
 *   4. Widget is itself fully accessible: real <button>s, role=switch/group
 *      from the control helpers, aria-modal, focus trap, Esc, focus return.
 *   5. Language change re-renders labels without breaking open state or focus
 *      trap.
 */

import { LAUNCHER_ICONS, type WidgetConfig } from "@makoya/shared";
import { type Prefs, DEFAULT_PREFS, loadPrefs, savePrefs, applyPrefs, STORAGE_KEY } from "../core/state";
import { PANEL_CSS } from "./styles";
import { type Lang, LANG_LABELS, t } from "./i18n";
import { buildFeature } from "./features";
import { PROFILES, applyProfileByKey } from "./profiles";
import { makeRuler, makeMask, makeReadAloud, makeMute } from "./live";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LANG_STORAGE_KEY = "makoya_lang";

const CLOSE_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>`;

/** Corner positioning for the launcher button and desktop panel. */
const POSITIONS: Record<string, string> = {
  "bottom-right": "bottom:16px; right:16px;",
  "bottom-left":  "bottom:16px; left:16px;",
  "top-right":    "top:16px;    right:16px;",
  "top-left":     "top:16px;    left:16px;",
};

/**
 * FeatureKey → section key mapping.
 * Controls which section each feature renders into.
 * Keys not listed here are silently skipped (forward-compat safety).
 */
const FEATURE_SECTION: Record<string, "sec_content" | "sec_color" | "sec_nav" | "sec_audio"> = {
  textSize:        "sec_content",
  lineSpacing:     "sec_content",
  readableFont:    "sec_content",
  textAlign:       "sec_content",
  highlightTitles: "sec_content",
  highlightLinks:  "sec_content",
  hideImages:      "sec_content",
  stopMotion:      "sec_content",
  contrast:        "sec_color",
  saturation:      "sec_color",
  readingRuler:    "sec_nav",
  readingMask:     "sec_nav",
  bigCursor:       "sec_nav",
  muteSounds:      "sec_audio",
  readAloud:       "sec_audio",
};

/** Display order of sections (only rendered when they have enabled features). */
const SECTION_ORDER = ["sec_content", "sec_color", "sec_nav", "sec_audio"] as const;
type SectionKey = typeof SECTION_ORDER[number];

// ---------------------------------------------------------------------------
// Helper: resolve persisted language or fall back to config default
// ---------------------------------------------------------------------------

function resolveInitialLang(configDefault: Lang): Lang {
  try {
    const stored = localStorage.getItem(LANG_STORAGE_KEY);
    if (stored && (stored === "en" || stored === "es" || stored === "fr" || stored === "de")) {
      return stored as Lang;
    }
  } catch {
    /* localStorage unavailable — use config default */
  }
  return configDefault;
}

function persistLang(lang: Lang): void {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    /* ignore — privacy mode */
  }
}

// ---------------------------------------------------------------------------
// mountUI — the single public export
// ---------------------------------------------------------------------------

/**
 * Mounts the full accessibility widget UI (launcher + panel) into a Shadow DOM
 * host appended to `document.documentElement`. Safe to call once per page load;
 * `core/index.ts` guards against double-init via `document.getElementById`.
 */
export function mountUI(config: WidgetConfig): void {
  try {
    _mount(config);
  } catch {
    /* auto-init must NEVER throw — swallow any unexpected errors */
  }
}

function _mount(config: WidgetConfig): void {
  // ─── Host + Shadow DOM ──────────────────────────────────────────────────
  const host = document.createElement("div");
  host.id = "makoya-widget-root"; // read-aloud controller's click-guard depends on this ID
  const shadow = host.attachShadow({ mode: "open" });
  // Mount on <html> — contrast/dark filter applies to <body>, keeping the
  // fixed widget positioned relative to the viewport, not inside the filter.
  document.documentElement.appendChild(host);

  // ─── Stylesheet ─────────────────────────────────────────────────────────
  const style = document.createElement("style");
  style.textContent = PANEL_CSS(config.primaryColor, config.launcherSize);
  shadow.appendChild(style);

  // ─── Language ───────────────────────────────────────────────────────────
  // Single mutable cell so setLang() can update it without closing over a const.
  let lang: Lang = resolveInitialLang(config.defaultLanguage as Lang);

  // ─── Prefs ──────────────────────────────────────────────────────────────
  // Check for stored prefs BEFORE loading so we can decide whether to apply
  // the defaultProfile on first visit.
  const hasStoredPrefs = (() => {
    try { return localStorage.getItem(STORAGE_KEY) !== null; } catch { return false; }
  })();
  const prefs: Prefs = loadPrefs();

  // ─── Live controllers (constructed once) ────────────────────────────────
  const ruler     = makeRuler();
  const mask      = makeMask();
  const readAloud = makeReadAloud(lang);
  const mute      = makeMute();

  // ─── Corner positioning ──────────────────────────────────────────────────
  const corner = POSITIONS[config.position] ?? POSITIONS["bottom-right"];
  const isBottom = config.position.startsWith("bottom");
  const isRight  = config.position.endsWith("right");

  // ─── Launcher button ────────────────────────────────────────────────────
  const btn = document.createElement("button");
  btn.className = "mky-btn";
  btn.type = "button";
  btn.style.cssText = corner;
  btn.setAttribute("aria-label", t(lang, "title"));
  btn.setAttribute("aria-expanded", "false");
  btn.innerHTML = LAUNCHER_ICONS[config.launcherIcon] ?? LAUNCHER_ICONS.accessibility;

  // ─── Panel ──────────────────────────────────────────────────────────────
  const panel = document.createElement("div");
  panel.className = "mky-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-label", config.panelTitle || t(lang, "title"));
  // Desktop position: above/below the launcher depending on corner.
  // (Mobile overrides via CSS bottom-sheet — these inline styles are beaten
  // by !important rules in the @media block in PANEL_CSS.)
  panel.style.cssText = [
    corner,
    isBottom ? `bottom: 84px;`  : `top: 84px;`,
    isRight  ? `right: 16px;`   : `left: 16px;`,
  ].filter(Boolean).join(" ");

  // ─── apply() — single source of truth ───────────────────────────────────
  // Called after every pref change. Pushes state to: HTML attributes (CSS
  // effects), live controllers (ruler/mask/read-aloud/mute), localStorage.
  function apply(): void {
    try {
      applyPrefs(prefs);
      prefs.ruler     ? ruler.on()          : ruler.off();
      mask.set(prefs.mask);
      prefs.readAloud ? readAloud.enable()  : readAloud.disable();
      readAloud.setLang(lang);
      prefs.mute      ? mute.enable()       : mute.disable();
      savePrefs(prefs);
    } catch {
      /* never throw from apply */
    }
  }

  // ─── Header ─────────────────────────────────────────────────────────────
  const head = document.createElement("div");
  head.className = "mky-head";

  const titleWrap = document.createElement("div");

  const h2 = document.createElement("h2");
  h2.className = "mky-title";

  const sub = document.createElement("p");
  sub.className = "mky-sub";

  titleWrap.append(h2, sub);

  // Language <select>
  const langSel = document.createElement("select");
  langSel.className = "mky-lang";
  langSel.setAttribute("aria-label", t(lang, "language"));
  for (const [code, label] of Object.entries(LANG_LABELS) as [Lang, string][]) {
    const opt = document.createElement("option");
    opt.value = code;
    opt.textContent = label;
    opt.selected = code === lang;
    langSel.appendChild(opt);
  }
  langSel.addEventListener("change", () => {
    const newLang = langSel.value as Lang;
    lang = newLang;
    persistLang(lang);
    readAloud.setLang(lang);
    updateLabels();
    renderBody();
  });

  const closeBtn = document.createElement("button");
  closeBtn.className = "mky-close";
  closeBtn.type = "button";
  closeBtn.innerHTML = CLOSE_ICON;

  head.append(titleWrap, langSel, closeBtn);

  // ─── Body ────────────────────────────────────────────────────────────────
  const body = document.createElement("div");
  body.className = "mky-body";

  // ─── Footer ─────────────────────────────────────────────────────────────
  const foot = document.createElement("div");
  foot.className = "mky-foot";

  const resetBtn = document.createElement("button");
  resetBtn.className = "mky-reset";
  resetBtn.type = "button";
  resetBtn.addEventListener("click", () => {
    Object.assign(prefs, DEFAULT_PREFS);
    apply();
    renderBody();
  });

  const noteEl = document.createElement("p");
  noteEl.className = "mky-note";

  foot.append(resetBtn, noteEl);

  // Accessibility statement link (only if URL provided)
  let statementLink: HTMLAnchorElement | null = null;
  if (config.accessibilityStatementUrl) {
    statementLink = document.createElement("a");
    statementLink.className = "mky-statement";
    statementLink.href = config.accessibilityStatementUrl;
    statementLink.target = "_blank";
    statementLink.rel = "noopener";
    foot.appendChild(statementLink);
  }

  // Branding line (unless hidden)
  let brandEl: HTMLParagraphElement | null = null;
  if (!config.hideBranding) {
    brandEl = document.createElement("p");
    brandEl.className = "mky-brand";
    const brandLink = document.createElement("a");
    brandLink.href = config.brandingUrl;
    brandLink.target = "_blank";
    brandLink.rel = "noopener";
    brandLink.textContent = "Makoya";
    brandEl.append("", brandLink); // text node for "Powered by" injected in updateLabels
    foot.appendChild(brandEl);
  }

  // ─── updateLabels() — refreshes all text without rebuilding DOM ──────────
  // Called on language change. Preserves open state and focus trap.
  function updateLabels(): void {
    const title = config.panelTitle || t(lang, "title");
    btn.setAttribute("aria-label", title);
    panel.setAttribute("aria-label", title);
    h2.textContent = title;
    sub.textContent = t(lang, "subtitle");
    closeBtn.setAttribute("aria-label", t(lang, "close"));
    langSel.setAttribute("aria-label", t(lang, "language"));
    resetBtn.textContent = t(lang, "reset");
    noteEl.textContent = t(lang, "note");
    if (statementLink) statementLink.textContent = t(lang, "statement");
    if (brandEl) {
      // Re-set text: "Powered by " + Makoya link
      const existingLink = brandEl.querySelector("a");
      if (existingLink) {
        brandEl.textContent = "";
        brandEl.appendChild(document.createTextNode(`${t(lang, "poweredBy")} `));
        brandEl.appendChild(existingLink);
      }
    }
  }

  // ─── renderBody() — rebuilds the body content ────────────────────────────
  // Called on mount, language change, profile application, and reset.
  function renderBody(): void {
    body.innerHTML = "";

    // ── Quick profiles section ────────────────────────────────────────────
    const profSec = document.createElement("div");
    profSec.className = "mky-sec";

    const profLabel = document.createElement("span");
    profLabel.className = "mky-sec-label";
    profLabel.textContent = t(lang, "quickProfiles");

    const profGrid = document.createElement("div");
    profGrid.className = "mky-profiles";

    for (const profile of PROFILES) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "mky-chip";
      const chipLabel = t(lang, profile.labelKey);
      chip.innerHTML = `${profile.icon}<span>${chipLabel}</span>`;
      chip.addEventListener("click", () => {
        applyProfileByKey(prefs, profile.key);
        apply();
        renderBody();
      });
      profGrid.appendChild(chip);
    }

    const divider = document.createElement("div");
    divider.className = "mky-divider";

    profSec.append(profLabel, profGrid, divider);
    body.appendChild(profSec);

    // ── Feature sections ──────────────────────────────────────────────────
    // Group enabled features by section, maintaining display order.
    const sectionFeatures = new Map<SectionKey, string[]>();
    for (const key of config.featuresEnabled) {
      const sec = FEATURE_SECTION[key] as SectionKey | undefined;
      if (!sec) continue; // unknown key — skip (forward-compat)
      if (!sectionFeatures.has(sec)) sectionFeatures.set(sec, []);
      sectionFeatures.get(sec)!.push(key);
    }

    for (const secKey of SECTION_ORDER) {
      const keys = sectionFeatures.get(secKey);
      if (!keys || keys.length === 0) continue; // skip empty sections

      const sec = document.createElement("div");
      sec.className = "mky-sec";

      const secLabel = document.createElement("span");
      secLabel.className = "mky-sec-label";
      secLabel.textContent = t(lang, secKey);
      sec.appendChild(secLabel);

      for (const key of keys) {
        const el = buildFeature(key as Parameters<typeof buildFeature>[0], prefs, lang, apply);
        if (el) sec.appendChild(el);
      }

      // Read-aloud hint note at the bottom of the Audio section
      if (secKey === "sec_audio" && config.featuresEnabled.includes("readAloud")) {
        const hint = document.createElement("p");
        hint.className = "mky-note";
        hint.style.cssText = "margin: 4px 8px 8px; text-align: left;";
        hint.textContent = t(lang, "readAloudHint");
        sec.appendChild(hint);
      }

      body.appendChild(sec);
    }
  }

  // ─── Assemble panel ─────────────────────────────────────────────────────
  panel.append(head, body, foot);

  // ─── Open/close + focus management ─────────────────────────────────────
  let isOpen = false;

  const setOpen = (v: boolean) => {
    isOpen = v;
    panel.classList.toggle("open", v);
    btn.setAttribute("aria-expanded", String(v));
    if (v) {
      // Focus close button on open (first focusable in panel)
      requestAnimationFrame(() => closeBtn.focus());
    } else {
      btn.focus();
    }
  };

  btn.addEventListener("click", () => setOpen(!isOpen));
  closeBtn.addEventListener("click", () => setOpen(false));

  // Esc closes; Tab focus-traps within the panel
  shadow.addEventListener("keydown", (ev) => {
    const e = ev as KeyboardEvent;
    if (!isOpen) return;

    if (e.key === "Escape") {
      setOpen(false);
      return;
    }

    if (e.key === "Tab") {
      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], select, input, [tabindex]:not([tabindex="-1"])'
        )
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last  = focusables[focusables.length - 1];
      const active = shadow.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  // ─── Mount into shadow root ──────────────────────────────────────────────
  shadow.append(btn, panel);

  // ─── Initial render ──────────────────────────────────────────────────────
  // 1. Set all text labels from the resolved language.
  updateLabels();
  // 2. Build body sections.
  renderBody();
  // 3. Default profile on first visit (no stored prefs + config opt-in).
  if (!hasStoredPrefs && config.defaultProfile !== "none") {
    applyProfileByKey(prefs, config.defaultProfile);
    renderBody(); // re-render with profile-applied prefs values
  }
  // 4. Apply prefs to the page (attributes + live controllers).
  apply();
}
