# Phase 1 — Widget License & Domain Gate

**Status:** spec v2 (review incorporated — Plan agent, 2026-06-25)
**Owner:** founder + orchestrating session
**Branch (planned):** `feat/phase-1-licensing`
**Created:** 2026-06-25

---

## 1. Why

The widget is sold on subscription, but **today there is zero enforcement**. The public
config endpoint hands a fully working widget to anyone, on any domain:

- `apps/web/app/api/config/[siteId]/route.ts` returns display config for **any** `siteId`,
  and returns `DEFAULT_CONFIG` (a working widget) for unknown sites.
- CORS is `access-control-allow-origin: *` — any origin can fetch it.
- No plan check, no license check, no domain check.
- `packages/widget/src/loader.ts` always falls back to a working widget on any non-200.

**Principle: protect the license, not the code.** The widget JS is copyable and that's fine.
We make a copied snippet *inert* unless it resolves to an **active, domain-matched** site,
and that decision is made server-side at the config endpoint — the single chokepoint every
visitor's browser must pass through.

## 2. Live-data ground truth (verified 2026-06-25 via Supabase)

**UPDATE 2026-06-25:** Founder deleted **all** sites to start fresh (`sites`/`site_config`/`scans`
all now 0; `leads` untouched). The DB is a **clean slate** — new sites will be added by pasting the
script on new sites. So:
- The migration backfill (apex+www from existing `domain`) is now a **no-op** — there are no rows.
  Keep it anyway; it's correct and harmless for any row added before the migration runs.
- **New requirement:** `createSite` (`lib/sites.ts`) must seed `allowed_domains` from the new site's
  `domain` (apex + www) at insert time, so every freshly onboarded site is gated correctly from
  creation. This replaces the (now irrelevant) reliance on the historical backfill.

Original snapshot (pre-delete) — the table had **one row** `wavesmvmnt.com` / `free`, stored as a
clean bare host. **There was no `crmmvmnt.com` site row.** Implications:
- Enforcement must NOT key off `plan` (the live site is `free`). It keys off a new
  `license_status` column that **defaults to `active`**, grandfathering every existing row.
- `wavesmvmnt.com` will be unaffected: backfill seeds its `allowed_domains` to
  `{wavesmvmnt.com, www.wavesmvmnt.com}` and its status defaults to active.
- **Open item before cutover:** if `crmmvmnt.com` is a real live embed, it must be registered
  as a site row (with its domain in `allowed_domains`) before enforcement is turned on, or it
  will be blocked.

## 3. Migration

`supabase/migrations/20260626000000_widget_licensing.sql`

```sql
alter table sites
  add column if not exists license_status  text        not null default 'active',
  add column if not exists trial_ends_at    timestamptz,
  add column if not exists allowed_domains  text[]      not null default '{}';

alter table sites drop constraint if exists sites_license_status_chk;
alter table sites add constraint sites_license_status_chk
  check (license_status in ('active','trial','past_due','suspended','canceled'));

-- backfill allowed_domains from the existing domain (apex + www), bare-host only
update sites
set allowed_domains = array_remove(array[
      lower(domain),
      case when lower(domain) like 'www.%' then substring(lower(domain) from 5)
           else 'www.' || lower(domain) end
    ], null)
where coalesce(array_length(allowed_domains,1),0) = 0;
```

Design notes:
- `license_status` defaults `active` → migration alone is behavior-neutral. No outage risk.
- `past_due` is a **grace** status (stays active) so a single failed charge doesn't kill a paying site.
- `allowed_domains text[]` (not the single `domain`) so apex + www + staging are all listable.
- No RLS change: the public endpoint uses the service-role client, which bypasses RLS.
- Backfill assumes `sites.domain` is a bare host (verified true for the one live row). If any
  future row stores a scheme/path, normalize host before seeding.

## 4. Endpoint logic  (v2 — review incorporated)

`apps/web/app/api/config/[siteId]/route.ts` (+ a new `getSiteLicense` in `lib/sites.ts`).

Helpers:

```ts
function hostFromOrigin(origin: string | null): string | null {
  if (!origin) return null;
  try { return new URL(origin).hostname.toLowerCase(); } catch { return null; }
}

// Best-effort domain deterrence (see §6.5 — Origin is attacker-spoofable; not a wall).
function isAllowedDomain(host: string | null, allowed: string[]): boolean {
  if (allowed.length === 0) return true;  // not configured yet → don't block
  if (!host) return true;                 // no Origin (non-browser GET) → don't block
  return allowed.includes(host);
}

function licenseActive(site: { license_status: string; trial_ends_at: string | null }): boolean {
  if (site.license_status === 'suspended' || site.license_status === 'canceled') return false;
  if (site.license_status === 'trial' && site.trial_ends_at && new Date(site.trial_ends_at) < new Date()) return false;
  return true; // active, trial-not-expired, past_due (grace) all pass
}
```

