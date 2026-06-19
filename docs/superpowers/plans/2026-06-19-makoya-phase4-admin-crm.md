# Makoya Phase 4: Admin CRM — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use `- [ ]`.

**Goal:** Give the operator (you) a private CRM at `/admin`: every customer site with owner email, plan, last scan score, and open consultation count; a per-site detail with a manual plan control and scan history; and a consultation-requests inbox with a status pipeline.

**Architecture:** `/admin` is already gated by middleware (admin emails) from Phase 1. This phase adds a server-only admin data layer that reads across all tenants with the service-role client and joins owner emails via the GoTrue admin API; two admin-guarded mutation routes (set plan, set request status); and three admin pages (customers list, site detail, requests inbox). Every admin route/page re-checks the admin role server-side (defense in depth — never rely on middleware alone).

**Tech Stack:** Next 15 (RSC + route handlers), React 19, Tailwind v4, Supabase service-role client.

## Global Constraints

- `apps/web` port 3000; Node 20+.
- Admin access = email in `ADMIN_EMAILS`. Every admin page AND mutation route calls a server-side `getAdminUser()` guard and 403s / notFounds non-admins (do not rely on middleware only).
- Cross-tenant reads use `getAdminSupabase()` (service role), only inside `lib/admin.ts` (server-only) and admin routes — never in a client component.
- Plans: `free | pro | managed`. Request statuses: `new | contacted | won | lost`. Validate on the server; reject unknown values (400).
- Owner emails come from `getAdminSupabase().auth.admin.listUsers()` (the `sites` table only stores `owner_id`).
- No "WCAG/ADA compliant"/"lawsuit-proof" copy.
- The CRM is site-centric (one row per site; a customer with N sites shows as N rows) — acceptable for v1.
- Commit per task; `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` trailer.

---

### Task 1: Admin constants + role guard (TDD)

**Files:** Create `apps/web/lib/admin-constants.ts`, `apps/web/lib/admin-constants.test.ts`, `apps/web/lib/auth/require-admin.ts`

**Interfaces:**
- Produces:
  - `PLANS = ["free","pro","managed"] as const`; `type Plan`; `isValidPlan(v): v is Plan`.
  - `REQUEST_STATUSES = ["new","contacted","won","lost"] as const`; `type RequestStatus`; `isValidStatus(v): v is RequestStatus`.
  - `getAdminUser(): Promise<{ id: string; email: string } | null>` — the signed-in user if their email is in `ADMIN_EMAILS`, else null.

- [ ] **Step 1: Failing test (`admin-constants.test.ts`)**

```ts
import { describe, it, expect } from "vitest";
import { isValidPlan, isValidStatus } from "./admin-constants";

describe("admin-constants", () => {
  it("isValidPlan accepts known plans, rejects others", () => {
    expect(isValidPlan("free")).toBe(true);
    expect(isValidPlan("pro")).toBe(true);
    expect(isValidPlan("managed")).toBe(true);
    expect(isValidPlan("enterprise")).toBe(false);
    expect(isValidPlan("")).toBe(false);
  });
  it("isValidStatus accepts known statuses, rejects others", () => {
    expect(isValidStatus("new")).toBe(true);
    expect(isValidStatus("won")).toBe(true);
    expect(isValidStatus("deleted")).toBe(false);
  });
});
```

- [ ] **Step 2: RED** — `cd apps/web && npx vitest run lib/admin-constants.test.ts`

- [ ] **Step 3: Implement `admin-constants.ts`**

```ts
export const PLANS = ["free", "pro", "managed"] as const;
export type Plan = (typeof PLANS)[number];
export function isValidPlan(v: unknown): v is Plan {
  return typeof v === "string" && (PLANS as readonly string[]).includes(v);
}

export const REQUEST_STATUSES = ["new", "contacted", "won", "lost"] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];
export function isValidStatus(v: unknown): v is RequestStatus {
  return typeof v === "string" && (REQUEST_STATUSES as readonly string[]).includes(v);
}
```

- [ ] **Step 4: GREEN**

