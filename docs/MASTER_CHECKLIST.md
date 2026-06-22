# Makoya — master build checklist (living document)

> Updated 2026-06-22 to match the ACTUAL codebase (the previous version described a
> `apps/dashboard` + mock-mode + 7-feature product that no longer exists).
> See `docs/SESSION.md` for phases and the locked strategy; `docs/research/COMPETITIVE_TEARDOWN.md` for positioning.

Legend: ✅ done & verified · 🟡 real code, needs creds/deploy · 🔶 planned (phase) · ⬜ not built · ❌ deliberately not building

## Strategy (locked)
Honest hybrid (real scan + remediation + monitoring + honest preferences widget) · SMB self-serve (PLG via scanner funnel) · bootstrap/OSS-first · demo-first then harden.

## Widget (packages/widget) — DEPLOYED
- ✅ Shadow-DOM widget, **15 features**, 9 profiles, i18n (en/es/fr/de), persistence, SPA re-apply, keyboard a11y
- ✅ Loader/core split (stable `loader.js` + versioned `core.js`); auto-init from script tag
- ✅ Glassmorphic panel + mobile bottom-sheet; read-aloud
- ✅ Built bundles copied to `apps/web/public/widget`; render proven via jsdom (`test-widget.mjs`)
- 🟡 Hosted on a real CDN (currently served from the app's `/public/widget`)
- 🔶 WordPress plugin wrapper (Phase 4) · ⬜ Shopify app
- ❌ Widget behavioural analytics (privacy risk, low value)
- RULE: widget is an honest usability convenience — never auto-detects assistive tech, never claims to "fix"/"comply"

## App (apps/web) — Next 15, Supabase, DEPLOYED (makoya-gamma.vercel.app)
- ✅ Real Supabase auth (@supabase/ssr) + RLS multi-tenancy; admin gating via `ADMIN_EMAILS`
- ✅ **Customizer-first client dashboard**: live-preview iframe (real bundle), debounced autosave, 15-feature reorder, report tab
- ✅ **Admin CRM**: customer overview (worst-score-first), plan management, scan history, consultations/leads, bulk customer add
- ✅ Config API (`/api/config/[siteId]`), on-demand scan API (`/api/scan`), cron rescan route
- ✅ Install snippet generator; typecheck clean; 27 unit tests pass
- 🔶 Server-side plan gating enforcement (Phase 2)
- ⬜ Billing UI beyond plan field

## Scanner engine (apps/web/lib/scanner) — THE MOAT
- ✅ Playwright + @axe-core/playwright; WCAG 2.0/2.1/2.2 A+AA + best-practice
- ✅ 6 custom DOM checks axe misses; second-pass stale-node verification; dedup
- ✅ Timeout fallback to reduced ruleset; screenshot; multi-page link crawl; serverless-tuned (@sparticuz/chromium)
- ✅ Plain-language issue translation (`lib/scanner/plain-language.ts`)
- ⚠️ Runs in the request path (`maxDuration=60`) — fine on-demand, won't scale to monitoring
- 🔶 Move heavy/monitoring scans to a queue (Inngest, Phase 4)

## Funnel / revenue loop — NOT WIRED (Phase 1)
- ✅ `scanner-integration/EmailCapture.tsx` drop-in exists
- 🔶 Wire `/api/scan-ingest` → Resend report email → lead in CRM
- 🔶 Rate-limit the scan endpoint
- 🔶 PDF report export (`@react-pdf/renderer`)

## Billing — NOT BUILT (Phase 2)
- 🔶 Lemon Squeezy checkout + webhook → `plan`; server-side gating

## Monitoring & AI — NOT BUILT (Phase 4)
- 🔶 Scheduled re-scan + "score dropped" email
- 🔶 Claude-powered remediation suggestions (alt-text, plain-language, code snippets) — human-confirmed, never silent auto-fix

## Foundation / DX — Phase 0 (DONE 2026-06-22)
- ✅ Shared-config drift killed: canonical `packages/shared`, generated mirror, CI drift test (`lib/shared-sync.test.ts`)
- ✅ Root scripts: `npm run ci` (sync + typecheck web+widget + tests)
- ✅ GitHub Actions CI (`.github/workflows/ci.yml`)
- ✅ Observability seam (`lib/observability.ts`) — env-guarded no-op, ready for PostHog + Sentry
- ✅ Docs corrected (this file, CLAUDE.md, SESSION.md)
- 🔶 Install Sentry + PostHog SDKs (next block, needs keys)

## Infra
- ✅ Supabase project live; migrations applied (`supabase/migrations`)
- ✅ Vercel deploy (app)
- 🟡 Dedicated CDN for the widget bundle
- 🔶 Resend domain, Lemon Squeezy account

## Required from founder (access)
Anthropic API key · Resend key + verified sending domain (DNS) · Lemon Squeezy (or Stripe) account · Sentry + PostHog projects · Calendly link.
