# Deployment

## Pieces
- Widget (static core.js + loader.js) → a CDN.
- Dashboard (Next.js) → Vercel.
- Database → Supabase.
- Config JSON → served by dashboard /api/config/[siteId], cached at edge.

## Best option (recommended)
Vercel (dashboard) + Supabase (db/auth) + Cloudflare (widget CDN).
Why: Vercel runs Next with zero config; Supabase gives db+auth+RLS together;
Cloudflare CDN serves the tiny widget globally and cheaply.

## Cheapest option
All on Vercel + Supabase free tiers. Host widget files as Vercel static assets
too (skip Cloudflare). Fine under ~100 sites. ~$0–25/mo.

## Most scalable option
Widget on Cloudflare (R2 + CDN, near-free at scale); dashboard on Vercel;
Supabase Pro; move heavy Chromium scans OFF Vercel onto a dedicated worker
(or Browserless) + a queue when you re-scan many sites for monitoring.

## Steps
1. Supabase: create project → SQL editor → run infra/schema.sql. Copy URL + service role key.
2. Dashboard on Vercel: import repo, set env (DB_MODE=supabase, SUPABASE_*, NEXT_PUBLIC_CDN_BASE, STRIPE_*, RESEND_API_KEY). Deploy.
3. Widget: `npm run build` in packages/widget → upload dist/loader.js + dist/core.js to Cloudflare (or Vercel /public). Point NEXT_PUBLIC_CDN_BASE at it.
4. Custom domain: app.makoya.com → Vercel; cdn.makoya.com → Cloudflare.

## REQUIRED_MANUAL_SETUP summary
- SUPABASE_URL / SERVICE_ROLE_KEY / ANON_KEY  → supabase.com → Settings → API
- STRIPE_SECRET_KEY / WEBHOOK_SECRET          → dashboard.stripe.com → Developers
- RESEND_API_KEY                              → resend.com → API Keys
- NEXT_PUBLIC_CDN_BASE                        → wherever you host loader.js/core.js
