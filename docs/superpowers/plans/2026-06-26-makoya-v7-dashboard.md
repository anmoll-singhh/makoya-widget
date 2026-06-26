# Makoya v7 Production Dashboard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Each task ends with `npm run ci` green + an "R" review + `/code-review` before it is merged.

**Goal:** Ship `docs/makoya_v7.html` as the real, live `/dashboard` — a multi-agent (multi-site) client dashboard wired to the existing live APIs — plus the v7 login page and an admin restyle, with Stripe honestly stubbed.

**Architecture:** Next.js 15 App Router. A shared shell (`app/dashboard/layout.tsx`) renders the v7 sidebar (with agent switcher), glass topbar, and the ported v7 craft CSS. Per-agent screens live at `/dashboard/[siteId]/<screen>` and fetch real data from the already-live authed `/api/sites/[id]/*` endpoints; account-level screens (Account, Partners) and the Agents portfolio sit alongside. Two tiny new owner routes (`GET`/`POST /api/sites`) wrap the **existing** `listSites`/`createSite` lib functions. Old `/dashboard` UI and `/v3` are deleted at cutover.

**Tech Stack:** Next.js 15, React 19, TypeScript, Supabase (`@supabase/ssr`, RLS), vitest, Zod, Tabler icons (webfont, already used by mockup), Manrope/Satoshi fonts, Sentry + PostHog + Upstash seams (already wired).

## Global Constraints

- **Best-version mandate:** port the *richest* existing behavior, not the minimal `/v3` shortcut. Audits use Scanner v2.
- **No compliance/"guaranteed accessible" claims.** Preserve the mockup's honest copy verbatim.
- **Entitlement contract:** paid features gate on `billing_subscriptions.status === 'active'`, never `trialing`.
- **RLS multi-tenant:** every new endpoint is owner-scoped via the cookie-bound client; ownership check turns not-found into 404 (mirror `overview/route.ts`). Never echo raw DB errors — route through `captureError` and return a generic message.
- **Never hand-edit `apps/web/lib/shared/`** (generated). Run `npm run sync:shared` if `packages/shared` changes.
- **Zod at every API boundary; SSRF-safe URL validation** for any domain input.
- **No new paid tooling.** Free seams only (Sentry/PostHog/Upstash already in tree). Paid candidates go in `docs/V7-PRODUCT-REVIEW.md`, not installed.
- **QA gate:** `npm run ci` green on an up-to-date base before AND after each merge.
- **a11y guards** (`prefers-reduced-motion`, `prefers-reduced-transparency`, `forced-colors`) ported verbatim from the mockup; the new shell + login must pass the existing CI axe/Lighthouse a11y check.
- **Integration branch:** `feat/v7-dashboard`. Each lane is its own worktree+branch off it; merge lane→integration only on green; integration→`main` at the end; deploy preview→prod.

## File Structure

```
apps/web/app/dashboard/
  layout.tsx                     # v7 shell: sidebar + switcher + topbar (RSC: session, listSites)
  Shell.tsx                      # client shell chrome (nav state, switcher dropdown, group expand)
  dashboard.css                  # ported v7 craft CSS (verbatim from mockup <style>)
  page.tsx                       # redirect: 0/many → /agents, exactly one → /[siteId]
  agents/page.tsx                # Agents portfolio (list + KPIs)  [Lane B]
  agents/new/AddAgent.tsx        # add-agent wizard               [Lane B]
  agents/new/page.tsx
  [siteId]/layout.tsx            # resolves+authorizes site, mints token, sets per-agent nav context
  [siteId]/page.tsx              # Overview                        [Lane C]
  [siteId]/mike/page.tsx         # Mike audit                      [Lane C]
  [siteId]/install/page.tsx      [siteId]/customize/page.tsx       [Lane C]
  [siteId]/statement/page.tsx    [siteId]/proof/page.tsx           [Lane C]
  [siteId]/reports/page.tsx      [siteId]/analytics/page.tsx       [Lane C]
  [siteId]/settings/page.tsx     [siteId]/billing/page.tsx         [Lane C]
  account/page.tsx               partners/page.tsx                 [Lane C]
  _components/                    # shared v7 primitives (Card, Pill, Toggle, Gauge, KpiCard, Hero…)
apps/web/app/api/sites/route.ts  # NEW: GET (list) + POST (create) [Lane B]
apps/web/lib/portfolio.ts        # NEW: per-owner agent roll-up    [Lane B]
apps/web/app/login/{page,LoginForm}.tsx   # rebuilt to mockup       [Lane A]
apps/web/public/makoya_brand_splash.png   # moved asset            [Lane A]
apps/web/app/admin/**            # restyled to v7 tokens           [Lane D]
docs/V7-PRODUCT-REVIEW.md        # end-of-session deliverable
```

