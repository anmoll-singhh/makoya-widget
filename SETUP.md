# Makoya — Setup & Deploy

Makoya is an embeddable web-accessibility widget plus a platform: a **client dashboard** (customize the widget, see an auto-generated accessibility report), an **operator admin CRM**, and the **scanner** that powers the report + consultation funnel.

- `packages/widget` — the embeddable widget (loader + core).
- `packages/shared` — shared widget config types + launcher icons.
- `apps/web` — the Next.js app (client dashboard + admin CRM + scanner + APIs). Runs on **port 3000**.
- `infra/schema.sql` + `supabase/migrations/` — the database schema.

## Prerequisites
- Node 20+.
- A Supabase project (Auth + Postgres).
- (For scans locally) Chromium for Playwright: `cd apps/web && npx playwright-core install chromium`.

## Environment variables (`apps/web/.env.local`)
Copy `apps/web/.env.example` → `apps/web/.env.local` and fill in:

| Variable | Where to get it | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project → Settings → API → Project URL | public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon/public key | public, respects RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role key | **secret, server-only — bypasses RLS, never commit** |
| `ADMIN_EMAILS` | your operator email(s), comma-separated | grants `/admin` access |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` locally; your deploy URL in prod | |
| `CRON_SECRET` | any long random string | guards the cron rescan route |

> In **production** the app fails fast at boot if the public Supabase vars are missing (no silent misconfiguration). The service-role key is validated at first use. `.env.local` is gitignored; `.env.example` holds only placeholders and is safe to commit.

## Database
Apply the schema once to a clean Supabase database. Either:
- **Supabase SQL Editor:** paste `infra/schema.sql` and Run; **or**
- **Supabase CLI:** `supabase link --project-ref <ref>` then `supabase db push` (applies `supabase/migrations/`).

This creates `sites`, `site_config`, `scans`, `consultation_requests` (all with RLS; `consultation_requests` is service-role only), plus the trigger that auto-creates a default `site_config` whenever a site is created.

## Run locally
```bash
npm install                  # repo root (installs all workspaces)
cd apps/web && npm run dev    # http://localhost:3000
```
- Sign in with an email (magic link). To reach `/admin`, the email must be in `ADMIN_EMAILS`.
- Add a site → it auto-scans on first report view → score + top-3 plain-English issues appear with a "Get full report / Book a call" CTA.

## Build
```bash
cd apps/web && npm run build
```

## Widget
```bash
cd packages/widget && npm install && npm run build   # dist/loader.js + dist/core.js
```
Host `dist/loader.js` + `dist/core.js` on a CDN (e.g. Cloudflare). Clients embed one line:
```html
<script src="https://YOUR-CDN/loader.js" data-site="THE_SITE_ID" defer></script>
```
The loader fetches the site's config from `GET <app>/api/config/{siteId}`. Ship new widget features by publishing a new `core.js`; clients never change their snippet.

## Deploy
### App → Vercel
1. Import the repo; set **Root Directory** = `apps/web`.
2. Add all env vars above in the Vercel project settings.
3. `apps/web/vercel.json` schedules the daily cron (`/api/cron/rescan`, 06:00 UTC) and sets `maxDuration` for the scan routes. Vercel Cron authenticates via `Authorization: Bearer ${CRON_SECRET}` automatically.
4. Deploy.

### Widget → Cloudflare (or any static/CDN host)
Upload `packages/widget/dist/loader.js` + `core.js`. Point clients' snippets at the `loader.js` URL. Set `MAKOYA_CDN_URL` references / the snippet base accordingly.

## Deferred / manual setup (intentionally not wired — your call)
- **Email (Resend, etc.):** consultation requests surface only in the admin CRM today. To email clients (report/follow-up), add a provider and call it from `/api/consultation`.
- **Stripe billing:** plans are set manually in the admin CRM (Customer → plan selector). To self-serve, add Stripe Checkout + a webhook that updates `sites.plan`.
- **Supabase Auth → URL Configuration:** for production magic links, set the Site URL and add your deploy URL + `/auth/callback` to the redirect allowlist.

## Compliance note
Describe the widget as offering accessibility **preferences/tools**, not legal "WCAG/ADA compliance." Avoid compliance/lawsuit claims in user-facing copy.
