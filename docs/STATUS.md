# Makoya — STATUS (central memory dashboard)

> **This is the single glance-able source of truth.** Read this first; it answers "where are we, what's in flight, what's blocked, what's next."
> Detailed narrative history lives in [`SESSION.md`](./SESSION.md) (append-only log). This file is the *dashboard view* on top of it.
>
> **Last updated:** 2026-06-26 · **Updated by:** Claude (block 23 — v3.1 backend program: **Waves 1–4 merged**, **10 migrations APPLIED TO PROD** (advisor clean bar 2 intentional + the known leaked-pw toggle), automated `verify:db` harness + CI added, pricing strategy done)
>
> **Backup status:** ✅ All branches pushed to `origin` (github.com/anmoll-singhh/makoya-widget). No work is local-only.
>
> **How to ask for an update:** open this file, or tell any agent *"read docs/STATUS.md and tell me the status."*
> **How agents keep it true:** see [§ Update protocol](#-update-protocol). Update this file at the end of every work block, before SESSION.md.

---

## 🚦 At a glance

| | |
|---|---|
| **Current phase** | **Phase H — bulletproofing (code+DB+CI DONE; rest founder-gated)** · then Phase 2 billing = **Stripe** |
| **Prod URL** | https://makoya-gamma.vercel.app (deployed from `main`, manual `vercel --prod`) |
| **Prod = state** | ✅ **LIVE on `main`** — Phase 1.5 (token wall + core-bypass close) + scanner second-engine deployed 2026-06-25 (`dpl_HWjCBHvCGdP5t52nwBQwE2kfheNi`). Verified live: loader forwards `?t=`, core.js fetch-gates, `/api/config?t=` → `no-store`+`active:true` (monitor), `/api/public-scan`→200. **Token + enforcement both ship OFF** (monitor). |
| **Canonical branch** | `main` — all code merged + QA-green + deployed |
| **Biggest risk right now** | Set `WIDGET_SIGNING_SECRET` in Vercel + watch monitor logs BEFORE ever flipping `WIDGET_ENFORCE` (avoid the two-flag lockout — plan A2 truth table). Shopify publish still founder-gated (Partner account). |
| **Next founder unblock** | Stripe account · enable Supabase leaked-password toggle · free accounts (Sentry/PostHog/Upstash/Inngest) · rotate leaked keys |

---

## 🤖 Agent / worktree coordination board

> **You often run 2–3 Claude sessions at once. This board prevents collisions.** Claim your lane before editing. **Never edit files outside your worktree's lane.** Past failure to never repeat: an agent wrote into the *main* checkout despite having its own worktree.

| Worktree | Branch | Owner / purpose | Status |
|---|---|---|---|
| `C:\Users\ANMOL\Desktop\makoya` | `feat/phase-1-licensing` | **Widget license + domain gate (Phase 1)** | ✅ MERGED + **DEPLOYED LIVE** (monitor); branch prunable |
| `C:\Users\ANMOL\Desktop\makoya` | `feat/phase-1.5-and-delivery` | **Phase 1.5 token wall + core-bypass close + WP/Shopify delivery** | ✅ MERGED + QA-before/after green + **DEPLOYED LIVE** (monitor); branch prunable |
| `C:\Users\ANMOL\Desktop\makoya-scanner-v3` | `feat/scanner-evidence-v3` | Scanner evidence v3 (other session) | ✅ deploy blocker fixed (`0cf0a1a` vendored HTMLCS as string module) + second-engine LIVE |
| `C:\Users\ANMOL\Desktop\makoya` | `feat/dashboards-ui-wip` | Dashboard/admin/CRM UI elevation | 🔶 WIP, unmerged — decide: finish→merge or fold into strategic frontend rebuild |
| `.claude/worktrees/agent-*` | `harden/*` | Phase H parallel agents (A/B/C) | ✅ MERGED to main — worktrees + branches can be pruned |
| _(merged + pruned)_ | `feat/v31-heartbeat` | **v3.1 Wave 1A** — widget heartbeat / install-verify | ✅ MERGED to `main` (QA + security GO). Migration `20260626120000_widget_heartbeats.sql` NOT yet applied to prod |
| _(merged + pruned)_ | `feat/v31-analytics` | **v3.1 Wave 1B** — widget usage analytics | ✅ MERGED to `main` (QA + security GO). Migration `20260626130000_widget_events.sql` NOT yet applied to prod |

> **v3.1 backend program (block 23):** Coordinator + subagent build of the backend behind `docs/makoya_v3.1.html`. Deep gap analysis → `docs/BACKEND-READINESS-V3.1.md`; master plan + wave decomposition → `docs/superpowers/plans/2026-06-26-v3.1-backend.md`. Pipeline per lane = plan → TDD build (isolated worktree subagent) → independent QA (`npm run ci`) → independent security review → coordinator merge.
> - **Wave 1 DONE** (install-verify #5 + widget analytics #10): `widget_heartbeats`, `widget_uptime_days`, `widget_events`, `widget_event_daily` + `lib/heartbeat.ts`, `lib/analytics.ts` + public `/api/heartbeat`, `/api/widget-events` + authed `/api/sites/[id]/install-status`, `/api/sites/[id]/analytics`.
> - **Wave 2 DONE** (issues #1 + remediation/activity #7/#3 + overview/reports #3/#7): `issues`, `issue_attachments`, `activity_log`, `remediation_log`, `monthly_reports` + `lib/issues.ts`, `lib/activity.ts`, `lib/remediation.ts`, `lib/reports.ts`, `lib/overview.ts` + authed `/api/sites/[id]/{issues(GET/PATCH),remediation,reports,overview}`.
> - **Wave 3 DONE** (org/team/roles tenancy #13): `organizations`, `team_members`, `team_invites`, `api_keys` + nullable `sites.org_id` + `is_org_member()` SECURITY DEFINER helper + **additive** org-read RLS (existing `owner_id` policies untouched) + backfill + `lib/roles.ts`, `lib/api-keys.ts` (hashed secrets), `lib/org.ts` + authed role-gated `/api/org`, `/api/team`, `/api/org/api-keys`. `issues.assignee_id` FK → team_members wired.
> - **Wave 4 (partial) DONE:** statement generator #8 (`accessibility_statements` + `lib/statement.ts`, XSS-escaped + compliance-guardrail tested + authed `/api/sites/[id]/statement`); proof-of-effort pack #9 (`vpat_documents`, `manual_audits` + `lib/proof.ts` + authed `/api/sites/[id]/proof-pack`).
> - **DB now actually verified, not just mocked:** `scripts/verify-db.mjs` spins an ephemeral Docker Postgres, applies ALL migrations in order, and asserts trigger + RLS-on-every-table + cross-tenant denial + backfill idempotency (10/10). Wired into CI (`.github/workflows/db-verify.yml`) + `npm run verify:db`. Founder said **yes** to the CI DB job.
> - **🟢 PROD MIGRATIONS APPLIED (founder authorized):** all **10** v3.1 migrations (`widget_heartbeats … proof` + `harden_is_org_member`) applied to the prod Supabase project. `list_tables` = 21 tables, all RLS-enabled. Security advisor clean except: `leads`/`consultation_requests` RLS-no-policy (INTENTIONAL service-role-only) + leaked-password toggle (⛔ founder Auth setting). The `is_org_member` SECURITY DEFINER RPC-exposure advisor WARN was FIXED (moved to `private` schema).
> - **Pricing strategy DONE** → `docs/PRICING-STRATEGY-V3.1.md` (Free→Starter→Growth★→Scale→Enterprise + feature matrix + card copy + `plan_quotas`/`PlanCatalog` encoding spec + slug map `pro→growth`/`managed→scale`). Founder asked an expert to design it.
> - Totals: **10 migrations (APPLIED), ~30 new files, ~140 new tests**, CI green; verify:db 10/10; all security reviews GO.
> - **⛔ Still founder/coordinator before full go-live:** (1) **deploy** `apps/web` (`vercel --prod`) so the new routes ship; (2) coordinator `packages/widget` change so the widget EMITS heartbeat + analytics events; (3) enable Supabase leaked-password toggle; (4) Stripe account + real plan prices for billing checkout/webhook.
> - **Next:** Wave 4C (settings + customize extras #6/#12 — touches canonical `packages/shared`, coordinator-owned), then Wave 5 (billing scaffold #11 from the pricing spec, Stripe-deferred + partners #14).

> **Block 10 note (data + licensing — ✅ SHIPPED):** Founder **deleted all `sites`** (clean slate; `leads` untouched) — new sites onboarded fresh. **Phase 1 widget licensing gate** is **LIVE** (config endpoint enforces per-site `license_status` + `allowed_domains`; `no-store`; fail-open infra / fail-closed not-found; monitor→enforce via `WIDGET_ENFORCE`). Migration `widget_licensing` applied to prod; merged to main (`e54b684`); deployed (`dpl_9Qpw1etTxRXtapJ7VbbsKkQ3y1mc`, makoya-gamma); verified live (unknown siteId → 200, `no-store`, `active:true` monitor-mode). **Ships OFF** — `WIDGET_ENFORCE` unset, so nothing is blocked yet; flip it only after **Phase 1.5** (signed-token wall + close direct-`core.js` bypass — Origin-lock alone is a deterrent, spoofable). Plan + threat-model: `docs/plans/PHASE-1-LICENSING.md`.

> **Block 11 note (Phase 1.5 + delivery — ✅ MERGED, ⛔ DEPLOY BLOCKED):** Built multi-agent (3 lanes) + 2 reviews + QA-before/after (all green), merged to `main` (`c8d2699`). **Lane A (gate hardening):** versioned HMAC site token (`v1.<hmac>`, `WIDGET_SIGNING_SECRET` server-only) folded into the config-endpoint verdict with a **grace rule** (missing token passes → legacy installs never break; only a *wrong* token fails); closed the direct-`core.js` auto-init bypass (now fetch-gated, never throws, `data-demo` escape hatch); built the real dashboard install surface (token minted server-side). **Lane B (delivery):** WordPress plugin (`wordpress-plugin/`), Shopify theme-app-extension scaffold + runbook (`shopify-app/`, founder-gated on Partner account), `docs/INSTALL.md`. **Build fix:** `build:widget:deploy` + `scripts/copy-widget-bundles.mjs` + widget tests wired into `ci` (closes the silent-stale-bundle gap — even Phase 1's loader.js had never been copied). Both kill-switches ship OFF (`WIDGET_ENFORCE` + secret unset = monitor). Plan: `docs/plans/PHASE-1.5-AND-DELIVERY.md`. **✅ DEPLOYED LIVE** (`dpl_HWjCBHvCGdP5t52nwBQwE2kfheNi`) after the scanner session fixed the deploy blocker (`0cf0a1a`, vendored HTMLCS as a string module → removed the breaking `outputFileTracingRoot`); verified live (loader `?t=`, core fetch-gates, config `no-store`, scanner 200). Set `WIDGET_SIGNING_SECRET` in Vercel + watch monitor logs before ever flipping `WIDGET_ENFORCE` (see plan A2 truth table).

**Rules:** one worktree = one branch = one agent · don't develop two features in one checkout · if two lanes need the same shared file (`packages/shared`, `package.json`, `lib/email`), STOP and coordinate · deploy only from clean `main` (`vercel --prod` from `apps/web`; no GitHub auto-deploy) · update this board when a lane merges/ends.

**Branches to prune (merged or superseded — all on origin, safe):** `harden/api-security`, `harden/ci-quality`, `harden/test-depth`, `feat/scanner-trustworthy-v2`, `phase-1-foundation`, `phase-2-widget-customizer`, `phase-3-scanner`, `phase-4-admin-crm`, `phase-5-polish`, `ws2-client-dashboard`, `ws3-admin-dashboard`, `chore/phase-0-foundation`, `feat/landing-page`, `feat/pdf-report-export`, `feat/phase-1-scanner-funnel`, `fix/landing-auth-redirect`, `fix/widget-scroll-contain`. *(Confirm before delete.)*

---

## ✅ Live in production (verified)

| Area | What works | Verified |
|---|---|---|
| Widget | 15 a11y features · en/es/fr/de · 9 profiles · Shadow DOM · loader/core split · mobile sheet · scroll-containment | ✅ live |
| Scanner v2 | Real WCAG engine · deterministic evidence-based scoring + auditable breakdown + provenance · Lambda | ✅ live (87/100 ex.) |
| Public funnel | `/scan` → score + plain-English issues → email capture → `leads` row → `/admin/leads` | ✅ end-to-end live |
| PDF export | "Download PDF" on `/scan` (no SSRF surface, honesty-guarded, input caps) | ✅ live |
| Landing | Honest-hybrid `/`, scores 100/100 on our own scanner | ✅ live |
| Auth / data | Supabase Auth · RLS multi-tenant · admin gating via `ADMIN_EMAILS` | ✅ live |
| Email | Resend (`mailer.jewlx.ai`, verified); send failure never blocks lead | ✅ live + tested |
| **Security (Phase H)** | DNS-rebinding/SSRF resolved-IP block · Zod at all API boundaries · hardened SECURITY DEFINER fn | ✅ live + QA'd |
| **Hardening (block 12)** | Widget config-fetch AbortController timeout (hang→fail-open) · app HTTP security headers (nosniff/Referrer-Policy/Permissions-Policy/HSTS, embedding-safe) | ✅ live + smoke-verified (`dpl_8zJE2A…`) |
| **Observability (block 13)** | Upstash durable cross-instance rate limiting (public-scan 5/min, scan-ingest 10/min, **report-pdf 20/min** added block 14, per-endpoint namespaced, fail-open) · Sentry error reporting (server+edge+client, no-op without DSN) | ✅ live + verified (`dpl_8rJk9q…`): all 3 public routes enforce across instances + budgets isolated; Sentry test error fired (verify in dashboard) |
| **Code-review pass (block 14)** | High-effort multi-agent review of the session diff → caught report-pdf still on the broken limiter (fixed) + 2 latent (captureError client-DSN gate, getLimiter doc/model) | ✅ fixed + deployed + live-verified |

---

## 🛡️ Phase H — Bulletproofing status

| Item | Status |
|---|---|
| DB: harden SECURITY DEFINER fn (search_path + revoke rpc) | ✅ applied + verified (advisor clean) |
| API: SSRF resolved-IP/DNS-rebinding defense | ✅ live (localhost/metadata → 400) |
| API: Zod validation everywhere (safe generic errors) | ✅ live (malformed/bad-JSON → 400) |
| Tests: 106 → **212** (determinism, email-no-block, PDF caps, RLS suite, E2E) | ✅ green |
| CI: Gitleaks · Semgrep · CodeQL · Dependabot · Lighthouse(a11y=1.0) · axe-dogfood · coverage gate · eslint/prettier | ✅ added (run on push) |
| Supabase leaked-password protection | ⛔ founder toggle (Auth settings) |
| Sentry / PostHog / Upstash / Inngest wiring | ⛔ founder creates free accounts → I wire |
| Rotate Anthropic + Resend keys (leaked in chat) | ⛔ founder |
| PAID (optional, founder decides) | Vercel Pro · Supabase Pro · Snyk/Socket · BrowserStack · pen-test · Stripe Tax |

---

## ⛔ Blocked on founder (access / accounts)

| Blocker | Unblocks | Free? |
|---|---|---|
| **Stripe account** (test mode ok) | Phase 2 billing. ⚠️ Stripe ≠ MoR → founder owns tax/VAT | Free acct; ~2.9%+30¢/txn |
| Enable Supabase leaked-password protection | Phase H security (Auth → toggle) | Free, 30 sec |
| ~~Sentry~~ ✅ · ~~Upstash~~ ✅ · ~~PostHog~~ ✅ wired (US cloud, live) · Inngest (keys) · Stripe (founder setting up later) | scan queue (Inngest) + billing (Stripe) remain | Free tiers |
| Rotate Anthropic + Resend keys | Security (pasted in chat earlier) | — |
| Own booking-system embed code | Phase 3 book-a-call (placeholder slot for now) | — |

---

## 🎯 Up next (recommended order)

1. ✅ Scanner-v2 + Phase H code/DB/CI hardening — DONE + deployed + live-QA'd.
2. **Cleanup:** remove merged agent worktrees + scanner worktree; prune merged/stale branches (all backed up).
3. **Wire monitoring** once founder creates the free accounts (Sentry/PostHog/Upstash/Inngest).
4. **Phase 2 — Stripe billing** (test mode): checkout + signature-verified idempotent webhook → plan gating.
5. **Phase 4 — Features:** Inngest scan queue · scheduled monitoring + "score dropped" alerts · AI remediation (human-confirmed) · WordPress plugin.
6. **Booking:** drop founder's real embed into the placeholder slot.
7. **Strategic frontend rebuild** — research-led, deliberate (last, on a finished backend).

> **Strategy (locked 2026-06-24/25):** Backend + features first behind a minimal beautiful demo frontend; harden everything to bulletproof before new features; then redo the whole frontend strategically (research first). Decide the dashboard-UI-wip fate (finish vs fold into rebuild).

---

## 🗺️ Roadmap phases (one-liners — detail in SESSION.md)

- **Phase 0 — Foundation:** ✅ done.
- **Phase 1 — Revenue loop:** ✅ live (scan → email → lead → admin) + PDF.
- **Phase H — Bulletproofing:** ✅ code/DB/CI done + live; founder-gated items remain (above).
- **Phase 2 — Money:** ⛔ Stripe checkout + webhook → plan gating. *Blocked on Stripe account.*
- **Phase 3 — Demo polish:** 🔶 landing ✅; remaining = booking embed (founder's own) + PostHog.
- **Phase 4 — Features:** Inngest queue · monitoring + alerts · AI remediation · WordPress plugin.
- **Phase 5 — V2/Enterprise:** white-label · human-audit · VPAT/ACR · SSO · CI/CD axe gate.

---

## 📋 Update protocol (for every agent, every block)

**START of a block:** read this file + claim/confirm your lane on the agent board.

**END of a block, in order:**
1. **`STATUS.md`** — the dashboard. Edit the table cells, agent board, "Up next", and the `Last updated`/`Updated by` line. Keep it scannable.
2. **`SESSION.md`** — append the detailed narrative entry (what/why/verification).
3. If structure/guardrails changed, reflect it in `CLAUDE.md`.

**Honesty rule:** mark ✅ only when *verified* (tests run, browser/live-checked). 🔶 in-progress, ⛔ blocked. Never claim done without evidence.

**gbrain:** local searchable brain (see CLAUDE.md `## GBrain Configuration`). Re-seed after big changes: `cat docs/STATUS.md | gbrain put "makoya-status-dashboard"`.