Delete at cutover: `app/v3/**`, the old `app/dashboard/DashboardTabs.tsx` + old screen files (replaced).

---

## LANE A — Shell, v7 CSS & Login

### Task A1: Port the v7 craft CSS

**Files:**
- Create: `apps/web/app/dashboard/dashboard.css`

- [ ] **Step 1:** Copy the entire `<style>` block from `docs/makoya_v7.html` (lines 10–358) into `dashboard.css` verbatim — including the v5 base, v6 overrides, **and** the v7 craft layer, and **all** `@media` a11y guards (`prefers-reduced-motion`, `prefers-reduced-transparency`, `forced-colors`). Keep the `:root` tokens.
- [ ] **Step 2:** Add the font links (Manrope, Satoshi, Tabler icons webfont) to `app/dashboard/layout.tsx` head (or import in CSS via `@import`), matching the mockup `<link>`s.
- [ ] **Step 3:** Visual check — temporarily render a mockup section; confirm tokens/glass resolve. Commit.

```bash
git add apps/web/app/dashboard/dashboard.css
git commit -m "feat(v7): port v7 craft CSS verbatim from mockup"
```

### Task A2: Shared v7 primitives

**Files:**
- Create: `apps/web/app/dashboard/_components/{Card,Pill,Toggle,Seg,Gauge,KpiCard,Hero,Note,Feat,PageHead}.tsx`

**Interfaces — Produces:**
- `Gauge({ value, size, label, delta })` → the score ring (svg, gradient `#1E63FF→#1FA86B`, `role="img"` aria-label `Accessibility score: N out of 100`).
- `KpiCard({ icon, iconBg, label, value, unit, delta, deltaDir, spark })`.
- `Pill({ tone, icon, children })` tones: `high|med|low|green|gray|b-red|b-amber|b-blue|b-green`.
- `Toggle({ on, onChange, label })` — real `<button role="switch" aria-checked>`.
- `Note({ tone: 'info'|'warn'|'good', children })`.
- `PageHead({ kicker, title })`.

- [ ] **Step 1:** Build each primitive as a faithful React port of the mockup's class-based markup (`.kpi`, `.gauge/.gwrap`, `.pill`, `.toggle`, `.note`, `.mcard`, `.feat`, `.pagehead`). Preserve aria attributes from the mockup.
- [ ] **Step 2:** Toggle/Seg are real interactive controls (keyboard-operable), not divs.
- [ ] **Step 3:** Commit.

```bash
git commit -am "feat(v7): shared dashboard UI primitives"
```

### Task A3: Dashboard shell (sidebar + topbar + switcher)

**Files:**
- Create: `apps/web/app/dashboard/layout.tsx` (RSC), `apps/web/app/dashboard/Shell.tsx` (client)

**Interfaces:**
- Consumes: `listSites(supabase, user.id)` from `lib/sites.ts`; session from `getServerSupabase`.
- Produces: `<Shell sites={Site[]} currentSiteId?={string} user={{name,email,initials}}>{children}</Shell>` — renders sidebar (brand gem, agent switcher dropdown, global nav Dashboard/Agents, per-agent nav group, footer Account/Billing/Partners/Help, status), glass topbar (search, bell, user menu with real sign-out → `/auth/signout`).

