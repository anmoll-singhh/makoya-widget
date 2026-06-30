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

import { LAUNCHER_ICONS, type WidgetConfig, type WidgetProfileKey } from "@makoya/shared";
import { type Prefs, DEFAULT_PREFS, loadPrefs, savePrefs, applyPrefs, STORAGE_KEY } from "../core/state";
import { PANEL_CSS } from "./styles";
import { type Lang, LANG_LABELS, t } from "./i18n";
import { buildFeature } from "./features";
import { PROFILES, applyProfileByKey } from "./profiles";
import { makeRuler, makeMask, makeReadAloud, makeMute, makeHoverHighlight } from "./live";
import { makeMagnifier } from "./live-magnifier";
import { makeReadMode } from "./live-readmode";
import { makeKeyboardNav } from "./keyboard-nav";
import { makeVirtualKeyboard } from "./virtual-keyboard";
import { makeVoiceNav } from "./voice-nav";
import { makeDictionary, type DictState } from "./dictionary";
import { makeSimplify } from "./simplify";
import { makeJumpMenu, collectLinks, collectHeadings } from "./page-nav";
import { postFeedback } from "./widget-net";
import { trackEvent } from "../core/telemetry";

/**
 * Map the current prefs to the SET of feature keys that are "active" (turned on).
 * Used to emit `feature_activated` telemetry ONLY on an off→on transition — we
 * diff this set across apply() calls so toggling a feature OFF, or re-rendering,
 * never emits. Keys match the canonical FeatureKey names used in config.
 */
