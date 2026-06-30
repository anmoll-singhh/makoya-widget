# Widget — accessiBe Parity + Superiority (Design Spec)

**Date:** 2026-06-30
**Branch:** `feat/widget-accessibe-parity`
**Status:** Reviewed — verdict applied (both specialist agents: *ship with changes*). Building.
**Author:** Claude (Opus 4.8)

---

## 0. Review verdict (applied 2026-06-30)

Per founder directive, the build starts from an **agent-reviewed** spec, not founder
sign-off. Two specialist agents critiqued this spec against the real code:

- **`ecc:architect`** (system-design / feasibility / sequencing): **SHIP WITH CHANGES.**
  Four P0 blockers fixed below — (1) the `effects.ts` single-gate typography design
  would regress untouched sites; (2) the new cross-origin POST routes had no CORS plan;
  (3) the Prefs migration as written wouldn't execute under `loadPrefs` and omitted
  `font`; (4) Wave 2 "isolated lanes" was false (every lane edits the same 5–6 files).
- **`ecc:a11y-architect`** (invariant / accessibility): **SHIP WITH CHANGES.** No
  feature regresses the current 18-feature build. Three P0 blockers fixed — (1) Read
  Mode pane had no focus contract; (2) Virtual Keyboard had focus-theft + a deprecated
  primary API; (3) the `screenReader` profile name is a compliance-claim risk.

**None of the findings contradict a locked founder decision.** They are implementation
refinements; the `screenReader` rename is *required* by the locked compliance guardrail.
All accepted P0/P1/P2 changes are folded into the sections below. The DOM-invariant
rulings the a11y agent issued (Read Mode, Virtual Keyboard, Voice Nav, Magnifier, Page
Structure, Color, Dictionary all ACCEPTABLE with named guard-rails) are encoded in §5.

---

## 1. Goal

Close every end-user feature gap between the Makoya widget and accessiBe's
`accessWidget`, and add the high-value UserWay-parity tools the founder asked
for, so the Makoya widget meets or exceeds both competitors. Build it solid,
review every lane with a specialist agent, QA, and deploy live.

Founder decisions locked (this session):
- **Adjusters → full `%` steppers** (replace fixed steps + binary toggles).
- **Scope = "everything accessiBe has" + UserWay extras** (Voice Nav, Virtual
  Keyboard) built **full-strength**.
- **Dictionary** uses the free public `dictionaryapi.dev` API, fail-silent.
- **AI Text Simplification ships OFF** by default (per-site flag).
- **33 languages = not this round** (keep en/es/fr/de).
- **Delivery = build → QA → deploy live.**

## 2. Research basis (authoritative, cross-checked 2026-06-30)

