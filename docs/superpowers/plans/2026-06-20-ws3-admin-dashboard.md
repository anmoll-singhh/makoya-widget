# WS3 — Admin Dashboard (Clients Overview, Worst-First) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax. Use **ui-ux-pro-max + frontend-design** for every visual decision. Assumes WS2 has already initialized shadcn in `apps/web`.

**Goal:** Turn the admin home into an operator command center: a sortable clients overview (email, domains, latest score, **issue count**, plan, open requests) defaulting to **most issues → fewest**, an "Add customer" flow that creates a login + pre-assigned site and shows the handover payload, and a polished customer detail (change plan, scan history, requests, link to config).

**Architecture:** Reuse the existing service-role data layer (`listAdminSites` already returns `latestScore`, `issueCount`, `openRequests`, `plan`, `ownerEmail`, `domain`; `getAdminSiteDetail`; `updateSitePlan`; `createCustomer` + `POST /api/admin/customers`). The overview becomes a shadcn data table with client-side sorting. "Add customer" posts to the existing route and renders the returned `{ email, tempPassword, siteId }` in a copyable dialog.

**Tech Stack:** Next.js 15 (RSC + client islands), React 19, Tailwind v4, shadcn/ui, Supabase service role (server only).

## Global Constraints

- **Service-role key never reaches the client.** All admin data is fetched in RSCs / server routes; client components receive only plain data props.
- Admin routes are guarded by `getAdminUser()` (already used) — every new server entry point must call it and redirect non-admins.
- **No compliance / "guaranteed accessible" claims** in copy.
- Keep the existing dark operator aesthetic (`bg-neutral-950`, brand accents) — shadcn primitives adopt it; don't introduce a light theme into `/admin`.
- `cd apps/web && npm run typecheck && npm run test && npm run build` pass before each commit.
- Deploy at end: `cd apps/web && vercel --prod --yes --scope anmolsinghh17-9375s-projects`.

---

## File Structure

- `apps/web/lib/admin-sort.ts` — pure sort/compare helpers for the overview (new) + unit test.
- `apps/web/components/admin/ClientsTable.tsx` — sortable clients table client component (new).
- `apps/web/components/admin/AddCustomerDialog.tsx` — add-customer dialog + handover payload (new).
- `apps/web/app/admin/page.tsx` — rewritten to use the sortable table + Add-customer + issue counts (modify).
- `apps/web/app/admin/sites/[id]/page.tsx` — add issue-count stat + "View widget config" link; polish with shadcn (modify).

---

### Task 1: Sort helpers (pure logic, TDD)

**Files:**
- Create: `apps/web/lib/admin-sort.ts`
- Test: `apps/web/lib/admin-sort.test.ts`

**Interfaces:**
- Produces:
  - `type SortKey = "issues"|"score"|"plan"|"email"|"open"`
  - `sortClients(rows: AdminSiteRow[], key: SortKey, dir: "asc"|"desc"): AdminSiteRow[]` — pure, returns a new array. `null` issueCount/score always sort to the BOTTOM regardless of dir (unknown ≠ best/worst). Default caller uses `("issues","desc")` = most issues first.

- [ ] **Step 1: Write the failing test** `admin-sort.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { sortClients } from "./admin-sort";
import type { AdminSiteRow } from "./admin";

const row = (p: Partial<AdminSiteRow>): AdminSiteRow => ({
  id: p.id ?? "x", domain: p.domain ?? "d", plan: p.plan ?? "free",
  createdAt: "", ownerEmail: p.ownerEmail ?? "a@a.com",
  lastScanScore: p.lastScanScore ?? null, openRequests: p.openRequests ?? 0,
  latestScore: p.latestScore ?? null, issueCount: p.issueCount ?? null,
});

describe("sortClients", () => {
  it("issues desc puts most issues first, nulls last", () => {
    const out = sortClients(
      [row({ id: "a", issueCount: 3 }), row({ id: "b", issueCount: null }), row({ id: "c", issueCount: 10 })],
      "issues", "desc"
    );
    expect(out.map(r => r.id)).toEqual(["c", "a", "b"]);
  });
  it("issues asc keeps nulls last", () => {
    const out = sortClients(
      [row({ id: "a", issueCount: 3 }), row({ id: "b", issueCount: null }), row({ id: "c", issueCount: 10 })],
      "issues", "asc"
    );
    expect(out.map(r => r.id)).toEqual(["a", "c", "b"]);
  });
  it("email sorts alphabetically", () => {
    const out = sortClients([row({ ownerEmail: "z@z.com" }), row({ ownerEmail: "a@a.com" })], "email", "asc");
    expect(out[0].ownerEmail).toBe("a@a.com");
  });
});
```
- [ ] **Step 2: Run test → FAIL.** Run: `cd apps/web && npx vitest run lib/admin-sort.test.ts` → Expected: FAIL (module not found).
- [ ] **Step 3: Implement `admin-sort.ts`.** Comparator dispatches on `key`; numeric keys (`issues`→issueCount, `score`→latestScore, `open`→openRequests) push `null` to the bottom in both directions; `plan`/`email` string-compare. Return a copy (`[...rows].sort(...)`).
- [ ] **Step 4: Run tests → PASS.** Run: `npx vitest run lib/admin-sort.test.ts`.
- [ ] **Step 5: Typecheck + commit**
```bash
cd apps/web && npm run typecheck
git add apps/web/lib/admin-sort.ts apps/web/lib/admin-sort.test.ts
git commit -m "feat(web): admin clients sort helpers (worst-first, nulls last)"
```

---

### Task 2: Sortable ClientsTable

