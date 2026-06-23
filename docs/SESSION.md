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
- **Phase 1 — Revenue loop (demo core): 🔶 IN PROGRESS (backbone done, against email STUB).**
  - ✅ `leads` table migration (service-role only, RLS no-policy) — supabase/migrations/20260622210000_leads.sql
  - ✅ Email seam: lib/email/* — provider interface + STUB provider (records to outbox, no send) + honest report-email builder (no compliance claims). Resend swaps in lib/email/index.ts only.
  - ✅ lib/leads.ts (createLead/listLeads, service-role).
  - ✅ POST /api/scan-ingest (public, CORS, validation, rate-limit) → lead + stub email. + OPTIONS.
  - ✅ Fixed scanner-integration/EmailCapture.tsx copy (removed "signed compliance file"/"ADA lawsuits" → honest).
  - ✅ Unit tests (report-email honesty guardrail, leads mapper). 33 tests green, typecheck 0.
  - ✅ Public scan API `POST /api/public-scan` (nodejs, maxDuration 60, NO auth). SSRF double-gate: new `lib/scan-utils/public-url.ts#isPublicHttpUrl` (pure, unit-tested) + existing `validateScanUrl`; per-IP rate limit (5/min); calls `runScan` directly (NOT stored — public scans are ephemeral); returns {score, totals, topIssues[], finalUrl}; generic error + machine `code` only (no SSRF oracle).
  - ✅ Public scanner page `/scan` (client): URL input → scan → big score/100 + critical/serious/moderate/minor breakdown + top-5 plain-English issues → email-capture card → `POST /api/scan-ingest` → "Report on its way" success. shadcn UI, honest copy, loading/error states, mobile-friendly.
  - ✅ Admin Leads page `/admin/leads` (server, getAdminUser-gated): `listLeads(getAdminSupabase())` → shadcn Table (email, domain, score, issue total, status, date), worst-first sort (lowest score then most issues), empty state. "Leads" + "Requests" links added to admin nav (app/admin/layout.tsx).
  - ✅ Unit test for the SSRF guard: `lib/scan-utils/public-url.test.ts` (10 cases). CI green: 43 tests, typecheck 0.
  - ⛔ BLOCKER to go LIVE: leads migration must be applied to Supabase (founder access / supabase db push). Routes + Leads page typecheck + unit-tested but NOT exercised against live DB. Also: real browser scan can not run on this Windows box (@sparticuz/chromium = Lambda), so `/api/public-scan` is verified by typecheck/units only, not live.
  - 🔶 TODO next: apply migration; swap stub→Resend; PDF export; durable cross-instance rate-limit; resolved-IP SSRF check (current guard is hostname-string only — DNS-rebinding still needs network egress controls).
- **Phase 2 — Money:** Lemon Squeezy checkout + webhook → plan; server-side plan gating. [needs: LS account, test mode ok]
- **Phase 3 — Demo polish:** honest-hybrid landing copy; Book-a-call (Calendly); PostHog funnel dashboard.
- **Phase 4 — V1 hardening:** Inngest queue; scheduled monitoring + "score dropped" alerts; Claude AI remediation suggestions (human-confirmed); WordPress plugin.
- **Phase 5 — V2/Enterprise:** agency/white-label portal; productized human-audit (partner); VPAT/ACR; SSO; CI/CD axe gate.

## Required from founder (access)
Anthropic API key · Resend key + verified domain (DNS) · Lemon Squeezy (or Stripe) account · Sentry + PostHog projects · Calendly link · confirm Supabase service-role.

## Session log
- 2026-06-23: Phase 1 funnel made demo-visible end-to-end. Added public scan API (/api/public-scan, SSRF double-gate + rate limit, ephemeral, generic errors), public scanner page (/scan, score + breakdown + plain-English issues + email gate → /api/scan-ingest), admin Leads page (/admin/leads, worst-first, getAdminUser-gated, service-role read), + isPublicHttpUrl guard with 10 unit tests. `npm run ci` green: 43 tests / typecheck 0. NOT verified live: browser scan needs Lambda chromium (cannot run on Windows); leads loop still blocked on applying the leads migration to Supabase.
- 2026-06-22: Audited real codebase (corrected stale docs). Ran competitive teardown (FTC, Overlay Fact Sheet, WebAIM, accessiBe pages) → docs/research/COMPETITIVE_TEARDOWN.md. Founder locked strategy (honest hybrid / SMB / bootstrap / demo-first). Delivered 3-perspective product walkthrough. **Executed Phase 0** (docs, shared-config drift guard, CI, observability seam) — verified green (27 tests, typecheck 0). Changes uncommitted on main. NEXT: commit Phase 0 (branch first); get Resend key + domain to start Phase 1 (scanner→email→lead loop).