- [ ] **Step 1:** `layout.tsx`: require session (else `redirect('/login?next=/dashboard')`); load `sites`; derive current `siteId` from the route segment (read via `headers()`/params pattern or pass through children). Render `<Shell>`.
- [ ] **Step 2:** `Shell.tsx`: port sidebar markup from mockup (lines 363–393) and topbar (395–401). Agent switcher = a real `<button>` opening a list of `sites` → navigates to `/dashboard/[id]`. Nav groups expand/collapse with `aria-expanded` (port mockup JS behavior to React state). Active link by current path.
- [ ] **Step 3:** User menu shows real `user.name/email/initials`; sign-out posts to existing `/auth/signout`.
- [ ] **Step 4:** Keyboard + focus: skip-link, focus-visible, Esc closes switcher. Verify a11y guards apply.
- [ ] **Step 5:** Commit.

```bash
git commit -am "feat(v7): dashboard shell — sidebar, agent switcher, glass topbar"
```

### Task A4: Login page to mockup

**Files:**
- Modify: `apps/web/app/login/page.tsx`, `apps/web/app/login/LoginForm.tsx`
- Create: `apps/web/public/makoya_brand_splash.png` (copy from `docs/makoya_brand_splash.png`)
- Create: `apps/web/app/login/login.css`

- [ ] **Step 1:** Copy `docs/makoya_brand_splash.png` → `apps/web/public/makoya_brand_splash.png`.
- [ ] **Step 2:** Port `docs/makoya_login.html` markup+CSS into `LoginForm.tsx` + `login.css`: full-bleed splash bg (`background-image:url('/makoya_brand_splash.png')`), white card, gem, "Welcome back", email + password with show/hide eye, Remember me, Forgot password, primary Sign in, divider, **disabled** "Continue with Google" (visually present, `aria-disabled`, tooltip/sublabel "coming soon"), "New to Makoya? Start free" → existing signup route, trust row, bottom tagline.
- [ ] **Step 3:** Keep the existing Supabase email/password submit logic (real auth, real error states, `next` param redirect). Do not break the existing flow — only restyle + wire the two real fields.
- [ ] **Step 4:** Verify: wrong creds → real error; correct → redirect to `/dashboard`. a11y: real labels, focus-visible, eye toggle keyboard-operable.
- [ ] **Step 5:** Commit.

```bash
git commit -am "feat(v7): login page matches mockup (splash bg, Google stub, real email/password)"
```

---

## LANE B — Agents (multi-site) layer & endpoints

### Task B1: `lib/portfolio.ts` — per-owner agent roll-up

**Files:**
- Create: `apps/web/lib/portfolio.ts`
- Test: `apps/web/lib/portfolio.test.ts`

**Interfaces — Produces:**
- `listAgents(client, ownerId): Promise<AgentSummary[]>` where `AgentSummary = { id, name, domain, plan, status: 'active'|'monitoring'|'action_needed', score: number|null, openIssues: number, lastAuditAt: string|null, installed: boolean }`.
- `portfolioKpis(agents): { total, avgScore, openIssues, needAttention }`.

- [ ] **Step 1 (test):** Write `portfolio.test.ts` — given a fake client returning 2 sites + their overview roll-ups, `listAgents` returns merged summaries; `portfolioKpis` computes total=2, avgScore=mean(scores ignoring null), openIssues=sum, needAttention=count(status==='action_needed'). Mirror the mocking style in `app/api/sites/[id]/billing/route.test.ts`.
- [ ] **Step 2:** Run: `npm run test -w @makoya/web -- portfolio` → FAIL (module missing).
- [ ] **Step 3:** Implement `listAgents` by composing `listSites` + the existing `getOverview`/install-status reads per site (reuse `lib/overview.ts`, `lib/billing.ts` for plan). `portfolioKpis` pure. Status derivation: not installed → `action_needed` if score low or never audited; installed+monitoring otherwise (document the rule inline).
- [ ] **Step 4:** Run test → PASS.
- [ ] **Step 5:** Commit.

```bash
git commit -am "feat(v7): portfolio roll-up lib (listAgents, portfolioKpis)"
```

### Task B2: `GET`/`POST /api/sites`

**Files:**
- Create: `apps/web/app/api/sites/route.ts`
- Test: `apps/web/app/api/sites/route.test.ts`

**Interfaces:**
- Consumes: `listAgents` (B1), `createSite(client, ownerId, domain)` + `mintSiteToken` (existing).
- Produces: `GET /api/sites` → `{ agents: AgentSummary[], kpis }`. `POST /api/sites` body `{ name?, domain }` → `{ siteId, token }` (201).

