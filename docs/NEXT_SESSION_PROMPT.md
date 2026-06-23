# Next-session kickoff prompt (copy-paste the block below)

---

You are my CTO + lead engineer for **Makoya**, an honest web-accessibility platform. This is a fresh session; full context lives in the repo. Do NOT re-derive strategy or re-audit from scratch — read the tracking docs first and continue.

**Working dir:** `C:\Users\ANMOL\Desktop\makoya` (npm-workspaces monorepo, Windows / PowerShell + Git Bash).

**Read these first (in order), then summarize current state back to me in ~10 lines before doing anything:**
1. `docs/SESSION.md` — live phase/status tracker + locked strategy (source of truth)
2. `docs/MASTER_CHECKLIST.md` — piece-by-piece done/todo
3. `docs/MAKOYA_PLAN.md` — the full plan/timeline (also exported to MAKOYA_PLAN.pdf)
4. `docs/research/COMPETITIVE_TEARDOWN.md` — why we're "honest hybrid"
5. `CLAUDE.md` — repo rules; then `git log --oneline -12`

**Locked strategy (do not relitigate):** Honest hybrid (real scan + remediation + monitoring + honest widget; NEVER overlay-compliance claims) · SMB self-serve via the public scanner funnel · bootstrap/OSS-first (<$50/mo) · demo-first then harden.

**Git state:** branches `chore/phase-0-foundation` (Phase 0) and `feat/phase-1-scanner-funnel` (Phase 1, stacked on Phase 0) are committed but NOT merged to `main`. Phase 1 docs/PDF/this prompt are on `feat/phase-1-scanner-funnel`. **DECIDED (2026-06-23):** apply the migration first, THEN merge BOTH Phase 0 + Phase 1 into `main` (CI-green, additive). Deploy stays gated on founder approval.

**What's DONE & verified (`npm run ci` green = sync:shared + typecheck web+widget + ~43 vitest tests):**
- Phase 0: shared-config drift guard, CI, observability seam, corrected docs.
- Phase 1 backbone (against an email STUB): `leads` table migration (supabase/migrations/20260622210000_leads.sql), provider-agnostic email seam (lib/email/* — stub records to outbox; Resend swaps in lib/email/index.ts ONLY), lib/leads.ts, public `/api/scan-ingest`, public `/api/public-scan` (SSRF double-gate via lib/scan-utils/public-url.ts + rate limit, NOT stored), public scanner page `/scan`, admin `/admin/leads` (worst-first). Honest-copy guardrail test enforces no "compliant/guaranteed/lawsuit-proof".

**THE blocker to going live:** the `leads` migration is NOT yet applied to Supabase. The **Supabase MCP is now fixed and ✔ Connected** (re-registered with `--project-ref=vgxvkegjnibvsngjrxqa` + `SUPABASE_ACCESS_TOKEN` env; the previous positional-token arg format had silently failed). FIRST ACTION this session: APPLY `supabase/migrations/20260622210000_leads.sql` via the Supabase MCP (it's idempotent; the table was confirmed not to exist yet). Then verify the scanner→email(stub)→lead→/admin/leads loop on the deployed app (real browser scan only runs on Vercel, not locally on Windows). THEN merge the stack to main (see Git state).

**Immediate next steps (demo-first order):**
1. Apply the `leads` migration (above). Verify the loop end-to-end on the deployed app (real browser scan only runs on Vercel, not locally on Windows).
2. Swap email stub → **Resend** (one-file change in lib/email/index.ts) once I give you `RESEND_API_KEY` + a verified sending domain.
3. **PDF report export** (`@react-pdf/renderer`).
4. **Billing**: Lemon Squeezy checkout + webhook → `plan` (test mode ok) + server-side plan gating.
5. Demo polish: honest-hybrid landing copy, Calendly "book a call", PostHog funnel dashboard.

**Keys/access I will provide as needed:** Supabase MCP/DB (now), Resend key+domain, Lemon Squeezy account, PostHog+Sentry projects, Calendly link, `ANTHROPIC_API_KEY` (for V1 AI features — Haiku default; NOT needed for the demo).

**Engineering discipline (non-negotiable):**
- `apps/web/lib/shared/index.ts` is a GENERATED mirror — never hand-edit; run `npm run sync:shared`.
- Run `npm run ci` and make it pass before claiming anything done. Be honest about what's verified live vs only typecheck/unit-tested.
- Match the heavy "explain WHY" doc-comment density of existing files.
- We're on `main` by default — branch before committing; end commit messages with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- Use subagents for independent build workstreams; keep `docs/SESSION.md` updated at the end of every block.
- Deploy to Vercel (`vercel --prod`) only after CI is green and I approve.

Start by reading the docs above, applying the leads migration via the now-connected Supabase MCP, taking the funnel loop live, then proceed down the next-steps list. Ask me for any key/access the moment you need it.

---