accessiBe's panel exposes ~36 adjustments/tools + 6 profiles, organized into
Accessibility Profiles, Content Adjustments, Color/Display Adjustments,
Orientation Adjustments, and top-level chrome. **TTS, Voice Navigation, and
Virtual Keyboard are NOT accessiBe panel features** (they are UserWay's);
accessiBe handles screen-reader support via background AI. Full inventory in the
research appendix at the bottom of this file.

## 3. What we already have (no rebuild needed)

Existing 18 `FeatureKey`s already cover: Stop Animations (`stopMotion`), Reading
Guide (`readingRuler`), Reading Mask (`readingMask`), Highlight Links/Titles,
Highlight Hover (`highlightHover`), Highlight Focus (`focusIndicator`),
Big Cursor black/white (`bigCursor`), Hide Images, Mute Sounds, Read Aloud/TTS
(`readAloud`), Bigger Tap Targets (`biggerTargets`, a bonus beyond accessiBe),
Monochrome + Low/High Saturation (`saturation`), basic Contrast on/dark
(`contrast`). 10 profiles already exceed accessiBe's 6.

## 4. Gap set to build

### 4.1 Rebuilt as `%` steppers (Content Adjustments)
| Feature | New Pref field | Range / step | Default | Effect mechanism |
|---|---|---|---|---|
| Content Scaling | `contentScale: number` | 70–150 % / 10 | 100 | `--mky-zoom` → `body { zoom: var(--mky-zoom,1) }` |
| Font Sizing | `fontScale: number` (replaces `text:0\|1\|2\|3`) | 80–200 % / 10 | 100 | `--mky-font-scale` → `html[data-mky-fontscale] { font-size: calc(100% * var(--mky-font-scale)) !important }` |
| Line Height | `lineHeightPct: number` (from `spacing`) | 100–250 % / 10 | 100 | `--mky-line-height` → `html[data-mky-lh] body, html[data-mky-lh] body * { line-height: var(--mky-line-height) !important }` |
| Letter Spacing | `letterSpacingPct: number` (new) | 0–50 (×0.01em) / 5 | 0 | `--mky-letter-spacing` → `html[data-mky-ls] body, html[data-mky-ls] body * { letter-spacing: var(--mky-letter-spacing) !important }` |

**Effect mechanism (corrected — architect P0-1 / P2-1).** `effects.ts` moves from
enumerated `data-mky-text` levels to **per-property CSS custom properties set inline on
`<html>`**, each gated by its OWN attribute so a property is applied **only when it
deviates from default**:

- `state.ts` sets, for each continuous property, BOTH an inline custom property
  (`html.style.setProperty("--mky-font-scale", …)`) AND a gating attribute
  (`data-mky-fontscale` / `data-mky-lh` / `data-mky-ls`) **only when the value ≠ default**.
  At default the attribute is absent → the rule is inert → the host site is untouched.
- This is the fix for the original single `data-mky-typo` gate, which would have forced
  `font-size:100%`, `line-height:1.0`, and `letter-spacing:0` onto every site the moment
  the user touched any one control — corrupting `html{font-size:62.5%}` rem-reset sites
  (1.6× text blowup) and collapsing line spacing. Keep `!important` (a site's own
  `html{font-size:Npx!important}` otherwise wins).
- **Content Scaling** uses `zoom` only (no `transform` fallback — `transform:scale()`
  creates a containing block and doesn't reflow). `body { zoom: var(--mky-zoom,1) }` is a
  safe no-op at `1` and composes with the existing `body { filter: … }`. The body-on /
  html-off invariant holds because the host mounts on `<html>`.
- **Stepper announcement (a11y P1-5):** the `.mky-stepval` display span in `makeStepper`
  and `makeDiscreteStepper` (controls.ts) must carry `role="status"` so the new value
  (e.g. "120%") is announced to AT after each step.

**Backward-compat migration — explicit, not a spread (architect P0-3).** Today
`loadPrefs` is `{...DEFAULT_PREFS, ...JSON.parse(raw)}`; once `DEFAULT_PREFS` drops
`text`/`spacing`/`align`, that spread does NOT migrate — it leaves legacy keys dangling
(re-serialized forever) and leaves the new fields at default. So:

- Add a pure `migratePrefs(parsed: unknown): Partial<Prefs>` that reads legacy keys,
  maps them, **strips the legacy keys from its result**, and **snaps to the step grid**:
  - `text 1|2|3` → `fontScale 110|130|140` (on the 80–200 /10 grid); `text 0`/absent → omit.
  - `spacing: true` → `lineHeightPct 180` + `letterSpacingPct 5` (on the 0–50 /5 grid).
  - `align: true` → `textAlign: "left"`.
  - `font: true` → `font: "readable"` (the type changes in §4.2 — this row was missing).
  - Existing `contrast` values (`"off"|"on"|"dark"`) stay valid; new `"light"|"high"`
    need no migration.
- `loadPrefs` becomes `{ ...DEFAULT_PREFS, ...migratePrefs(parsed) }`. Migration is pure
  and covered by tests, including malformed/partial localStorage and each legacy combo.

### 4.2 Upgrades to existing controls
| Feature | Change |
|---|---|
| Align Text | `align: boolean` → `textAlign: "off"\|"left"\|"center"\|"right"\|"justify"` (5-button seg) |
| Contrast | `contrast: "off"\|"on"\|"dark"` → add `"light"` + `"high"` |
| Readable/Dyslexia Font | `font: boolean` → `font: "off"\|"readable"\|"dyslexic"` (seg) |

**Contrast effect definitions (architect P1-1 / a11y P1-10).** Each value needs a
concrete rule in `effects.ts`:
- `"on"` → `--mky-f-contrast: contrast(1.18)` (existing).
- `"high"` → `--mky-f-contrast: contrast(1.5)` (composes via the existing
  `body { filter: var(--mky-f-contrast,) var(--mky-f-sat,) }` seam).
- `"dark"` → `invert(1) hue-rotate(180deg)` + image re-invert (existing).
- `"light"` is **not a filter** — it forces a light surface:
  `html[data-mky-contrast="light"] body { background:#ffffff !important; color:#1a1a1a !important }`
  (optionally `--mky-f-contrast: brightness(1.05) contrast(1.05)`).
- `"light"`, `"dark"`, and the color palettes (§4.3) are **mutually exclusive** with the
  invert path — see §4.3 precedence.

**Readable/Dyslexia Font.** `"readable"` = the current Verdana stack. `"dyslexic"` uses
the OpenDyslexic embed in flight on `feat/a11y-font-embed`; until that merges, ship a
**safe stacked fallback** (`"OpenDyslexic", "Comic Sans MS", Verdana, …`) and wire the
real `@font-face` asset when it lands. **Coordinate before editing font code** (collision
risk — see HANDOFF).

### 4.3 New Color/Display tools
| Feature | New Pref field | Control | Effect |
|---|---|---|---|
| Adjust Text Colors | `textColor: string` ("" = off) | `makeColorPalette` (curated swatches + "off") | `--mky-text-color` → `body *:not(#makoya-widget-root) { color }` |
| Adjust Title Colors | `titleColor: string` | palette | `h1–h6 { color }` |
| Adjust Background Colors | `bgColor: string` | palette | `body { background }` |

**Swatch curation & legibility (a11y P1-4 / P2-14).** Palettes are **fixed, curated
lists — not free-entry pickers**. Each swatch carries a human-readable `name`
("Black", "Cream", "Dark blue") — never a hex string — because `makeColorPalette` builds
`aria-label="${group}: ${name}"`. Curation rule: text/title swatches exclude near-white
values (would vanish on light backgrounds); background swatches exclude near-black values
(would hide default dark body text). Goal: tools must not *actively harm* readability.
(No compliance/contrast *claims* in copy.)

**Composition / precedence (architect P1-2).** `contrast:"dark"` does `invert(1)` on
`<body>`, which flips any chosen colors; saturation/grayscale desaturates them. Therefore:
when `contrast:"dark"` (or `"light"`) is active, the color palettes are **disabled /
no-op** (last-set-wins, surfaced in the UI), and vice-versa. The selector
`body *:not(#makoya-widget-root)` is correct; the host is mounted on `<html>` (outside
`<body>`) and is Shadow-DOM encapsulated, so the `:not()` is belt-and-braces, not
load-bearing.

### 4.4 New Orientation / nav tools (live controllers in `ui/live.ts`-style modules)
All new controllers follow the existing `live.ts` contract: append at most their own
overlay to `document.documentElement`, `aria-hidden="true"` + `pointer-events:none` on
decorative overlays, fully reversible teardown, never throw.

| Feature | Pref | Mechanism |
|---|---|---|
| Text Magnifier | `magnifier: boolean` | Pointer-driven lens: a **fixed div appended to `document.documentElement`** (NOT shadow DOM — matches `makeRuler`/`makeMask`/`makeHoverHighlight`), `aria-hidden`, `pointer-events:none`, reads text, never edits host DOM. Documented as a **pointer/mouse** feature. |
| Read Mode | `readMode: boolean` | Extract main-article text via a Readability-style heuristic (read-only traversal, **max-node + time budget** so huge pages can't jank); render into **our own full-screen Shadow-DOM pane**. **Focus contract (a11y P0-1):** pane root `role="dialog"` + `aria-modal="true"`; on open focus moves to the pane heading; Tab/Shift+Tab trapped within the pane; Esc **and** the toggle close it and **return focus to the triggering panel control**; empty extraction renders an accessible in-pane message ("couldn't build a reading view for this page"), never an empty dialog. |
| Useful Links | `usefulLinks: boolean` | Scan page links; render a `<ul><li><a/button>` jump menu in the panel. Keyboard: items are sequential focus stops (Tab in/out); activating calls `el.scrollIntoView({behavior:"smooth"})` then `el.focus()` so AT announces the target. |
| Page Structure | `pageStructure: boolean` | List headings/landmarks/forms as a `<ul><li><button>` jump menu; same keyboard + scroll-and-focus contract as Useful Links. |
| Keyboard Nav shortcuts | `keyboardNav: boolean` | Quick-jump shortcuts + Tab focus ring. **Must use a modifier** (e.g. `Alt+M/H/F/B/G`) — bare single-letter global keys are **prohibited** because NVDA/JAWS/VoiceOver use single letters for their own navigation (a11y P1-7). Handlers never block AT keys. |

### 4.5 UserWay-parity extras (founder asked, full-strength)
| Feature | Pref | Mechanism |
|---|---|---|
| Virtual Keyboard | `virtualKeyboard: boolean` | On-screen keyboard overlay in **our** Shadow DOM. **Key buttons call `mousedown.preventDefault()`** so clicking a key does not steal focus from the host input (a11y P0-2). Text injection: primary path uses the **native `HTMLInputElement.prototype.value` setter** (`Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,"value").set`) + a bubbling `new InputEvent("input",{inputType:"insertText",data:key,bubbles:true})` so **React/Vue controlled inputs update** (architect P1-3); deprecated `execCommand("insertText")` is a legacy fallback only, wrapped in `try/catch`; if nothing works it fails silently. Explicitly **permitted input dispatch — not structural DOM rewriting** (§5 ruling). Does NOT suppress the OS soft-keyboard; documented as **pointer/desktop-primary**. |
| Voice Navigation | `voiceNav: boolean` | `webkitSpeechRecognition`; commands: "scroll down/up", "go to top/bottom", "click <link text>", "open menu". Activation is **focus-first then click** (`el.focus()` announces the target, then `el.click()`); only activates elements already in the a11y tree (not `aria-hidden`, not `disabled`); on multiple text matches, do nothing (optionally announce "multiple matches"). Feature-detected; mic-permission-gated; silent where unsupported; never throws. |

(TTS already shipped as `readAloud`.)

### 4.6 New chrome / backend
| Feature | Where | Notes |
|---|---|---|
| Reset Settings | panel footer | Already exists (`reset` → `Object.assign(prefs, DEFAULT_PREFS)` + `apply()`). Confirm `apply()` calls every new live controller's `disable()` so reset fully tears down. |
| Hide Interface | panel footer | Hides the launcher for the session (sessionStorage). **Restore path (architect P1-8):** the launcher returns automatically on the next session/page-load; document this in the User Guide so a visitor can't lock themselves out. |
| User Guide | panel | Small in-panel help section (i18n). **User-facing label = "Help" / "User guide"** — NOT "Accessible user guide" (a11y P2-13: avoid compliance framing). |
| Feedback Form | panel → `POST /api/widget-feedback` | Visitor reports an issue; server emails the site owner via the existing Resend seam (`lib/email`). **CORS (architect P0-2):** handles `OPTIONS` preflight, emits CORS headers, validates `Origin` against the registered site domain. Zod-validated; rate-limited via `checkRateLimit` (Upstash when configured, in-memory fallback otherwise); **service-role owner-email lookup by `siteId`**. Accessible UX (a11y P2-12): validation errors via `aria-describedby` on the offending input; success announced via a `role="status"` region ("Feedback sent"). Fail-silent in the widget. |
| Online Dictionary | panel → `dictionaryapi.dev` | On text-select (`window.getSelection()`), fetch a definition **client-side** (the API is CORS-enabled — no proxy route); render in the panel's **`aria-live="polite"` results region** (a11y P1-9); only the selected word leaves the page; fail-silent. |
| AI Text Simplification | `POST /api/widget-simplify` | **Ships OFF by default** behind a new per-site `aiSimplifyEnabled` `WidgetConfig` flag (added in Wave 0). When enabled: selected paragraph → Claude Haiku → simpler text shown in the panel's `aria-live` region (never rewrites host DOM). **CORS + origin validation** like feedback; strict rate-limit; requires `ANTHROPIC_API_KEY` in `apps/web` (raw `fetch` to the Anthropic API — no SDK dependency added). Off because it is the only recurring-cost / abuse-surface tool on a public widget; founder enables per plan. When the flag is off the route returns 404/403 before any model call. |

### 4.7 New profiles (complete accessiBe's 6)
Add **two** profiles so the set is a strict superset of accessiBe's six:
- `keyboardNav` — keyboard shortcuts (modifier-based) + enhanced focus + bigger targets.
- `clearReading` (renamed from `screenReader` — a11y P0-3) — readable font +
  skip-to-content + highlight titles/links. **Profile names are user-facing strings and
  fall under the same compliance-copy guardrail as body copy**, so the
  "screen reader" name (which implies the widget makes a site work with screen readers —
  a litigated overlay claim) is replaced with the neutral, descriptive "Clear reading".

### 4.8 Explicitly NOT in this round
- **33 UI languages** — pure translation/content effort, not feature engineering. Keep
  en/es/fr/de; the i18n type system already supports adding languages later.

## 5. Architecture & invariants (non-negotiable)

1. **Never rewrite the host DOM.** Read Mode, Magnifier, Page Structure, Virtual
   Keyboard, Voice Nav all *read* the page and render UI into our own overlay /
   Shadow DOM. Effects are CSS-variable/attribute + one stylesheet only.
2. **Filters & zoom on `<body>`, never `<html>`** (preserves fixed-widget stacking).
   Color/zoom/typography variables compose via the existing custom-property seam; the
   per-property gating attributes live on `<html>` but only drive `body`-scoped rules.
3. **Always fail-silent / fail-open.** Every network (dictionary, feedback, simplify),
   mic, speech, and storage path is guarded; the widget never throws, never blocks the page.
4. **Widget UI stays accessible** — real buttons, `aria-pressed`/`role`, Esc closes
   overlays, focus management on open/close. New surfaces add: stepper `role="status"`
   value announcement (§4.1), Read Mode focus trap + return (§4.4), modifier-gated
   shortcuts (§4.4), `aria-live` result regions for dictionary/simplify/feedback (§4.6).
5. **No compliance claims.** Tools/preferences language only; this now explicitly covers
   **feature and profile NAMES** (hence "Clear reading", "Help") — not just body copy.
6. **One config source of truth.** New `FeatureKey`s + `WidgetConfig` flags go in
   `packages/shared`; regenerate the `@makoya/shared` mirror (`npm run sync:shared`); CI
   drift gate (`apps/web/lib/shared-sync.test.ts`) must stay green.
7. **Dashboard parity.** Every new `FeatureKey` gets a `FEATURE_META` entry in
   **`apps/web/lib/customizer/feature-meta.ts`** (and the canonical order is re-derived in
   **`feature-order.ts`**) — NOT in `_CustomizeClient.tsx` as earlier drafts said. The
   meta-array order MUST equal `DEFAULT_CONFIG.featuresEnabled`.

**DOM-invariant rulings (a11y agent, for the build team).** All ACCEPTABLE with the
named guard-rails: Read Mode (read-only extract → our pane), Virtual Keyboard (synthetic
`InputEvent` on existing nodes = input dispatch, with `mousedown.preventDefault()`), Voice
Nav (`el.click()` on existing a11y-tree elements), Page Structure/Useful Links
(`el.focus()` navigation), Color (CSS vars on `<html>` don't create stacking contexts),
Magnifier (fixed div on `documentElement`, `aria-hidden`+`pointer-events:none`),
Dictionary (`getSelection()` read-only).

## 6. Per-feature change recipe (applies to each)

`FeatureKey` + any `WidgetConfig` flag (shared) → `Prefs` field + `DEFAULT_PREFS` +
`migratePrefs` + `applyPrefs` (state.ts) → effect (effects.ts CSS-var / a new live
controller module) → panel control (features.ts `buildFeature` + controls.ts) → section
assignment (`FEATURE_SECTION` in ui.ts) → live-controller construction + `apply()` wiring
in ui.ts → `activeFeatureKeys` telemetry mapping in ui.ts → i18n strings ×4 langs
(i18n.ts `StringKey` union + all 4 `STRINGS` records) → `FEATURE_META`
(`apps/web/lib/customizer/feature-meta.ts`) + `feature-order.ts` → `npm run sync:shared`
→ unit test.

## 7. Build plan (waves — execution model corrected per architect P0-4)

Because every "lane" in the old plan edited the same shared files
(`packages/shared`, `state.ts`, `effects.ts`, `features.ts`, `ui.ts`, `i18n.ts`), true
parallel editing would guarantee merge conflicts and `featuresEnabled`-order drift. New
model: **lock the whole surface single-threaded first, author per-feature logic in NEW
modules, then integrate single-threaded.** Given single-developer + agent execution,
shared-file wiring is **serialized** in Wave 3, not parallelized.

**Wave 0 — Lock the entire surface (single-threaded).**
- `packages/shared`: full final `FeatureKey` union; final `DEFAULT_CONFIG.featuresEnabled`
  **order**; new `WidgetProfileKey` values (`keyboardNav`, `clearReading`); new
  `WidgetConfig` flag `aiSimplifyEnabled`.
- `state.ts`: full numeric/string `Prefs` model + `DEFAULT_PREFS` + pure `migratePrefs` +
  `applyPrefs` writing the per-property gating attributes/vars.
- `effects.ts`: per-property typography refactor (independent gated vars), Contrast
  `light`/`high`, Content Scaling `zoom`, color-var scaffolding. Keep the attribute model
  for on/off effects.
- `controls.ts`: add `role="status"` to the stepper value span.
- `i18n.ts`: full `StringKey` union with English strings + 4-lang placeholders (so Wave 2
  modules typecheck — `StringKey` is a closed, completeness-enforced union).
- Reviewer: `ecc:typescript-reviewer`. **Gate:** `npm run ci` + `node test-widget.mjs`
  green before any later wave builds on it.

**Wave 1 — Backend routes (parallel with nothing that touches them).**
`/api/widget-feedback` and `/api/widget-simplify` (flag-gated OFF). Both: `OPTIONS`
preflight + CORS + `Origin`-vs-site validation, Zod, `checkRateLimit`, service-role.
Feedback: owner-email lookup by `siteId` + Resend seam. Simplify: `ANTHROPIC_API_KEY` raw
fetch, 404/403 when the flag is off. Confirm Upstash creds exist (else documented
in-memory fallback). Route tests. Reviewer: `ecc:security-reviewer`.

**Wave 2 — Feature MODULE authoring (parallelizable because outputs are new files).**
Each lane delivers **new modules + unit tests only** — NOT edits to the shared
switch/apply/i18n/state/effects:
- Lane A: % adjuster + seg semantics (validated against the Wave-0 `Prefs`/effects).
- Lane B: color-effect CSS additions + palette swatch tables.
- Lane C: `live-magnifier.ts`, `live-readmode.ts` (focus-trap pane), useful-links /
  page-structure builders.
- Lane D: `virtual-keyboard.ts`, `voice-nav.ts`.
- Lane E: dictionary client, feedback-form control, hide-interface, user-guide content,
  the two new profile definitions.
Each module reviewed by `ecc:typescript-reviewer`; widget-invariant audit by
`ecc:a11y-architect`.

**Wave 3 — Single-threaded INTEGRATION.** Wire the new modules into `buildFeature`,
`FEATURE_SECTION`, the live-controller construction block + `apply()`, and
`activeFeatureKeys` (ui.ts). Finalize `featuresEnabled` order == `feature-meta.ts` order;
add `FEATURE_META` + `feature-order.ts` entries; polish en/es/fr/de translations;
`npm run sync:shared`; fix the drift test.

**Wave 4 — QA + ship.** QA-before (`npm run ci` on updated `main` base + branch),
`node test-widget.mjs`, `npm run build:widget` + copy bundles, high-effort `/code-review`
of the full diff, security review of new routes, fix findings, QA-after on `main`
post-merge. Merge to `main`; `cd apps/web && vercel --prod --yes`; live smoke (loader
`?t=`, config gate, panel renders, a few effects apply, one new route). Update STATUS.md +
SESSION.md; re-seed gbrain.

## 8. Testing

- **Unit (tsx, widget):** `migratePrefs` table (each legacy combo maps AND strips old
  keys; malformed/partial localStorage → defaults); a `html{font-size:62.5%}` rem-base
  site is **unchanged at `fontScale=100`** (the P0-1 regression guard); each new effect
  sets/clears the right gated var/attribute; each live controller is reversible (on→off
  leaves zero residue); Read Mode focus contract (focus in, Esc returns focus); fail-silent
  paths (no speech API, fetch rejects) don't throw.
- **Customizer:** every `FeatureKey` has a `FEATURE_META` entry and `feature-order`
  position (existing-style test).
- **Shared drift:** mirror regenerated; `shared-sync.test.ts` green.
- **Backend:** route tests — Zod reject, rate-limit, **CORS preflight (`OPTIONS`) on both
  routes**, owner-email lookup, simplify flag-off → 404/403, controlled-input update
  dispatched by Virtual Keyboard.
- **Smoke:** `node test-widget.mjs` proves render; live post-deploy checks.

## 9. Risks

- **effects.ts refactor** is the highest-blast-radius change. Mitigated by: per-property
  independent gating (default = inert), keeping the attribute model for on/off effects,
  the 62.5%-rem regression test, and Wave 0 gated before anything builds on it.
- **Voice Nav / Virtual Keyboard** browser variance → strict feature detection, silent
  absence, no thrown errors; controlled-input carve-out via native value setter; manual
  cross-browser smoke.
- **AI Simplify cost/abuse** → ships OFF, per-site flag, hard rate limit, 404/403 when off.
- **Read Mode** parsing variance → max-node/time budget; if extraction finds too little,
  show a clear accessible "couldn't build a reading view" message rather than a broken or
  empty pane.
- **Cross-origin routes** → CORS + `Origin` validation, else feedback/simplify are dead on
  arrival on customer domains.
- **Housekeeping:** `feature-order.ts` carries stale "17/15-key" comments — refresh as the
  key count grows.

---

## Appendix A — accessiBe full feature inventory (research, 2026-06-30)

Profiles (6): Seizure Safe, Vision Impaired, ADHD Friendly, Cognitive
Disability, Keyboard Navigation (Motor; M/H/F/B/G shortcuts), Blind/Screen
Reader. Content (10): Content Scaling ±%, Font Sizing ±%, Line Height ±%,
Letter Spacing ±%, Align (L/C/R/Justify), Readable Font, Dyslexia Font,
Highlight Titles, Highlight Links, Text Magnifier. Color/Display (9): Dark
Contrast, Light Contrast, High Contrast, Monochrome, High Saturation, Low
Saturation, Adjust Text/Title/Background Colors (palettes). Orientation (11):
Mute Sounds, Hide Images, Read Mode, Reading Guide, Reading Mask, Stop
Animations, Highlight Hover, Highlight Focus, Big Black Cursor, Big White
Cursor, Useful Links. Chrome (9): Language selector (33), Online Dictionary
(API), AI Text Simplification, Statement link, Accessible User Guide, Feedback
Form, Reset, Hide Interface, Keyboard shortcuts / Page Structure nav. NOT in
accessiBe (UserWay only): in-panel TTS, Voice Navigation, Virtual Keyboard.
