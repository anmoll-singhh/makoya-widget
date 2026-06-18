# Makoya Platform — Design Spec

**Date:** 2026-06-19
**Status:** Approved for planning

## 1. Purpose

Makoya sells an embeddable web-accessibility widget. This spec covers the platform around that widget:

- A **client dashboard** where each customer customizes their widget and sees an auto-generated accessibility report of their site.
- A private **admin CRM** where the operator (you) manages all customers and upsell requests.
- Integration of the existing **accessibility scanner** so reports are generated automatically.

The embeddable widget itself is already built, tested, and working; it is **kept and extended**, not rebuilt.

Deferred by explicit decision (drop-in later, not in this build): Stripe/automated payments, automated emails, any public/anonymous lead-magnet scanner.

## 2. High-level architecture

One npm-workspaces monorepo, one Next.js 15 app deployed to Vercel, one Supabase project (Auth + Postgres), the widget hosted on Cloudflare.

```
makoya/
├─ packages/
│  ├─ widget/        KEPT. Extended only for launcher-icon choice. (the product)
│  └─ shared/        Widget config types, extended (adds launcherIcon)
├─ apps/web/         NEW unified Next.js app (replaces apps/dashboard). Three zones:
│   ├─ (public)/     thin: marketing/login. No anonymous scanner.
│   ├─ dashboard/    CLIENT zone (overview, customize widget, scanner report, billing view)
│   ├─ admin/        ADMIN zone (CRM) — gated to operator emails
│   └─ api/          server routes incl. ported scanner (/api/scan), config JSON, ingest
├─ lib/scanner/      scanner engine ported in from ada-external-scanner (Playwright + axe-core)
├─ infra/schema.sql  fresh Supabase schema + RLS
└─ docs/
```

**Three zones, one auth, role-gated:**
- **Client** — sees only their own data, enforced by Postgres Row Level Security (`owner_id = auth.uid()`).
- **Admin (operator)** — email allowlist via `ADMIN_EMAILS` env var. Admin pages use the Supabase service role server-side to read across all customers.

## 3. Authentication & roles

- **Supabase Auth**, email magic-link (default; fewer moving parts than password reset flows).
- A logged-in user is a **client** by default. If their email is in `ADMIN_EMAILS`, they additionally get access to `/admin`.
- No public/anonymous access to the scanner or any data. Onboarding is operator-initiated: operator creates the customer + their site domain in the admin CRM; the customer then logs in to their dashboard.

## 4. The widget (kept + extended)

- Existing `packages/widget` loader/core split, 7 accessibility features, Shadow DOM isolation, keyboard accessibility — all unchanged.
- **Extension:** add `launcherIcon` to the shared `WidgetConfig` (a small preset set of SVG icons, e.g. accessibility / person / eye / adjust). The client dashboard drives it along with color and position.
- The widget continues to fetch its public config JSON (color, position, launcherIcon, featuresEnabled, hideBranding) from a server route; the dashboard writes that config.

## 5. Scanner integration (auto-scan model)

The scanner from `ada-external-scanner` (Next.js, Playwright + headless Chromium, axe-core, SSRF protection, multi-page up to 3 internal links, scoring) is **ported into `apps/web`** as an internal API route (`/api/scan`, Node runtime, `maxDuration` 60). Decision: port in (one deploy) rather than a separate service.

**The client never operates the scanner.** Flow:

1. **On onboarding** — when the operator creates a customer's site (with domain) in the admin CRM, the system **auto-triggers a background scan** and stores the result in `scans`.
2. **Customer arrives to a finished report** — their dashboard shows score + the **top 3 issues in plain English** + the upsell CTA. No URL box, no scan button.
3. **First-load race** — if the very first scan is still running when they log in, the dashboard shows an "Analyzing your site…" state that polls until the scan row appears.
4. **Freshness** — a weekly **Vercel Cron** re-scans active sites so scores stay current and the upsell re-surfaces.

**Plain-English transformation (curated mapping):** a hand-written lookup `axe rule id → { friendly title, "what it means", "who it affects" }`. Deterministic, instant, free, no API key. Unknown rule ids fall back to a friendly generic template built from axe's own fields. Lives in `lib/scanner/plain-language.ts`.

