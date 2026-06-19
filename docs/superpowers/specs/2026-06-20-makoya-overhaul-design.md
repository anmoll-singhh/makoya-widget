# Makoya Overhaul — Widget + Client Dashboard + Admin Dashboard

**Date:** 2026-06-20
**Status:** Approved design → spec (pending user spec-review)
**Goal:** Make Makoya's widget and dashboards the best-in-class accessibility-widget product — better UX, mobile, performance, and honesty than the incumbents (accessiBe, UserWay, AudioEye, EqualWeb).

---

## 0. Context & constraints

The product is **live** at https://makoya-gamma.vercel.app (Vercel prod, code on `origin/main`, widget served from `/widget/loader.js`). Test logins (`Makoya2026!`): admin `anmols@wavesmvmnt.com`, client `anmol.singhh17@gmail.com`.

Hard constraints (carried from CLAUDE.md / SESSION.md):

- **`@makoya/shared` is VENDORED** at `apps/web/lib/shared/index.ts` (mirror of `packages/shared/src/index.ts`). **Edit BOTH** when changing config/icons/FeatureKey.
- Widget build: `cd packages/widget && npm run build` → copy `dist/{loader,core}.js` to `apps/web/public/widget/`, then redeploy.
- Widget rules: always render with fallback; **effects via attributes + one stylesheet only — never rewrite the DOM**; UI in Shadow DOM; the widget itself must be accessible; persist prefs across SPA nav; keep the contrast/dark "mounted on `<html>`, filter on `<body>`" fix.
- **No "WCAG/ADA/Section-508 compliant" or "guaranteed accessible" legal claims** in user-facing copy. Describe accessibility *preferences/tools*, not compliance. (Reinforced by the **April 2025 FTC $1M order against accessiBe** for deceptive compliance claims.)
- Reuse existing data layers: `lib/sites`, `lib/admin`, `lib/scans`. Multi-tenant RLS; `leads`/service-role rules unchanged.
- Deploy each phase: `cd apps/web && vercel --prod --yes --scope anmolsinghh17-9375s-projects`; verify live; keep `SESSION.md` current.
- QA pattern: node script stubs `globalThis.WebSocket`, GoTrue password sign-in, mints `@supabase/ssr` cookie, drives the **live** app with Playwright + screenshots (shadow-DOM pierce; wait `state:"attached"` for the zero-size widget host). Scratch scripts live at `apps/web/_*.mjs` (gitignored), run, then delete.

## 1. Competitive research (informs feature set + positioning)

Incumbent feature taxonomy (accessiBe / UserWay / AudioEye / EqualWeb / Helperbird):

- **Profiles:** Motor-impaired, Blind, Color-blind, Dyslexia, Low-vision, Cognitive/Learning, Seizure/Epileptic, ADHD, Senior.
- **Content:** font size, line/letter/word spacing, dyslexia-friendly font, readable font, text align (left), highlight links, highlight titles/headings.
- **Color:** dark / light / high-contrast / invert; saturation low / high / monochrome (grayscale); color-tint screen mask.
- **Navigation/reading:** big cursor (black/white), reading mask (dim band), reading guide (line follows cursor), stop animation, hide images, mute sounds.
- **Audio:** click-to-speech read-aloud (SpeechSynthesis).
- **Meta:** accessibility statement link, language selector, reset, save preferences.

**Where Makoya wins (differentiators, not parity):**
1. **Premium glass UI** — incumbents look dated/clunky; ours is a polished glassmorphic panel.
2. **Genuinely good mobile** — incumbents are cramped/cut-off on phones; ours is a true full-width bottom sheet.
3. **Performance + safety** — attribute-only effects, one stylesheet, no DOM rewriting, no fighting assistive tech (overlays are notorious here).
4. **Honest copy** — accessibility *tools*, never "compliance guaranteed." This is a trust/legal moat post-FTC.
5. **Operator-led onboarding + instant-preview customizer** — clients get a configured widget on day one and tune it live.

## 2. Phasing (each phase ends: build → deploy → live-QA → check-in)

- **Phase 0 — Foundation** (shared, no UI): expand config (both mirrors), Add-customer onboarding, admin issue counts.
- **Phase 1 — WS1 Widget** redesign (vanilla TS + Shadow DOM, glass CSS, mobile sheet, new effects).
- **Phase 2 — WS2 Client dashboard** (customizer-first, shadcn).
- **Phase 3 — WS3 Admin dashboard** (clients overview worst-first, shadcn).

