# A11y Feature Wave — implementation spec (2026-06-29)

Branch `feat/a11y-feature-wave`, worktree `C:\Users\ANMOL\Desktop\makoya-a11y`.
Phase 1 (config+state foundation) is DONE + committed (822d1ae). New prefs already exist:
`keyboardNav:boolean`, `focusMode:boolean`, `colorFilter:"off"|"protanopia"|"deuteranopia"|"tritanopia"`
in `packages/widget/src/core/state.ts`; new FeatureKeys `keyboardNav`,`focusMode`,`colorBlindFilter`
in `packages/shared/src/index.ts` (+ mirror synced). `applyPrefs` already sets `data-mky-focus` and
`data-mky-cf`. Build on these — do NOT re-add them.

## Non-negotiable widget rules (CLAUDE.md) — obey all
1. Always render with fallback; never throw (esp. auto-init / live controllers).
2. Effects via `html[data-mky-*]` attributes + ONE injected stylesheet (`effects.ts`). Never rewrite host DOM.
3. Widget UI in Shadow DOM; effects act on real page.
4. The widget UI itself must be accessible (real buttons, aria-pressed, Esc, focus mgmt).
5. Persist prefs across SPA nav.
6. No "compliant"/"WCAG/ADA guaranteed" claims in user copy. Tools = *preferences*, not compliance.

## LANE A — Widget features (packages/widget) + customizer meta (apps/web/lib/customizer)

### A1. Global focus mode (CSS only) — `features/effects.ts`
Add to `EFFECT_CSS` a rule keyed on `html[data-mky-focus="on"]`. Every focusable element, when
focused, gets a thick high-contrast ring that works on any background:
```
html[data-mky-focus="on"] *:focus,
html[data-mky-focus="on"] *:focus-visible {
  outline: 3px solid #1e63ff !important;
  outline-offset: 2px !important;
  box-shadow: 0 0 0 3px #fff, 0 0 0 6px #1e63ff !important;
  border-radius: 2px;
}
```
Already wired via applyPrefs `data-mky-focus`. No state changes needed.

### A2. Daltonization colour-blind filters (CSS+SVG) — `features/effects.ts`
The current colorBlind profile uses `saturation:high` which does NOT help colour blindness. Replace with
REAL daltonization via SVG `feColorMatrix`. Inject a hidden `<svg>` (once, alongside the stylesheet) with
three filters using the standard published colour-matrix values:
- protanopia, deuteranopia, tritanopia.
Then CSS applies them to BODY (same safe pattern as saturation — filter on body, not html):
```
html[data-mky-cf="protanopia"]   { --mky-f-cf: url(#mky-cf-protanopia); }
html[data-mky-cf="deuteranopia"] { --mky-f-cf: url(#mky-cf-deuteranopia); }
html[data-mky-cf="tritanopia"]   { --mky-f-cf: url(#mky-cf-tritanopia); }
```
and extend the existing `body { filter: var(--mky-f-contrast,) var(--mky-f-sat,); }`
composite (add `var(--mky-f-cf,)`). The SVG must be injected into the host page (documentElement) once,
aria-hidden, 0x0, absolutely positioned. Guard injection (idempotent, never throw).
applyPrefs already sets `data-mky-cf`. No state changes needed.

### A3. Real dyslexia font — `features/effects.ts` (readableFont / `data-mky-font`)
Today `data-mky-font="on"` maps to Verdana — not a real dyslexia font. Improve honestly:
- font stack must lead with genuinely dyslexia-recommended faces present on most systems, then a webfont:
  `"OpenDyslexic","Atkinson Hyperlegible","Comic Sans MS","Comic Sans",Verdana,Tahoma,sans-serif`
- Add an `@font-face` for OpenDyslexic (Regular+Bold). PREFER a self-contained data: URI woff2 if you can
  reliably obtain the bytes (download OpenDyslexic woff2 from its official open-source release and base64);
  inject this @font-face lazily (only when readableFont first activates) to keep core.js lean. If you cannot
  reliably embed the bytes, ship the system-font stack above (Comic Sans MS is a real, widely-installed
  dyslexia-recommended face — that alone is a legitimate, honest improvement) and leave a `// TODO(font)`
  noting the webfont can be embedded later. Either way: graceful fallback, never block render.

### A4. Keyboard navigation controller (LIVE) — `ui/live.ts` `makeKeyboardNav()`
New controller mirroring makeRuler/makeMute conventions (enable()/disable(), idempotent, never throws,
aria-hidden overlays, teardown leaves zero residue). When enabled:
- Inject a "Skip to main content" link as the first focusable thing (visually hidden until focused) that
  jumps to `<main>`, `[role=main]`, `#main`, or the first `<h1>`.
- Global keydown (capturing, but ignore when focus is in an input/textarea/select/contenteditable or inside
  `#makoya-widget-root`): `H`/`Shift+H` = next/prev heading; `L` = next landmark (main/nav/aside/header/footer
  /[role]); `K` = next link; `B` = back to top. Move real focus (set tabindex=-1 if needed) to the target and
  scroll it into view; draw a temporary focus marker (reuse the hover-highlight style) on it.
