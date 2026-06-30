# Widget — accessiBe Parity + Superiority (Design Spec)

**Date:** 2026-06-30
**Branch:** `feat/widget-accessibe-parity`
**Status:** Design — pending founder review
**Author:** Claude (Opus 4.8)

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
| Content Scaling | `contentScale: number` | 70–150 % / 10 | 100 | `--mky-zoom` → `body { zoom }` *(with transform fallback)* |
| Font Sizing | `fontScale: number` (replaces `text:0\|1\|2\|3`) | 80–200 % / 10 | 100 | `--mky-font-scale` → `html { font-size: calc(100% * var) }` |
| Line Height | `lineHeightPct: number` (from `spacing`) | 100–250 % / 10 | 100 | `--mky-line-height` |
| Letter Spacing | `letterSpacingPct: number` (new) | 0–50 (×0.01em) / 5 | 0 | `--mky-letter-spacing` |

`effects.ts` moves from enumerated `data-mky-*` attributes to **CSS custom
properties** set inline on `<html>` (continuous values can't be enumerated).
One `data-mky-typo="on"` attribute gates the variable-driven rules so defaults
stay untouched. Filters/zoom invariant preserved (zoom on `<body>`, not `<html>`).

**Backward-compat migration (`loadPrefs`):** old `text:1\|2\|3` →
`fontScale 112\|125\|140`; old `spacing:true` → `lineHeightPct 180` +
`letterSpacingPct 4`; old `align:true` → `textAlign:"left"`. Unknown/missing →
defaults. Migration is pure and covered by tests.

### 4.2 Upgrades to existing controls
| Feature | Change |
|---|---|
| Align Text | `align: boolean` → `textAlign: "off"\|"left"\|"center"\|"right"\|"justify"` (4-button seg) |
| Contrast | `contrast: "off"\|"on"\|"dark"` → add `"light"` + `"high"` (accessiBe Dark/Light/High Contrast) |
| Readable/Dyslexia Font | `font: boolean` → `font: "off"\|"readable"\|"dyslexic"` (seg). Dyslexic uses the OpenDyslexic embed already in flight on `feat/a11y-font-embed`; if that hasn't merged, ship a safe stacked fallback and wire the real font when it lands. |

### 4.3 New Color/Display tools
| Feature | New Pref field | Control | Effect |
|---|---|---|---|
| Adjust Text Colors | `textColor: string` ("" = off) | `makeColorPalette` (~10 swatches + "off") | `--mky-text-color` → `body *:not(widget) { color }` |
| Adjust Title Colors | `titleColor: string` | palette | `h1–h6 { color }` |
| Adjust Background Colors | `bgColor: string` | palette | `body { background }` (text-color-aware) |

Color overrides are scoped to skip the widget host (`#makoya-widget-root`) and
compose under the existing body-filter invariant.

### 4.4 New Orientation / nav tools (live controllers in `ui/live.ts`)
| Feature | Pref | Mechanism |
|---|---|---|
| Text Magnifier | `magnifier: boolean` | hover lens overlay (Shadow-DOM/`documentElement` fixed div, reads text, never edits host DOM) |
| Read Mode | `readMode: boolean` | extract main article text via Readability-style heuristic, render into **our own** full-screen Shadow-DOM reading pane; host DOM untouched; Esc/toggle closes |
| Useful Links | `usefulLinks: boolean` | scan page links, render a jump-menu in the panel; click scrolls + focuses |
| Page Structure | `pageStructure: boolean` | list headings/landmarks/forms; jump-navigation menu |
| Keyboard Nav shortcuts | `keyboardNav: boolean` | M/H/F/B/G quick-jump key handlers + Tab focus ring (accessiBe Keyboard profile) |

### 4.5 UserWay-parity extras (founder asked, full-strength)
| Feature | Pref | Mechanism |
|---|---|---|
| Virtual Keyboard | `virtualKeyboard: boolean` | on-screen keyboard overlay; types into the focused host input via `execCommand`/`InputEvent`; fully in our overlay |
| Voice Navigation | `voiceNav: boolean` | `webkitSpeechRecognition`; commands: "scroll down/up", "go to top/bottom", "click <link text>", "open menu". Feature-detected; mic-permission-gated; silent where unsupported; never throws |

(TTS already shipped as `readAloud`.)

### 4.6 New chrome / backend
| Feature | Where | Notes |
|---|---|---|
| Reset Settings | panel footer | already exists (`reset`) — confirm covers new fields |
| Hide Interface | panel footer | hides launcher for the session (sessionStorage) |
| Accessible User Guide | panel | small in-panel help section (i18n) |
| Feedback Form | panel → `POST /api/widget-feedback` | visitor reports an issue; server emails the site owner via the existing Resend seam; rate-limited (Upstash), Zod-validated, service-role write; fail-silent in widget |
| Online Dictionary | panel → `dictionaryapi.dev` | on text-select, fetch definition; render in panel; only the selected word leaves the page; fail-silent |
| AI Text Simplification | `POST /api/widget-simplify` | **ships OFF by default** behind a per-site flag + strict rate-limit; selected paragraph → Claude Haiku → simpler text shown in panel (never rewrites host DOM). Off because it is the only recurring-cost / abuse-surface tool on a public widget. Founder enables per plan. |

### 4.7 New profiles (complete accessiBe's 6)
Add `keyboardNav` (keyboard shortcuts + enhanced focus + bigger targets) and
`screenReader` (readable font + skip-to-content + highlight titles/links) so the
profile set is a strict superset of accessiBe's six.

### 4.8 Explicitly NOT in this round
- **33 UI languages** — pure translation/content effort, not feature
  engineering. Keep en/es/fr/de; the i18n type system already supports adding
  languages later. (Noted, not built.)

## 5. Architecture & invariants (non-negotiable)

1. **Never rewrite the host DOM.** Read Mode, Magnifier, Page Structure, Virtual
   Keyboard, Voice Nav all *read* the page and render UI into our own overlay /
   Shadow DOM. Effects are CSS-variable/attribute + one stylesheet only.
2. **Filters & zoom on `<body>`, never `<html>`** (preserves fixed-widget
   stacking). Color/zoom variables compose via the existing custom-property seam.
3. **Always fail-silent / fail-open.** Every network (dictionary, feedback,
   simplify), mic, speech, and storage path is guarded; the widget never throws
   and never blocks the page.
4. **Widget UI stays accessible** — real buttons, `aria-pressed`/`role`, Esc
   closes overlays, focus management on open/close.
5. **No compliance claims.** Tools/preferences language only; no
   WCAG/ADA/"guaranteed accessible" copy.
6. **One config source of truth.** New `FeatureKey`s go in `packages/shared`;
   regenerate the `@makoya/shared` mirror (`npm run sync:shared`); CI drift gate
   must stay green.
7. **Dashboard parity.** Every new `FeatureKey` gets a `FEATURE_META` entry so
   site owners can enable/disable it; the live preview keeps working.

## 6. Per-feature change recipe (applies to each)

`FeatureKey` (shared) → `Prefs` field + migration + `applyPrefs` (state.ts) →
effect (effects.ts CSS-var / live.ts controller) → panel control
(features.ts + controls.ts) → i18n strings ×4 langs → `FEATURE_META`
(customizer) → `sync:shared` → unit test.

## 7. Build plan (waves; parallel subagents each reviewed by a specialist)

**Wave 0 — Foundation (single-threaded; touches shared + state + effects core).**
New/changed `FeatureKey`s; Prefs numeric model + migration; effects.ts
CSS-variable refactor; controls already provide `makeStepper`/`makeSeg`/
`makeColorPalette`. Reviewer: `ecc:typescript-reviewer`. Gate: `npm run ci` +
`node test-widget.mjs` green before Wave 2 starts.

**Wave 1 — Backend routes (parallel with nothing else that touches them).**
`/api/widget-feedback`, `/api/widget-simplify` (flag-gated, off), Zod + rate
limit + tests. Reviewer: `ecc:security-reviewer`.

**Wave 2 — Feature lanes (parallel subagents, isolated by file area):**
- Lane A: % adjusters (Content Scaling, Font, Line Height, Letter Spacing) + Align seg + Contrast light/high + Font readable/dyslexic seg.
- Lane B: Color palettes (text/title/background).
- Lane C: Magnifier, Read Mode, Useful Links, Page Structure.
- Lane D: Keyboard Nav shortcuts, Virtual Keyboard, Voice Nav.
- Lane E: Dictionary, Feedback Form, Hide Interface, User Guide, new profiles.
Each lane reviewed by `ecc:typescript-reviewer`; widget-invariant audit by
`ecc:a11y-architect`.

**Wave 3 — Surface + i18n + mirror.** Wire all keys into `features.ts`, author
en/es/fr/de strings, add `FEATURE_META`, `sync:shared`, fix the drift test.

**Wave 4 — QA + ship.** QA-before (`npm run ci` on updated `main` base + branch),
`node test-widget.mjs`, `npm run build:widget` + copy bundles, high-effort code
review of the full diff, security review of new routes, fix findings,
QA-after on `main` post-merge. Merge to `main`; `cd apps/web && vercel --prod`;
live smoke (loader `?t=`, config gate, panel renders, a few effects apply).
Update STATUS.md + SESSION.md; re-seed gbrain.

## 8. Testing

- **Unit (vitest, widget):** Prefs migration table; each new effect sets/clears
  the right CSS var/attribute; each live controller is reversible (on→off leaves
  zero residue); fail-silent paths (no speech API, fetch rejects) don't throw.
- **Customizer:** every `FeatureKey` has `FEATURE_META` (existing-style test).
- **Shared drift:** mirror regenerated; `shared-sync.test.ts` green.
- **Backend:** route tests (Zod reject, rate-limit, owner-email lookup,
  simplify flag-off → 404/403).
- **Smoke:** `node test-widget.mjs` proves render; live post-deploy checks.

## 9. Risks

- **effects.ts refactor** is the highest-blast-radius change (every existing
  effect routes through it). Mitigated by: keep the attribute model for
  on/off effects, add the variable model only for continuous ones; full
  migration tests; Wave 0 gated before anything builds on it.
- **Voice Nav / Virtual Keyboard** browser variance → strict feature detection,
  silent absence, no thrown errors; manual cross-browser smoke.
- **AI Simplify cost/abuse** → ships OFF, per-site flag, hard rate limit.
- **Read Mode** parsing variance → if extraction finds too little, show a clear
  "couldn't build a reading view for this page" message rather than a broken pane.

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
