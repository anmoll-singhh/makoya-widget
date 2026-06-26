# Makoya v7 — Production Dashboard, Login & Admin Restyle — Design Spec

**Date:** 2026-06-26
**Author:** Claude (with founder)
**Status:** Awaiting founder approval → then `writing-plans`
**Source mockups:** `docs/makoya_v7.html` (dashboard), `docs/makoya_login.html` (login), `docs/makoya_brand_splash.png` (login background)

---

## 1. Goal

Make `docs/makoya_v7.html` the **real, live production client dashboard**, reframed around the founder's mental model:

- **Agent** = a website the user owns. One user can own many agents and manage them all from one dashboard.
- **Mike** = the audit agent — the existing real WCAG scanner, presented as a named auditor.

Plus: build the v7 **login page** (with the splash background + Google stub), **restyle the admin CRM** to the v7 theme, and make every gap that lacks credentials (Stripe) an **honest stub** — never fake "working" UI.

The backend is already ~95% built and live (14 migrations in prod, real Supabase auth + RLS, and the `/v3` preview already wires most screens to live authed APIs). This work is therefore **primarily a high-fidelity frontend build + a multi-site "Agents" layer + 3 small endpoints + login + admin restyle + cutover + deploy**.

## 2. Locked decisions (founder, 2026-06-26)

| # | Decision | Choice |
|---|---|---|
| 1 | Cutover | **Full cutover** — v7 **becomes `/dashboard`**; the old `/dashboard` UI and `/v3` preview are retired. |
| 2 | Admin CRM | **Restyle** `/admin` to the v7 navy/royal-blue/sage glass design system. |
| 3 | Google SSO | **Stub** — button rendered pixel-perfect but disabled ("coming soon"). Email+password fully works. |
| 4 | Deploy | **Preview first** (Vercel preview URL) → founder eyeballs → **promote to prod** (`makoya-gamma`). |
| 5 | Code review gate | **"R" review subagent + built-in `/code-review`** per lane. No CodeRabbit account (CLI is Linux/macOS-only; founder opted out for this session). |
| 6 | Invoices | **Honest empty state** ("Invoices appear here once billing is connected"). Real rows light up when Stripe is wired. |

## 3. Non-negotiables (inherited from CLAUDE.md / STATUS.md)

- **No compliance/"guaranteed accessible" claims** in user copy. The v7 mockup already follows this ("we track and estimate; we never auto-certify"). Preserve that language verbatim.
- **Entitlement contract:** paid-feature gating must key off `billing_subscriptions.status === 'active'` (the future Stripe-webhook PAID state), **never** `trialing`. `trialing` = "selected, awaiting payment", no expiry. Buy-now must not grant paid entitlements.
- **Widget rules unchanged** — this work does not touch `packages/widget` runtime behavior; Customize writes config the widget already reads.
- **RLS multi-tenant** — every new endpoint is owner/org-scoped; never trust the client for plan/ownership state. `leads`/`consultation_requests` stay service-role-only.
- **Never hand-edit `apps/web/lib/shared/`** (generated mirror). If `packages/shared` changes, run `npm run sync:shared`.
- **QA gate around every merge:** `npm run ci` green on an up-to-date base before AND after merge.

## 4. Architecture & routing

Full cutover. v7 lives at `/dashboard` with real, deep-linkable nested routes so the **agent switcher** maps to a URL segment.

```
/dashboard                       → server redirect: → /dashboard/agents if 0 or >1 agents,
                                    or → /dashboard/<onlySiteId> if exactly one (last-used cookie may override)
/dashboard/agents                → Agents portfolio (multi-site list + portfolio KPIs)
/dashboard/agents/new            → Add-agent wizard (add → free scan → choose plan → install)
/dashboard/[siteId]              → Overview  (hero + journey + score gauge + 4 KPIs + trend + next-best-action + activity + priority issues + framework progress)
/dashboard/[siteId]/mike         → Mike audit (Overview / Issues / Criteria; grouped Failing / Needs review / Passing)
/dashboard/[siteId]/install      → Install widget (copy code, pick platform, verify)
/dashboard/[siteId]/customize    → Customize widget (Features / Appearance / Mobile + live preview)
/dashboard/[siteId]/statement    → Accessibility statement generator
/dashboard/[siteId]/proof        → Proof of effort pack
/dashboard/[siteId]/reports      → Monthly audits + remediation log
/dashboard/[siteId]/analytics    → Widget usage analytics
/dashboard/[siteId]/settings     → Agent settings (Owner info / Advanced / Notifications)
/dashboard/[siteId]/billing      → Plan & billing (per-agent; honest invoices)
/dashboard/account               → Account (Profile/org · Team · Security · API keys) — account-level
/dashboard/partners              → Partner program — account-level
```