- Show a tiny, dismissible on-screen legend of the shortcuts (aria-hidden visual aid) when first enabled.
- Disable(): remove skip link, listener, marker, legend. Fully reversible.
Wire into `ui.ts`/`core/index.ts` like the other live controllers (mute/readAloud/mask): toggle calls
keyboardNav.enable()/disable(); re-apply after SPA nav like the others.

### A5. Read-aloud upgrade (LIVE) — `ui/live.ts` `makeReadAloud()`
Upgrade from "click an element -> read its innerText once":
- Add continuous mode: when enabled, clicking a block reads it, then auto-advances to the next readable block.
- Word highlight: use SpeechSynthesisUtterance `onboundary` to highlight the current word via an overlay /
  non-destructive range highlight that is fully removed on stop. DO NOT permanently mutate host DOM.
- Controls: expose play/pause/resume/stop and a rate setter (0.75/1/1.25/1.5). Keep feature detection
  (no speechSynthesis -> safe no-ops). Never throw from handlers. Cancel on disable/stop.
Keep the existing API shape used by callers and extend it; update `ui/*` controls accordingly.

### A6. Wire UI + i18n + profiles
- `ui/features.ts` / `ui/controls.ts`: render toggles for `keyboardNav`, `focusMode`, and a 4-state
  `colorBlindFilter` control (off/protanopia/deuteranopia/tritanopia), plus the read-aloud controls.
  Real <button>s, aria-pressed, keyboard operable.
- `ui/i18n.ts`: add labels for the new features in en/es/fr/de (match existing key style). Add the
  keyboard-shortcut legend strings.
- `ui/profiles.ts`: FIX the wrong presets —
  - `colorBlind`: set `p.colorFilter = "deuteranopia"` + `p.titles = true`; REMOVE `p.saturation = "high"`.
  - `dyslexia`: keep `p.font=true` (now a real font) + spacing + text=1.
- Update `apps/web/lib/customizer/feature-meta.ts` (+ its test + feature-order test) so the 3 new
  FeatureKeys have customizer metadata consistent with existing entries. Keep
  `apps/web/lib/shared-config.test.ts` and feature-order tests green.

### A7. Tests
Extend `packages/widget/src/core/state.test.ts` for new applyPrefs attrs (`data-mky-focus`,`data-mky-cf`).
Add minimal tests for new live controllers where jsdom allows. Keep `node test-widget.mjs` passing and
`npm run build:widget` green.

## LANE B — Scanner: 5 new custom checks — `apps/web/lib/scanner/index.ts`
Add to `runCustomChecks` (the single page.evaluate). Bump `CUSTOM_CHECKS_VERSION` to 2, extend
`CUSTOM_CHECK_IDS` and `CUSTOM_CHECK_TAGS`. New checks:
1. `placeholder-as-label` — inputs with a placeholder but NO label/aria-label/aria-labelledby/title.
   impact serious. tag wcag2a/wcag131 (1.3.1).
2. `table-missing-headers` — data `<table>` (not role=presentation) with no `<th>` and no `[scope]`/`[headers]`.
   impact serious. tag wcag2a/wcag131.
3. `heading-order-skip` — heading levels that jump (e.g. h2 -> h4). impact moderate. tag best-practice/wcag131.
4. `positive-tabindex` — elements with tabindex > 0 (breaks tab order). impact moderate.
   tag best-practice/wcag243 (2.4.3).
5. `text-over-image-no-contrast` — element with non-empty direct text + computed background-image !== 'none'
   + transparent/low-alpha background-color (contrast risk axe can't evaluate). impact moderate.
   tag best-practice/wcag143.
Each check: same shape as existing (id/description/help/impact/totalInstances/nodes), capped node lists,
non-fatal. Add/extend tests mirroring existing custom-check style. Keep determinism. Do NOT touch widget files.

## LANE C — Gap-fill (apps/web) — do AFTER Lane A's customizer edits land
1. PUBLIC accessibility-statement page: a server route e.g. `app/a11y/[siteId]/page.tsx` that reads the
   current `accessibility_statements` row via service-role (display HTML is owner-authored, non-secret, already
   XSS-escaped) and renders the stored `html`. This is the footer URL (`accessibilityStatementUrl`). Honest,
   no compliance claims. Add a "Public URL" + copy button on the dashboard statement screen. 404 cleanly if no
   statement. Add a loader test + not-found test.
2. Score-trend chart on the dashboard Overview: score-over-time from existing scan history. If a history
   source exists use it; else add a small authed lib+route returning last N scores + a lightweight inline
   SVG chart component (no heavy deps). Honest empty state when <2 scans.

## Process for every lane
- Work ONLY in the worktree `C:\Users\ANMOL\Desktop\makoya-a11y`. Absolute paths.
- Do NOT `git commit` — the orchestrator reviews + commits.
- A GateGuard hook may demand "facts" before the first edit of each file: present (1) importers, (2) affected
  funcs, (3) data shape, (4) the user instruction, then retry. Comply; don't try to disable it.
- Report back: files changed, key decisions, any TODO/limitation, and the exact commands you ran + results.