- [ ] **Step 1 (test):** `route.test.ts` — (a) `GET` with no session → 401; with session → 200 `{agents,kpis}`. (b) `POST` no session → 401; invalid domain → 400 (Zod + SSRF rule); valid → 201 `{siteId, token}` and `createSite` called with `(client, user.id, domain)`. Mirror billing route test mocking.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement: auth via `getServerSupabase`; `GET` → `listAgents` + `portfolioKpis`; `POST` → validate domain with the existing Zod + SSRF-safe validator (reuse `lib/validation/*`), call `createSite`, then `mintSiteToken(site.id)`, return 201. Apply the existing Upstash limiter to `POST` (namespace `sites-create`, fail-open) as public/abuse-prone routes do. `captureError` + generic 500.
- [ ] **Step 4:** Run → PASS; `npm run ci`.
- [ ] **Step 5:** Commit.

```bash
git commit -am "feat(v7): GET/POST /api/sites (owner agent list + self-serve create)"
```

### Task B3: `sites` self-insert RLS verification (+ migration only if needed)

**Files:**
- Possibly create: `supabase/migrations/<ts>_sites_owner_insert.sql`

- [ ] **Step 1:** Verify whether `sites` already has an INSERT policy allowing `owner_id = auth.uid()` self-insert (check `infra/schema.sql` + `supabase/migrations/*` + `mcp__supabase__list_tables`). The AFTER-INSERT onboarding trigger already exists; confirm it fires for owner-inserted rows.
- [ ] **Step 2:** If and only if missing, add an **additive** migration with a single INSERT policy `with check (owner_id = auth.uid())` — do not touch existing policies. Run `npm run verify:db` (ephemeral Docker Postgres) to prove all migrations still apply + RLS intact.
- [ ] **Step 3:** If a migration was added, it stays **unapplied to prod** until founder authorizes (per STATUS protocol); note it for the deploy step.
- [ ] **Step 4:** Commit (if changed).

```bash
git commit -am "feat(v7): owner self-insert RLS policy for sites (additive)"  # only if needed
```

### Task B4: Agents portfolio page + Add-agent wizard

**Files:**
- Create: `apps/web/app/dashboard/agents/page.tsx`, `apps/web/app/dashboard/agents/AgentsTable.tsx`
- Create: `apps/web/app/dashboard/agents/new/page.tsx`, `apps/web/app/dashboard/agents/new/AddAgent.tsx`
- Create/modify: `apps/web/app/dashboard/page.tsx` (redirect logic)

- [ ] **Step 1:** `dashboard/page.tsx` (RSC): load `listSites`; if 0 or >1 → `redirect('/dashboard/agents')`; if exactly 1 → `redirect('/dashboard/<id>')`.
- [ ] **Step 2:** `agents/page.tsx`: fetch `GET /api/sites`; render portfolio KPIs (`.mcard`) + the agents `.tcard` table (mockup lines 473–486) with **real** rows; "New agent" → `/dashboard/agents/new`. Empty state when no agents. Each row "Manage" → `/dashboard/<id>`.
- [ ] **Step 3:** `AddAgent.tsx`: port the 4-step wizard (mockup 487–509). Step 1 form (name/domain) → `POST /api/sites` → on success run the free teaser scan via `/api/public-scan` for the domain homepage → show real top issue + locked remainder → "Continue — get the widget" → `/dashboard/<id>/install`. "See full audit with Mike" → `/dashboard/<id>/mike`. Honest copy preserved.
- [ ] **Step 4:** PostHog: fire `agent_added`, `free_scan_viewed`. Verify create→scan→install happy path manually.
- [ ] **Step 5:** `npm run ci`; commit.

```bash
git commit -am "feat(v7): Agents portfolio + self-serve add-agent wizard (real scan)"
```

---

## LANE C — Per-agent & account screens (port + re-skin, best-version)

> Each task: build `app/dashboard/[siteId]/<screen>/page.tsx` (+ a client component) porting the **richest** existing wiring (prefer the fuller implementation over `/v3` minimal) into v7 markup from the named mockup lines, fetching from the named live API. Verification per task = renders real data (no hard-coded mock numbers), honest empty/error states, a11y guards intact, no console errors. `[siteId]/layout.tsx` resolves+authorizes the site once (404/redirect if not owner) and mints the token.

