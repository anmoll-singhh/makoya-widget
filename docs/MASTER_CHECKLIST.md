# Makoya — master build checklist (living document)

Legend: ✅ done & verified · 🟡 real code, needs creds/deploy · ⬜ not built · ❌ deliberately not building

## Widget
- ✅ Shadow-DOM widget, 7 features, persistence, SPA re-apply, keyboard a11y
- ✅ Auto-init from script tag (the "icon not showing" fix)
- ✅ Loader pattern (loader.js + versioned core.js)
- ✅ Built bundles: core 3.6KB gz, loader 0.7KB gz
- ✅ Render proven via jsdom test (test-widget.mjs)
- 🟡 Hosted on a real CDN (URLs are placeholders today)
- ⬜ Shopify app / WP plugin wrappers
- ❌ Widget behavioural analytics dashboard (intentionally not built)

## Dashboard (apps/dashboard) — RUNS in mock mode, zero creds
- ✅ Next.js 15 app, typecheck clean
- ✅ Mock data layer (in-memory + seed) — runs with no database
- ✅ Sites list + stats, create site
- ✅ Config editor (color/position/features/branding) with plan gating
- ✅ Install snippet generator
- ✅ Accessibility report view + dollar-risk remediation CTA
- ✅ Lead funnel page (new→contacted→audit→won→lost)
- ✅ Billing placeholder (3 plans)
- ✅ API: /api/sites (CRUD), /api/config/[siteId], /api/scan-ingest
- 🟡 Real auth (mock cookie now → swap Supabase Auth)
- 🟡 Real DB (set DB_MODE=supabase + run infra/schema.sql)
- 🟡 Stripe billing (placeholder buttons)
- 🟡 CDN cache purge on config save

## Scanner funnel (scanner-integration/)
- ✅ EmailCapture.tsx drop-in component
- ✅ /api/scan-ingest creates scan + lead
- 🟡 Resend email (report + day-2 follow-up) — RESEND_API_KEY
- 🟡 Rate limiting on scan endpoint (add in scanner repo)

## Infra
- ✅ Postgres schema with RLS (infra/schema.sql)
- 🟡 Supabase project created + schema applied
- 🟡 Vercel deploy (dashboard) + Cloudflare (widget CDN)

## Next 10 (priority)
1. Test contrast/dark on 10 real sites; fix layout breakage (filter-on-html risk)
2. Fix reading ruler surviving SPA navigation
3. Deploy widget to CDN; test full loader path end-to-end
4. Wire EmailCapture into the real scanner + ingest (revenue path)
5. Swap mock auth → Supabase Auth; set DB_MODE=supabase
6. Resend emails (report + follow-up)
7. Stripe checkout + webhook → plan
8. One install wrapper (Shopify OR WordPress)
9. Widget error reporting
10. CSP/enterprise install note