**Files:**
- Create: `apps/web/components/admin/ClientsTable.tsx`

**Interfaces:**
- Consumes: `AdminSiteRow[]`, `sortClients`, shadcn primitives.
- Produces: `<ClientsTable rows={AdminSiteRow[]} />` — renders all columns; default sort `("issues","desc")`; clicking a sortable header (issues, score, plan, email, open) toggles dir and re-sorts client-side with a direction caret. Each row links to `/admin/sites/<id>`.

- [ ] **Step 1:** Build the table (shadcn `Table` or the existing table markup restyled). Columns: Customer (avatar + domain + email), Plan (pill), Latest score (color pill via existing `scoreClass` thresholds), **Issues** (count; emphasized — this is the worst-first signal; show "—" when null), Open (amber pill when >0). Header cells for issues/score/plan/email/open are buttons that set `{key,dir}` state.
- [ ] **Step 2:** Default state `{ key: "issues", dir: "desc" }`. Derive `sortClients(rows, key, dir)` for render. Show a ▲/▼ caret on the active column. Keep keyboard accessibility (header buttons are real `<button>`s with `aria-sort`).
- [ ] **Step 3:** Empty state row ("No customers yet — add one to hand over a configured widget."). Use design skills for density/contrast on the dark theme.
- [ ] **Step 4: Typecheck + commit**
```bash
cd apps/web && npm run typecheck
git add apps/web/components/admin/ClientsTable.tsx
git commit -m "feat(web): sortable admin clients table (default worst-first)"
```

---

### Task 3: Add-customer dialog

**Files:**
- Create: `apps/web/components/admin/AddCustomerDialog.tsx`

**Interfaces:**
- Consumes: `POST /api/admin/customers` (existing) → `{ email, tempPassword, siteId, created }`; shadcn `Dialog`, `Input`, `Select` (plan), `Button`.
- Produces: `<AddCustomerDialog />` — a trigger button + dialog with email + domain + optional plan; on submit posts; on success swaps to a "handover" panel showing email, temp password, site id, each with a copy button; "Done" closes and `router.refresh()`es the overview.

- [ ] **Step 1:** Form state (email, domain, plan). Client-side validate email shape + non-empty domain before posting; show inline errors. POST and handle non-2xx (show `error` from body).
- [ ] **Step 2:** Success view: render `{email, tempPassword, siteId}` in a monospace card with per-field copy buttons (`navigator.clipboard.writeText`, fallback select-all). If `created === false`, note "Existing user — password unchanged; send a reset link." Copy must avoid compliance claims.
- [ ] **Step 3:** "Done" → close + `router.refresh()`. Wire the trigger into the overview header (Task 4).
- [ ] **Step 4: Typecheck + commit**
```bash
cd apps/web && npm run typecheck
git add apps/web/components/admin/AddCustomerDialog.tsx
git commit -m "feat(web): add-customer dialog with copyable handover payload"
```

---

### Task 4: Wire overview page + detail polish

**Files:**
- Modify: `apps/web/app/admin/page.tsx`, `apps/web/app/admin/sites/[id]/page.tsx`

- [ ] **Step 1: `admin/page.tsx`** — keep `getAdminUser()` guard + `listAdminSites()`. Recompute stat cards to include a "Total open issues" stat (sum of `issueCount ?? 0`) alongside Customers / Open requests / Avg score. Replace the static table with `<ClientsTable rows={sites} />` and put `<AddCustomerDialog />` in the header next to "Requests inbox".
- [ ] **Step 2: `admin/sites/[id]/page.tsx`** — add an "Issues (latest scan)" stat near the score using `issueCountFromTotals(site.scans[0]?.totals)` (import from `@/lib/issue-count-utils`), and a "View widget config" link to `/dashboard?site=<id>` (operator can open the customizer). Polish header/sections with shadcn `Card`s while keeping the dark operator theme. Keep `PlanSelect`, scan history, requests.
- [ ] **Step 3: Typecheck + build + tests.** Run: `cd apps/web && npm run typecheck && npm run test && npm run build` → all PASS.
- [ ] **Step 4: Commit**
```bash
git add apps/web/app/admin
git commit -m "feat(web): admin overview worst-first + add-customer + detail issue count"
```

---

### Task 5: Live QA on prod + deploy

**Files:** scratch `apps/web/_ws3_qa.mjs` (gitignored, deleted after).

- [ ] **Step 1: Deploy** `cd apps/web && vercel --prod --yes --scope anmolsinghh17-9375s-projects`.
- [ ] **Step 2: QA script** (established pattern): admin password sign-in (`anmols@wavesmvmnt.com`); mint cookie; Playwright-drive `/admin`. Assert: overview lists customers; default order is most-issues-first; clicking the Score header re-sorts; "Add customer" creates a user+site and shows the temp password (then verify the new client can be signed in via GoTrue with that password and lands on the customizer). Open a customer detail → change plan persists (`updateSitePlan`) → reload shows new plan. Screenshot `/admin` + detail into gitignored `.qa-shots/`.
- [ ] **Step 3:** Clean up the throwaway customer + site via service role; delete `_ws3_qa.mjs`.
- [ ] **Step 4: Final whole-branch review** (requesting-code-review), fix loop, merge `ws3-admin-dashboard` → `main`, push, update `SESSION.md`.

---

## Self-Review notes
- Spec coverage: overview with all columns incl. issue count (T2), default worst-first + sortable (T1/T2), Add-customer with handover payload (T3), detail plan change + scans + requests + config link (T4). ✓
- Reuses existing data layer entirely; no shared/schema changes. ✓
- Service role stays server-side; client gets plain props. ✓