Each workstream uses the multi-agent pipeline (implementer + independent reviewer + fix loop + final review).

---

## Phase 0 — Foundation

### 0.1 Shared config (edit `packages/shared/src/index.ts` AND `apps/web/lib/shared/index.ts`, keep identical)

**New `FeatureKey`s** (visibility-gated toggles; `featuresEnabled` only controls which controls render, so pref shape can change freely):
`saturation`, `readingMask`, `highlightTitles`, `textAlign`, `muteSounds`, `readAloud`.
Existing keys retained: `textSize`, `lineSpacing`, `contrast`, `stopMotion`, `readingRuler`, `highlightLinks`, `bigCursor`, `readableFont`, `hideImages`. **Total: 15.**

> `bigCursor` stays a single key; its *pref value* becomes a 3-way choice (`off | black | white`) handled in widget `state.ts`/`effects.ts` — no key churn.
> `saturation` pref = `off | grayscale | low | high`. `readingMask` pref = `off | dim | tint` (dim band vs color-tint overlay) — covers both market "reading mask" and "screen color mask".

**New scalar config fields** (stored in the existing config JSON → **no DB migration**):
- `launcherSize`: `"sm" | "md" | "lg"` (default `md`)
- `defaultProfile`: profile id (`vision | low-vision | dyslexia | adhd | seizure | senior | cognitive`) or `"none"` (default `none`) — applied on first widget open for that visitor.
- `accessibilityStatementUrl`: `string` (default `""` → link hidden when empty)
- `defaultLanguage`: `"en" | "es" | "fr" | "de"` (default `en`)
- `panelTitle`: `string` (default `""` → falls back to built-in i18n title). **Branding field — paid-gated** alongside existing `hideBranding`.

`DEFAULT_CONFIG` gets all new fields; `featuresEnabled` default = all 15. `resolveConfig` unchanged in logic (spread merge). Extend `apps/web/lib/shared-config.test.ts`.

### 0.2 Onboarding — operator creates the customer (service-role)

- `lib/admin.ts → createCustomer({ email, domain, plan? })`:
  1. service-role `auth.admin.createUser({ email, email_confirm: true, password: <generated> })` (idempotent: if the user exists, reuse their id).
  2. `createSite(adminClient, newUserId, domain)` so the site is pre-owned by the client.
  3. return `{ email, tempPassword, siteId }` for the operator to hand over. Magic-link login still works; **no email vendor needed**.
- New route `POST /api/admin/customers` (admin-gated via existing admin guard). Validates email + domain. Returns the handover payload.
- Consumed by WS3 admin UI ("Add customer" button) and implicitly enables WS2 (client logs in → site already exists).
- Clients no longer self-add sites — WS2 removes/redirects the self-serve add path.

### 0.3 Admin data layer — issue counts for worst-first sort

