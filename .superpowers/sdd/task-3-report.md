# Task 3 Report — Operator-led customer onboarding (service role)

**Date:** 2026-06-20
**Plan:** `docs/superpowers/plans/2026-06-20-phase0-foundation.md` → Task 3

---

## Files Changed

1. **`apps/web/lib/admin.ts`** (modified)
   - Added `import { createSite } from "@/lib/sites";` (new import line)
   - `Plan` was already imported from `@/lib/admin-constants` — no duplicate added
   - Added private `generateTempPassword()` helper (16 url-safe chars via `crypto.getRandomValues`)
   - Added exported `createCustomer({ email, domain, plan? })` function with idempotent auth-user creation (pages `listUsers` on conflict to reuse existing user id)

2. **`apps/web/app/api/admin/customers/route.ts`** (created)
   - `POST /api/admin/customers`
   - Admin-gated via `getAdminUser()` → 403 if not admin
   - Validates email format with regex, non-empty domain → 400 on failure
   - Accepts optional `plan` validated via `isValidPlan`
   - Delegates to `createCustomer`, returns 201 + payload or 500 + error message

---

## Typecheck Result

```
> tsc --noEmit
(no output — exit 0)
```

**PASS** — zero type errors.

---

## Commit Hash

To be filled after commit (see git log for `feat(admin): operator-led customer onboarding`).

---

## Step 4 — Live Verification Deferred

Per controller instructions, Step 4 (write + run `_verify-onboarding.mjs` scratch script against the live Supabase instance) was **not performed**. It will be run as part of the consolidated live QA pass by the controller.

---

## Concerns / Notes

- `createCustomer` calls `updateSitePlan` which is declared later in the same file. This is safe at runtime (the call only happens when the exported function is invoked, not at module load), and TypeScript resolves it correctly since both are `async function` expressions at module scope.
- `generateTempPassword` uses `crypto.getRandomValues` (Web Crypto, available in Node 18+ and the Next.js edge/server runtime). No polyfill needed.
- The route file uses `e: any` in the catch block per the plan's exact code — acceptable in a route handler context.
- The `(existing user — unchanged)` tempPassword sentinel is intentional: the operator should not use the returned password to overwrite an existing user's credentials; they should use Supabase Auth password reset for that case.
