# Makoya — monorepo (widget + dashboard + scanner funnel)

## Quick start
- **See the widget instantly:** open `apps/demo-standalone.html` (double-click). Button = bottom-right.
- **Run the dashboard (no creds needed):**
  ```
  cd apps/dashboard && npm install && npm run dev
  # open http://localhost:3001  (login: any email; demo@makoya.dev is seeded)
  ```
  It runs in MOCK MODE on in-memory demo data. Set DB_MODE=supabase for real data.
- **Rebuild the widget:** `cd packages/widget && npm install && npm run build`
- **Prove the widget renders:** `npm install jsdom && node test-widget.mjs`

## What's here
- `packages/widget` — embeddable accessibility widget (DONE, builds, tested)
- `packages/shared` — shared config types
- `apps/dashboard` — Next.js dashboard, RUNS in mock mode (sites, config, reports, leads, billing placeholder)
- `apps/demo-standalone.html` — foolproof widget demo
- `scanner-integration/` — drop-in EmailCapture for your existing scanner + the funnel join
- `infra/schema.sql` — Postgres schema with RLS
- `docs/` — MASTER_CHECKLIST, TESTING, DEPLOYMENT
- `CLAUDE_CODE_PROMPTS.md` — prompts for remaining real-service wiring

See `docs/MASTER_CHECKLIST.md` for exact status of every piece.