### Task C0: `[siteId]/layout.tsx` — per-agent context
- [ ] Resolve `siteId` param → `getSite` + ownership check (else `notFound()`); mint token; provide `{site, token}` to children via a server component prop or context. Set the active per-agent nav. `npm run ci`; commit.

### Task C1: Overview (`[siteId]/page.tsx`) — mockup 407–471, API `GET /api/sites/[id]/overview`
- [ ] Hero (welcome + compliance journey + score `Gauge`), 4 `KpiCard`s, score-trend chart (real series; honest "not enough data" if sparse), Next-best-action (derived from real issues), Activity feed (`activity_log`), Priority issues (real grouped counts), Framework progress bars (real coverage). Replace every mock number. Commit.

### Task C2: Mike audit (`[siteId]/mike/page.tsx`) — mockup 510–530, API `GET/PATCH /api/sites/[id]/issues`
- [ ] Header stats (passing %, unassigned, criteria met), Overview/Issues/Criteria tabs. Issues grouped Failing/Needs-review/Passing with **real** rows; **wire real issue assignment** (`assignee_id → team_members`) and resolve (logs `remediation_log`+`activity_log`). Search/filter operate on real data. Criteria tab from overview/coverage. Export → real CSV or honest disabled. Commit.

### Task C3: Install (`[siteId]/install/page.tsx`) — mockup 531–570, API `GET /api/sites/[id]/install-status`
- [ ] Real snippet with server-minted token + real siteId; copy-to-clipboard; platform tiles; "Verify" calls install-status and reflects real verified/heartbeat state. "Send to developer" → mailto (or Resend if wired) — never a fake "sent". Warn note verbatim. Commit.

### Task C4: Customize (`[siteId]/customize/page.tsx`) — mockup 571–585, API `GET/PUT /api/sites/[id]/config`
- [ ] Features/Appearance/Mobile tabs over the canonical `@makoya/shared` fields; **real** toggles persisted on Publish; live preview reflects state; brand-color AA badge via `lib/contrast.ts` (real ratio). Reset reverts to saved. Commit.

### Task C5: Statement (`[siteId]/statement/page.tsx`) — mockup 586–602, API `GET/POST /api/sites/[id]/statement`
- [ ] Form (brand, jurisdictions, target, contact) → real generated statement; live preview; Copy HTML (real, XSS-escaped per existing lib). Honest "not a legal certification" note. Commit.

### Task C6: Proof (`[siteId]/proof/page.tsx`) — mockup 603–673, API `GET /api/sites/[id]/proof-pack`
- [ ] Real evidence items with real status (audit history, remediation log, statement, install proof/uptime, VPAT, manual audit) — each shows its true state or honest "not yet"; never fake "Ready". Download proof pack → real endpoint. Warn note verbatim. Commit.

### Task C7: Reports (`[siteId]/reports/page.tsx`) — mockup 674–723, API `GET /api/sites/[id]/reports` + `/remediation`
- [ ] Monthly audits table (real `monthly_reports`) + Remediation-log tab (real). Download PDF → existing `report-pdf`. Honest empty state when no months yet. Info note verbatim. Commit.

### Task C8: Analytics (`[siteId]/analytics/page.tsx`) — mockup 724–780, API `GET /api/sites/[id]/analytics`
- [ ] Widget-opens / feature-activations / most-used from real `widget_events`; bar chart over real series; usage-by-feature cards real. Honest "no data yet" when empty. Commit.

### Task C9: Billing (`[siteId]/billing/page.tsx`) — mockup 781–865, API `GET /api/sites/[id]/billing` + `POST …/checkout`
- [ ] Real current plan/quota/usage; plan cards from `PLAN_CATALOG`; current plan marked from real subscription. "Choose/Buy now" → checkout sets `trialing` (no charge) with friendly "payments connect soon" note. **Invoices = honest empty state** (§ spec decision 6). Entitlement contract respected. PostHog `plan_buy_now`. Commit.

### Task C10: Settings (`[siteId]/settings/page.tsx`) — mockup 866–871, API `GET/POST /api/sites/[id]/settings`
- [ ] Owner info / Advanced / Notifications tabs over real private `site_settings` + the 4 advanced widget fields; real Save. Info note verbatim. Commit.