- [ ] **Step 5: Implement `auth/require-admin.ts`**

```ts
import { getServerSupabase } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/roles";
import { env } from "@/lib/env";

/** Returns the signed-in user only if they are an operator (admin). Else null. */
export async function getAdminUser(): Promise<{ id: string; email: string } | null> {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email || !isAdmin(user.email, env.ADMIN_EMAILS)) return null;
  return { id: user.id, email: user.email };
}
```

- [ ] **Step 6: Typecheck** clean.

- [ ] **Step 7: Commit** — `feat(admin): plan/status constants + server-side admin guard (tested)`

---

### Task 2: Admin data layer

**Files:** Create `apps/web/lib/admin.ts`

**Interfaces:**
- Consumes: `getAdminSupabase`, `Plan`/`RequestStatus` (Task 1).
- Produces (all server-only):
  - `interface AdminSiteRow { id: string; domain: string; plan: string; createdAt: string; ownerEmail: string; lastScanScore: number | null; openRequests: number }`
  - `listAdminSites(): Promise<AdminSiteRow[]>`
  - `interface AdminSiteDetail { id: string; domain: string; plan: string; createdAt: string; ownerEmail: string; scans: { id: string; score: number; totals: any; createdAt: string }[]; requests: AdminRequest[] }`
  - `getAdminSiteDetail(siteId: string): Promise<AdminSiteDetail | null>`
  - `updateSitePlan(siteId: string, plan: Plan): Promise<void>`
  - `interface AdminRequest { id: string; siteId: string; siteDomain: string; type: string; status: string; note: string | null; createdAt: string }`
  - `listConsultationRequests(): Promise<AdminRequest[]>`
  - `updateConsultationStatus(id: string, status: RequestStatus): Promise<void>`

- [ ] **Step 1: Implement `lib/admin.ts`**

```ts
import "server-only";
import { getAdminSupabase } from "@/lib/supabase/admin";
import type { Plan, RequestStatus } from "@/lib/admin-constants";

/** id -> email for all auth users (paged). */
async function emailMap(): Promise<Map<string, string>> {
  const admin = getAdminSupabase();
  const map = new Map<string, string>();
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error || !data?.users?.length) break;
    for (const u of data.users) if (u.email) map.set(u.id, u.email);
    if (data.users.length < 1000) break;
    page++;
  }
  return map;
}

export interface AdminSiteRow {
  id: string; domain: string; plan: string; createdAt: string;
  ownerEmail: string; lastScanScore: number | null; openRequests: number;
}

export async function listAdminSites(): Promise<AdminSiteRow[]> {
  const admin = getAdminSupabase();
  const [{ data: sites }, emails] = await Promise.all([
    admin.from("sites").select("id, owner_id, domain, plan, created_at").order("created_at", { ascending: false }),
    emailMap(),
  ]);
  const rows: AdminSiteRow[] = [];
  for (const s of sites ?? []) {
    const { data: latest } = await admin.from("scans").select("score")
      .eq("site_id", s.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    const { count } = await admin.from("consultation_requests")
      .select("id", { count: "exact", head: true }).eq("site_id", s.id).eq("status", "new");
    rows.push({
      id: s.id, domain: s.domain, plan: s.plan, createdAt: s.created_at,
      ownerEmail: emails.get(s.owner_id) ?? "(unknown)",
      lastScanScore: latest?.score ?? null, openRequests: count ?? 0,
    });
  }
  return rows;
}

export interface AdminRequest {
  id: string; siteId: string; siteDomain: string; type: string; status: string; note: string | null; createdAt: string;
}

export interface AdminSiteDetail {
  id: string; domain: string; plan: string; createdAt: string; ownerEmail: string;
  scans: { id: string; score: number; totals: unknown; createdAt: string }[];
  requests: AdminRequest[];
}

export async function getAdminSiteDetail(siteId: string): Promise<AdminSiteDetail | null> {
  const admin = getAdminSupabase();
  const { data: s } = await admin.from("sites").select("id, owner_id, domain, plan, created_at").eq("id", siteId).maybeSingle();
  if (!s) return null;
  const emails = await emailMap();
  const { data: scans } = await admin.from("scans").select("id, score, totals, created_at")
    .eq("site_id", siteId).order("created_at", { ascending: false }).limit(20);
  const { data: reqs } = await admin.from("consultation_requests").select("*")
    .eq("site_id", siteId).order("created_at", { ascending: false });
  return {
    id: s.id, domain: s.domain, plan: s.plan, createdAt: s.created_at,
    ownerEmail: emails.get(s.owner_id) ?? "(unknown)",
    scans: (scans ?? []).map((x) => ({ id: x.id, score: x.score, totals: x.totals, createdAt: x.created_at })),
    requests: (reqs ?? []).map((r) => ({ id: r.id, siteId: r.site_id, siteDomain: s.domain, type: r.type, status: r.status, note: r.note, createdAt: r.created_at })),
  };
}

export async function updateSitePlan(siteId: string, plan: Plan): Promise<void> {
  const { error } = await getAdminSupabase().from("sites").update({ plan }).eq("id", siteId);
  if (error) throw error;
}

export async function listConsultationRequests(): Promise<AdminRequest[]> {
  const admin = getAdminSupabase();
  const [{ data: reqs }, { data: sites }] = await Promise.all([
    admin.from("consultation_requests").select("*").order("created_at", { ascending: false }),
    admin.from("sites").select("id, domain"),
  ]);
  const domainById = new Map((sites ?? []).map((s) => [s.id, s.domain]));
  return (reqs ?? []).map((r) => ({
    id: r.id, siteId: r.site_id, siteDomain: domainById.get(r.site_id) ?? "(deleted site)",
    type: r.type, status: r.status, note: r.note, createdAt: r.created_at,
  }));
}

export async function updateConsultationStatus(id: string, status: RequestStatus): Promise<void> {
  const { error } = await getAdminSupabase().from("consultation_requests").update({ status }).eq("id", id);
  if (error) throw error;
}
```

