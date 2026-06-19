# Makoya Build — Session State (resume file)

**Purpose:** If a session is interrupted/compacted, READ THIS FIRST, then `.git/sdd/progress.md` (the per-task ledger) and `git log --oneline -30`. Trust the ledger + git over memory.

**Standing directive (from the user):** Autonomously drive ALL phases to completion using the subagent build→review→fix pipeline (superpowers:subagent-driven-development). Do all QA yourself. Only stop for genuinely human-only steps (email vendor choice, final deploy logins). Leave a summary when done. No check-ins between tasks.

## Environment facts (already set up — don't redo)
- Monorepo at `C:\Users\ANMOL\Desktop\makoya`. App: `apps/web` (Next 15, port **3000**).
- Supabase project **Makoya** (`vgxvkegjnibvsngjrxqa`, ap-southeast-1). Keys already in `apps/web/.env.local` (gitignored). DB password known to user; CLI linked; schema applied via `supabase/migrations/`.
- `ADMIN_EMAILS=creativesgpt@wavesmvmnt.com` (the operator/admin account; has a temp password `Verify-Fixed-A1b2c3!` set for headless QA).
- Scanner engine ported into `apps/web/lib/{scanner,browser,utils}` + `apps/web/types`. Chromium installed locally via playwright-core. `next.config.mjs` has `serverExternalPackages` for playwright.
- **QA pattern (no email needed):** mint a real `@supabase/ssr` session cookie via a node script (stub `globalThis.WebSocket`, password sign-in, `setSession`), then curl the running dev server. Service-role admin API used to create/confirm users + cleanup. See past `_qa_*.mjs` scripts (gitignored `apps/web/_*.mjs`, deleted after use).
- Deferred to the very end (user's call): email sending (Resend), Stripe, Supabase Auth redirect-URL config, deploy logins.

## Phase status
- ✅ **Phase 1 Foundation** — MERGED `main`. auth (magic-link), role gating, 4-table schema+RLS. E2E verified.
- ✅ **Phase 2 Widget Customizer** — MERGED. shared launcher icons, sites/config data layer, config API (plan-gated), customize UI + live preview. E2E verified. Fast-follows pending (Phase 5): atomic site-create trigger, save-error UX, clipboard guard.
- ✅ **Phase 3 Scanner** — MERGED. engine port, plain-language, /api/scan (auto+cached), cron, consultation funnel, report UI. E2E verified. **Critical SSRF found+fixed** (validateScanUrl wired in; 8 internal targets blocked). Minor hardening pending: octal/hex IP encodings.
- ✅ **Phase 4 Admin CRM** — MERGED `main`. admin guard, cross-tenant data layer, plan + status mutation routes, customers list + site detail + requests inbox. E2E verified (admin reads/mutates, non-admin 403+redirect). Minors deferred to Phase 5.
- ✅ **Phase 5 Polish + Deploy prep** — MERGED `main`. env fail-fast, atomic site-create trigger (applied), admin perf+errors, client error feedback, removed legacy `apps/dashboard`, `vercel.json` cron, deploy docs. FULL-PRODUCT E2E QA passed on the production build.

## ✅ ALL 5 PHASES COMPLETE & MERGED TO main.
Remaining = user-only deferred items (documented in SETUP.md): email vendor (Resend), Stripe billing, Supabase Auth redirect-URL config, actual deploy logins (Vercel app + Cloudflare widget CDN). Optional hardening backlog is in `.git/sdd/progress.md` (octal/hex IP encodings; getAdminSiteDetail parallelization; admin list error surfacing).

## Resume protocol
1. `git branch --show-current` and `git log --oneline -15`.
2. Read `.git/sdd/progress.md` — last line tells you the last completed task.
3. Continue the SDD loop: task-brief → implementer subagent → review-package → reviewer subagent → fix loop → ledger line → next.
   - Scripts: `C:/Users/ANMOL/.claude/plugins/cache/claude-plugins-official/superpowers/6.0.2/skills/subagent-driven-development/scripts/{task-brief,review-package}`.
   - Implementer model: haiku for verbatim transcription, sonnet for integration/routes/UI. Reviewer: haiku small / sonnet security. Final per-phase review: opus.
   - Some subagents STALL on long foreground builds — if an implementer returns an incomplete status, check `git status`/files; if code is correct, the controller builds + commits it directly.
4. Free port 3000 before builds (kill the node holding `.next`).
5. Update THIS file at each phase boundary.
