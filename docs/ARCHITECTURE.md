# Makoya — Architecture Reference (stable)

> **Purpose & contract.** This file describes the **stable shape** of the system: how the
> pieces fit, where things live, and the invariants that must not be broken. It deliberately
> contains **no volatile state** (what's deployed, what's in flight, what's blocked) — that
> lives in [`STATUS.md`](./STATUS.md). When structure and state disagree, **the code is the
> source of truth**; fix the doc that drifted.
>
> Read order for a new session: `STATUS.md` (where are we) → this file (how it's built) →
> the specific code you're touching. You should rarely need to read the whole tree.
>
> **Last structural review:** 2026-06-29 (ownership-audit block).

---

## 1. The product in one paragraph

Makoya is an npm-workspaces monorepo that sells and runs an embeddable web-accessibility
widget. Three surfaces share one backend: a **scanner** (real WCAG engine — funnel top +
product core), a **widget** (a `<script>` that applies 18 accessibility preferences to a
host page), and a **dashboard + admin CRM** (Next.js 15 app on Supabase with real auth +
RLS). Config flows one way: dashboard **writes** config → CDN/API JSON → widget loader
**reads** it. Both ends share one type package so they can't disagree about the shape.

---

## 2. Workspace layout (stable)

```
packages/shared      CANONICAL WidgetConfig + DEFAULT_CONFIG + resolveConfig()
packages/widget      The embeddable widget — two IIFE bundles (loader.js + core.js)
apps/web             Next.js 15 / React 19 app: dashboard, admin CRM, scanner engine,
                     config + scan APIs, Supabase auth + RLS, billing scaffold
apps/web/lib/shared  GENERATED mirror of packages/shared (the @makoya/shared alias) — DO NOT hand-edit
scripts/             sync-shared.mjs (regenerates the mirror), copy-widget-bundles.mjs,
                     verify-db.mjs (ephemeral-Postgres migration+RLS verifier)
supabase/migrations  Applied DB migrations (canonical schema; 26+ files)
infra/schema.sql     Original RLS schema reference
wordpress-plugin/    Drop-in WP install path for the widget snippet
shopify-app/         Shopify theme-app-extension scaffold (founder-gated on Partner acct)
scanner-integration/ EmailCapture.tsx for the public funnel (Phase 1)
docs/                Memory + knowledge system (see GOVERNANCE.md for the map)
.github/workflows/   ci.yml (typecheck+tests+shared-drift gate) + db-verify.yml + security gates
```

**The shared-config contract (load-bearing invariant).** `packages/shared` is the single
source of truth for `WidgetConfig`. The widget imports it directly; `apps/web` consumes a
**generated mirror** at `apps/web/lib/shared/index.ts` (because Vercel uploads only
`apps/web`). Regenerate with `npm run sync:shared`. CI fails if the mirror drifts
(`apps/web/lib/shared-sync.test.ts`). **Never hand-edit the mirror.**

---

## 3. The widget (`packages/widget`)

Two bundles built from one `vite.config.ts`, selected by `BUILD_TARGET`:

- **`loader.js`** — tiny, stable URL the client pastes **once**. Reads `data-site` from its
  own `<script>` tag, fetches that site's config JSON (fail-open to `{}`), loads `core.js`,
  calls `MakoyaWidget.init(config)`. Forwards a `?t=` signed token for licensing.
- **`core.js`** — versioned; holds the actual widget. Ship features by publishing a new core
  bundle; the client's snippet URL never changes. Supports auto-init via `data-site`
  (opt out with `data-no-auto`; demo escape hatch `data-demo`).

**Client snippet:** `<script src=".../loader.js" data-site="SITE_ID" defer></script>`

**Non-negotiable widget rules (do not violate — these prevent overlay-class failures):**
1. **Always render with a fallback.** Every external call (network/CORS/localStorage/config)
   falls back to `DEFAULT_CONFIG`/`DEFAULT_PREFS`. Auto-init must never throw. Config-fetch
   is bounded by an `AbortController` timeout so a *hang* fails open like an *error*.
2. **Effects via attributes + one stylesheet — never rewrite the DOM.** `effects.ts` injects a
   single `<style>` keyed on `html[data-mky-*]` attributes; `state.ts` toggles them. No DOM
   mutation, no ARIA injection, no fighting the user's assistive tech.
3. **Widget UI lives in Shadow DOM** (isolated both ways). Effects act on the real page.
4. **The widget itself is accessible** — real `<button>`s, `aria-pressed`, Esc closes, focus
   trap on open/restore on close.
5. **Persist prefs across SPA navigation** — wraps `history.pushState`/`replaceState` +
   `popstate`, re-applying after route changes.

**Telemetry:** widget emits throttled heartbeat (origin+path only, no PII) + batched usage
events to public endpoints; fully fail-silent; opt out with `data-no-telemetry`.

---

## 4. The app (`apps/web`) — Next.js 15 App Router, React 19

### 4.1 Data layer (`apps/web/lib/*`)
Supabase-only (no mock mode). Each function takes a Supabase client (server, or service-role
for privileged writes). Columns are snake_case; `*-mappers.ts` convert to/from camelCase.
Core modules: `sites.ts`, `scans.ts`, `admin.ts`, `leads.ts` (service-role only),
`issues.ts`, `activity.ts`, `remediation.ts`, `reports.ts`, `overview.ts`, `heartbeat.ts`,
`analytics.ts`, `roles.ts`, `api-keys.ts`, `org.ts`, `statement.ts`, `proof.ts`,
`site-settings.ts`, `contrast.ts`, `billing.ts` + `billing/{plans,stripe}.ts`,
`partner.ts`, `config-cache.ts`, `scan-queue.ts`, `rate-limit.ts`, `observability.ts`.

### 4.2 API surface (`apps/web/app/api/**`, ~38 routes)
- **Public (no auth):** `config/[siteId]` (widget config; `no-store`; KV read-through cache;
  licensing verdict), `public-scan` (SSRF-gated, rate-limited, ephemeral), `scan-ingest`
  (lead capture, service-role), `report-pdf`, `heartbeat`, `widget-events`, `consultation`.
- **Authed (RLS, owner-scoped):** `sites`, `sites/[id]/{config,overview,issues,analytics,
  install-status,verify-install,remediation,reports,proof-pack,statement,settings,billing,
  billing/checkout,report-pdf}`, `org`, `org/api-keys`, `team`, `team/accept`, `partner`,
  `partner/enroll`, `partner/white-label`.
- **Admin (gated by `ADMIN_EMAILS`):** `admin/customers`, `admin/sites/[id]`,
  `admin/consultations/[id]`.
- **Cron / internal (secret-gated):** `cron/rescan`, `cron/scan-dispatch`,
  `cron/recompute-reports`, `internal/scan-worker`.

### 4.3 Scanner (`apps/web/lib/scanner`, `/api/scan`, `/api/public-scan`)
Real WCAG 2.0/2.1/2.2 engine: Playwright (`playwright-core` + `@sparticuz/chromium` on
Lambda) + `@axe-core/playwright` + a second engine (vendored HTML_CodeSniffer as a string
module) + custom DOM checks + plain-language translation (`plain-language.ts`). Deterministic,
evidence-based scoring with auditable provenance. **Interactive `/api/scan` stays sync** (with
lock + concurrency cap); **scheduled scanning is decoupled** onto a Redis ZSET queue
(`scan-queue.ts`) with producer (`cron/rescan`), dispatcher (`cron/scan-dispatch`), and worker
(`internal/scan-worker`, 1 Chromium/instance via `after()`).

### 4.4 Auth & tenancy
Real Supabase Auth (`@supabase/ssr`; `lib/supabase/{server,client,middleware}.ts`;
`app/auth/*`). Multi-tenant via **RLS** — every row owned by an auth user; cross-tenant reads
are impossible at the DB layer. Org/team layer adds *additive* org-read RLS via a
`private.is_org_member()` SECURITY DEFINER helper (owner_id policies untouched). Admin gating:
`lib/auth/roles.ts` + `require-admin.ts` against `ADMIN_EMAILS`.

### 4.5 Observability & resilience seams
`lib/observability.ts` is the **single seam** for Sentry (`captureError`) + PostHog (`track`).
`lib/rate-limit.ts` = Upstash sliding-window, per-endpoint namespaced, **fails open**.
`lib/config-cache.ts` = Upstash KV read-through on the hot config path. All Upstash-backed
libs **no-op safely when unconfigured**.

---

## 5. Database (Supabase Postgres + RLS)

28 tables (live-verified 2026-06-29), **all RLS-enabled**. Groups:
- **Core:** `sites`, `site_config`, `site_settings` (private), `scans`.
- **Funnel (service-role only, RLS-no-policy by design):** `leads`, `consultation_requests`.
- **Widget telemetry:** `widget_heartbeats`, `widget_uptime_days`, `widget_events`,
  `widget_event_daily`.
- **Work tracking:** `issues`, `issue_attachments`, `activity_log`, `remediation_log`,
  `monthly_reports`.
- **Tenancy:** `organizations`, `team_members`, `team_invites`, `api_keys` (hashed secrets).
- **Compliance artifacts:** `accessibility_statements`, `vpat_documents`, `manual_audits`.
- **Billing:** `plan_quotas`, `billing_subscriptions`.
- **Partners:** `partner_accounts`, `partner_clients`, `white_label_config`,
  `partner_commissions`.

**DB rules:** billing is gated server-side and (when wired) driven by signature-verified,
idempotent Stripe webhooks — never trust the client for plan state. The service key never
reaches the browser. Migrations are canonical in `supabase/migrations`; `scripts/verify-db.mjs`
applies them all to an ephemeral Postgres and asserts triggers + RLS-on-every-table +
cross-tenant denial (wired into CI). **Known intentional advisor noise:** `leads` +
`consultation_requests` RLS-no-policy (service-role only). **Founder-gated:** enable
leaked-password protection (Auth toggle).

---

## 6. Build, test, deploy (commands that matter)

```bash
npm ci                      # install all workspaces
npm run ci                  # sync:shared + typecheck(web+widget) + tests  <- before pushing
npm run sync:shared         # regenerate the @makoya/shared mirror
npm run build:widget:deploy # build core.js + loader.js AND copy to public/widget
npm run verify:db           # ephemeral-Postgres migration + RLS verification
npm run dev -w @makoya/web  # http://localhost:3000 (real Supabase Auth)
```

There is **no mock mode**. Local dev needs `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_EMAILS` (see
`apps/web/lib/env.ts`, which build-phase-guards the prod hard-throw).

**Deploy is CLI-only and load-bearing** (see `STATUS.md` DEPLOY section for the full hard-won
runbook): `cd apps/web && vercel --prod --yes`. **GitHub auto-deploy is intentionally
disconnected** — it built from repo-root and 404'd prod. To restore push-to-deploy later,
set Vercel **Root Directory = `apps/web`** first.

---

## 7. Compliance guardrail (legal, non-negotiable)

Do **not** put WCAG/ADA/Section-508 "compliance" or "guaranteed accessible" claims in
user-facing copy. Describe the widget as offering accessibility *preferences/tools*, not as
making a site compliant. This line is enforced by unit tests on landing/email/statement copy.

---

## 8. Where volatile truth lives (don't duplicate it here)

| Question | Source |
|---|---|
| What's deployed / in flight / blocked / next | `STATUS.md` (dashboard) |
| Why a thing was done + verification detail | `SESSION.md` (append-only log) |
| Which agent owns which worktree right now | `STATUS.md` agent board |
| Locked product/strategy decisions | `DECISIONS.md` |
| How sessions + agents coordinate | `GOVERNANCE.md` |