- [ ] **Step 2: Typecheck** clean.

- [ ] **Step 3: Commit** — `feat(admin): cross-tenant admin data layer (sites, detail, requests)`

---

### Task 3: Admin mutation routes (plan + request status)

**Files:** Create `apps/web/app/api/admin/sites/[id]/route.ts`, `apps/web/app/api/admin/consultations/[id]/route.ts`

**Interfaces:**
- Consumes: `getAdminUser` (Task 1), `isValidPlan`/`isValidStatus` (Task 1), `updateSitePlan`/`updateConsultationStatus` (Task 2).
- Produces:
  - `PATCH /api/admin/sites/[id]` body `{ plan }`: admin-guarded; validates plan; updates `sites.plan`.
  - `PATCH /api/admin/consultations/[id]` body `{ status }`: admin-guarded; validates status; updates `consultation_requests.status`.

- [ ] **Step 1: `app/api/admin/sites/[id]/route.ts`**

```ts
import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/require-admin";
import { isValidPlan } from "@/lib/admin-constants";
import { updateSitePlan } from "@/lib/admin";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;
  let body: { plan?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }
  if (!isValidPlan(body.plan)) return NextResponse.json({ error: "invalid plan" }, { status: 400 });
  await updateSitePlan(id, body.plan);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: `app/api/admin/consultations/[id]/route.ts`**

```ts
import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/require-admin";
import { isValidStatus } from "@/lib/admin-constants";
import { updateConsultationStatus } from "@/lib/admin";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;
  let body: { status?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }
  if (!isValidStatus(body.status)) return NextResponse.json({ error: "invalid status" }, { status: 400 });
  await updateConsultationStatus(id, body.status);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Typecheck + build** (foreground; expect both routes present).

- [ ] **Step 4: Commit** — `feat(admin): admin-guarded plan + consultation-status routes`

---

### Task 4: Admin customers list + site detail pages

**Files:** Modify `apps/web/app/admin/page.tsx`; Create `apps/web/app/admin/sites/[id]/page.tsx`, `apps/web/components/admin/PlanSelect.tsx`