GET flow — note the **fail-open on infra error** vs **fail-closed on not-found**:

```ts
const origin  = req.headers.get('origin');
const host    = hostFromOrigin(origin);
const enforce = process.env.WIDGET_ENFORCE === 'true';   // monitor → enforce flag

let site: SiteLicense | null = null;
let cfg:  SiteConfig | null = null;
let infraError = false;
try {
  site = await getSiteLicense(admin, siteId);  // throws on infra error; returns null if no such site
  cfg  = await getConfig(admin, siteId);
} catch {
  infraError = true;                           // DB/transport failure
}

// fail-OPEN on our own outage (availability > enforcement); fail-CLOSED only on a real verdict.
let active: boolean;
if (infraError)      active = true;            // never punish a paying site for our blip
else if (!enforce)   active = true;            // monitor mode: compute but never block
else                 active = !!site && licenseActive(site) && isAllowedDomain(host, site.allowed_domains);

// observability seam, NOT raw console (CLAUDE.md). Log the would-be denial in monitor mode too.
if (!infraError && !(!!site && licenseActive(site) && isAllowedDomain(host, site.allowed_domains))) {
  logWidgetGate({ siteId, host, status: site?.license_status ?? 'no-site', enforced: enforce });
}

// CACHE: gated response is computed per-request from Origin → must NOT be shared/stale on the CDN.
const headers = {
  'cache-control': 'no-store',                 // see §6.5; revisit with split-endpoint if scale demands
  'access-control-allow-origin': '*',          // public read-only data, no credentials; safe with no-store
};

if (!active) return NextResponse.json({ siteId, active: false }, { headers });
return NextResponse.json({ siteId, active: true, /* ...existing safe display fields from cfg/DEFAULT... */ }, { headers });
```

Critical correctness points:
1. **`no-store`, not cached.** The verdict depends on `Origin`; caching it on a shared CDN risks
   serving one domain's verdict to another. At one live site the extra function invocations are
   negligible. If/when traffic grows, split into a *cacheable* display-config response + an
   *uncacheable* verdict (or move to signed tokens, §6.5).
2. **Fail-open on infra error, fail-closed on not-found.** A thrown DB error → `active:true`
   (mirrors the existing "never 500 / never break the host page" contract in route.ts:12). Only an
   explicit not-found / inactive / domain-mismatch yields `active:false`.
3. **No FIRST_PARTY carve-out.** The dashboard live-preview (`LivePreview.tsx`) inlines config
   server-side and never fetches this endpoint, so no exception is needed — and a self-origin
   allowlist would itself be a spoof vector. Dropped.
4. **Always 200, never 500** — preserve the existing "public endpoint never throws" contract.
5. **Logging via `lib/observability.ts`** (`logWidgetGate` helper), not raw `console`.

## 5. Loader / core change

`packages/widget/src/loader.ts` `boot()` — respect an explicit off-switch:

```ts
const [partial] = await Promise.all([fetchConfig(siteId), loadCore()]);
if ((partial as { active?: boolean }).active === false) return; // licensed-off → don't mount
window.MakoyaWidget?.init({ ...DEFAULT_CONFIG, ...partial, siteId });
```

