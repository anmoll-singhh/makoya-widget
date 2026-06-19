# WS1 — Widget Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Rebuild the embeddable widget into a best-in-market, glassmorphic, mobile-first accessibility panel with full competitor-parity effects — without violating the widget's non-negotiable safety rules.

**Architecture:** Keep the loader/core split and the "effects = attributes + ONE stylesheet, UI in Shadow DOM, mounted on `<html>`" model. Expand `Prefs` (state.ts) and the effect stylesheet (effects.ts). Split the growing `ui.ts` into focused modules: `i18n.ts`, `controls.ts`, `features.ts`, `profiles.ts`, `live.ts` (ruler/mask/read-aloud/mute controllers), `styles.ts` (glass + mobile-sheet CSS), and a slim `ui.ts` orchestrator. Vanilla TS only — NO React, NO shadcn here.

**Tech Stack:** TypeScript, Vite (IIFE bundles), Shadow DOM, SpeechSynthesis API, `@makoya/shared` (already expanded in Phase 0).

## Global Constraints

- **Never break the safety rules:** always render with fallback (auto-init never throws); effects via `html[data-mky-*]` attributes + the ONE stylesheet only (no DOM rewriting except the documented live overlay elements: ruler, mask, which are `pointer-events:none` aria-hidden, and read-aloud/mute which only add listeners/mute media — never restructure page DOM); UI in Shadow DOM; widget itself fully accessible (real buttons, `role=switch/group`, `aria-pressed`/`aria-checked`, `aria-modal`, focus trap, Esc, focus return); persist prefs across SPA nav.
- **Keep the contrast/dark fix:** color filters apply to `<body>`; the widget host stays mounted on `<html>`. Saturation filters ALSO go on `<body>` and must COMPOSE with contrast (see Task 2's CSS-variable technique) — never put a `filter` on `<html>` (it would re-anchor the fixed widget).
- **No "WCAG/ADA compliant" / "guaranteed accessible" copy.** Keep the existing honest note: "Changes affect your view only — they don't alter the website."
- **15 feature keys** already in `@makoya/shared` (Phase 0). `featuresEnabled` gates which controls render; pref values live in `state.ts`.
- Config fields to honor: `primaryColor`, `position`, `launcherIcon`, `launcherSize`, `defaultProfile`, `defaultLanguage`, `accessibilityStatementUrl`, `panelTitle`, `hideBranding`, `brandingUrl`.
- Build: `cd packages/widget && npm run typecheck` then `npm run build` (builds core + loader). Verify with `node test-widget.mjs` (needs jsdom).
- Default test viewport for mobile checks: **390×844**.

## File structure (target)

```
packages/widget/src/
  core/state.ts        # Prefs (expanded) + persistence + applyPrefs (attribute setter)
  features/effects.ts  # ONE stylesheet (expanded) + setHtmlAttr
  ui/i18n.ts           # LANGS, STRINGS[en|es|fr|de], t(lang,key)
  ui/styles.ts         # PANEL_CSS(color, size) — glass + mobile bottom-sheet
  ui/controls.ts       # makeSwitch, makeSeg, makeStepper, row helpers
  ui/features.ts       # ICON, FEATURES map (control builders per FeatureKey)
  ui/profiles.ts       # PROFILES (incl. new Cognitive + Color-blind)
  ui/live.ts           # ruler, reading mask, read-aloud, mute controllers
  ui/ui.ts             # mountUI orchestrator (header/body/footer, open/close, focus trap)
  core/index.ts        # unchanged init/SPA/auto-init (verify still compiles)
```

---

### Task 1: Expand Prefs + applyPrefs (state.ts)

**Files:** Modify `packages/widget/src/core/state.ts`; Test: `packages/widget/src/core/state.test.ts` (new; widget has `test-widget.mjs` but add a vitest-free node assert test OR a `.test.ts` if vitest exists — check `package.json`. If no test runner, write `packages/widget/state-test.mjs` using `node:assert` and run with `node`).

**Interfaces — Produces:** `Prefs` gains `cursor: "off" | "black" | "white"` (CHANGED from boolean), `saturation: "off" | "grayscale" | "low" | "high"`, `mask: "off" | "dim" | "tint"`, `titles: boolean`, `align: boolean`, `mute: boolean`, `readAloud: boolean`. `DEFAULT_PREFS` updated. `applyPrefs` sets new attributes.

- [ ] **Step 1: Write failing test** (`state-test.mjs` via `node:assert`, or `.test.ts` if a runner exists). Assert: `DEFAULT_PREFS.cursor === "off"`, `DEFAULT_PREFS.saturation === "off"`, `DEFAULT_PREFS.mask === "off"`, and `titles/align/mute/readAloud === false`. Assert `loadPrefs()` merges over defaults (simulate via JSON). Run, verify FAIL.

- [ ] **Step 2: Update `Prefs` + `DEFAULT_PREFS`.** Change `cursor: boolean` → `cursor: "off" | "black" | "white"`; add the 6 new fields. `DEFAULT_PREFS`: `cursor: "off"`, `saturation: "off"`, `mask: "off"`, `titles: false`, `align: false`, `mute: false`, `readAloud: false`.

- [ ] **Step 3: Update `applyPrefs`** — add after existing attrs:
```ts
  setHtmlAttr("data-mky-cursor", prefs.cursor === "off" ? null : prefs.cursor);   // was boolean "on"
  setHtmlAttr("data-mky-sat", prefs.saturation === "off" ? null : prefs.saturation);
  setHtmlAttr("data-mky-titles", prefs.titles ? "on" : null);
  setHtmlAttr("data-mky-align", prefs.align ? "on" : null);
  // mask, mute, readAloud are LIVE (controllers in ui/live.ts), not pure CSS attrs.
```
Remove the old boolean `data-mky-cursor` line (replaced above).

- [ ] **Step 4: Run test, verify PASS.** Run `cd packages/widget && npm run typecheck` (will error in ui.ts until later tasks — note and proceed; this task's own file compiles).

- [ ] **Step 5: Commit** `feat(widget): expand Prefs — cursor color, saturation, mask, titles, align, mute, read-aloud`.

---

### Task 2: Expand effect stylesheet (effects.ts) — composed filters + new CSS effects

**Files:** Modify `packages/widget/src/features/effects.ts`.

**Interfaces — Consumes:** the `data-mky-*` attributes Task 1 sets. **Produces:** CSS rules for cursor color, saturation (composed with contrast), highlight titles, left-align.

- [ ] **Step 1: Replace the contrast block with a CSS-variable composition** so contrast + saturation stack on `<body>` (a single `filter` property can't be set twice):
```css
/* Composed page filter on BODY (keeps widget on <html> safe). Empty vars → invalid filter → ignored. */
body { filter: var(--mky-f-contrast,) var(--mky-f-sat,); }
html[data-mky-contrast="on"]   { --mky-f-contrast: contrast(1.18); }
html[data-mky-contrast="dark"] { --mky-f-contrast: invert(1) hue-rotate(180deg); }
html[data-mky-contrast="dark"] { background:#000; }
html[data-mky-contrast="dark"] body { background:#fff; }
html[data-mky-contrast="dark"] body img,
html[data-mky-contrast="dark"] body video,
html[data-mky-contrast="dark"] body picture,
html[data-mky-contrast="dark"] body [style*="background-image"] { filter: invert(1) hue-rotate(180deg); }
html[data-mky-sat="grayscale"] { --mky-f-sat: grayscale(1); }
html[data-mky-sat="low"]       { --mky-f-sat: saturate(.5); }
html[data-mky-sat="high"]      { --mky-f-sat: saturate(1.6); }
```
(Verify: with no contrast/sat attrs, `filter: var(--mky-f-contrast,) var(--mky-f-sat,)` resolves to whitespace → invalid → body unfiltered → fixed widget unaffected. Confirm in QA.)

- [ ] **Step 2: Replace the old cursor rule** with black/white variants (data-driven):
```css
html[data-mky-cursor="black"] * { cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'%3E%3Cpath d='M6 2 L6 38 L16 28 L22 42 L28 39 L22 26 L36 26 Z' fill='black' stroke='white' stroke-width='2'/%3E%3C/svg%3E") 4 2, auto !important; }
html[data-mky-cursor="white"] * { cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'%3E%3Cpath d='M6 2 L6 38 L16 28 L22 42 L28 39 L22 26 L36 26 Z' fill='white' stroke='black' stroke-width='2'/%3E%3C/svg%3E") 4 2, auto !important; }
```

- [ ] **Step 3: Add highlight-titles + left-align rules:**
```css
html[data-mky-titles="on"] h1, html[data-mky-titles="on"] h2,
html[data-mky-titles="on"] h3, html[data-mky-titles="on"] h4,
html[data-mky-titles="on"] h5, html[data-mky-titles="on"] h6 {
  background: #fff8c5 !important; color:#1a1a1a !important;
  outline: 2px solid #facc15 !important; outline-offset: 2px;
}
html[data-mky-align="on"] body, html[data-mky-align="on"] body * { text-align: left !important; }
```

- [ ] **Step 4: Build check.** `cd packages/widget && npm run build` should still produce `dist/core.js` (esbuild ignores TS errors elsewhere). Commit `feat(widget): effects — composed contrast+saturation filter, cursor color, highlight titles, left-align`.

---

### Task 3: i18n module (ui/i18n.ts)

**Files:** Create `packages/widget/src/ui/i18n.ts`.

**Interfaces — Produces:** `type Lang = "en"|"es"|"fr"|"de"`; `const LANG_LABELS: Record<Lang,string>` (English/Español/Français/Deutsch); `function t(lang: Lang, key: StringKey): string`; `type StringKey` covering every UI string. Falls back to English for any missing key.

- [ ] **Step 1: Define `StringKey`** for: `title`, `subtitle`, `quickProfiles`, profile labels (`profile_vision`, `profile_lowVision`, `profile_dyslexia`, `profile_adhd`, `profile_seizure`, `profile_senior`, `profile_cognitive`, `profile_colorBlind`), section headers (`sec_content`, `sec_color`, `sec_nav`, `sec_audio`, `sec_about`), feature labels (one per FeatureKey: `f_textSize`, `f_lineSpacing`, `f_contrast`, `f_stopMotion`, `f_readingRuler`, `f_highlightLinks`, `f_bigCursor`, `f_readableFont`, `f_hideImages`, `f_saturation`, `f_readingMask`, `f_highlightTitles`, `f_textAlign`, `f_muteSounds`, `f_readAloud`), control options (`opt_off`, `opt_on`, `opt_dark`, `opt_grayscale`, `opt_low`, `opt_high`, `opt_dim`, `opt_tint`, `opt_black`, `opt_white`), `reset`, `note`, `poweredBy`, `statement`, `language`, `close`, `readAloudHint`.

- [ ] **Step 2: Provide full `STRINGS: Record<Lang, Record<StringKey,string>>`** with accurate translations for en/es/fr/de (translate every key; keep them short). `t(lang,key)` returns `STRINGS[lang]?.[key] ?? STRINGS.en[key]`.

- [ ] **Step 3: Commit** `feat(widget): i18n module (en/es/fr/de) for widget labels`.

---

### Task 4: Controls + features + profiles modules (ui/controls.ts, ui/features.ts, ui/profiles.ts)

**Files:** Create `ui/controls.ts`, `ui/features.ts`, `ui/profiles.ts`; this task moves the existing helpers out of `ui.ts` and adds the new controls. Use `t(lang,...)` for all labels.

**Interfaces:**
- `controls.ts` Produces: `makeSwitch(label, isOn, set, onChange)`, `makeSeg(groupLabel, opts, onChange)`, `makeStepper(...)`, `row(iconSvg, label, control)` (now takes icon+label strings, not a FeatureKey, to decouple from the map).
- `features.ts` Produces: `ICON: Partial<Record<FeatureKey,string>>` (add icons for the 6 new keys), and `buildFeature(key, prefs, lang, onChange): HTMLElement | null` — a function returning the control row for a key (switch/seg/stepper), or null for unknown. Replaces the old `FEATURES` map.
  - `saturation` → segmented off/grayscale/low/high. `bigCursor` → segmented off/black/white. `readingMask` → segmented off/dim/tint. `highlightTitles`/`textAlign`/`muteSounds`/`readAloud` → switches. Existing keys keep their controls (textSize stepper, contrast seg, others switches).
- `profiles.ts` Produces: `interface Profile { key: WidgetProfileKey; labelKey: StringKey; icon: string; apply: (p: Prefs) => void }` and `PROFILES: Profile[]` including new **Cognitive** (`p.mask="dim"; p.spacing=true; p.images=true; p.stopMotion=true`) and **Color-blind** (`p.saturation="high"; p.titles=true`). Update existing profiles to use new pref types (e.g. Low vision `p.cursor="black"`). Provide `applyProfileByKey(prefs, key)` for `defaultProfile`.

- [ ] **Step 1:** Create `controls.ts` (move + generalize helpers; `row` takes icon+label). 
- [ ] **Step 2:** Create `features.ts` with `ICON` (6 new SVGs) + `buildFeature`. For mask/mute/readAloud the control toggles the pref; the LIVE behavior is wired by `live.ts` via the `onChange` apply callback.
- [ ] **Step 3:** Create `profiles.ts` with 8 profiles + `applyProfileByKey`.
- [ ] **Step 4:** `cd packages/widget && npm run typecheck` (ui.ts not yet refactored may error — note; these new modules must compile on their own). Commit `feat(widget): controls/features/profiles modules + new controls & profiles`.

---

### Task 5: Live controllers (ui/live.ts) — ruler, reading mask, read-aloud, mute

**Files:** Create `packages/widget/src/ui/live.ts` (move `makeRuler` here too).

**Interfaces — Produces:** `makeRuler()`, `makeMask()` (`set("off"|"dim"|"tint")` — a fixed `pointer-events:none` aria-hidden overlay following the pointer: "dim" = dark band w/ clear center, "tint" = full soft-color overlay), `makeReadAloud(lang)` (`enable()/disable()`: when enabled, clicking page text reads `target.innerText` via `speechSynthesis` with the chosen lang voice; `disable()` cancels and removes the listener; feature-detect `window.speechSynthesis` and no-op if absent), `makeMute()` (`enable()/disable()`: mute all `<audio>/<video>` and intercept new ones via a `play` capture listener that sets `muted=true`; `disable()` unmutes & removes listener). All controllers are reversible and add NO persistent DOM beyond their own overlay elements.

- [ ] **Step 1:** Implement the four controllers, each with feature detection and clean teardown. Read-aloud: pick a voice via `speechSynthesis.getVoices().find(v => v.lang.startsWith(lang))`; guard empty text.
- [ ] **Step 2:** `npm run typecheck` for this file. Commit `feat(widget): live controllers — reading mask, read-aloud (SpeechSynthesis), mute sounds`.

---

### Task 6: Glass + mobile-sheet styles (ui/styles.ts)

**Files:** Create `packages/widget/src/ui/styles.ts` (move `PANEL_CSS` here, redesigned).

**Interfaces — Produces:** `PANEL_CSS(color: string, size: "sm"|"md"|"lg"): string` and `LAUNCHER_SIZES` mapping (sm 48px / md 56px / lg 64px).

**Design spec (market-beating glass):**
- **Launcher:** size from `launcherSize`; `${color}` bg; soft layered shadow; hover scale 1.06; `focus-visible` ring; respects reduced-motion.
- **Panel (desktop ≥481px):** glassmorphism — `background: rgba(255,255,255,.72)`; `backdrop-filter: blur(20px) saturate(1.4)`; `-webkit-backdrop-filter` too; 1px hairline border `rgba(255,255,255,.5)` over a subtle `rgba(15,23,42,.08)` outer; soft shadow; radius 22px; width 360px; max-height `calc(100vh - 108px)`; internal scroll. **AA text legibility:** put text/content on an inner layer with `background: rgba(255,255,255,.9)` (slightly opaque) so body text stays AA over the blur. Provide a `@supports not (backdrop-filter: blur(1px))` fallback to solid `#fff`.
- **Mobile (`@media (max-width:480px)`):** panel becomes a **full-width bottom sheet** — `left:0; right:0; bottom:0; width:100%; max-width:100%; border-radius:22px 22px 0 0; max-height:85dvh; overflow-y:auto;` slide-up transform; `padding-bottom: max(16px, env(safe-area-inset-bottom));` plus safe-area left/right. Touch targets ≥44px (switches, seg buttons, close, chips, steppers bumped up). Larger close button (40px). The launcher stays in its corner but the panel ignores corner positioning on mobile (always bottom sheet).
- Keep `prefers-reduced-motion` disabling transitions.

- [ ] **Step 1:** Write `PANEL_CSS(color,size)` per the spec. **Step 2:** Commit `feat(widget): glassmorphic panel styles + mobile bottom-sheet`.

---

### Task 7: Assemble mountUI (ui/ui.ts) — wire everything

**Files:** Rewrite `packages/widget/src/ui/ui.ts` as a slim orchestrator importing the modules.

**Interfaces — Consumes:** all modules above + `config`. **Produces:** `mountUI(config: WidgetConfig)`.

- [ ] **Step 1:** Build mountUI:
  - Determine `lang` = `config.defaultLanguage` (persisted lang override in prefs/localStorage if user changed it).
  - Mount host on `<html>`, Shadow DOM, inject `PANEL_CSS(config.primaryColor, config.launcherSize)`.
  - Launcher (icon from `config.launcherIcon`, size from config).
  - Header: title = `config.panelTitle || t(lang,"title")`, subtitle, **language `<select>`** (en/es/fr/de) that re-renders labels on change and persists choice, close button.
  - Body sections with headers (`t` keys): Quick Profiles (chips incl. new ones) → Content → Color → Navigation → Audio. Render only `config.featuresEnabled` controls via `buildFeature`, grouped into the right section (define a key→section map).
  - Footer: Reset all; honest note; **Accessibility statement** link if `config.accessibilityStatementUrl`; "Powered by Makoya" unless `config.hideBranding`.
  - Wire `apply()` to: `applyPrefs(prefs)`, ruler on/off, mask.set(prefs.mask), readAloud enable/disable, mute enable/disable, savePrefs.
  - On first mount, if `config.defaultProfile !== "none"` AND no stored prefs yet, apply it.
  - Keep open/close, focus-to-panel, focus return, Esc, focus trap, `aria-modal`, `aria-expanded`.
- [ ] **Step 2:** `cd packages/widget && npm run typecheck` → MUST pass now (whole widget). Fix any cross-module type gaps.
- [ ] **Step 3:** `node test-widget.mjs` (install jsdom if needed) → widget mounts, launcher + panel exist, toggles present. 
- [ ] **Step 4:** Commit `feat(widget): assemble redesigned glass widget — sections, i18n selector, statement link, default profile`.

---

### Task 8: Build, copy bundles, live mobile + desktop QA

**Files:** `packages/widget/dist/*` → `apps/web/public/widget/{loader,core}.js`.

- [ ] **Step 1:** `cd packages/widget && npm run typecheck && npm run build`. Confirm `dist/core.js` + `dist/loader.js` produced.
- [ ] **Step 2:** Copy `dist/loader.js` and `dist/core.js` to `apps/web/public/widget/`.
- [ ] **Step 3:** Commit `build(widget): rebuild + copy redesigned bundles to app`.
- [ ] **Step 4:** Deploy: `cd apps/web && vercel --prod --yes --scope anmolsinghh17-9375s-projects`.
- [ ] **Step 5:** Live QA (Playwright, prod-QA authorized): load a page with the live widget (e.g. an app demo route or a blank page injecting `loader.js?data-site=<known>`), open the panel. Screenshot **desktop (1280×800)** and **mobile (390×844)**. Assert (shadow-pierce, `state:"attached"`): panel fully visible on mobile (bottom sheet, not cut off), glass renders, and EACH new effect visibly changes the page — toggle saturation/grayscale (page desaturates), reading mask (overlay appears), highlight titles (headings highlighted), cursor color, left-align, mute (media muted), read-aloud (speechSynthesis called — stub/spy it), language selector (labels change), contrast+saturation compose (both visible together). Save screenshots under `apps/web/_ws1-shots/` (gitignored), review, then clean up scratch.
- [ ] **Step 6:** Update `SESSION.md` (widget redesigned: 15 features live, mobile sheet, i18n, read-aloud) + commit. Mark WS1 done.

---

## Spec coverage self-check (WS1 section of overhaul spec §4)
- Glass + AA legibility → Task 6. ✓
- Mobile bottom-sheet (≤480px, 85dvh, 44px, safe-area) → Task 6 + QA Task 8. ✓
- Section headers + plain labels + Quick Profiles on top → Task 7. ✓
- New effects (saturation, reading mask, highlight titles, cursor color, left-align, mute, read-aloud) → Tasks 1,2,4,5. ✓
- Accessibility statement link + language selector (en/es/fr/de) → Tasks 3,7. ✓
- Keep Reset + Save + a11y (aria-modal, focus trap, role=switch/group) + `<html>`-mount fix → Tasks 6,7 + Global Constraints. ✓
- Verify every effect on desktop + mobile with screenshots → Task 8. ✓
```