### Task C11: Account (`account/page.tsx`) — mockup 872–905, APIs `/api/org`, `/api/team`(+accept), `/api/org/api-keys`
- [ ] Profile/org (real `/api/org` save), Team (real roster/roles/invite-with-token + accept), Security, API keys (real create/revoke, one-time secret display). Port the **richest** existing wiring from `/v3` (which already implements team + api-keys). Commit.

### Task C12: Partners (`partners/page.tsx`) — mockup 906–916, APIs `/api/partner`(+enroll), `/partner/white-label`
- [ ] Real partner state; "Become a partner" → real `POST /api/partner/enroll`; white-label config real; **revenue shown as real ($0 until billing)** with honest note — not "$6.2k". Real client/agent counts. Commit.

---

## LANE D — Admin restyle

### Task D1: Admin to v7 tokens
**Files:** `apps/web/app/admin/{layout,page}.tsx`, `admin/leads/**`, `admin/requests/**`, `admin/sites/**`
- [ ] **Step 1:** Import/reuse the v7 design tokens + primitives; reskin admin layout (sidebar/topbar) and tables/cards/pills to match v7 — **functionality unchanged** (worst-score-first list, plan management, leads, consultations). No route/data changes.
- [ ] **Step 2:** Verify every admin page still works (load, plan change, leads, requests) and matches the v7 look; a11y guards present.
- [ ] **Step 3:** `npm run ci`; commit.

```bash
git commit -am "feat(v7): restyle admin CRM to v7 design system (no functional change)"
```

---

## CUTOVER, QA & DEPLOY

### Task X1: Cutover — delete old dashboard + /v3
- [ ] Delete `app/v3/**` and the superseded old `app/dashboard/*` files (DashboardTabs + old screens) now replaced by v7 routes. Fix/redirect any links pointing at `/v3` or old paths. `npm run ci` green. Commit.

### Task X2: Full QA pass
- [ ] `npm run ci` green on integration branch (sync:shared + typecheck web+widget + tests + shared-sync drift).
- [ ] Live-smoke (headless browser) against a local/preview build as the demo customer: login (mockup look) → portfolio shows real agents → switch agents → every screen real data, no console errors, no mock numbers → add-agent runs a real free scan → customize publishes → billing buy-now writes `trialing` then resets → admin renders restyled. Record results.
- [ ] "R" review subagent over the full integration diff; `/code-review`; fix findings.

### Task X3: Merge to main + preview deploy
- [ ] QA-before on up-to-date `main` base; merge `feat/v7-dashboard` → `main`; QA-after `npm run ci` green on `main`.
- [ ] `vercel` **preview** deploy from `apps/web`; run live-smoke on the preview URL; share URL with founder.

### Task X4: Prod (on founder OK) + docs
- [ ] On founder approval: `vercel --prod` → `makoya-gamma`; live-smoke on prod.
- [ ] Apply any pending migration (B3) only with founder authorization.
- [ ] Write `docs/V7-PRODUCT-REVIEW.md` (what shipped, paid-tools register with **verified** prices, honest gaps, product review). Update `docs/STATUS.md` + `docs/SESSION.md`.

---

## Self-Review (coverage vs spec)

- Spec §4 routing → Lane A/B/C tasks (shell, redirect, [siteId] routes). ✓
- Spec §5 endpoints → B1/B2/B3; note: `createSite`/`listSites` already exist → wrappers only. ✓
- Spec §6 screen map → C1–C12. ✓
- Spec §7 login → A4. ✓
- Spec §8 admin → D1. ✓
- Spec §9 Stripe stub → C9. ✓
- Spec §10 pipeline → lanes + X2 review gates. ✓
- Spec §11 testing → B1/B2 unit + X2 smoke + CI a11y. ✓
- Spec §12 deploy → X3/X4. ✓
- Spec §15 best-version + free tools → Global Constraints + C-lane "richest wiring" + PostHog/Sentry/Upstash steps. ✓
- Spec §16 paid register + product review → X4. ✓
- Spec §17 risks (RLS, fidelity, shell contention, time) → B3, per-task honest states, Lane A lands first, preview gate. ✓
