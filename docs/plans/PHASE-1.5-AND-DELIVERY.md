# Phase 1.5 (signed-token wall + close core bypass) + Platform Delivery (Shopify/WordPress)

**Status:** spec v2 (Plan-agent review incorporated, 2026-06-25)
**Branch:** `feat/phase-1.5-and-delivery` (off `main` @ e3c4174)
**Created:** 2026-06-25

Two parallel, file-disjoint lanes. **Lane A** hardens the gate; **Lane B** ships the install surfaces.
They share only the *snippet contract* (below), so they can be built independently.

---

## Snippet contract (the one shared interface — both lanes code to THIS)

```html
<script src="https://makoya-gamma.vercel.app/widget/loader.js"
        data-site="SITE_ID" data-token="SITE_TOKEN" defer></script>
```

- `data-site` — the site UUID (already exists).
- `data-token` — NEW: an HMAC signature proving this siteId was provisioned by us (Lane A).
  Long-lived, pasted once. Lane B treats it as an opaque string the merchant pastes/configures.
- The loader forwards `token` to the config endpoint; the endpoint verifies it.
- **Back-compat:** a snippet with no `data-token` still works in monitor mode and (when enforcing)
  is treated as token-missing → gated only if enforcement + token-required are both on. Existing
  installs never hard-break.

---

# LANE A — Phase 1.5: signed-token wall + close the direct-core.js bypass

## A0. Honest scope (what this does and does NOT do)
- **Closes:** the direct-`core.js` embed free path (today it mounts on defaults, never calling the
  gate); **forgery** — you cannot fabricate a working snippet for an invented or guessed siteId; tamper.
- **Does NOT meaningfully add anti-enumeration** — siteIds are already unguessable UUIDs (`sites.id`),
  so the token's value is *anti-forgery* (siteId+token are both required and the pair can't be forged),
  NOT "enumeration closed." (Review S1.)
- **Hardens but does not make absolute:** a determined freeloader running a server-side proxy that
  replays a *copied* valid snippet from the licensed domain's `Origin` is still possible — unclosable
  for any pure client-side widget without per-request server-side snippet rendering. Accepted.

## A1. Token design (`apps/web/lib/licensing/token.ts`)
- New env `WIDGET_SIGNING_SECRET` — add to `lib/env.ts` as a **server-only** `process.env.… ?? ""`
  (like `RESEND_API_KEY`), NOT `requiredPublic` (must never reach the client bundle, must not fail-fast).
- **Versioned** token: `token = "v1." + base64url( HMAC_SHA256(secret, siteId) )`. The `v1.` prefix
  makes future secret/scheme rotation non-breaking (Review N2). Deterministic → **no DB storage**.
