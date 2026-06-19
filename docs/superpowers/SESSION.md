# Makoya — Session State (resume file)

**Purpose:** If a session is interrupted/compacted or a NEW session starts, READ THIS FIRST, then `git log --oneline -25`. The product is fully built, deployed, and on GitHub — trust git over memory.

## 🚀 Current status: SHIPPED & LIVE
- **Live app:** https://makoya-gamma.vercel.app (Vercel, production, public).
- **GitHub:** `anmoll-singhh/makoya-widget` (remote `origin`, branch `main`). Every change is pushed.
- **Widget served from the app:** `https://makoya-gamma.vercel.app/widget/loader.js` (+ `core.js`). Loader fetches config from `/api/config/{siteId}` (CORS enabled).
- All 5 build phases done + merged, then: deployed, password auth added, full UI redesign (client dashboard + admin CRM), widget UI overhaul, and live bug fixes.

## 🔭 OVERHAUL IN PROGRESS (2026-06-20) — spec + plans under `docs/superpowers/{specs,plans}/`
Goal: best-in-market widget + dashboards. Decomposed into Phase 0 (foundation) → WS1 widget → WS2 client dashboard → WS3 admin dashboard. Spec: `docs/superpowers/specs/2026-06-20-makoya-overhaul-design.md`.
- **Phase 0 (foundation) — DONE, merged to main, deployed.** (plan: `docs/superpowers/plans/2026-06-20-phase0-foundation.md`)
  - Shared config expanded: **15 feature keys** (added saturation, readingMask, highlightTitles, textAlign, muteSounds, readAloud) + 5 new scalars (`launcherSize`, `defaultProfile`, `accessibilityStatementUrl`, `defaultLanguage`, `panelTitle`). Mirrored in `packages/shared/src/index.ts` AND `apps/web/lib/shared/index.ts`.
  - Persistence: migration `supabase/migrations/20260620010000_widget_config_v3.sql` (5 new `site_config` columns + 15-key default + backfill). `infra/schema.sql` synced. Mappers + public config API allowlist + plan-gated PATCH updated.
  - **⚠️ MIGRATION NOT YET APPLIED to live DB** (no DB password in this env). App is safe (rowToConfig `?? default` fallbacks). APPLY before Phase 2 customizer persistence: paste the migration SQL in Supabase SQL Editor (project `vgxvkegjnibvsngjrxqa`) or `npx supabase db push`.
  - Onboarding: `lib/admin.ts createCustomer()` (service-role, idempotent) + `POST /api/admin/customers` (admin-gated) — operator creates auth user + pre-assigned site. Verified live (creates+cleans up).
  - Admin: `issueCountFromTotals` + `AdminSiteRow.latestScore/issueCount` for worst-first sort.
  - Widget `ui.ts` maps made `Partial<Record<FeatureKey,…>>` (gracefully skips not-yet-implemented features; widget bundle NOT rebuilt this phase — WS1 does that).
- **WS1 (widget redesign) — DONE, merged to main, deployed.** (plan: `docs/superpowers/plans/2026-06-20-ws1-widget-redesign.md`)
  - Widget modularized: `packages/widget/src/ui/{i18n,controls,features,profiles,live,styles,ui}.ts` + `core/state.ts` + `features/effects.ts`. Vanilla TS, Shadow DOM.
  - Glassmorphic panel (backdrop-filter, opaque sticky header/footer with solid fallback so no body bleed-through) + **mobile full-width bottom-sheet** (≤480px, 85dvh, safe-area, 44px targets). Verified on 390×844.
  - 15 features incl. 6 new effects: saturation (grayscale/low/high, composed with contrast via CSS-var filter on body), reading mask (dim band/tint), highlight titles, cursor color (black/white), left-align, mute sounds, read-aloud (SpeechSynthesis click-to-read). Live controllers in `ui/live.ts` (leak-free). 8 quick profiles (added Cognitive + Color-blind).
  - i18n en/es/fr/de (`ui/i18n.ts`), language selector in header, accessibility-statement link (config.accessibilityStatementUrl). a11y preserved (aria-modal, focus trap, role=switch/group, Esc, focus return). Host mounted on `<html>` (id `makoya-widget-root`).
  - `WidgetProfileKey` updated in BOTH shared mirrors: `low-vision`→`lowVision`, added `colorBlind`.
  - Built + copied to `apps/web/public/widget/{core,loader}.js`; live `core.js` serves the new bundle. QA: 27/27 Playwright checks + visual screenshots (desktop + mobile) PASSED.