**The upsell gate:** the top 3 issues + score are shown free. The **complete itemized report + how-to-fix guidance** is gated behind a **"Get full report / Book a call"** CTA. Clicking it:
- creates a `consultation_requests` row (visible to admin as an upsell/action item against that customer), and
- unlocks the full report for that customer (intent in → full report out).

## 6. Client dashboard (`/dashboard`)

- **Overview** — their site, install snippet, widget status, latest scan score.
- **Customize widget** — live preview + controls: position, primary color, launcher icon, which accessibility features show, branding toggle. Branding-off is gated to paid plans and enforced **server-side**. Save regenerates the public config JSON.
- **Report** — the auto-scan result (section 5): score, top 3 plain-English issues, upsell CTA, gated full report.
- **Billing / Plan** — current plan + what each tier includes + "contact us to upgrade." No Stripe.

## 7. Admin CRM (`/admin`, operator only)

- **Customers list** — every customer: domain, plan, signup date, last scan score, count of open consultation requests. Sortable/filterable/searchable.
- **Customer detail** — their sites, scan history, widget config, and a **plan selector the operator can change manually** (plan control without Stripe).
- **Requests inbox** — all consultation requests across customers as a pipeline: `new → contacted → won → lost`.

## 8. Data model (fresh Supabase schema, RLS enabled)

| Table | Columns (core) | Access |
|---|---|---|
| `sites` | `id, owner_id, domain, plan, created_at` | client: own rows (RLS `owner_id = auth.uid()`) |
| `site_config` | `site_id, primary_color, position, launcher_icon, features_enabled, hide_branding, updated_at` | client: own via site (RLS) |
| `scans` | `id, site_id, url, score, totals(jsonb), issues(jsonb), created_at` | client: own via site (RLS) |
| `consultation_requests` | `id, site_id, scan_id, type, note, status, created_at` | **admin only** — RLS enabled, no client policy; service role only |

- Plans: **Free / Pro / Managed** (display + gating only; operator flips them in the CRM).
- The public config JSON is served by a server route reading `sites` + `site_config`; the widget never queries the DB directly.
- The service role key is server-only.

## 9. Tech stack

- Next.js 15 (App Router, React Server Components) + React 19.
- Tailwind CSS v4 (aligned to the scanner's existing Tailwind 4 setup).
- Supabase JS client (Auth + Postgres).
- Playwright-core + `@sparticuz/chromium` for the scan route (from the existing scanner).
- All UI built with the `ui-ux-pro-max` and `frontend-design` skills for an industry-ready look.

## 10. Configuration & credentials

All credentials are placeholdered; nothing blocks local development. Provided files: `apps/web/.env.example` and a root `SETUP.md` with exact "where to find it" steps.

| Env var | Where it comes from |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project → Settings → API (server-only, gitignored) |
| `ADMIN_EMAILS` | operator email(s), comma-separated |
| `NEXT_PUBLIC_APP_URL` | Vercel deployment URL |
| `MAKOYA_CDN_URL` | Cloudflare URL hosting the widget bundles |

Tooling for fetching/applying these (set up): Supabase CLI (`npx supabase`), Wrangler (Cloudflare), Vercel CLI + Vercel MCP. After a one-time operator login on each platform, the assistant can fetch keys into `.env.local` and apply the schema.

## 11. Compliance guardrail

No "WCAG compliant", "ADA compliant", or "lawsuit-proof" claims anywhere in copy. The product offers accessibility **tools/preferences**, not compliance guarantees.

## 12. Out of scope (this build)

- Stripe / automated payments (manual plan-flipping in CRM instead).
- Automated emails (consultation requests surface in the CRM only).
- Public anonymous lead-magnet scanner (scanner is client-only).
- Behavioural analytics, browser extension, platform plugins, multi-region.

## 13. Build phases (high level — detailed plan to follow)

1. **Foundation** — monorepo restructure, `apps/web` scaffold, Tailwind, Supabase client, schema applied, auth (magic-link) + role gating.
2. **Widget config loop** — extend shared config (launcherIcon), config write API + public config JSON, client "Customize widget" screen with live preview.
3. **Scanner** — port engine into `apps/web`, curated plain-language mapping, auto-scan on onboarding + cron, client Report screen with gated full report + CTA.
4. **Admin CRM** — customers list, customer detail with manual plan control, consultation requests pipeline.
5. **Polish & deploy** — design pass with the design skills, `.env`/`SETUP.md`, deploy to Vercel, widget to Cloudflare, end-to-end verification.