- Extend `AdminSiteRow` with `latestScore: number | null` and `issueCount: number | null` (from the latest scan's totals).
- Update `listAdminSites()` to fetch each site's latest scan totals (one query joined/aggregated; keep the existing perf-logging pattern). Add a unit test in the `admin-*.test.ts` style.

**Phase 0 done when:** typecheck + unit tests pass; both shared mirrors identical; `POST /api/admin/customers` creates auth user + site (verified by a scratch service-role script); `listAdminSites()` returns issue counts. Deploy + smoke-check the config API still serves new fields with safe defaults for old sites.

---

## Phase 1 — WS1 Widget redesign (`packages/widget`, vanilla TS, Shadow DOM)

**UI / visual:**
- Glassmorphism: translucent panel, `backdrop-filter: blur`, 1px hairline border, soft shadow, on-brand accent. **Text legibility:** a slightly-opaque solid layer sits behind text so contrast stays AA over the glass.
- Clear section headers (Profiles · Content · Color · Navigation · Audio · About), plain labels, **Quick Profiles on top**.
- Launcher honors `launcherSize` + `position` + `launcherIcon` + `primaryColor`.

**Mobile fix (the priority bug) — `@media (max-width: 480px)`:**
- Panel becomes a **full-width bottom sheet**: pinned to bottom, `width:100%`, rounded **top** corners, `max-height: 85dvh` with internal scroll, `env(safe-area-inset-*)` padding, ≥44px touch targets, larger close button. Verify on **390×844** that the whole panel is visible and legible.

**New effects (attribute-based on `html[data-mky-*]`, one stylesheet; keep `<html>`-mount/`<body>`-filter fix; no DOM rewrite):**
- `saturation`: grayscale / low / high (CSS filter on `<body>`, same containing-block strategy as contrast).
- `readingMask`: moving dim band that follows the pointer (dim mode) and a color-tint overlay (tint mode); overlay is `pointer-events:none`.
- `highlightTitles`: outline/background on `h1–h6`.
- `bigCursor`: off / black / white (cursor SVG via CSS `cursor`).
- `textAlign`: force left-align.
- `muteSounds`: mute all `<audio>`/`<video>` + intercept `play()` volume (attribute-gated; reversible).
- `readAloud`: SpeechSynthesis — when on, clicking page text reads it aloud (respect `defaultLanguage` for voice); clean toggle-off cancels speech.

**Meta:**
- **Accessibility-statement** link (shown only when `accessibilityStatementUrl` set).
- **Language selector** (en/es/fr/de) translating the widget's own labels; structure RTL-safe for future. `defaultLanguage` seeds it.
- Keep **Reset** + **Save preferences** (localStorage, with safe fallback).

**A11y of the widget itself (unchanged guarantees):** `aria-modal`, focus trap, Esc closes, focus returns to launcher, `role=group`/`role=switch` + `aria-pressed`/`aria-checked`, AA contrast.

**Done when:** build succeeds; `node test-widget.mjs` passes; live screenshots (desktop **and** 390×844) prove the panel renders and **every** new effect visibly changes the page; bundles copied to `apps/web/public/widget` and deployed.

---

## Phase 2 — WS2 Client dashboard (`apps/web`, React/Next + shadcn + design skills)

- **Init shadcn** in `apps/web` (`vercel:shadcn` skill), Tailwind tokens aligned to brand.
- **Landing = the live Customizer** for the client's assigned site (no "add site" step). If multiple sites → a **site switcher** (Select).
- **Customizer:** big **live preview** (renders the real widget against the current config) + grouped controls:
  - Appearance: `primaryColor`, `launcherIcon`, `launcherSize`, `position`.
  - Features: toggle which of the 15 `featuresEnabled` show, reorderable list (display order).
  - Behavior: `defaultProfile`, `defaultLanguage`.
  - Branding (**paid-gated**: disabled with an upsell when plan = free): `hideBranding`, `panelTitle`, `accessibilityStatementUrl`.
  - Save → `PUT /api/sites/[id]/config` (existing). Instant preview updates on every change (debounced save).
- **Separate "Scanner & report" tab/page:** latest score + issue breakdown + "Get full report / book a call" CTA (existing consultation flow). Re-scan button.
- Keep the **account/profile** page.

**Done when:** client login lands on the customizer for their pre-assigned site; every control updates the live preview and persists; report tab shows score/issues + CTA; live-QA screenshots pass; deployed.

---

## Phase 3 — WS3 Admin dashboard (`apps/web`, shadcn + design skills)

- **Clients overview** (every customer): email, site domain(s), **latest score**, **issue count**, plan, **open consultation requests** count.
- **Default sort = most issues → fewest** (worst on top). Key columns sortable (issues, score, plan, email).
- **Add customer** button → calls `POST /api/admin/customers`, shows the handover payload (email + temp password + site id) to copy.
- **Open a customer** → detail: change plan (`updateSitePlan`), scan history, consultation requests (existing `getAdminSiteDetail`), link to their site config.
- Clean, fast, scannable (shadcn DataTable, stat cards, pills for score/plan/status).

**Done when:** overview lists all customers sorted worst-first with correct issue counts; Add-customer creates a working login + site (verified by logging in as the new client); plan changes persist; live-QA screenshots pass; deployed.

---

## Risks & mitigations
- **Old sites missing new config fields** → `resolveConfig` spread over `DEFAULT_CONFIG` guarantees safe defaults; config API never 500s (existing guard).
- **SpeechSynthesis / backdrop-filter browser support** → feature-detect; degrade gracefully (read-aloud control hidden if unavailable; glass falls back to solid translucent bg).
- **Context loss over a long run** → per-phase checkpoints + keep SESSION.md current after each deploy.
- **shadcn + existing Tailwind conflicts** → init carefully, reconcile `globals.css` tokens; keep existing brand fonts (Sora/Inter).
- **Onboarding email** → no vendor; hand temp password to operator + magic-link fallback (documented).

## Out of scope (deferred, per SESSION.md)
Resend emails, Stripe billing, real Calendly link, Cloudflare CDN, SSRF octal/hex hardening.
