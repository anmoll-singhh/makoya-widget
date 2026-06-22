# Makoya — Session & Phase Tracker (living doc)

> Purpose: keep context across long sessions. Update at the end of every work block.
> Owner: Claude (building + selling this). Founder: not building — strategy/approvals/keys only.

## Locked strategy (2026-06-22)
- **Positioning:** Honest hybrid (real scan + remediation guidance + monitoring + honest preferences widget). NOT overlay-compliance.
- **Customer:** SMB self-serve (PLG via public scanner funnel).
- **Budget:** Bootstrap / OSS-first (<$50/mo + usage until revenue).
- **Goal:** Demo-first (~2 wks end-to-end loop), then harden for real customers.

## Ground truth (what actually exists — supersedes CLAUDE.md / MASTER_CHECKLIST, which are STALE)
- ✅ Widget: 15 features, i18n (en/es/fr/de), 9 profiles, Shadow DOM, loader/core split, mobile bottom-sheet. Deployed.
- ✅ Scanner: Playwright + @axe-core/playwright, WCAG 2.0/2.1/2.2 A+AA, 6 custom DOM checks, second-pass verify, fallback, screenshot, multi-page. (lib/scanner)
- ✅ Supabase backend (NO mock mode left), RLS, auth (@supabase/ssr), admin gating via ADMIN_EMAILS.
- ✅ Client dashboard: customizer-first, live-preview iframe, debounced autosave, report tab.
- ✅ Admin CRM: customer overview, plan field, consultations/leads, cron rescan route.
- ✅ Plain-language issue translation (lib/scanner/plain-language.ts).
- ❌ Billing (no Stripe/Lemon Squeezy). ❌ Email (no Resend). ❌ Scalable queue/monitoring. ❌ AI remediation. ❌ PDF export. ❌ Sentry/PostHog/CI.
- ⚠️ TECH DEBT: lib/shared is a hand-maintained MIRROR of packages/shared (will drift). Scanner runs in request path (won't scale to monitoring).

## Roadmap phases
- **Phase 0 — Foundation (no keys needed): ✅ DONE 2026-06-22.** Stale docs rewritten (CLAUDE.md, MASTER_CHECKLIST). Shared-config drift killed: canonical=packages/shared, generated mirror via scripts/sync-shared.mjs, CI drift test lib/shared-sync.test.ts. Root `npm run ci` = sync+typecheck(web+widget)+tests. GitHub Actions .github/workflows/ci.yml. Observability seam lib/observability.ts (env-guarded no-op). Verified: 27 tests pass, typecheck 0. (Sentry/PostHog SDK install deferred to a keyed block.)
- **Phase 1 — Revenue loop (demo core):** scanner-integration → /api/scan-ingest → Resend report email → lead in CRM; rate-limit scan endpoint; PDF report export. [needs: Resend key+domain]
- **Phase 2 — Money:** Lemon Squeezy checkout + webhook → plan; server-side plan gating. [needs: LS account, test mode ok]
- **Phase 3 — Demo polish:** honest-hybrid landing copy; Book-a-call (Calendly); PostHog funnel dashboard.
- **Phase 4 — V1 hardening:** Inngest queue; scheduled monitoring + "score dropped" alerts; Claude AI remediation suggestions (human-confirmed); WordPress plugin.
- **Phase 5 — V2/Enterprise:** agency/white-label portal; productized human-audit (partner); VPAT/ACR; SSO; CI/CD axe gate.

## Required from founder (access)
Anthropic API key · Resend key + verified domain (DNS) · Lemon Squeezy (or Stripe) account · Sentry + PostHog projects · Calendly link · confirm Supabase service-role.

## Session log
- 2026-06-22: Audited real codebase (corrected stale docs). Ran competitive teardown (FTC, Overlay Fact Sheet, WebAIM, accessiBe pages) → docs/research/COMPETITIVE_TEARDOWN.md. Founder locked strategy (honest hybrid / SMB / bootstrap / demo-first). Delivered 3-perspective product walkthrough. **Executed Phase 0** (docs, shared-config drift guard, CI, observability seam) — verified green (27 tests, typecheck 0). Changes uncommitted on main. NEXT: commit Phase 0 (branch first); get Resend key + domain to start Phase 1 (scanner→email→lead loop).
