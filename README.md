# Makoya

An embeddable web-accessibility widget **and** the platform around it: a client dashboard to customize the widget and see an auto-generated accessibility report, an operator admin CRM, and a real accessibility scanner that powers the report + consultation funnel.

## Repo layout
- **`packages/widget`** — the embeddable widget (tiny `loader.js` + versioned `core.js`, Shadow-DOM, 7 a11y features, configurable launcher icon). Built with Vite.
- **`packages/shared`** — shared widget config types + launcher-icon SVGs (one source of truth for widget + dashboard).
- **`apps/web`** — Next.js 15 app (port **3000**): magic-link auth + role gating, client dashboard (customize widget with live preview, install snippet, accessibility report), admin CRM (`/admin`), the scanner engine (Playwright + axe-core), and all APIs.
- **`infra/schema.sql`** + **`supabase/migrations/`** — Postgres schema with RLS + the atomic default-config trigger.
- **`docs/superpowers/`** — design specs, phase plans, and `SESSION.md` (build state).

## Quick start
```bash
# 1. Configure (see SETUP.md for the full env table)
cp apps/web/.env.example apps/web/.env.local   # fill in Supabase keys, ADMIN_EMAILS, CRON_SECRET

# 2. Apply the DB schema (Supabase SQL Editor: paste infra/schema.sql, or `supabase db push`)

# 3. Install + run
npm install
cd apps/web && npm run dev            # http://localhost:3000

# 4. (for local scans) install Chromium once
cd apps/web && npx playwright-core install chromium

# 5. Build the widget
cd packages/widget && npm install && npm run build   # dist/loader.js + core.js
```
Sign in with an email (magic link). To reach `/admin`, your email must be in `ADMIN_EMAILS`.

## How it works
- **Client** logs in → adds a site (a default config is created atomically) → customizes the widget (color, position, launcher icon, features, branding — branding-off gated to paid plans) with a **live preview** → copies a one-line install snippet.
- The embedded widget fetches its config from `GET /api/config/{siteId}` and applies accessibility preferences on the host page (via attributes + one stylesheet — no DOM rewriting).
- The site is **auto-scanned**; the client sees a score + **top-3 issues in plain English** with a "Get full report / Book a call" CTA that records a **consultation request**.
- The **operator** (you) manages everything at `/admin`: customers, manual plan control, and the consultation pipeline.

## Status
All 5 build phases complete and merged: foundation/auth, widget customizer, scanner funnel (SSRF-hardened), admin CRM, and polish/deploy-prep. See `SETUP.md` for deploy steps and the intentionally-deferred items (email vendor, Stripe, Supabase Auth redirect URLs, deploy logins).

> Accessibility **tools/preferences** — not a legal "WCAG/ADA compliance" guarantee. Keep copy free of compliance/lawsuit claims.
