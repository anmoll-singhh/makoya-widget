# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What Makoya is

A 3-part product for selling and running an embeddable web-accessibility widget:

1. **Widget** (`packages/widget`) — a `<script>` clients drop on any site. Renders a launcher button + settings panel; applies accessibility preferences (text size, spacing, contrast, stop-motion, reading ruler, highlight links, big cursor) to the host page.
2. **Dashboard** (`apps/dashboard`) — Next.js app where clients create sites, edit widget config, view scan reports, manage leads, and (eventually) billing.
3. **Scanner funnel** (`scanner-integration/`, `/api/scan-ingest`) — a public accessibility scanner captures an email in exchange for a report, which creates a **lead** in the dashboard. This is the sales funnel.

It's an npm-workspaces monorepo. `packages/shared` is the single source of truth for the widget config shape, consumed by both widget and dashboard via a path alias (no build step).

## Layout

```
packages/shared      WidgetConfig type + DEFAULT_CONFIG + resolveConfig() — imported by both sides
packages/widget      The embeddable widget. Two bundles: loader.js + core.js
apps/dashboard       Next.js 15 / React 19 dashboard (runs on port 3001)
scanner-integration  Drop-in EmailCapture.tsx for an external scanner + the funnel join
infra/schema.sql     Postgres/Supabase schema with RLS
apps/demo*.html      Standalone widget demos (double-click to run)
docs/                MASTER_CHECKLIST (status of every piece), TESTING, DEPLOYMENT
CLAUDE_CODE_PROMPTS.md  Prompts for the remaining real-service wiring
```

## Commands

```bash
# Widget
cd packages/widget && npm install && npm run build   # builds dist/core.js AND dist/loader.js
npm run typecheck                                     # tsc --noEmit
node test-widget.mjs                                  # proves the widget renders (needs: npm i jsdom)

# Dashboard
cd apps/dashboard && npm install && npm run dev       # http://localhost:3001, login = any email
npm run typecheck

# Widget build from repo root
npm run build:widget
```

The dashboard runs in **mock mode** by default — in-memory seed data, **zero credentials needed**. Login accepts any email; `demo@makoya.dev` is seeded. Data resets on server restart. Set `DB_MODE=supabase` + Supabase env vars for real data.

## Widget architecture: the loader/core split

Two separate IIFE bundles built from one `vite.config.ts`, selected by `BUILD_TARGET`:

- **`loader.js`** — tiny, stable URL the client pastes **once** and never edits. Reads `data-site` from its own `<script>` tag, fetches that site's config JSON from the CDN (with safe fallback to `{}`), loads `core.js`, then calls `MakoyaWidget.init(config)`.
- **`core.js`** — versioned, holds the actual widget. You ship features by publishing a new core bundle; the client's snippet URL stays the same forever.

Client snippet: `<script src=".../loader.js" data-site="SITE_ID" defer></script>`

`core/index.ts` also supports **auto-init**: if `core.js` is included directly with a `data-site` attr it mounts with defaults (this is what makes the standalone demos "just work"). Opt out with `data-no-auto`.

## Non-negotiable widget rules

These exist to avoid the failure modes that make accessibility overlays notorious. Do not violate them.

1. **Always render with a fallback.** Network/CORS/localStorage/config failures must NEVER stop the widget. Every external call is wrapped to fall back to `DEFAULT_CONFIG` / `DEFAULT_PREFS`. Auto-init must never throw.
2. **Effects via attributes + one stylesheet only — never rewrite the DOM.** `effects.ts` injects a single `<style>` whose rules activate only when `html[data-mky-*]` attributes are set (`state.ts` toggles them). No DOM mutation, no ARIA injection, no fighting the user's assistive tech. Turning a toggle off cleanly removes the attribute.
3. **Widget UI lives in Shadow DOM.** Isolated so host CSS can't break the panel and the panel's CSS can't leak out. Effects act on the real page; the UI does not.
4. **The widget itself must be accessible.** Real `<button>`s, `aria-pressed` on toggles, Esc closes, focus moves into panel on open and back on close. (A lot of overlays fail exactly here.)
5. **Persist prefs across SPA navigation.** `core/index.ts` wraps `history.pushState`/`replaceState` and listens to `popstate`, re-applying prefs after route changes so settings never silently disappear.

Config flows one way: dashboard **writes** config → CDN JSON → loader **reads** it. Both ends share `@makoya/shared` so they can't disagree about the shape.

## Backend / data rules

- **Multi-tenant via RLS.** Every row is owned by an auth user; RLS makes cross-tenant reads impossible. See `infra/schema.sql`.
- **`leads` is service-role only.** It has RLS enabled with **no policy** — only the service role touches it. The public scanner writes leads via a server route (`/api/scan-ingest`) using the service key, never from the browser. Owners never see other owners' leads.
- **Service key never reaches the client.** The widget never queries the DB directly; it only fetches a public, read-only config JSON (`/api/config/[siteId]`) that exposes only safe display fields.
- **Billing is gated server-side** and (when wired) driven by Stripe webhooks — never trust the client for plan state.
- The data layer (`apps/dashboard/lib/db.ts`) presents the **same function API** in mock and supabase modes; swap modes with no UI changes. Supabase columns are snake_case (`toSnake`/`fromSnake` helpers).

## Compliance guardrails

Do **not** put WCAG/ADA/Section-508 "compliance" or "guaranteed accessible" claims in user-facing copy. Overlay compliance claims are legally risky and have produced lawsuits. Describe the widget as offering accessibility *preferences/tools*, not as making a site compliant.

## Conventions

- `REQUIRED_MANUAL_SETUP` comments mark the only places real credentials/services need wiring (Supabase, Resend, Stripe). Search for them before a real deploy.
- Source files carry thorough top-of-file doc comments explaining *why*; match that density when editing.
- Auth is currently a mock cookie holding an email (`lib/session.ts`) — swap for Supabase Auth in real mode.

See `docs/MASTER_CHECKLIST.md` for the exact done/todo status of every piece, and `CLAUDE_CODE_PROMPTS.md` for the remaining real-service wiring prompts.
