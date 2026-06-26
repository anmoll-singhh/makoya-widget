# Lane B Implementation Report

Branch: `feat/v7-dashboard`

---

## B1 — `lib/portfolio.ts` + `lib/portfolio.test.ts`

**Files created:**
- `apps/web/lib/portfolio.ts`
- `apps/web/lib/portfolio.test.ts`

**Interface implemented:**
- `AgentSummary { id, name, domain, plan, status: 'active'|'monitoring'|'action_needed', score: number|null, openIssues: number, lastAuditAt: string|null, installed: boolean }`
- `listAgents(client, ownerId): Promise<AgentSummary[]>` — fans out `listSites` + `getOverview` per site via `Promise.all`; degrades per-site on `getOverview` failure rather than aborting the whole list
- `portfolioKpis(agents): { total, avgScore, openIssues, needAttention }` — pure function, no I/O

**Status derivation rule (inline comment in code):**
- `not_installed` → `action_needed`, `installed: false`
- `action_needed` → `action_needed`, `installed: true`
- `active` → `active`, `installed: true`
- `monitoring` → `monitoring`, `installed: true`

`name` derives from `domain` (no name column on `sites` table — no migration invented).

**Tests:** 9/9 passing. Wrote failing test first, confirmed module-not-found error, then implemented.

**Commit:** `a7aa98d`

---

## B2 — `app/api/sites/route.ts` + `app/api/sites/route.test.ts`

**Files created:**
- `apps/web/app/api/sites/route.ts`
- `apps/web/app/api/sites/route.test.ts`

**Endpoints:**
- `GET /api/sites` → `{ agents: AgentSummary[], kpis }` (401 no session; 500 via `captureError` on error)
- `POST /api/sites` body `{ name?, domain }` → 201 `{ siteId, token }` (401 no session; 400 Zod fail or SSRF; 429 rate limited; 500 via `captureError`)

**Security layers on POST:**
1. Zod `createSiteBodySchema` (shape gate — domain required string ≤253)
2. `normalizeDomain()` strips scheme/path → bare hostname
3. `isPublicHttpUrl(domain)` from `lib/scan-utils/public-url` (SSRF gate — rejects localhost/private/loopback/internal)
4. `checkRateLimit(user.id, { name: 'sites-create', limit: 10, windowMs: 60_000 })` — Upstash with in-memory fallback, fail-open

Mirrors `app/api/sites/[id]/overview/route.ts` auth pattern exactly. Raw DB errors never echoed.

**Tests:** 11/11 passing. Wrote failing test first, confirmed module-not-found, then implemented.

**Commit:** `e4854a7`

---

## B3 — Sites INSERT RLS policy verification

**Finding: Policy already exists. No migration added.**

Checked:
- `infra/schema.sql` lines 56–59: `create policy "owner writes own sites" on sites for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());`
- `supabase/migrations/20260619040000_init.sql` lines 50–53: same policy
- Scanned all 23 migration files — no subsequent migration drops or weakens this policy

The `FOR ALL` command with `WITH CHECK (owner_id = auth.uid())` covers INSERT, UPDATE, DELETE, and SELECT. A self-inserting user session cannot set `owner_id` to anything other than their own `auth.uid()`. The `AFTER INSERT` trigger (`create_default_site_config`) fires normally under this policy.

**`npm run verify:db` not run** — Docker not available in this environment. Policy verified by static SQL analysis only.

No migration file was added.

---

## B4 — Portfolio page + Add-agent wizard

**Files created/modified:**
- `apps/web/app/dashboard/page.tsx` — updated to redirect: 0 or >1 sites → `/dashboard/agents`; exactly 1 → `/dashboard/<id>`
- `apps/web/app/dashboard/agents/page.tsx` — RSC; calls `listAgents` + `portfolioKpis` directly; renders `<AgentsTable>`
- `apps/web/app/dashboard/agents/AgentsTable.tsx` — client component; 4 KPI `mcard`s + `.tcard` table; real rows; empty state; status pills; score bars; Manage → `/dashboard/<id>`
- `apps/web/app/dashboard/agents/new/page.tsx` — RSC session guard wrapper
- `apps/web/app/dashboard/agents/new/AddAgent.tsx` — 4-step client wizard

**AddAgent wizard flow:**
1. Step 1 form (domain + optional name) → `POST /api/sites` → receives `siteId`
2. Step 2 → calls `POST /api/public-scan` for homepage URL → shows REAL top issue + locked "N more — install to unlock the full audit" row
3. "Continue — get the widget" → `router.push(/dashboard/<siteId>/install)`
4. "See full audit with Mike" → `router.push(/dashboard/<siteId>/mike)`

**PostHog:** `agent_added` and `free_scan_viewed` fired via `posthog.capture()` (best-effort: failures are silently caught, never break the flow).

**Scan failure handling:** if `/api/public-scan` fails or times out, step 2 renders an honest "We couldn't complete the homepage scan" message; wizard continues to install.

**Honest copy preserved verbatim:** "Not yet conformant — estimated", "install to unlock the full audit", "See full audit with Mike", no compliance claims.

**Commit:** `19d8448`

---

## CI result

```
npm run ci → EXIT 0
72 test files: 71 passed | 1 skipped (RLS isolation tests require Docker)
592 tests: 592 passed | 6 skipped
sync:shared ✓ (already in sync)
typecheck web ✓ | typecheck widget ✓
test:widget ✓ (59 widget tests)
```

---

---

## Lane B Review Fixes (2026-06-26)

Commit: `e1b3f4f` on `feat/v7-dashboard`

| ID | File | Fix |
|----|------|-----|
| I-1 | `app/api/sites/route.test.ts` | Added 429 rate-limit test case; mocks `checkRateLimit.mockResolvedValue(true)`, asserts status 429 and `createSite` not called. |
| M-1 | `app/api/sites/route.ts` | Corrected misleading file-header comment: token is returned in 201 body for API consumer convenience only; the `/install` page re-mints server-side (deterministic). Wizard does NOT pass token as URL param. |
| M-2 | `app/dashboard/agents/new/AddAgent.tsx` | `rawDomain.startsWith("http")` → `rawDomain.startsWith("http://") \|\| rawDomain.startsWith("https://")` (prevents `httpsomething.com` false-positive). |
| M-3 | `app/dashboard/agents/new/AddAgent.tsx` | Added `aria-current={now ? "step" : undefined}` to the active `StepBar` step `<div>`. |
| M-4 | `app/dashboard/page.tsx` | No-user fallback now redirects to `/login?next=/dashboard` instead of `/dashboard/agents`. |
| M-5 | `app/dashboard/agents/new/AddAgent.tsx` | Replaced `data.siteId!` non-null assertion with explicit falsy guard: sets `setError("Unexpected error. Please try again.")` and returns early if `data.siteId` is falsy. |

CI result after fixes: `71 test files passed | 1 skipped`, `593 tests passed | 6 skipped`, typecheck ✓, sync:shared ✓, widget tests ✓.

---

## Concerns / Notes

- `lastAuditAt` in `AgentSummary` is a "YYYY-MM" period string (from monthly reports trend), not a full ISO timestamp. The UI can format this as needed. Future: expose `created_at` from `scans` table for exact dates.
- `listAgents` is N×(getOverview) with `Promise.all` parallelism. Each `getOverview` fans out to 7 sub-queries. For portfolios with many sites, a dedicated lightweight SQL roll-up would be more efficient. Flagged for future optimization; correctness is verified.
- B3 migration: Docker unavailable for `npm run verify:db`. Policy verified by static SQL analysis. The policy is in the canonical `_init.sql` migration, applied to prod during initial setup.