function activeFeatureKeys(p: Prefs): Set<string> {
  const s = new Set<string>();
  if (p.contentScale !== 100) s.add("contentScale");
  if (p.fontScale !== 100) s.add("textSize");
  if (p.lineHeightPct !== 100) s.add("lineSpacing");
  if (p.letterSpacingPct !== 0) s.add("letterSpacing");
  if (p.contrast !== "off") s.add("contrast");
  if (p.stopMotion) s.add("stopMotion");
  if (p.ruler) s.add("readingRuler");
  if (p.links) s.add("highlightLinks");
  if (p.cursor !== "off") s.add("bigCursor");
  if (p.font !== "off") s.add("readableFont");
  if (p.images) s.add("hideImages");
  if (p.saturation !== "off") s.add("saturation");
  if (p.mask !== "off") s.add("readingMask");
  if (p.titles) s.add("highlightTitles");
  if (p.textAlign !== "off") s.add("textAlign");
  if (p.mute) s.add("muteSounds");
  if (p.readAloud) s.add("readAloud");
  if (p.hoverHighlight) s.add("highlightHover");
  if (p.biggerTargets) s.add("biggerTargets");
  if (p.focusIndicator) s.add("focusIndicator");
  if (p.textColor !== "") s.add("textColor");
  if (p.titleColor !== "") s.add("titleColor");
  if (p.bgColor !== "") s.add("bgColor");
  if (p.magnifier) s.add("magnifier");
  if (p.readMode) s.add("readMode");
  if (p.usefulLinks) s.add("usefulLinks");
  if (p.pageStructure) s.add("pageStructure");
  if (p.keyboardNav) s.add("keyboardNav");
  if (p.virtualKeyboard) s.add("virtualKeyboard");
  if (p.voiceNav) s.add("voiceNav");
  if (p.dictionary) s.add("dictionary");
  if (p.aiSimplify) s.add("aiSimplify");
  return s;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LANG_STORAGE_KEY = "makoya_lang";

const CLOSE_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>`;

/**
 * FeatureKey → section key mapping.
 * Controls which section each feature renders into.
 * Keys not listed here are silently skipped (forward-compat safety).
 */
const FEATURE_SECTION: Record<string, "sec_content" | "sec_color" | "sec_nav" | "sec_audio" | "sec_tools"> = {
  contentScale:    "sec_content",
  textSize:        "sec_content",
  lineSpacing:     "sec_content",
  letterSpacing:   "sec_content",
  readableFont:    "sec_content",
  textAlign:       "sec_content",
  highlightTitles: "sec_content",
  highlightLinks:  "sec_content",
  hideImages:      "sec_content",
  stopMotion:      "sec_content",
  contrast:        "sec_color",
  saturation:      "sec_color",
  textColor:       "sec_color",
  titleColor:      "sec_color",
  bgColor:         "sec_color",
  readingMask:     "sec_color",
  readingRuler:    "sec_nav",
  bigCursor:       "sec_nav",
  highlightHover:  "sec_nav",
  biggerTargets:   "sec_nav",
  focusIndicator:  "sec_nav",
  magnifier:       "sec_nav",
  readMode:        "sec_nav",
  usefulLinks:     "sec_nav",
  pageStructure:   "sec_nav",
  keyboardNav:     "sec_nav",
  virtualKeyboard: "sec_nav",
  voiceNav:        "sec_nav",
  muteSounds:      "sec_audio",
  readAloud:       "sec_audio",
  dictionary:      "sec_tools",
  aiSimplify:      "sec_tools",
  // feedbackForm, userGuide, hideInterface rendered separately (chrome).
};

/** Display order of sections (only rendered when they have enabled features). */
const SECTION_ORDER = ["sec_content", "sec_color", "sec_nav", "sec_audio", "sec_tools"] as const;
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
  // "Hide interface" persists for the browser SESSION (sessionStorage) — if the
  // visitor hid the launcher, don't mount again on reload. It returns next session.
  try {
    if (sessionStorage.getItem("makoya_hidden") === "1") return;
  } catch {
    /* privacy mode — fall through and mount normally */
  }

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

  // ─── Active profile tracker (Task 4: chip toggle-off) ───────────────────
  // Tracks which profile chip is currently active so clicking it again resets
  // prefs to defaults (deselect). "none" means no profile is active.
  let activeProfile: WidgetProfileKey = "none";

  // Remembers which collapsible feature sections the user opened/closed this
  // session, so a re-render (lang change, profile apply) doesn't reset them.
  const sectionOpenState: Record<string, boolean> = {};

  // ─── Live controllers (constructed once) ────────────────────────────────
  const ruler     = makeRuler();
  const mask      = makeMask();
  const readAloud = makeReadAloud(lang);
  const mute      = makeMute();
  const hover     = makeHoverHighlight();

  // ─── accessiBe-parity live controllers ──────────────────────────────────
  const magnifier       = makeMagnifier();
  const keyboardNav     = makeKeyboardNav();
  const virtualKeyboard = makeVirtualKeyboard();
  const voiceNav        = makeVoiceNav({ getLang: () => lang });
  // Modal tools: closing them (Esc/button) flips the pref back off + re-renders.
  // getReturnFocus points at closeBtn (panel header, survives renderBody) so
  // closing a modal tool re-anchors focus inside the panel instead of <body>.
  const readMode = makeReadMode({
    onClose: () => { prefs.readMode = false; apply(); renderBody(); },
    getReturnFocus: () => closeBtn,
  });
  const linksMenu = makeJumpMenu({
    collect: collectLinks,
    getTitle: () => t(lang, "f_usefulLinks"),
    getCloseLabel: () => t(lang, "close"),
    getEmptyLabel: () => t(lang, "nav_none"),
    onClose: () => { prefs.usefulLinks = false; apply(); renderBody(); },
    getReturnFocus: () => closeBtn,
  });
  const structureMenu = makeJumpMenu({
    collect: collectHeadings,
    getTitle: () => t(lang, "f_pageStructure"),
    getCloseLabel: () => t(lang, "close"),
    getEmptyLabel: () => t(lang, "nav_none"),
    onClose: () => { prefs.pageStructure = false; apply(); renderBody(); },
    getReturnFocus: () => closeBtn,
  });

  // Dictionary result popover — own Shadow DOM; role=status/aria-live so AT
  // announces the definition. Text set via textContent only (no injection).
  let dictHost: HTMLDivElement | null = null;
  function hideDictResult(): void { dictHost?.remove(); dictHost = null; }
  function showDictResult(state: DictState): void {
    try {
      if (!dictHost) {
        dictHost = document.createElement("div");
        dictHost.style.cssText =
          "position:fixed;left:50%;bottom:84px;transform:translateX(-50%);z-index:2147483646;";
        const sh = dictHost.attachShadow({ mode: "open" });
        const st = document.createElement("style");
        st.textContent =
          ".box{position:relative;max-width:min(420px,92vw);background:#fff;color:#1a1a1a;" +
          "border:2px solid #1e63ff;border-radius:12px;padding:14px 32px 14px 16px;" +
          "box-shadow:0 8px 30px rgba(0,0,0,.25);font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;}" +
          ".w{font-weight:700;}.pos{color:#666;font-style:italic;margin-left:6px;}" +
          ".x{position:absolute;top:6px;right:8px;border:0;background:transparent;font-size:18px;cursor:pointer;color:#666;}" +
          ".x:focus-visible{outline:3px solid #1e63ff;outline-offset:2px;}";
        const box = document.createElement("div");
        box.className = "box";
        box.setAttribute("role", "status");
        box.setAttribute("aria-live", "polite");
        const x = document.createElement("button");
        x.className = "x"; x.type = "button"; x.textContent = "×";
        x.setAttribute("aria-label", t(lang, "close"));
        x.addEventListener("click", hideDictResult);
        const content = document.createElement("div");
        content.className = "content";
        box.append(x, content);
        sh.append(st, box);
        document.documentElement.appendChild(dictHost);
      }
      const content = dictHost.shadowRoot!.querySelector<HTMLElement>(".content");
      if (!content) return;
      content.innerHTML = "";
      if (state.status === "loading") {
        content.textContent = t(lang, "dict_loading");
      } else if (state.status === "none") {
        content.textContent = `“${state.word}” — ${t(lang, "dict_none")}`;
      } else if (state.status === "ok") {
        const w = document.createElement("span"); w.className = "w"; w.textContent = state.word;
        content.appendChild(w);
        if (state.partOfSpeech) {
          const p = document.createElement("span"); p.className = "pos"; p.textContent = state.partOfSpeech;
          content.appendChild(p);
        }
        const d = document.createElement("div"); d.textContent = state.definition;
        content.appendChild(d);
      }
    } catch {
      /* never throw */
    }
  }
  const dictionary = makeDictionary({ getLang: () => lang, onResult: showDictResult });
  // AI simplify: selecting text offers a "Simplify" button → POST to our route
  // (flag-gated OFF per site; fails silent when disabled/unavailable).
  const simplify = makeSimplify({
    getLang: () => lang,
    getSiteId: () => config.siteId,
    getStrings: () => ({
      action: t(lang, "as_action"),
      loading: t(lang, "as_loading"),
      failed: t(lang, "as_failed"),
      close: t(lang, "close"),
    }),
  });

  // ─── Corner positioning + offsets ───────────────────────────────────────
  // offsetX/Y shift the button (and panel) away from the anchor corner.
  // Positive offsetX = further right; positive offsetY = further down.
  // For right-anchored positions, "further right" means a SMALLER right value;
  // for left-anchored positions it means a LARGER left value, and so on.
  const ox = typeof config.offsetX === "number" ? config.offsetX : 0;
  const oy = typeof config.offsetY === "number" ? config.offsetY : 0;
  const isBottom = config.position.startsWith("bottom");
  const isRight  = config.position.endsWith("right");

  // Base inset for the launcher button (16 px from each edge).
  const BASE = 16;
  const btnCorner = isBottom
    ? (isRight
        ? `bottom:${BASE - oy}px; right:${BASE - ox}px;`
        : `bottom:${BASE - oy}px; left:${BASE + ox}px;`)
    : (isRight
        ? `top:${BASE + oy}px; right:${BASE - ox}px;`
        : `top:${BASE + oy}px; left:${BASE + ox}px;`);

  // ─── Launcher button ────────────────────────────────────────────────────
  const btn = document.createElement("button");
  btn.className = "mky-btn";
  btn.type = "button";
  btn.style.cssText = btnCorner;

  // Apply launcher shape via inline border-radius (overrides the 50% default
  // in PANEL_CSS without regenerating the whole stylesheet).
  const shapeBorderRadius: Record<string, string> = {
    circle:  "50%",
    rounded: "16px",
    square:  "8px",
  };
  const br = shapeBorderRadius[config.launcherShape ?? "circle"] ?? "50%";
  btn.style.borderRadius = br;

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
  // Panel base inset is 84 px (button 56 px + 16 px gap + 12 px clearance).
  // Offsets shift the panel in the same direction as the button.
  // (Mobile overrides via CSS bottom-sheet — these inline styles are beaten
  // by !important rules in the @media block in PANEL_CSS.)
  const PANEL_BASE = 84;
  const panelCss = isBottom
    ? (isRight
        ? `bottom:${PANEL_BASE - oy}px; right:${BASE - ox}px;`
        : `bottom:${PANEL_BASE - oy}px; left:${BASE + ox}px;`)
    : (isRight
        ? `top:${PANEL_BASE + oy}px; right:${BASE - ox}px;`
        : `top:${PANEL_BASE + oy}px; left:${BASE + ox}px;`);
  panel.style.cssText = panelCss;

  // Baseline for the feature_activated diff. `null` until the FIRST apply() so
  // that the initial mount (which applies stored prefs / a default profile) is
  // treated as the baseline and emits nothing — only genuine user-driven off→on
  // transitions after mount fire telemetry.
  let lastActive: Set<string> | null = null;

  // ─── apply() — single source of truth ───────────────────────────────────
  // Called after every pref change. Pushes state to: HTML attributes (CSS
  // effects), live controllers (ruler/mask/read-aloud/mute), localStorage.
  function apply(): void {
    try {
      applyPrefs(prefs);
      ruler.setColor(prefs.rulerColor);
      prefs.ruler     ? ruler.on()          : ruler.off();
      mask.set(prefs.mask);
      prefs.readAloud ? readAloud.enable()  : readAloud.disable();
      readAloud.setLang(lang);
      prefs.mute      ? mute.enable()       : mute.disable();
      prefs.hoverHighlight ? hover.enable() : hover.disable();
      // accessiBe-parity live controllers (open/enable are idempotent).
      prefs.magnifier       ? magnifier.enable()       : magnifier.disable();
      prefs.keyboardNav     ? keyboardNav.enable()     : keyboardNav.disable();
      prefs.virtualKeyboard ? virtualKeyboard.enable() : virtualKeyboard.disable();
      prefs.voiceNav        ? voiceNav.enable()        : voiceNav.disable();
      prefs.readMode        ? readMode.open(lang)      : readMode.close();
      prefs.usefulLinks     ? linksMenu.open()         : linksMenu.close();
      prefs.pageStructure   ? structureMenu.open()     : structureMenu.close();
      if (prefs.dictionary) dictionary.enable();
      else { dictionary.disable(); hideDictResult(); }
      prefs.aiSimplify ? simplify.enable() : simplify.disable();
      savePrefs(prefs);
      // Telemetry (fire-and-forget, never affects the UI): emit feature_activated
      // for each feature that just transitioned off→on. The first apply only
      // seeds the baseline.
      try {
        const now = activeFeatureKeys(prefs);
        if (lastActive) {
          for (const key of now) {
            if (!lastActive.has(key)) trackEvent("feature_activated", key);
          }
        }
        lastActive = now;
      } catch {
        /* telemetry must never affect apply() */
      }
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
    activeProfile = "none"; // deselect any active profile chip
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
      chip.setAttribute("aria-pressed", String(activeProfile === profile.key));
      const chipLabel = t(lang, profile.labelKey);
      chip.innerHTML = `${profile.icon}<span>${chipLabel}</span>`;
      chip.addEventListener("click", () => {
        if (activeProfile === profile.key) {
          // Clicking the already-active profile deselects it → reset to defaults
          applyProfileByKey(prefs, "none");
          activeProfile = "none";
        } else {
          applyProfileByKey(prefs, profile.key);
          activeProfile = profile.key;
        }
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

      // Collapsible section (native <details> — keyboard + screen-reader friendly).
      // The two most-used groups start open; the rest collapse to cut clutter now
      // that there are many tools. Open/closed state persists for the session.
      const sec = document.createElement("details");
      sec.className = "mky-sec";
      const persisted = sectionOpenState[secKey];
      sec.open = persisted !== undefined ? persisted : (secKey === "sec_content" || secKey === "sec_color");
      sec.addEventListener("toggle", () => { sectionOpenState[secKey] = sec.open; });

      const secLabel = document.createElement("summary");
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

    // ── Chrome: User guide, Feedback form, Hide interface ─────────────────
    const wantGuide = config.featuresEnabled.includes("userGuide");
    const wantFeedback = config.featuresEnabled.includes("feedbackForm");
    const wantHide = config.featuresEnabled.includes("hideInterface");
    if (wantGuide || wantFeedback || wantHide) {
      const sec = document.createElement("details");
      sec.className = "mky-sec";
      sec.open = sectionOpenState["sec_about"] ?? false; // collapsed by default
      sec.addEventListener("toggle", () => { sectionOpenState["sec_about"] = sec.open; });
      const secLabel = document.createElement("summary");
      secLabel.className = "mky-sec-label";
      secLabel.textContent = t(lang, "sec_about");
      sec.appendChild(secLabel);

      if (wantGuide) {
        const d = document.createElement("details");
        d.style.cssText = "margin:4px 8px;";
        const s = document.createElement("summary");
        s.textContent = t(lang, "f_userGuide");
        s.style.cssText = "cursor:pointer;font-size:14px;padding:6px 0;";
        const p = document.createElement("p");
        p.textContent = t(lang, "guide_body");
        p.style.cssText = "margin:6px 0;font-size:13px;line-height:1.5;";
        d.append(s, p);
        sec.appendChild(d);
      }

      if (wantFeedback) {
        const inputCss =
          "width:100%;box-sizing:border-box;margin:4px 0;padding:8px;font:inherit;border:1px solid #ccc;border-radius:6px;";
        const d = document.createElement("details");
        d.style.cssText = "margin:4px 8px;";
        const s = document.createElement("summary");
        s.textContent = t(lang, "fb_open");
        s.style.cssText = "cursor:pointer;font-size:14px;padding:6px 0;";
        const ta = document.createElement("textarea");
        ta.setAttribute("aria-label", t(lang, "fb_msgLabel"));
        ta.placeholder = t(lang, "fb_msgLabel");
        ta.rows = 3;
        ta.style.cssText = inputCss;
        const email = document.createElement("input");
        email.type = "email";
        email.setAttribute("aria-label", t(lang, "fb_emailLabel"));
        email.placeholder = t(lang, "fb_emailLabel");
        email.style.cssText = inputCss;
        const send = document.createElement("button");
        send.type = "button";
        send.className = "mky-reset";
        send.textContent = t(lang, "fb_send");
        const status = document.createElement("p");
        status.setAttribute("role", "status");
        status.setAttribute("aria-live", "polite");
        status.style.cssText = "margin:6px 0;font-size:13px;";
        send.addEventListener("click", () => {
          const msg = ta.value.trim();
          if (!msg) return;
          send.disabled = true;
          status.textContent = t(lang, "fb_sending");
          void postFeedback({
            siteId: config.siteId,
            message: msg,
            email: email.value.trim() || undefined,
            url: location.href,
          }).then((ok) => {
            status.textContent = ok ? t(lang, "fb_sent") : t(lang, "fb_failed");
            send.disabled = false;
            if (ok) ta.value = "";
          });
        });
        d.append(s, ta, email, send, status);
        sec.appendChild(d);
      }

      if (wantHide) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "mky-reset";
        b.style.cssText = "margin:8px;";
        b.textContent = t(lang, "f_hideInterface");
        b.addEventListener("click", () => {
          try { sessionStorage.setItem("makoya_hidden", "1"); } catch { /* privacy mode */ }
          host.style.display = "none";
        });
        sec.appendChild(b);
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
      // Panel opened — record it (fire-and-forget, never throws).
      trackEvent("open");
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
    activeProfile = config.defaultProfile; // mark chip as active for the toggle-off feature
    renderBody(); // re-render with profile-applied prefs values
  }
  // 4. Apply prefs to the page (attributes + live controllers).
  apply();
}