Safe asymmetry: a true **network failure** returns `{}` (no `active` field) → widget still mounts
on defaults (availability preserved per non-negotiable rule #1). Only an **explicit** server
`active:false` suppresses mount. A freeloader's browser always reaches the server → gets the
explicit `false`; a paying customer during a network blip does not get punished.

Type: add optional `active?: boolean` as a **loader-local transport type only** — do NOT add it to
the canonical `WidgetConfig` in `packages/shared` (it is an envelope/transport flag, not a widget
display field). Touching `packages/shared` would require `npm run sync:shared` and risks the
`shared-sync.test.ts` drift gate; keeping `active` loader-local sidesteps that entirely.

## 6. Admin / CRM (follow-on, not blocking the gate)

Surface and edit `license_status` + `allowed_domains` in `/admin` so the founder can:
- flip a customer `active`/`suspended` manually (works before Stripe webhooks exist),
- edit allowed domains (apex/www/staging).

This is a separate, later lane (depends on the data layer landing first). Not part of the
parallel build of the gate itself.

## 6.5 Known limitations & honest threat model (from review — READ BEFORE FLIPPING ENFORCE)

Phase 1 is **best-effort deterrence**, not a cryptographic wall. Two gaps are deliberately left
for a follow-on (Phase 1.5), and must be understood before `WIDGET_ENFORCE=true`:

1. **`Origin` is spoofable outside a real browser.** A real visitor's browser sends a truthful
   `Origin`, so casual copy-paste onto another domain is blocked. But a determined freeloader can
   run a server-side proxy that sends `Origin: https://<a-licensed-domain>` and relay the config.
   Do **not** describe this as "the hole is closed." The real wall is **signed tokens**: mint a
   short-lived, per-site signed value server-side and verify it on the config request. That layers
   cleanly on top of this foundation with no rework. **Decision needed before enforce flip.**
2. **Direct `core.js` embed bypasses the gate entirely.** `core/index.ts` auto-inits from a
   `data-site` attr unless `data-no-auto` is set; the public `core.js` URL "just works" by design
   (CLAUDE.md). A freeloader who embeds `core.js` directly (not the loader) never calls the config
   endpoint and mounts on `DEFAULT_CONFIG`. The §5 loader fix does NOT close this. Phase 1.5 options:
   (a) make core auto-init also fetch + respect the verdict, or (b) disable auto-init in production
   builds and support only the loader path (demos opt in explicitly). Documented as an open bypass.

Net: Phase 1 stops the common case (someone copying a client's snippet into their own site in a
browser) and gives you the kill switch + monitor visibility. Phase 1.5 (signed tokens + core gate)
turns the deterrent into a wall.

## 7. Rollout (so nothing live breaks)

1. **Migrate** — behavior-neutral (defaults grandfather all rows). wavesmvmnt.com unaffected.
2. **Deploy in monitor mode** (`WIDGET_ENFORCE` unset/false) — endpoint computes the verdict and
   logs `monitor_would_deny`, but always serves active config. Watch logs; confirm wavesmvmnt.com
   is never flagged.
3. **Register crmmvmnt.com** (if it's a real embed) as a site with its domain in `allowed_domains`.
4. **Flip `WIDGET_ENFORCE=true`** — enforcement live. Verify wavesmvmnt.com + dashboard preview
   still work; verify a foreign-origin fetch returns `active:false`.

## 8. Test plan

Backend (vitest, `apps/web`):
- unknown siteId → `active:false`.
- known + `active` + matching origin → `active:true` + display fields.
- known + `suspended` → `active:false`.
- known + `trial` past `trial_ends_at` → `active:false`; trial not expired → active.
- known + `active` + foreign origin (not in allowed_domains) → `active:false`.
- empty `allowed_domains` → not blocked (lenient).
- `Referer`-only / no-`Origin` browser fetch → not blocked (host=null → lenient).
- monitor mode (`WIDGET_ENFORCE` false) → always `active:true` regardless of verdict; deny still logged.
- response carries `cache-control: no-store`.
- **infra error fails OPEN** (DB throw → `active:true`); **not-found fails CLOSED** (→ `active:false` in enforce).
- endpoint never throws on DB error → safe response.
- (documented known-bypass, not a passing test) direct `core.js` embed never calls endpoint — track for Phase 1.5.

Widget (`packages/widget`):
- `active:false` config → widget does not mount.
- `{}` (network failure) → widget mounts with defaults.
- normal config → mounts with config.

Shared gate: `npm run ci` (sync:shared + typecheck web+widget + tests) green before merge.

## 9. Parallel build decomposition (isolated lanes)

- **Lane A — backend (`apps/web` + `supabase/migrations`)**: migration, `getSiteLicense` in
  `lib/sites.ts`, endpoint rewrite, backend tests. Owns `sites.ts` and the route.
- **Lane B — widget (`packages/widget`)**: loader/core `active:false` handling + widget tests.
  Disjoint files from Lane A → safe to run in parallel.
- **Lane C — admin CRM**: follow-on after Lane A lands (depends on the new data layer).

Integration: merge A + B into `feat/phase-1-licensing`, run `npm run ci`, then C.

## 10. Open questions / decisions

- [ ] Is `crmmvmnt.com` a real live embed, or did it mean `wavesmvmnt.com`? **Blocks the enforce flip** (must be a registered site before enforcement, else blocked).
- [ ] **Phase 1.5 ambition decision:** add signed tokens + close the direct-`core.js` bypass to turn the deterrent into a wall? (Foundation here supports it with no rework.)
- [ ] Add a Vercel WAF rate-limit rule on `/api/config/*` since the gated response is now `no-store` (uncached) — low priority at one site, note for scale.
