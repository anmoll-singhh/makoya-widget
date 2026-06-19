# Makoya Phase 5: Polish, Hardening & Deploy Prep — Plan

> Polish/cleanup phase. Controller-driven small fixes (each verified by typecheck/build/QA), then one consolidated opus review + full-product E2E QA before merge.

**Goal:** Make the product deployable and robust: fail-fast config, atomic data, client error feedback, remove the legacy dashboard, and ship deploy config + docs — then prove the whole product end-to-end.

## Work items (each: edit → typecheck/build → note)

### A. Backend robustness
1. **env fail-fast in production** (`lib/env.ts`): when `NODE_ENV === "production"`, throw if a required public/secret var is missing/placeholder (URL, anon, service role). Keep warn-only in dev so local scaffolding still boots.
2. **Atomic site creation** (`infra/schema.sql` + new migration + `lib/sites.ts`): add a Postgres `AFTER INSERT ON sites` trigger that inserts the default `site_config` row; remove the second insert from `createSite`. Eliminates the orphaned-site window. Apply migration to Supabase (controller).
3. **Admin data layer** (`lib/admin.ts`): `getAdminSiteDetail` resolves the owner email via `auth.admin.getUserById` (not a full `emailMap`); `listAdminSites` batches the per-site scan+count reads with `Promise.all`; read functions `console.error` on Supabase error instead of silently returning empty.

### B. Client UX feedback
4. **Mutation feedback**: `PlanSelect`, `StatusSelect`, and `ConfigEditor.save` check `res.ok` and surface a brief error on failure (no silent failures).
5. **SnippetBox clipboard guard**: guard `navigator.clipboard?.writeText` for non-secure/older contexts with a fallback (select-text) and no unhandled rejection.
6. **Login loading state**: disable the submit button + show "Sending…" while the magic-link request is in flight.

### C. Cleanup + deploy
7. **Remove legacy `apps/dashboard`** (superseded by `apps/web`): delete the directory, drop it from root `package.json` workspaces.
8. **`apps/web/vercel.json`**: a daily cron hitting `/api/cron/rescan`, and function config (`maxDuration` for scan/cron). Note the cron needs the `x-cron-secret` header — document that Vercel Cron uses the `CRON_SECRET` via a header rule or the route reads it; for Vercel Cron, switch the cron guard to also accept Vercel's `Authorization: Bearer ${CRON_SECRET}` OR keep `x-cron-secret` and document manual scheduling. (Keep `x-cron-secret`; document.)
9. **`SETUP.md` / root `README.md`**: full env table, local-run steps, deploy steps (Vercel app + Cloudflare widget CDN), the schema-apply step, and the explicitly-deferred items (Resend email, Stripe, Supabase Auth redirect URLs).

### D. Verification
10. **Production build** of `apps/web` clean.
11. **Full-product E2E QA** (one script): auth gating → create site → customize+save→public JSON → real scan→plain top-3→consultation → admin sees it, changes plan+status → non-admin blocked. (Re-runs the per-phase QA in one pass.)
12. **Consolidated opus review** of the whole Phase 5 branch → merge to main.

## Out of scope (deferred to the user, documented in SETUP)
Resend email sending, Stripe billing, Supabase Auth redirect-URL config, actual deploy logins. Octal/hex IP SSRF encodings (Playwright normalizes; low risk) — noted as a known hardening item.