**Interfaces:**
- Consumes: `getAdminUser`, `listAdminSites`, `getAdminSiteDetail`, `PLANS`.
- Produces: `/admin` lists all sites (table) with a link to `/admin/sites/[id]`; the detail page shows owner/plan/scans/requests and a `PlanSelect` that PATCHes the plan.

**Design intent:** dark admin shell (already in `admin/layout.tsx`); a clean table (`text-sm`, zebra rows via `divide-y divide-neutral-800`), badge for open requests, monospace scores. No emoji/gradients.

- [ ] **Step 1: `components/admin/PlanSelect.tsx`**

```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PLANS } from "@/lib/admin-constants";

export function PlanSelect({ siteId, plan }: { siteId: string; plan: string }) {
  const router = useRouter();
  const [value, setValue] = useState(plan);
  const [saving, setSaving] = useState(false);
  async function change(next: string) {
    setValue(next); setSaving(true);
    await fetch(`/api/admin/sites/${siteId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ plan: next }) });
    setSaving(false); router.refresh();
  }
  return (
    <select value={value} disabled={saving} onChange={(e) => change(e.target.value)}
      className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm text-neutral-100">
      {PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
    </select>
  );
}
```

- [ ] **Step 2: `app/admin/page.tsx` (customers list)**

```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth/require-admin";
import { listAdminSites } from "@/lib/admin";