**Shared shell** (in `app/dashboard/layout.tsx`):
- Sidebar: brand gem · **agent switcher** (swaps `[siteId]`) · global nav (Dashboard, Agents) · per-agent nav group (Overview, Mike, Widget›Install/Customize, Compliance›Statement/Proof, Insights›Reports/Analytics, Agent settings) · footer (Account, Plan & billing, Partners, Help) · "All systems operational" status.
- Topbar (glass): search, notifications bell, user menu (real name/email/initials from session; sign-out).
- v7 **craft CSS layer** ported verbatim from the mockup `<style>` (glass, aurora hero, gauge glow, dimensional icon tiles, floating cards) **including** every `@media` a11y guard: `prefers-reduced-motion`, `prefers-reduced-transparency`, `forced-colors`. This is a non-negotiable part of "exactly like the mockup".

**Implementation note:** the existing `/v3/Dashboard.tsx` already contains working fetch/loading/error logic for Overview, Mike/Issues, Install, Customize, Statement, Proof, Reports, Analytics, Billing, Settings, Account, Team, API keys, Partners. We **port and re-skin** that logic into the v7 markup/routes — we do not rebuild data-fetching from scratch. `/v3` is deleted at the end of cutover.

## 5. Multi-site "Agents" layer — the only real backend gaps

Three new owner-scoped pieces (everything else already has a live API):

### 5.1 `GET /api/sites` — list my agents
Returns the authenticated owner's sites for the portfolio + switcher: `{ id, name, domain, plan, status, score, openIssues, lastAuditAt, installed }`. Scoped by RLS (owner + org membership). Powers the Agents table and portfolio KPIs (total agents, avg score, open issues, need-attention count) and the sidebar switcher.