- `mintSiteToken(siteId): string` and `verifySiteToken(siteId, token): { ok: boolean; reason: "ok"|"missing"|"bad" }`.
  Crypto rules (Review S2): if `secret === ""` → `{ok:true, reason:"ok"}` (monitor-safe). If token empty →
  `reason:"missing"`. Compare with `crypto.timingSafeEqual` **after** a length-equality guard (it throws
  on unequal length — guard first, return bad). Wrap all crypto so a malformed secret/token NEVER throws
  (the route's never-500 contract must survive). Nothing in a client component may import this file.

## A2. Endpoint (`app/api/config/[siteId]/route.ts`)
- Read `token` from query (`?t=`) or `x-makoya-token` header.
- `const tok = verifySiteToken(siteId, token)`. **Grace for legacy installs (Review S4):** a *missing*
  token does NOT fail the verdict (so token-less LIVE snippets keep working); only a *wrong* token fails.
  → `tokenOk = tok.reason !== "bad"`. `pass = !!site && licenseActive(site) && isAllowedDomain(...) && tokenOk`.
  Keep `active = infraError ? true : enforce ? pass : true`, fail-open on infra, `no-store`, never 500.
- `logWidgetGate` gains a **`reason`** field (`"domain"|"license"|"token"|"no-site"`) — this is a real
  `observability.ts` signature change; **update the existing `route.test.ts` logWidgetGate assertions**
  (Review S3). Log the would-be denial (incl. missing-token, as `reason:"token"`) even in monitor mode.
- **Two-flag truth table (must be in code comments + INSTALL/SETUP docs):**

  | `WIDGET_ENFORCE` | secret set | token on snippet | result |
  |---|---|---|---|
  | unset (monitor) | any | any | **active** (verdict only logged) |
  | true | unset | any | gated by license+domain only (no token check) |
  | true | set | valid | active (if license+domain ok) |
  | true | set | **missing** | **active** (grace — legacy install) + logged `reason:"token"` |
  | true | set | **wrong** | **blocked** |

  Rule: set the secret, watch `reason:"token"` denials in monitor mode for a full cycle, ensure all
  live snippets carry a token, THEN flip `WIDGET_ENFORCE`. Never flip both blind.

## A3. Widget — close the core bypass + forward token
- **Shared helper** `packages/widget/src/fetch-config.ts`: `fetchGatedConfig(siteId, token?)` →
  `{ active: boolean; config: Partial<WidgetConfig> }`. Network/timeout/CORS failure → `{active:true,
  config:{}}` (availability — non-negotiable #1). `active` stays loader-LOCAL, **never** added to
  `@makoya/shared` (Review N3 — would trip `shared-sync.test.ts`). Imported by BOTH entry bundles.
- `loader.ts`: read `data-token`, pass to `fetchGatedConfig`; respect `active:false` (already does).
- `core/index.ts` `autoInit()`: **stop mounting on raw defaults.** Becomes async: if it has `data-site`,
  call `fetchGatedConfig` and only `init()` when `active !== false`. **Must never throw** (CLAUDE.md):
  wrap the async body AND attach `.catch()` to the IIFE promise (Review S6); on `{}`/timeout still mount
  on defaults. Keep `data-no-auto` (loader path). Add `data-demo` to mount on defaults WITHOUT a fetch
  (forward-looking; the *current* demos call `init()` explicitly so closing autoInit does NOT break them
  — Review S5, verified).

## A4. Dashboard install surface — **BUILD IT (the current one is dead code, Review B1)**
- `components/SnippetBox.tsx` is imported by **zero** files; the live dashboard renders no snippet.
  Merchants (and Lane B) need a real place to copy Site ID + Token + snippet.
- Mint the token **server-side** in the dashboard RSC `app/dashboard/page.tsx` (`mintSiteToken(siteId)`),
  and render a snippet card (reuse/replace `SnippetBox`) that shows the **contract** snippet incl.
  `data-token`, plus the bare Site ID + Token (so Lane B's WP/Shopify forms can be filled). Pass
  `siteId` + `token` as props from the RSC → client component (secret never crosses to the client).
- This is now in-scope Lane A work, not "find the parent."

## A5. Tests — widget tests use **node:assert + tsx**, NOT vitest (Review B3)
- `apps/web` (vitest, discovered by the `npm run test -w @makoya/web` gate):
  - `token.ts`: mint deterministic + `v1.` prefix; verify ok/missing/bad; secret-unset → ok; tampered → bad; never throws.
  - route: secret set + enforce → valid passes, **missing → active (grace) + logged**, wrong → `active:false`;
    monitor → always active but logged; `logWidgetGate` called with the new `reason`.
- `packages/widget` (node:assert run via `tsx`, matching `loader.test.ts`/`state.test.ts`): `fetch-config.ts`
  (active:false → `{active:false}`; net-fail → `{active:true,{}}`); core autoInit (active:false → not mounted;
  `data-demo` → mounts without fetch; normal → mounts; never throws). **These are NOT discovered by the
  apps/web vitest** — the QA gate must explicitly run them (see A6 / Integration).

## A6. Build pipeline — rebuild widget + copy to `public/widget/` (Review B2, CRITICAL)
- Prod serves a **hand-committed static** `apps/web/public/widget/{loader,core}.js` — separate from
  `packages/widget/dist/`, with **no copy step** in any script. Editing widget source does NOT reach prod
  until rebuilt + copied. Add a script (e.g. root `build:widget:deploy`) that runs `build:widget` then
  copies `packages/widget/dist/{loader,core}.js` → `apps/web/public/widget/`, and run it at integration.
- Add a `test` script to `packages/widget/package.json` (`tsx src/*.test.ts`) and wire the widget tests
  into the QA gate (the orchestrator runs `npm run build:widget` + widget tests + the copy + byte-diff
  verify), since `npm run ci` covers neither today.

---

# LANE B — Platform Delivery (Shopify + WordPress + install docs)

All NEW files/dirs — zero overlap with Lane A.

## B1. WordPress plugin (fully buildable + shippable)
`wordpress-plugin/makoya-accessibility/`
- `makoya-accessibility.php` — plugin header; settings page under Settings → Makoya with fields:
  **Site ID**, **Token**, optional **Loader URL** (default the prod loader). Sanitize inputs.
- Frontend injection via `wp_enqueue_script` (or `wp_head`) emitting the contract snippet on every
  page. Guard: only inject when Site ID is set. Escape all output.
- `readme.txt` (WP.org format) + `uninstall.php` (clean options).
- **QA:** `php -l` syntax check on every PHP file (if `php` present; else structural review);
  assert the emitted `<script>` matches the contract; a `MANUAL-TEST.md` (local WP install steps).

## B2. Shopify (theme app extension — scaffold + integration guide)
`shopify-app/` (or `wordpress-plugin/`-sibling `shopify-extension/`)
- A **Theme App Extension** app-embed block: `blocks/makoya.liquid` with a schema exposing
  **Site ID** + **Token** settings, injecting the contract snippet into `<head>` when enabled.
- `shopify.extension.toml` + minimal app config.
- **Reality:** a published Shopify App needs the founder's **Partner account + `shopify app` CLI +
  OAuth + (likely) Shopify Billing**. We ship the embed-block code + a `SHOPIFY-SETUP.md` runbook
  (create Partner account → `shopify app init` → drop in this extension → `shopify app deploy`).
  Cannot be QA'd live without a dev store — documented as founder-gated.

## B3. Install docs
`docs/INSTALL.md` — copy-paste, per platform, using the contract snippet:
Shopify (`theme.liquid` before `</head>`, or the app embed), WordPress (this plugin, or a header
plugin), Wix, Squarespace, Webflow, raw HTML. Note where Site ID + Token come from (dashboard).

## B4. Lane B QA
- `php -l` all PHP; structural lint of Liquid/TOML against Shopify schema shape.
- Verify each documented snippet exactly matches the A-lane contract (no drift).
- Manual-test runbooks for WP (local) + Shopify (dev store) since neither runs in our JS CI.

---

## Integration, QA & merge (orchestrator)
1. **QA-before:** `npm run ci` green on up-to-date `main` (DONE — 245 tests).
2. Build Lane A + Lane B in parallel (file-disjoint; agents write code+tests, no npm/git/build).
3. **Integrate** on `feat/phase-1.5-and-delivery`, then run the FULL gate (CI alone is insufficient — B2/B3):
   - `npm run ci` (apps/web vitest + typecheck web+widget + shared-sync) — must be green.
   - `npm run build:widget` then run the **widget** node:assert tests (`tsx packages/widget/src/*.test.ts`).
   - **Copy** `packages/widget/dist/{loader,core}.js` → `apps/web/public/widget/` and **verify a byte-diff**
     (the autoInit bypass fix only ships via this copy).
   - `php -l` every PHP file **if `php` is available on the box; if NOT, record it as a real QA gap**
     (the WP plugin would ship un-syntax-checked — Review N5) and do a careful structural review instead.
4. **QA agent** (read-only) verifies both lanes against this spec + live monitor-mode behavior. NOTE: Lane B
   can only be fully validated once A4's install surface exists (Review N4) — sequence accordingly.
5. **Merge** to `main` (fast-forward), **QA-after** (`npm run ci` on main + live smoke), deploy if asked.
6. `WIDGET_SIGNING_SECRET` must be set in Vercel; then watch monitor logs; enforcement stays OFF
   (`WIDGET_ENFORCE`) until founder flips it per the A2 truth table. Rotating the secret invalidates ALL
   pasted tokens at once (the `v1.` prefix lets a future scheme add a new key id without a fleet re-paste).

## Open decisions
- [ ] Shopify billing model (own Stripe vs Shopify Billing) — still deferred; only affects publishing.
- [ ] Set `WIDGET_SIGNING_SECRET` now (so new snippets carry tokens) — founder action.
- [ ] Token rotation strategy (deterministic-per-site now; add a version byte later if rotation needed).