export default async function AdminHome() {
  const admin = await getAdminUser();
  if (!admin) redirect("/dashboard");
  const sites = await listAdminSites();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Customers</h1>
        <Link href="/admin/requests" className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm hover:bg-neutral-900">Requests inbox →</Link>
      </div>
      <div className="overflow-hidden rounded-xl border border-neutral-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-900 text-neutral-400">
            <tr><th className="px-4 py-2">Site</th><th className="px-4 py-2">Owner</th><th className="px-4 py-2">Plan</th><th className="px-4 py-2">Last score</th><th className="px-4 py-2">Open requests</th></tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {sites.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-neutral-500">No customers yet.</td></tr>}
            {sites.map((s) => (
              <tr key={s.id} className="hover:bg-neutral-900">
                <td className="px-4 py-2"><Link href={`/admin/sites/${s.id}`} className="font-medium underline-offset-2 hover:underline">{s.domain}</Link></td>
                <td className="px-4 py-2 text-neutral-300">{s.ownerEmail}</td>
                <td className="px-4 py-2">{s.plan}</td>
                <td className="px-4 py-2 font-mono">{s.lastScanScore ?? "—"}</td>
                <td className="px-4 py-2">{s.openRequests > 0 ? <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-amber-300">{s.openRequests}</span> : <span className="text-neutral-600">0</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: `app/admin/sites/[id]/page.tsx` (detail)**

```tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth/require-admin";
import { getAdminSiteDetail } from "@/lib/admin";
import { PlanSelect } from "@/components/admin/PlanSelect";

export default async function AdminSiteDetail({ params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser();
  if (!admin) redirect("/dashboard");
  const { id } = await params;
  const site = await getAdminSiteDetail(id);
  if (!site) notFound();
  return (
    <div className="space-y-6">
      <Link href="/admin" className="text-sm text-neutral-400 hover:text-neutral-100">← All customers</Link>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{site.domain}</h1>
          <p className="text-sm text-neutral-400">{site.ownerEmail} · joined {new Date(site.createdAt).toLocaleDateString()}</p>
        </div>
        <div className="flex items-center gap-2 text-sm"><span className="text-neutral-400">Plan</span><PlanSelect siteId={site.id} plan={site.plan} /></div>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-medium text-neutral-400">Scan history</h2>
        <div className="rounded-xl border border-neutral-800 divide-y divide-neutral-800">
          {site.scans.length === 0 && <p className="px-4 py-3 text-neutral-500">No scans yet.</p>}
          {site.scans.map((sc) => (
            <div key={sc.id} className="flex items-center justify-between px-4 py-2 text-sm">
              <span className="font-mono">{sc.score}/100</span>
              <span className="text-neutral-500">{new Date(sc.createdAt).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-neutral-400">Consultation requests</h2>
        <div className="rounded-xl border border-neutral-800 divide-y divide-neutral-800">
          {site.requests.length === 0 && <p className="px-4 py-3 text-neutral-500">No requests.</p>}
          {site.requests.map((r) => (
            <div key={r.id} className="flex items-center justify-between px-4 py-2 text-sm">
              <span>{r.type === "book_call" ? "Book a call" : "Full report"}</span>
              <span className="text-neutral-400">{r.status}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Typecheck + build** (foreground; `/admin` and `/admin/sites/[id]` present).

- [ ] **Step 5: Commit** — `feat(admin): customers list + site detail with plan control`

---

### Task 5: Consultation requests inbox

**Files:** Create `apps/web/app/admin/requests/page.tsx`, `apps/web/components/admin/StatusSelect.tsx`

**Interfaces:**
- Consumes: `getAdminUser`, `listConsultationRequests`, `REQUEST_STATUSES`.
- Produces: `/admin/requests` lists all consultation requests with a `StatusSelect` that PATCHes the status.

- [ ] **Step 1: `components/admin/StatusSelect.tsx`**

```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { REQUEST_STATUSES } from "@/lib/admin-constants";

export function StatusSelect({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [saving, setSaving] = useState(false);
  async function change(next: string) {
    setValue(next); setSaving(true);
    await fetch(`/api/admin/consultations/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: next }) });
    setSaving(false); router.refresh();
  }
  return (
    <select value={value} disabled={saving} onChange={(e) => change(e.target.value)}
      className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm text-neutral-100">
      {REQUEST_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
    </select>
  );
}
```

- [ ] **Step 2: `app/admin/requests/page.tsx`**

```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth/require-admin";
import { listConsultationRequests } from "@/lib/admin";
import { StatusSelect } from "@/components/admin/StatusSelect";

export default async function AdminRequests() {
  const admin = await getAdminUser();
  if (!admin) redirect("/dashboard");
  const requests = await listConsultationRequests();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Consultation requests</h1>
        <Link href="/admin" className="text-sm text-neutral-400 hover:text-neutral-100">← Customers</Link>
      </div>
      <div className="overflow-hidden rounded-xl border border-neutral-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-900 text-neutral-400">
            <tr><th className="px-4 py-2">Site</th><th className="px-4 py-2">Type</th><th className="px-4 py-2">When</th><th className="px-4 py-2">Status</th></tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {requests.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-neutral-500">No requests yet.</td></tr>}
            {requests.map((r) => (
              <tr key={r.id} className="hover:bg-neutral-900">
                <td className="px-4 py-2"><Link href={`/admin/sites/${r.siteId}`} className="underline-offset-2 hover:underline">{r.siteDomain}</Link></td>
                <td className="px-4 py-2">{r.type === "book_call" ? "Book a call" : "Full report"}</td>
                <td className="px-4 py-2 text-neutral-500">{new Date(r.createdAt).toLocaleString()}</td>
                <td className="px-4 py-2"><StatusSelect id={r.id} status={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck + build** (foreground; `/admin/requests` present).

- [ ] **Step 4: Commit** — `feat(admin): consultation requests inbox with status pipeline`

---

## Self-Review

**Coverage:** admin guard ✔ (T1); cross-tenant data ✔ (T2); plan + status mutations ✔ (T3); customers list + detail + plan control ✔ (T4); requests inbox + status pipeline ✔ (T5). Every page/route re-checks admin server-side. Owner emails via `auth.admin.listUsers`. Plans/statuses validated server-side.

**Placeholders:** none — real code throughout.

**Type consistency:** `getAdminUser`, `isValidPlan`/`isValidStatus`, `PLANS`/`REQUEST_STATUSES`, `listAdminSites`/`getAdminSiteDetail`/`updateSitePlan`/`listConsultationRequests`/`updateConsultationStatus`, and `AdminSiteRow`/`AdminRequest` are used consistently T1→T5. Routes consume the exact data-layer fn names from T2.
