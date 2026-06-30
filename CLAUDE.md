# CLAUDE.md

Guidance for Claude Code when working in this repository.

## 🧠 Project memory — READ THIS FIRST (every session, every agent)

There is a **central memory system**. Use it so parallel agents don't re-confuse each other.

1. **`docs/STATUS.md`** — the glanceable dashboard (single source of truth). What's live / in-flight / blocked / next, plus the **agent-coordination board** (which worktree+branch each agent owns). **Read it at session start; update it at the end of every work block, before SESSION.md.**
2. **`docs/SESSION.md`** — append-only narrative log (the "why" + verification detail).
3. **gbrain** — a local searchable brain (PGLite). Query past project state semantically. See `## GBrain Configuration` below.

**Multi-agent rule (founder often runs 2-3 Claude sessions at once):** one worktree = one branch = one agent. Claim your lane on the STATUS.md agent board before editing. **Never edit files outside your worktree's lane.** Deploys happen only from a clean `main` worktree.

**To get a status update:** read `docs/STATUS.md`, or run `gbrain search "makoya status"`.

## What Makoya is

A 3-part product for selling and running an embeddable web-accessibility widget:

1. **Widget** (`packages/widget`) — a `<script>` clients drop on any site. Renders a launcher button + settings panel; applies **18** accessibility preferences (text size, spacing, contrast, stop-motion, reading ruler/mask, highlight links/titles, big cursor, readable font, hide images, saturation, text align, mute sounds, read-aloud, highlight-on-hover, bigger click targets, focus indicator) to the host page. Ships with 9 quick-profiles and 4 UI languages (en/es/fr/de).
2. **Dashboard** (`apps/web`) — Next.js 15 app with **real Supabase auth + RLS**. Clients land in a customizer-first widget editor with live preview, view their scan report, and re-scan. A separate **admin CRM** (`/admin`, gated by `ADMIN_EMAILS`) lists customers worst-score-first, manages plans, and tracks leads/consultations.
3. **Scanner** (`apps/web/lib/scanner`, `/api/scan`) — a REAL WCAG 2.0/2.1/2.2 engine (Playwright + axe-core + 6 custom DOM checks) that scores a site and returns plain-language issues. It is both the product core and the top of the funnel. `scanner-integration/` + `/api/scan-ingest` are the email→lead capture path (Phase 1, not yet wired).

It's an npm-workspaces monorepo. `packages/shared` is the single source of truth for the widget config shape. The widget imports it directly; `apps/web` consumes a **generated mirror** (`apps/web/lib/shared/index.ts`, the `@makoya/shared` alias) because Vercel uploads only `apps/web`. Regenerate with `npm run sync:shared`; CI fails if it drifts (`apps/web/lib/shared-sync.test.ts`). **Never hand-edit the mirror.**

## Layout

```
packages/shared          CANONICAL WidgetConfig + DEFAULT_CONFIG + resolveConfig()
packages/widget          The embeddable widget. Two bundles: loader.js + core.js
apps/web                 Next.js 15 / React 19 app (port 3000): client dashboard,
                         admin CRM, scanner engine, config API, Supabase auth + RLS
apps/web/lib/shared      GENERATED mirror of packages/shared — do not hand-edit
scripts/sync-shared.mjs  Regenerates the mirror from canonical
scanner-integration      Drop-in EmailCapture.tsx for the scanner funnel (Phase 1)
supabase/migrations      Applied DB migrations (canonical schema lives here)
infra/schema.sql         Original RLS schema reference
docs/SESSION.md          Living phase/session tracker + ground-truth status
docs/research/           Competitive teardown (positioning decisions)
.github/workflows/ci.yml Typecheck + tests + shared-sync drift gate
```

## Commands

```bash
# From repo root (npm workspaces)
npm ci                         # install all workspaces
npm run ci                     # sync:shared + typecheck (web+widget) + tests  ← run before pushing
npm run sync:shared            # regenerate the @makoya/shared mirror
npm run build:widget           # builds dist/core.js AND dist/loader.js

# App (apps/web) — needs Supabase env vars (see apps/web/lib/env.ts)
npm run dev -w @makoya/web     # http://localhost:3000 (real Supabase Auth)
npm run test -w @makoya/web    # vitest

# Widget
node test-widget.mjs           # proves the widget renders (needs: npm i jsdom)
```