- **WS2 (client dashboard customizer-first) / WS3 (admin worst-first) — NOT STARTED.** Next: WS2 — init shadcn in apps/web (vercel:shadcn), customizer-first client landing using the expanded config + the Add-customer onboarding from Phase 0; then WS3 admin overview using `listAdminSites` issueCount/latestScore. Use subagent-driven-development + design skills. Prod QA test records AUTHORIZED by user. Migration still PENDING apply (needed for WS2 persistence of new config fields).

## 🔑 Test accounts (password auth — no email/rate-limit)
Password for all: `Makoya2026!`
- `anmols@wavesmvmnt.com` — **admin/operator**
- `creativesgpt@wavesmvmnt.com` — **admin/operator** (also `ADMIN_EMAILS`)
- `anmol.singhh17@gmail.com` — **client** (not admin)
Login at `/login` (email+password is the default; "magic link" is a fallback). `ADMIN_EMAILS` (Vercel prod) = `anmols@wavesmvmnt.com,creativesgpt@wavesmvmnt.com`.

## Environment facts (already set up — don't redo)
- Monorepo `C:\Users\ANMOL\Desktop\makoya`. App `apps/web` (Next 15, local port **3000**).
- Supabase **Makoya** (`vgxvkegjnibvsngjrxqa`, ap-southeast-1). Keys in `apps/web/.env.local` (gitignored). DB password held by user; CLI linked; schema in `infra/schema.sql` + `supabase/migrations/` (latest applied).
- Vercel CLI authed (scope `anmolsinghh17-9375s-projects`, project `makoya`). Deploy: `cd apps/web && vercel --prod --yes --scope anmolsinghh17-9375s-projects`. Prod env vars set (Supabase keys, ADMIN_EMAILS, CRON_SECRET).
- **`@makoya/shared` is VENDORED** at `apps/web/lib/shared/index.ts` (mirror of canonical `packages/shared/src/index.ts`) so the CLI deploy of just `apps/web` is self-contained. **Edit BOTH when changing the shared config/icons/FeatureKey.**
- Scanner engine ported into `apps/web/lib/{scanner,browser,utils}` + `apps/web/types`; Chromium installed locally via playwright-core; `next.config.mjs` has `serverExternalPackages`.
- **QA/screenshot pattern (no email):** node script — stub `globalThis.WebSocket`, password sign-in via GoTrue, mint `@supabase/ssr` cookie, drive the LIVE app / Playwright. Service-role admin API to create/confirm users + cleanup. Write to `apps/web/_*.mjs` (gitignored), run, delete. Playwright pierces shadow DOM; wait `state:"attached"` for the zero-size widget host.

## Widget (packages/widget) — current behavior
- Premium Shadow-DOM UI: launcher + panel, **6 Quick Profiles** (Vision impaired, Low vision, Dyslexia, ADHD/Focus, Seizure safe, Senior), modern switches, segmented contrast, text-size stepper. a11y: aria-modal, focus trap, role=group, AA contrast.
- 9 features: textSize, lineSpacing, contrast, stopMotion, readingRuler, highlightLinks, bigCursor, **readableFont, hideImages**.
- Effects: text-size scales **root `<html>` font-size** (so rem text grows). Contrast/dark filter applied to **`<body>`**, and the widget host is mounted on **`<html>`** (escapes the filter's containing block) so contrast/dark profiles don't hide it.
- Build: `cd packages/widget && npm run build` → copy `dist/{loader,core}.js` to `apps/web/public/widget/`, then redeploy.

## Deferred (user's call — documented in SETUP.md)
Email vendor (Resend) for client report/follow-up emails; Stripe billing; a real Calendly link in the report "book a call"; Cloudflare CDN (optional — widget already served from the app). Supabase Auth redirect URLs: user added them (magic link works; password auth doesn't need them). Hardening backlog: octal/hex IP SSRF encodings; admin perf polish.

## How to resume / continue
- `git log --oneline -25` shows the full history (phase merges + UI/widget commits).
- To verify everything still works: re-run the full QA pattern against the live app (auth, create site, scan, admin plan/status, widget render). Past QA: ALL PASSED.
- Open questions the user may pick up: wire Calendly into "book a call"; add "change email" to the account page; more widget options/profiles; Resend emails; Stripe.