### 5.2 `POST /api/sites` — self-serve create agent
Body `{ name, domain }`. Inserts a `sites` row owned by the auth user (via the user's Supabase client so RLS applies; `owner_id = auth.uid()`). The existing **AFTER-INSERT trigger** auto-provisions org + owner membership + `org_id` + a `free` `billing_subscription`, and an install token is available server-side. Returns `{ siteId, token }`.
- **Build-time check:** confirm an RLS INSERT policy on `sites` permits `owner_id = auth.uid()` self-insert. If missing, add a migration with that policy only (additive, does not touch existing policies). Validate domain with Zod + the existing SSRF-safe URL rules.

### 5.3 Free scan on add
Reuse the **existing real scanner** for the new agent's homepage. Prefer the existing public scan path (`/api/public-scan`) for the teaser; show the first issue and lock the rest ("install to unlock the full audit"), exactly like the mockup. No new scanner code — wire to what exists. The full monitoring scan begins after install/verify (existing cron + completion pipeline populates `issues`/`activity`).

## 6. Screen-by-screen data map

| Screen | Data source | Real vs honest-stub |
|---|---|---|
| Overview / Dashboard | `GET /api/sites/[id]/overview` (score, issues, journey, framework, activity, next-best-action) | **Real** |
| Agents portfolio | `GET /api/sites` (new) | **Real** |
| Add agent | `POST /api/sites` (new) + `/api/public-scan` | **Real** |
| Mike audit | `GET /api/sites/[id]/issues` (+ `PATCH` resolve/assign), criteria from overview | **Real** (assignee → team_members) |
| Install | `GET /api/sites/[id]/install-status` + server-minted token; "Verify" hits install-status | **Real**. "Send to developer" → mailto/Resend if wired, else honest "copied/share" action (no fake send) |
| Customize | `GET/PUT /api/sites/[id]/config` (canonical `@makoya/shared` fields) + `lib/contrast.ts` for the AA badge | **Real** |
| Statement | `GET/POST /api/sites/[id]/statement` | **Real** |
| Proof | `GET /api/sites/[id]/proof-pack` | **Real** for items with data; VPAT/manual-audit show real on-file state or honest "not yet generated" — never a fake "Ready" |
| Reports | `GET /api/sites/[id]/reports` (monthly) + `/remediation` (log); "Download PDF" → existing `report-pdf` | **Real** where data exists; honest empty state otherwise |
| Analytics | `GET /api/sites/[id]/analytics` (widget opens, feature activations from `widget_events`) | **Real** |
| Billing | `GET /api/sites/[id]/billing` (plan/quota/usage) + `POST …/billing/checkout` (sets `trialing`, no charge) | **Real subscription state**; **Stripe stub** for payment; **honest empty invoices** |
| Settings | `GET/POST /api/sites/[id]/settings` (private owner info + advanced widget toggles) | **Real** |
| Account | `GET /api/org`, `GET/POST /api/team` (+ `/team/accept`), `GET/POST/DELETE /api/org/api-keys` | **Real** |
| Partners | `GET /api/partner`, `/partner/white-label`, `POST /partner/enroll` | **Real**; revenue = $0 until Stripe (honest), not the mockup's "$6.2k" |

**Rule:** any tile/number the mockup hard-codes (3 agents, score 86, $6.2k, 142 days uptime, sample invoices) is replaced by the real value for the logged-in account, or an honest empty/zero state. No mock numbers ship.

## 7. Login page

`app/login/page.tsx` + `LoginForm.tsx` re-built to match `docs/makoya_login.html`:
- Full-bleed `makoya_brand_splash.png` background (move asset into `apps/web/public/`), white card, Makoya gem, "Welcome back", email + password (show/hide eye), Remember me, Forgot password, primary "Sign in", divider, **disabled** "Continue with Google" with a "coming soon" affordance, "New to Makoya? Start free" → existing signup, trust row.
- Wired to existing Supabase email/password auth (`lib/supabase/*`, `app/auth/*`). Real validation + error states. Forgot-password → existing reset flow if present, else honest link.
- Accessibility preserved (labels, focus-visible, real `<button>`s).

## 8. Admin restyle

`/admin` (layout, page, leads, requests, sites) re-skinned with the v7 design tokens/components (same CSS variables, cards, pills, tables, glass topbar). **Functionality unchanged** — worst-score-first customer list, plan management, leads, consultations. No data-model or route changes; purely presentational alignment to the v7 system, with the same a11y guards.

## 9. Stripe stub (explicit)

- Keep the inert seam `apps/web/lib/billing/stripe.ts` (no SDK, no secret).
- "Choose/Buy now" → `POST /api/sites/[id]/billing/checkout` sets `status:'trialing'` (no charge), carries the `// TODO(stripe)` marker.
- Billing UI shows real plan/quota/usage + honest invoices empty state.
- A clear, friendly "Payments connect soon" note where a real charge would occur. When Stripe is later wired, only `status==='active'` unlocks paid entitlements.

## 10. Build pipeline (multi-agent, as requested)

Parallel **lanes**, each in its **own git worktree = own branch = one agent** (per the multi-agent rule), pipeline per lane:

1. **Plan** the lane (scoped slice of the implementation plan).
2. **Build** with TDD where it's logic (endpoints, mappers); component/visual work verified against the mockup.
3. **"R" review** — a dedicated read-only review subagent audits the lane's diff for correctness, security, a11y, and fidelity.
4. **`/code-review`** built-in skill on the lane diff.
5. **`npm run ci` green** (sync:shared + typecheck web+widget + tests + shared-sync drift).
6. **Founder-visible checkpoint** as appropriate; I merge to `main` only on green.

**Lanes (initial):**
- **A — Shell & login:** `app/dashboard/layout.tsx` (sidebar/topbar/switcher), v7 craft CSS, login page, asset move.
- **B — Agents/multi-site & endpoints:** `GET/POST /api/sites`, portfolio page, add-agent wizard, redirect logic, (RLS policy migration if needed).
- **C — Per-agent screens:** port + re-skin the 12 per-agent/account screens from `/v3` into v7 routes/markup at full fidelity.
- **D — Admin restyle:** re-skin `/admin`.

Lanes A and B/C share the shell contract — A lands first (or its shell contract is fixed first) to avoid collisions on `layout.tsx`. Shared files (`packages/shared`, `package.json`) are touched by only one lane at a time; if two need them, STOP and coordinate (STATUS.md rule).

> **Note on parallelism:** subagents are spawned **only because the founder explicitly asked for multi-agent architecture.** Lanes with a shared-file dependency are serialized, not forced parallel.

## 11. Testing strategy

- **Unit/integration (vitest):** new endpoints (`GET/POST /api/sites`) — ownership/RLS scoping, validation, onboarding-trigger side effects, error/fallback. Mappers snake↔camel. Contrast badge logic.
- **Shared-sync gate:** unchanged; CI fails on mirror drift.
- **Live smoke (headless browser) against the preview deploy:** sign in as the demo customer → portfolio renders real agents → open an agent → every screen loads real data (no console errors, no fake numbers) → add-agent wizard runs a real free scan → customize publishes → billing buy-now writes `trialing` then resets → admin renders.
- **a11y:** verify the ported reduced-motion / reduced-transparency / forced-colors guards actually apply; keyboard nav + focus on the shell and login.
- `npm run ci` green before every merge and again on `main` after.

## 12. Deployment

1. All lanes merged to `main`, `npm run ci` green on `main`.
2. `vercel` **preview** deploy from `apps/web`; run the live smoke checklist against the preview URL.
3. Founder reviews the preview.
4. On approval: `vercel --prod` → `makoya-gamma`. Live smoke on prod. Update STATUS.md + SESSION.md.

## 13. Out of scope / explicitly deferred

- Real Stripe payment, real invoices, partner commission $ (blocked on Stripe account — stubbed honestly).
- Real Google OAuth (stubbed; founder enables provider later).
- New scanner capability — we reuse the existing engine.
- Widget runtime changes.
- New analytics/event types beyond what `widget_events` already captures.

## 14. Acceptance criteria

- `/dashboard` is the v7 UI; old dashboard + `/v3` removed; no dead links.
- A user with multiple agents can switch between them and manage each from one dashboard; a user can self-serve **add an agent** (real row + real free scan).
- Every screen renders **real account data or an honest empty state** — zero hard-coded mock numbers, zero fake "working" actions.
- Login matches the mockup (splash bg, Google stub, working email/password).
- `/admin` visually matches the v7 system, functionally unchanged.
- Stripe is a clearly-honest stub; entitlement contract respected.
- `npm run ci` green; "R" review + `/code-review` passed each lane; live smoke green on preview, then prod.
- STATUS.md + SESSION.md updated.

## 15. Best-version mandate & tooling (founder directive, 2026-06-26)

**Best-version mandate.** Every capability we wire must use the **most complete, best implementation we have built to date** — not a minimal shortcut. Concretely:
- Where the "minimal" `/v3` port and a richer implementation both exist for a screen, port the **richer** behavior (full loading/empty/error states, real interactions like issue assignment/resolution, real publish on Customize, real proof-pack items).
- The scanner used for audits + the free teaser scan is the **current best engine** (Scanner v2 — deterministic evidence-based scoring + provenance), not an older path.
- Reuse the hardened pieces already live: SSRF-safe URL validation, Zod at every boundary, Upstash durable rate-limiting, Sentry capture seam, fail-open widget config — new endpoints inherit these patterns, they are not re-invented more weakly.

**Free enhancements — applied now (no founder action, already provisioned per STATUS.md):**
- **Sentry** — wrap new `/api/sites` routes + dashboard error boundaries via `lib/observability.ts` (already wired; no-op without DSN).
- **PostHog** — fire product events on the real funnel moments this UI introduces: `agent_added`, `free_scan_viewed`, `widget_published`, `plan_buy_now`, `agent_switched` (provider already mounted: `app/posthog-provider.tsx`).
- **Upstash rate-limit** — apply the existing limiter to `POST /api/sites` (abuse-prone create) the same way public routes are limited.
- **axe-core / Lighthouse a11y** — already in CI; extend the dogfood check to the new `/dashboard` shell + login so the product passes its own accessibility bar.
- No new dependency is added unless it is free, already in the tree, or trivially justified; anything non-trivial is listed in §16 instead of silently installed.

**Final deliverable:** a written **product review** at session end (see §16) covering what shipped, what's honestly stubbed, the paid-tools register, and recommended next steps.

## 16. Paid-tools register & end-of-session product review (deliverable)

At session end I deliver `docs/V7-PRODUCT-REVIEW.md` containing:

1. **What shipped** — screen-by-screen real/stub status, verified live on preview→prod.
2. **Paid-tools register** — every tool that would *enhance* the product but costs money, each with: **what it does**, **why it'd be used here**, **exact current price** (verified against the vendor at write-time — not quoted from memory), and **priority**. Expected candidates (prices to be verified, not asserted now): Stripe (payments, ~2.9%+30¢/txn + optional Stripe Tax), Vercel Pro, Supabase Pro, Inngest (scan queue), Snyk/Socket (supply-chain), BrowserStack (cross-browser a11y), managed uptime/monitoring, a transactional-email tier bump if Resend free is exceeded. **No paid tool is enabled this session** — free tools only, paid ones are documented for the founder to choose.
3. **Honest gaps** — anything not fully real and exactly why (Stripe payment, Google OAuth, real invoices/commission).
4. **Product review** — a candid assessment of the whole product (UX, trust/positioning, accessibility, security posture, conversion funnel) with prioritized recommendations.

> Accuracy rule for this deliverable: **all prices are fetched/verified at write-time.** If a price cannot be verified, it is marked "verify" rather than guessed. No hallucinated numbers.

## 17. Open risks

- **`sites` self-insert RLS** may need an additive policy (build-time check, §5.2).
- **`/v3` fidelity gap:** `/v3` is "minimal"; some screens may need more wiring than a straight port (e.g., Mike Criteria tab, issue assignment UI). Each is wired to a real API or given an honest state — flagged per-screen during the plan.
- **Shell file contention** between lanes A/C — mitigated by landing A's shell contract first.
- **Time:** large surface for one session; preview-gated so nothing half-done hits prod.