There is **no mock mode** — the app talks to Supabase directly (real auth + RLS). Local dev needs `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `ADMIN_EMAILS`. `lib/env.ts` fails fast in production on missing public keys; admin routes are gated by `ADMIN_EMAILS`.

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
- **Billing is gated server-side** and (when wired) driven by payment webhooks (**Stripe** — founder's chosen processor as of 2026-06-24; webhooks must be signature-verified + idempotent) — never trust the client for plan state. **Not yet built.** Note: Stripe is a payment *processor*, not a Merchant-of-Record, so tax/VAT is the founder's responsibility (Stripe Tax add-on or manual).
- **Booking/consultations:** founder uses their **own external booking system** (NOT Calendly). UI leaves a placeholder/demo embed slot; the real embed code is dropped in later.
- The data layer lives in `apps/web/lib/{sites,scans,admin}.ts` and is **Supabase-only** (no mock mode). Each function takes a Supabase client (server, or service-role for privileged writes). Columns are snake_case; `*-mappers.ts` convert to/from camelCase.

## Compliance guardrails

Do **not** put WCAG/ADA/Section-508 "compliance" or "guaranteed accessible" claims in user-facing copy. Overlay compliance claims are legally risky and have produced lawsuits. Describe the widget as offering accessibility *preferences/tools*, not as making a site compliant.

## Conventions

- **QA gate around every merge (standing rule, founder directive 2026-06-25):** before merging any branch to `main`, run a **QA-before** (`npm run ci` green on the up-to-date `main` base + the branch) AND a **QA-after** (re-run `npm run ci` on `main` post-merge, plus a live smoke check if deployed). Never merge on a red or stale base. For larger lanes, dispatch a read-only verification agent for both passes.
- Supabase + Resend are wired and live. Still to wire: **Stripe** (billing), Sentry/PostHog (route through `apps/web/lib/observability.ts` — the single seam). See `docs/SESSION.md` for phase status.
- Source files carry thorough top-of-file doc comments explaining *why*; match that density when editing.
- Auth is **real Supabase Auth** (`@supabase/ssr`; `lib/supabase/{server,client,middleware}.ts`; `app/auth/*`). Admin gating: `lib/auth/roles.ts` + `lib/auth/require-admin.ts` against `ADMIN_EMAILS`.

See `docs/STATUS.md` for the glanceable dashboard + agent board (READ FIRST), `docs/SESSION.md` for the narrative phase/session log + locked strategy, `docs/research/COMPETITIVE_TEARDOWN.md` for market positioning, and `docs/MASTER_CHECKLIST.md` for the piece-by-piece checklist.

## GBrain Configuration (configured by /setup-gbrain, 2026-06-24)
- Mode: local-stdio
- Engine: pglite (`C:\Users\ANMOL\.gbrain\brain.pglite`)
- Binary: `C:\Users\ANMOL\.bun\bin\gbrain.exe` (not on PATH — call by absolute path, or add `~/.bun/bin` to PATH)
- MCP registered: yes (user scope, `✔ Connected`) — restart Claude Code sessions to see `mcp__gbrain__*` tools
- Embeddings: **disabled** (no OpenAI/Voyage/ZeroEntropy key on this box). Search is full-text/keyword only. To unlock semantic search later: `export OPENAI_API_KEY=…` (or VOYAGE/ZEROENTROPY) then `gbrain config set embedding_model <id> && gbrain embed --stale`.
- Seeded pages: `makoya-status-dashboard`, `makoya-project-state-2026-06-24`.

## GBrain Search Guidance
Prefer `gbrain` (via `C:\Users\ANMOL\.bun\bin\gbrain.exe` or the `mcp__gbrain__*` tools) over Grep for **semantic / "what did we decide" / "what's the status"** questions:
- Project state: `gbrain search "makoya status"` / `gbrain search "what is blocked"`.
- Past decisions / history: `gbrain search "<terms>"`.
Grep is still right for exact strings, regex, and file globs. Re-seed the status page after big changes: `cat docs/STATUS.md | gbrain put "makoya-status-dashboard"`.
