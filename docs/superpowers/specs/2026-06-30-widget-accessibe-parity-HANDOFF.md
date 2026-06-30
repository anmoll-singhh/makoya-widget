# HANDOFF — Widget accessiBe Parity build (resume here)

**Read this first, then the spec next to it.** This file lets a fresh Claude
Code session pick up the accessiBe-parity widget build with zero loss.

## Where we are (as of 2026-06-30)

- **Branch:** `feat/widget-accessibe-parity` (off `main`).
- **Done:** competitive research (accessiBe + UserWay) complete; full design
  spec written + committed. **No widget/app code changed yet.** Working tree is
  clean except this handoff.
- **Spec (the source of truth for what to build):**
  `docs/superpowers/specs/2026-06-30-widget-accessibe-parity-design.md`
  (commit `fc315a5`).
- **Next action:** start **Wave 0** (foundation). Nothing is built yet.

## Locked founder decisions (do NOT re-ask)

1. Adjusters become **full `%` steppers** (replace fixed steps + binary toggles).
2. Scope = **everything accessiBe has + UserWay extras** (Voice Nav, Virtual
   Keyboard) built **full-strength**. (TTS already exists as `readAloud`.)
3. **Dictionary** = free public `dictionaryapi.dev`, fail-silent.
4. **AI Text Simplification** ships **OFF** (per-site flag) — recurring cost /
   abuse surface.
5. **33 languages = NOT this round** (translation/content task). Keep en/es/fr/de.
6. Delivery = **build → QA → deploy live** (`cd apps/web && vercel --prod`).

## The build plan (waves — full detail in the spec §7)

- **Wave 0 (single-threaded, do first):** `packages/shared` new `FeatureKey`s;
  `state.ts` numeric Prefs model + **backward-compat migration** (`text:1|2|3`→
  `fontScale`, `spacing:true`→`lineHeightPct`+`letterSpacingPct`, `align:true`→
  `textAlign:"left"`); `effects.ts` refactor to **CSS custom properties** for
  continuous values (keep attribute model for on/off effects). **Gate:**
  `npm run ci` + `node test-widget.mjs` green before Wave 2. Reviewer:
  `ecc:typescript-reviewer`.
- **Wave 1 (backend):** `POST /api/widget-feedback` (emails owner via Resend
  seam, Zod, Upstash rate-limit, service-role) + `POST /api/widget-simplify`
  (flag-gated OFF, Claude Haiku). Reviewer: `ecc:security-reviewer`.
- **Wave 2 (parallel lanes, isolated file areas):**
  - A: % adjusters + Align seg (L/C/R/Justify) + Contrast light/high + Font
    readable/dyslexic seg.
  - B: Color palettes (text/title/background).
  - C: Magnifier, Read Mode, Useful Links, Page Structure.
  - D: Keyboard-Nav shortcuts (M/H/F/B/G), Virtual Keyboard, Voice Nav.
  - E: Dictionary, Feedback Form, Hide Interface, User Guide, 2 new profiles
    (`keyboardNav`, `screenReader`).
  Each lane reviewed by `ecc:typescript-reviewer` + invariants by
  `ecc:a11y-architect`.
- **Wave 3:** wire keys into `ui/features.ts`, author en/es/fr/de i18n, add
  `FEATURE_META` in `_CustomizeClient.tsx`, `npm run sync:shared`, fix
  `shared-sync.test.ts`.
- **Wave 4:** QA-before/after (`npm run ci`), `build:widget` + copy bundles,
  high-effort `/code-review` of the diff, security review, fix findings, merge
  to `main`, deploy, live smoke, update STATUS.md + SESSION.md, re-seed gbrain.

## Per-feature recipe (every feature follows this)

`FeatureKey` (packages/shared) → `Prefs` field + migration + `applyPrefs`
(state.ts) → effect (effects.ts CSS-var / live.ts controller) → panel control
(ui/features.ts + ui/controls.ts) → i18n ×4 (ui/i18n.ts) → `FEATURE_META`
(_CustomizeClient.tsx) → `npm run sync:shared` → vitest.

## Hard invariants (spec §5 — never violate)

Never rewrite host DOM (Read Mode/Magnifier/VKbd/Voice render in OUR overlay);
filters & zoom on `<body>` not `<html>`; everything fail-silent/fail-open;
widget never throws; widget UI stays accessible (real buttons, aria, Esc, focus);
no WCAG/ADA/"compliant" copy; regenerate the `@makoya/shared` mirror (never
hand-edit it); CI drift gate must stay green.

## Coordination warnings (multi-agent repo)

- **Collision risk:** sibling worktree `feat/a11y-font-embed` (OpenDyslexic
  embed) touches widget `state.ts`/`effects.ts`. Our Font readable/dyslexic seg
  should ship a **safe stacked-font fallback** and wire the real OpenDyslexic
  asset only after that branch merges. Coordinate before editing the font code.
- Other active sibling lanes: `feat/a11y-feature-wave`, `feat/mike-pricing-
  entitlements`. Stay in OUR branch/worktree; don't edit their files.
- Deploy ONLY via `cd apps/web && vercel --prod --yes` (GitHub auto-deploy is
  disconnected). Git author email must be `anmol.singhh17@gmail.com`. See
  STATUS.md §⚠️ DEPLOY.

## Resume commands (new session, repo root `C:\Users\ANMOL\Desktop\makoya`)

```bash
git checkout feat/widget-accessibe-parity
git pull --ff-only            # if pushed; else it's local-only
git log --oneline -3          # expect fc315a5 docs(spec) on top (+ this handoff)
npm ci                        # if node_modules missing
```

Then tell the new session:
> Read docs/superpowers/specs/2026-06-30-widget-accessibe-parity-HANDOFF.md and
> the design spec beside it, then begin Wave 0. Decisions are locked — do not
> re-ask. Build → QA → deploy live with specialist-agent review per the plan.
