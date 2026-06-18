# Testing manual

## Widget (works now, no creds)
- Standalone: open apps/demo-standalone.html (double-click). Expect button bottom-right.
- Built demo: `cd packages/widget && npm i && npm run build`, then `npx serve apps`, open /demo.html.
- Logic test: `node test-widget.mjs` → expect "✅ WIDGET RENDERS CORRECTLY".
- Per feature: text size, spacing, contrast→dark, stop motion, ruler (move mouse), highlight links, big cursor. Reload → settings persist.
- Failure cases to force:
  - Include core.js twice → still ONE button (double-init guard).
  - Block localStorage → widget still shows, won't persist.
  - Bad data-site → widget loads defaults.
- Known bugs to watch: contrast filter can shift fixed headers on some sites; dark mode inverts images imperfectly; ruler may not survive SPA route change (task #2).

## Dashboard (works now in mock mode)
- `cd apps/dashboard && npm i && npm run dev` → http://localhost:3001
- Log in (any email; demo@makoya.dev is seeded) → see 2 sites, stats, leads.
- Create a site → appears in list. Open it → edit color/features → Save.
- Free plan: "hide branding" disabled. blue-spa (pro) → enabled.
- Leads page → funnel counts + table.
- Multi-tenant test: log in as other@x.com → you see NO sites (isolation).
- Failure cases: PATCH another user's site via API → 403. Free plan hideBranding forced false server-side.

## Scanner funnel
- POST to /api/scan-ingest with {url,email,score,totals} → lead appears on Leads page, scan on the site report.
- `curl -X POST localhost:3001/api/scan-ingest -H 'content-type: application/json' -d '{"url":"https://x.com","email":"a@b.com","score":40,"totals":{"critical":3,"serious":4,"moderate":2,"minor":1}}'`

## Auth / billing (mock today)
- Auth: cookie-based mock. Real test after Supabase Auth swap.
- Billing: placeholder buttons disabled. Real test after Stripe wiring.
