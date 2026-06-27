# Security audit — URL / console leak sweep (2026-06-27)

Founder ask: "nothing important revealed in query parameters or console so no one can hack our system." Read-only audit by ECC security-reviewer. Fixes applied on branch `feat/mobile-motion-hardening` after the build lanes merge (several findings touch lane-owned files).

## Do first (this release)
1. **Invite token in URL** — `app/accept-invite/page.tsx:30,67-69` + `app/dashboard/account/_AccountClient.tsx:435`. Token sits in history twice (`/accept-invite?token=…` and nested in `/login?next=…`). Fix: `history.replaceState` to scrub after read; carry token via `sessionStorage`, redirect to `/login?next=/accept-invite` without the token.
2. **PostHog forwards query params (incl. token)** — `app/posthog-provider.tsx:47-50`. `$current_url` includes all search params → token escapes to 3rd party before any scrub. Fix: strip `token` (+ other sensitive keys) before `posthog.capture`, or set `property_denylist`/`sanitize_properties` in `posthog.init`.
3. **Raw DB error echoed to client** — `app/api/admin/customers/route.ts:28` returns `e?.message`. Fix: `captureError(e, {...})` + generic message.
4. **Auth error enumeration** — `app/login/LoginForm.tsx:71` shows `signUpError.message` ("User already registered" → account enumeration). Fix: generic signup-failure message. **(Lane B owns this file — coordinate.)**

## Next cleanup pass
5. **Email recipient logged** — `lib/email/stub-provider.ts:35` `console.info` logs recipient+subject. Fix: guard `NODE_ENV !== 'production'` or remove.
6. **Widget-gate console.warn** — `lib/observability.ts:116` logs siteId/host/licenseStatus on every denial (fires in monitor mode too). Fix: remove; use the structured PostHog/Sentry seam.
7. **Cron logs domain+siteId** — `app/api/cron/rescan/route.ts:35`. Fix: `captureError`, drop domain.
8. **Admin raw Supabase errors** — `lib/admin.ts:80,111` `console.error(error.message)`. Fix: `captureError`.
9. **AccountForm echoes updateUser error** — `components/AccountForm.tsx:28`. Fix: map codes / generic fallback.

## Structural hardening (later)
10. **`lib/env.ts:27-43`** bundles server secrets + public vars in one object imported by `"use client"` files (`lib/supabase/client.ts`, `posthog-provider.tsx`, `instrumentation-client.ts`). Next strips non-`NEXT_PUBLIC_` today, but it's fragile. Fix: split into `env.server.ts` (`import "server-only"`) + `env.public.ts`.
11. **Dead code** — `components/customizer/Customizer.tsx:102` `router.push('/dashboard?site=${id}')` (siteId in query). Not imported anywhere. Fix: delete or convert to path-based before reuse.

> Note: opaque resource IDs in PATH segments (`/dashboard/[siteId]`) are fine under RLS — the concern is query-string leakage + secrets, which the above covers.
