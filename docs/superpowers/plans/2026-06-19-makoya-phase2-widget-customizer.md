# Makoya Phase 2: Widget Customizer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a logged-in client add their site, customize their widget (position, primary color, launcher icon, which features show, branding) with a live preview, save it, and copy an install snippet — and have the embeddable widget honor the chosen launcher icon via a shared icon source.

**Architecture:** Launcher icons move into `@makoya/shared` as a single keyed SVG map consumed by both the widget (`ui.ts`) and a React `WidgetPreview` in the dashboard, so preview and reality never drift. The dashboard reads/writes `sites` + `site_config` through a small typed data layer: owner-scoped writes use the request-bound (RLS) Supabase client; the public config JSON endpoint reads via a server-only service-role client. Plan-gating (branding) is enforced server-side.

**Tech Stack:** Next.js 15 App Router (RSC + Route Handlers), React 19, Tailwind v4, `@supabase/supabase-js` / `@supabase/ssr`, Vitest; existing `@makoya/widget` (Vite IIFE) + `@makoya/shared` (path-alias, no build).

## Global Constraints

- Node 20+, Next 15.x, React 19.x, Tailwind v4; `apps/web` on port 3000.
- Service role key server-only — only in `lib/supabase/admin.ts`, never imported by a client component or middleware. `.env.local` is gitignored.
- Owner data access goes through RLS (request-bound client). Only the public config endpoint uses the service-role client, and it returns ONLY safe display fields (no owner_id, no plan internals beyond what the widget needs).
- `hide_branding` may be true ONLY when the site's `plan !== 'free'`; enforce on the server, never trust the client.
- Launcher icon keys are exactly: `accessibility | person | eye | adjust`. Default `accessibility`.
- Widget config shape lives in `@makoya/shared`; widget and dashboard both import it — never redefine it.
- No "WCAG compliant" / "ADA compliant" / "lawsuit-proof" copy anywhere. The widget's existing "Adjusts your view only…" disclaimer stays.
- Keep `packages/widget` behavior backward-compatible: a config without `launcherIcon` still renders the accessibility icon.
- Commit after each task; conventional-commit messages with the `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` trailer.

---

### Task 1: Extend `@makoya/shared` with launcher icons (TDD)

**Files:**
- Modify: `packages/shared/src/index.ts`
- Create: `apps/web/lib/shared-config.test.ts` (tests the shared package via the `@makoya/shared` path alias, since shared has no test runner)

**Interfaces:**
- Produces:
  - `type LauncherIconKey = "accessibility" | "person" | "eye" | "adjust"`
  - `const LAUNCHER_ICONS: Record<LauncherIconKey, string>` (inline `<svg>` strings, `fill="currentColor"`, `viewBox="0 0 24 24"`)
  - `WidgetConfig` gains `launcherIcon: LauncherIconKey`
  - `DEFAULT_CONFIG.launcherIcon === "accessibility"`
  - `resolveConfig` unchanged in signature (spreads partial over defaults).

- [ ] **Step 1: Write the failing test**

`apps/web/lib/shared-config.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { DEFAULT_CONFIG, LAUNCHER_ICONS, resolveConfig } from "@makoya/shared";

describe("shared launcher icons", () => {
  it("default launcher icon is accessibility", () => {
    expect(DEFAULT_CONFIG.launcherIcon).toBe("accessibility");
  });
  it("LAUNCHER_ICONS has all 4 keys and each is an <svg> string", () => {
    for (const k of ["accessibility", "person", "eye", "adjust"] as const) {
      expect(typeof LAUNCHER_ICONS[k]).toBe("string");
      expect(LAUNCHER_ICONS[k]).toContain("<svg");
    }
  });
  it("resolveConfig keeps a provided launcherIcon and fills the default otherwise", () => {
    expect(resolveConfig("s1", { launcherIcon: "eye" }).launcherIcon).toBe("eye");
    expect(resolveConfig("s1", {}).launcherIcon).toBe("accessibility");
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `cd apps/web && npx vitest run lib/shared-config.test.ts`
Expected: FAIL — `LAUNCHER_ICONS` is undefined / `launcherIcon` missing.

- [ ] **Step 3: Implement in `packages/shared/src/index.ts`**

Add the type + icons near the top (after `WidgetPosition`):
```ts
export type LauncherIconKey = "accessibility" | "person" | "eye" | "adjust";

/** Inline SVGs for the launcher button. Shared so the widget and the
 *  dashboard live-preview render the exact same icon. */
export const LAUNCHER_ICONS: Record<LauncherIconKey, string> = {
  accessibility: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="4" r="2"/><path d="M21 9c0 .55-.45 1-1 1h-4v11a1 1 0 0 1-2 0v-5h-4v5a1 1 0 0 1-2 0V10H4a1 1 0 0 1 0-2h16c.55 0 1 .45 1 1z"/></svg>`,
  person: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="7" r="4"/><path d="M4 21a8 8 0 0 1 16 0 1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/></svg>`,
  eye: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 5c-5 0-9 4.5-10 7 1 2.5 5 7 10 7s9-4.5 10-7c-1-2.5-5-7-10-7zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8z"/><circle cx="12" cy="12" r="2"/></svg>`,
  adjust: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 7h11a3 3 0 0 1 6 0h1a1 1 0 0 1 0 2h-1a3 3 0 0 1-6 0H3a1 1 0 0 1 0-2zm6 8a3 3 0 0 1 6 0h6a1 1 0 0 1 0 2h-6a3 3 0 0 1-6 0H3a1 1 0 0 1 0-2h6z"/></svg>`,
};
```
Add `launcherIcon` to the `WidgetConfig` interface (after `position`):
```ts
  /** Which launcher icon the button shows. */
  launcherIcon: LauncherIconKey;
```
Add it to `DEFAULT_CONFIG` (after `position`):
```ts
  launcherIcon: "accessibility",
```
(`resolveConfig` already spreads `partial` over `DEFAULT_CONFIG`, so no change needed there.)

- [ ] **Step 4: Run the test, verify it passes**

Run: `cd apps/web && npx vitest run lib/shared-config.test.ts`
Expected: 3 passing.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/index.ts apps/web/lib/shared-config.test.ts
git commit -m "feat(shared): launcher icon map + launcherIcon config field"
```

---

### Task 2: Widget honors `launcherIcon`

**Files:**
- Modify: `packages/widget/src/ui/ui.ts`

**Interfaces:**
- Consumes: `LAUNCHER_ICONS`, `LauncherIconKey` from `@makoya/shared` (Task 1).
- Produces: the launcher button renders `LAUNCHER_ICONS[config.launcherIcon]`, falling back to the accessibility icon.

- [ ] **Step 1: Replace the hardcoded icon with the shared map**

In `packages/widget/src/ui/ui.ts`:
1. Extend the import on line 14 to include the icons:
```ts
import { LAUNCHER_ICONS, type WidgetConfig, type FeatureKey } from "@makoya/shared";
```
2. Delete the local `A11Y_ICON` constant (line 172).
3. Change the launcher button's icon line (currently `btn.innerHTML = A11Y_ICON;`, ~line 218) to:
```ts
  btn.innerHTML = LAUNCHER_ICONS[config.launcherIcon] ?? LAUNCHER_ICONS.accessibility;
```

- [ ] **Step 2: Typecheck + build the widget**

Run: `cd packages/widget && npm run typecheck && npm run build`
Expected: typecheck clean; `dist/core.js` and `dist/loader.js` rebuilt with no errors.

- [ ] **Step 3: Verify the widget still renders (existing jsdom test)**

Run (from repo root): `node test-widget.mjs`
Expected: the script's existing success output (widget root mounts, button present). If `test-widget.mjs` needs `jsdom`, run `npm install jsdom` first. The default config now includes `launcherIcon: "accessibility"` via `resolveConfig`, so the button renders the accessibility icon exactly as before.

- [ ] **Step 4: Commit**

```bash
git add packages/widget/src/ui/ui.ts
git commit -m "feat(widget): render configurable launcher icon from shared map"
```

---

### Task 3: App data layer — admin client + sites/config repo (TDD for mappers)

**Files:**
- Create: `apps/web/lib/supabase/admin.ts`, `apps/web/lib/sites.ts`, `apps/web/lib/sites-mappers.ts`, `apps/web/lib/sites-mappers.test.ts`

**Interfaces:**
- Produces:
  - `getAdminSupabase()` from `lib/supabase/admin.ts` — a service-role client (server-only).
  - Types in `lib/sites.ts`: `Site { id: string; ownerId: string; domain: string; plan: "free"|"pro"|"managed"; createdAt: string }` and `SiteConfig { siteId: string; primaryColor: string; position: WidgetPosition; launcherIcon: LauncherIconKey; featuresEnabled: FeatureKey[]; hideBranding: boolean }`.
  - `lib/sites-mappers.ts`: `rowToConfig(row): SiteConfig` and `configToRow(patch: Partial<SiteConfig>): Record<string, unknown>` (camelCase ⇄ snake_case).
  - `lib/sites.ts` functions (all async): `createSite(client, ownerId, domain): Promise<Site>`, `listSites(client, ownerId): Promise<Site[]>`, `getSite(client, id): Promise<Site|null>`, `getConfig(client, siteId): Promise<SiteConfig|null>`, `updateConfig(client, siteId, patch): Promise<void>`. `client` is a `SupabaseClient` passed in by the caller (request-bound for owner ops, admin for public read).

- [ ] **Step 1: Write the failing test (mappers)**

`apps/web/lib/sites-mappers.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { rowToConfig, configToRow } from "./sites-mappers";

describe("sites mappers", () => {
  it("rowToConfig maps snake_case row to camelCase config", () => {
    const row = {
      site_id: "s1", primary_color: "#111111", position: "top-left",
      launcher_icon: "eye", features_enabled: ["textSize"], hide_branding: true,
    };
    expect(rowToConfig(row)).toEqual({
      siteId: "s1", primaryColor: "#111111", position: "top-left",
      launcherIcon: "eye", featuresEnabled: ["textSize"], hideBranding: true,
    });
  });
  it("configToRow only includes provided fields, snake_cased", () => {
    expect(configToRow({ primaryColor: "#222", hideBranding: false })).toEqual({
      primary_color: "#222", hide_branding: false,
    });
    expect(configToRow({ launcherIcon: "adjust" })).toEqual({ launcher_icon: "adjust" });
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `cd apps/web && npx vitest run lib/sites-mappers.test.ts`
Expected: FAIL — module `./sites-mappers` not found.

- [ ] **Step 3: Implement the mappers**

`apps/web/lib/sites-mappers.ts`:
```ts
import type { WidgetPosition, FeatureKey, LauncherIconKey } from "@makoya/shared";

export interface SiteConfig {
  siteId: string;
  primaryColor: string;
  position: WidgetPosition;
  launcherIcon: LauncherIconKey;
  featuresEnabled: FeatureKey[];
  hideBranding: boolean;
}

export function rowToConfig(row: any): SiteConfig {
  return {
    siteId: row.site_id,
    primaryColor: row.primary_color,
    position: row.position,
    launcherIcon: row.launcher_icon,
    featuresEnabled: row.features_enabled,
    hideBranding: row.hide_branding,
  };
}

export function configToRow(patch: Partial<SiteConfig>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (patch.primaryColor !== undefined) out.primary_color = patch.primaryColor;
  if (patch.position !== undefined) out.position = patch.position;
  if (patch.launcherIcon !== undefined) out.launcher_icon = patch.launcherIcon;
  if (patch.featuresEnabled !== undefined) out.features_enabled = patch.featuresEnabled;
  if (patch.hideBranding !== undefined) out.hide_branding = patch.hideBranding;
  return out;
}
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `cd apps/web && npx vitest run lib/sites-mappers.test.ts`
Expected: 2 passing.

- [ ] **Step 5: Implement the admin client + sites repo**

`apps/web/lib/supabase/admin.ts`:
```ts
import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/** Service-role client. SERVER-ONLY. Bypasses RLS — use only for the public
 *  config endpoint and admin/operator features. Never import into a client component. */
export function getAdminSupabase() {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
```

`apps/web/lib/sites.ts`:
```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { WidgetPosition, FeatureKey } from "@makoya/shared";
import { rowToConfig, configToRow, type SiteConfig } from "./sites-mappers";

export type { SiteConfig };
export interface Site {
  id: string;
  ownerId: string;
  domain: string;
  plan: "free" | "pro" | "managed";
  createdAt: string;
}

const DEFAULT_FEATURES: FeatureKey[] = [
  "textSize", "lineSpacing", "contrast", "stopMotion",
  "readingRuler", "highlightLinks", "bigCursor",
];

function rowToSite(r: any): Site {
  return { id: r.id, ownerId: r.owner_id, domain: r.domain, plan: r.plan, createdAt: r.created_at };
}

export async function createSite(client: SupabaseClient, ownerId: string, domain: string): Promise<Site> {
  const { data, error } = await client
    .from("sites")
    .insert({ owner_id: ownerId, domain })
    .select("*")
    .single();
  if (error) throw error;
  // create the default config row for this site
  const { error: cErr } = await client.from("site_config").insert({
    site_id: data.id,
    features_enabled: DEFAULT_FEATURES,
  });
  if (cErr) throw cErr;
  return rowToSite(data);
}

export async function listSites(client: SupabaseClient, ownerId: string): Promise<Site[]> {
  const { data, error } = await client
    .from("sites").select("*").eq("owner_id", ownerId).order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(rowToSite);
}

export async function getSite(client: SupabaseClient, id: string): Promise<Site | null> {
  const { data } = await client.from("sites").select("*").eq("id", id).maybeSingle();
  return data ? rowToSite(data) : null;
}

export async function getConfig(client: SupabaseClient, siteId: string): Promise<SiteConfig | null> {
  const { data } = await client.from("site_config").select("*").eq("site_id", siteId).maybeSingle();
  return data ? rowToConfig(data) : null;
}

export async function updateConfig(client: SupabaseClient, siteId: string, patch: Partial<SiteConfig>): Promise<void> {
  const { error } = await client.from("site_config").update(configToRow(patch)).eq("site_id", siteId);
  if (error) throw error;
}
```

- [ ] **Step 6: Typecheck**

Run: `cd apps/web && npm run typecheck`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add apps/web/lib/supabase/admin.ts apps/web/lib/sites.ts apps/web/lib/sites-mappers.ts apps/web/lib/sites-mappers.test.ts
git commit -m "feat(web): sites/config data layer + service-role client + mappers (tested)"
```

---

### Task 4: API routes — create site, update config, public config JSON

**Files:**
- Create: `apps/web/app/api/sites/route.ts`, `apps/web/app/api/sites/[id]/config/route.ts`, `apps/web/app/api/config/[siteId]/route.ts`

**Interfaces:**
- Consumes: `getServerSupabase` (Phase 1), `getAdminSupabase` (Task 3), `createSite`/`getSite`/`getConfig`/`updateConfig` (Task 3), `DEFAULT_CONFIG` (shared).
- Produces:
  - `POST /api/sites` — body `{ domain }`, auth required, creates a site owned by the user. Returns the `Site`.
  - `PATCH /api/sites/[id]/config` — body `Partial<SiteConfig>`, auth + ownership required; server forces `hideBranding=false` when the site's plan is `free`. Returns `{ ok: true }`.
  - `GET /api/config/[siteId]` — public; returns safe widget config JSON (service-role read) with cache headers; falls back to defaults if missing.

- [ ] **Step 1: Create `POST /api/sites`**

`apps/web/app/api/sites/route.ts`:
```ts
import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { createSite } from "@/lib/sites";

export async function POST(req: Request) {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }
  const domain = typeof body?.domain === "string" ? body.domain.trim() : "";
  if (!domain) return NextResponse.json({ error: "domain required" }, { status: 400 });

  try {
    const site = await createSite(supabase, user.id, domain);
    return NextResponse.json(site, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "failed to create site" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create `PATCH /api/sites/[id]/config`**

`apps/web/app/api/sites/[id]/config/route.ts`:
```ts
import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getSite, updateConfig, type SiteConfig } from "@/lib/sites";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const site = await getSite(supabase, id);
  if (!site || site.ownerId !== user.id) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let patch: Partial<SiteConfig>;
  try { patch = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }

  // Server-side plan gating: free plan cannot hide branding.
  if (site.plan === "free") patch.hideBranding = false;

  try {
    await updateConfig(supabase, id, patch);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "update failed" }, { status: 500 });
  }
}
```

- [ ] **Step 3: Create public `GET /api/config/[siteId]`**

`apps/web/app/api/config/[siteId]/route.ts`:
```ts
import { NextResponse } from "next/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getConfig } from "@/lib/sites";
import { DEFAULT_CONFIG } from "@makoya/shared";

export async function GET(_req: Request, { params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const headers = { "cache-control": "public, s-maxage=300, stale-while-revalidate=86400" };
  const cfg = await getConfig(getAdminSupabase(), siteId);
  if (!cfg) {
    return NextResponse.json({ ...DEFAULT_CONFIG, siteId }, { headers });
  }
  // Only safe display fields cross to the public widget.
  return NextResponse.json({
    siteId,
    primaryColor: cfg.primaryColor,
    position: cfg.position,
    launcherIcon: cfg.launcherIcon,
    featuresEnabled: cfg.featuresEnabled,
    hideBranding: cfg.hideBranding,
    brandingUrl: DEFAULT_CONFIG.brandingUrl,
  }, { headers });
}
```

- [ ] **Step 4: Typecheck + build**

Run: `cd apps/web && npm run typecheck && npm run build`
Expected: compiles; routes `/api/sites`, `/api/sites/[id]/config`, `/api/config/[siteId]` present in the build output.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/api/sites apps/web/app/api/config
git commit -m "feat(web): site create + config update (plan-gated) + public config JSON"
```

---

### Task 5: Dashboard Overview — add site, list sites, install snippet

**Files:**
- Modify: `apps/web/app/dashboard/page.tsx`
- Create: `apps/web/components/AddSiteForm.tsx`, `apps/web/components/SnippetBox.tsx`

**Interfaces:**
- Consumes: `getServerSupabase`, `listSites` (Task 3), `isAdmin`/`env` (Phase 1), `POST /api/sites` (Task 4).
- Produces: dashboard lists the user's sites (domain + a "Customize" link to `/dashboard/sites/[id]`) and the install snippet per site; an `AddSiteForm` that POSTs to `/api/sites` and refreshes.

**Design intent (apply frontend-design principles):** generous whitespace, a single-column max-w-3xl content well, rounded-2xl cards with `border border-neutral-200` and subtle `shadow-sm`, `text-neutral-500` secondary text, one clear primary action color (`bg-neutral-900` buttons), monospace snippet in a `bg-neutral-50` block with a copy button. No emoji, no gradients.

- [ ] **Step 1: Snippet box (client component, copy button)**

`apps/web/components/SnippetBox.tsx`:
```tsx
"use client";
import { useState } from "react";

export function SnippetBox({ siteId }: { siteId: string }) {
  const [copied, setCopied] = useState(false);
  const snippet = `<script src="https://cdn.makoya.example/loader.js" data-site="${siteId}" defer></script>`;
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-neutral-500">Install snippet</span>
        <button
          onClick={() => { navigator.clipboard.writeText(snippet); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
          className="text-xs font-medium text-neutral-700 hover:text-neutral-900"
        >{copied ? "Copied" : "Copy"}</button>
      </div>
      <pre className="mt-1 overflow-x-auto rounded-lg bg-neutral-50 p-3 text-xs text-neutral-800 ring-1 ring-neutral-200">{snippet}</pre>
    </div>
  );
}
```

- [ ] **Step 2: Add-site form (client component)**

`apps/web/components/AddSiteForm.tsx`:
```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function AddSiteForm() {
  const router = useRouter();
  const [domain, setDomain] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const res = await fetch("/api/sites", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ domain }),
    });
    setBusy(false);
    if (!res.ok) { setError((await res.json()).error ?? "Failed"); return; }
    setDomain("");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-center gap-2">
      <input
        value={domain} onChange={(e) => setDomain(e.target.value)} required
        placeholder="yourdomain.com"
        className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
      />
      <button disabled={busy} className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
        {busy ? "Adding…" : "Add site"}
      </button>
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
    </form>
  );
}
```

- [ ] **Step 3: Rebuild the dashboard page to list sites**

`apps/web/app/dashboard/page.tsx`:
```tsx
import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import { listSites } from "@/lib/sites";
import { isAdmin } from "@/lib/auth/roles";
import { env } from "@/lib/env";
import { AddSiteForm } from "@/components/AddSiteForm";
import { SnippetBox } from "@/components/SnippetBox";

export default async function DashboardPage() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  const sites = user ? await listSites(supabase, user.id) : [];
  const admin = isAdmin(user?.email, env.ADMIN_EMAILS);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Your sites</h1>
          <p className="mt-1 text-sm text-neutral-500">Add a site, customize its widget, and copy the install snippet.</p>
        </div>
        {admin && <Link href="/admin" className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white">Admin CRM →</Link>}
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-medium text-neutral-700">Add a new site</h2>
        <div className="mt-3"><AddSiteForm /></div>
      </div>

      {sites.length === 0 ? (
        <p className="text-sm text-neutral-500">No sites yet — add your first one above.</p>
      ) : (
        <ul className="space-y-4">
          {sites.map((s) => (
            <li key={s.id} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">{s.domain}</p>
                  <p className="text-xs text-neutral-500">Plan: {s.plan}</p>
                </div>
                <Link href={`/dashboard/sites/${s.id}`} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium hover:bg-neutral-50">Customize</Link>
              </div>
              <SnippetBox siteId={s.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Typecheck + build**

Run: `cd apps/web && npm run typecheck && npm run build`
Expected: compiles, `/dashboard` builds.

- [ ] **Step 5: Browser verification (qa)**

With the dev server on 3000 and a signed-in session (the controller provides a minted session cookie for `creativesgpt@wavesmvmnt.com`), POST a site via the form path and confirm: the site appears in the list with a Customize link and the snippet shows the new site id. Record the created site id. (If the controller runs this, it can `curl` `POST /api/sites` with the session cookie and then GET `/dashboard`.)

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/dashboard/page.tsx apps/web/components/AddSiteForm.tsx apps/web/components/SnippetBox.tsx
git commit -m "feat(web): dashboard overview — add/list sites + install snippet"
```

---

### Task 6: Customize Widget screen with live preview

**Files:**
- Create: `apps/web/app/dashboard/sites/[id]/page.tsx`, `apps/web/components/WidgetPreview.tsx`, `apps/web/components/ConfigEditor.tsx`

**Interfaces:**
- Consumes: `getServerSupabase`, `getSite`, `getConfig` (Task 3), `LAUNCHER_ICONS`/types (shared), `PATCH /api/sites/[id]/config` (Task 4).
- Produces: a two-column editor — controls on the left, a live `WidgetPreview` on the right that updates instantly as controls change; Save persists via PATCH. Branding toggle disabled for `free` plan.

**Design intent (apply frontend-design / ui-ux-pro-max principles):** the preview is a faux "browser" card (rounded-2xl, a faint top bar with three dots) containing a neutral page mock, with the launcher button pinned in the chosen corner using the actual `LAUNCHER_ICONS[icon]` and `primaryColor`. Controls are grouped (Appearance / Features / Branding) with clear labels, a native color input, a segmented position picker, and icon swatches. Save button shows a success tick.

- [ ] **Step 1: WidgetPreview (client component)**

`apps/web/components/WidgetPreview.tsx`:
```tsx
"use client";
import { LAUNCHER_ICONS, type LauncherIconKey, type WidgetPosition } from "@makoya/shared";

const CORNER: Record<WidgetPosition, string> = {
  "bottom-right": "bottom-3 right-3",
  "bottom-left": "bottom-3 left-3",
  "top-right": "top-3 right-3",
  "top-left": "top-3 left-3",
};

export function WidgetPreview({ color, position, icon }: { color: string; position: WidgetPosition; icon: LauncherIconKey }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 shadow-sm">
      <div className="flex items-center gap-1.5 border-b border-neutral-200 bg-neutral-50 px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-neutral-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-neutral-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-neutral-300" />
      </div>
      <div className="relative h-72 bg-white p-5">
        <div className="space-y-2">
          <div className="h-3 w-2/3 rounded bg-neutral-200" />
          <div className="h-3 w-1/2 rounded bg-neutral-100" />
          <div className="h-3 w-3/5 rounded bg-neutral-100" />
        </div>
        <button
          aria-hidden
          className={`absolute grid h-12 w-12 place-items-center rounded-full text-white shadow-lg ${CORNER[position]}`}
          style={{ background: color }}
          dangerouslySetInnerHTML={{ __html: scaleIcon(LAUNCHER_ICONS[icon]) }}
        />
      </div>
    </div>
  );
}

/** The shared SVG has no explicit size; constrain it for the preview button. */
function scaleIcon(svg: string): string {
  return svg.replace("<svg ", '<svg width="26" height="26" ');
}
```

- [ ] **Step 2: ConfigEditor (client component with live preview + save)**

`apps/web/components/ConfigEditor.tsx`:
```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  LAUNCHER_ICONS, type LauncherIconKey, type WidgetPosition, type FeatureKey,
} from "@makoya/shared";
import { WidgetPreview } from "./WidgetPreview";
import type { SiteConfig } from "@/lib/sites-mappers";

const POSITIONS: WidgetPosition[] = ["bottom-right", "bottom-left", "top-right", "top-left"];
const ICONS = Object.keys(LAUNCHER_ICONS) as LauncherIconKey[];
const ALL_FEATURES: { key: FeatureKey; label: string }[] = [
  { key: "textSize", label: "Text size" },
  { key: "lineSpacing", label: "Line spacing" },
  { key: "contrast", label: "Contrast" },
  { key: "stopMotion", label: "Stop motion" },
  { key: "readingRuler", label: "Reading ruler" },
  { key: "highlightLinks", label: "Highlight links" },
  { key: "bigCursor", label: "Big cursor" },
];

export function ConfigEditor({ siteId, plan, initial }: { siteId: string; plan: string; initial: SiteConfig }) {
  const router = useRouter();
  const [cfg, setCfg] = useState<SiteConfig>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const canHideBranding = plan !== "free";

  function set<K extends keyof SiteConfig>(k: K, v: SiteConfig[K]) {
    setCfg((c) => ({ ...c, [k]: v }));
    setSaved(false);
  }
  function toggleFeature(k: FeatureKey) {
    setCfg((c) => ({
      ...c,
      featuresEnabled: c.featuresEnabled.includes(k)
        ? c.featuresEnabled.filter((f) => f !== k)
        : [...c.featuresEnabled, k],
    }));
    setSaved(false);
  }
  async function save() {
    setSaving(true);
    const res = await fetch(`/api/sites/${siteId}/config`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(cfg),
    });
    setSaving(false);
    if (res.ok) { setSaved(true); router.refresh(); }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="space-y-6">
        <section>
          <h3 className="text-sm font-medium text-neutral-700">Appearance</h3>
          <div className="mt-3 space-y-4">
            <label className="flex items-center justify-between gap-4">
              <span className="text-sm">Primary color</span>
              <input type="color" value={cfg.primaryColor} onChange={(e) => set("primaryColor", e.target.value)} className="h-9 w-14 cursor-pointer rounded border border-neutral-300" />
            </label>
            <div>
              <span className="text-sm">Position</span>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {POSITIONS.map((p) => (
                  <button key={p} onClick={() => set("position", p)}
                    className={`rounded-lg border px-3 py-2 text-sm ${cfg.position === p ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300 hover:bg-neutral-50"}`}>
                    {p.replace("-", " ")}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="text-sm">Launcher icon</span>
              <div className="mt-2 flex gap-2">
                {ICONS.map((ic) => (
                  <button key={ic} onClick={() => set("launcherIcon", ic)} aria-label={ic}
                    className={`grid h-11 w-11 place-items-center rounded-lg border ${cfg.launcherIcon === ic ? "border-neutral-900 ring-2 ring-neutral-900" : "border-neutral-300 hover:bg-neutral-50"}`}
                    dangerouslySetInnerHTML={{ __html: LAUNCHER_ICONS[ic].replace("<svg ", '<svg width="22" height="22" ') }} />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-sm font-medium text-neutral-700">Features shown</h3>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {ALL_FEATURES.map((f) => {
              const on = cfg.featuresEnabled.includes(f.key);
              return (
                <button key={f.key} onClick={() => toggleFeature(f.key)} aria-pressed={on}
                  className={`rounded-lg border px-3 py-2 text-left text-sm ${on ? "border-neutral-900 bg-neutral-50" : "border-neutral-200 text-neutral-500"}`}>
                  {f.label}
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <h3 className="text-sm font-medium text-neutral-700">Branding</h3>
          <label className="mt-3 flex items-center gap-3">
            <input type="checkbox" checked={cfg.hideBranding} disabled={!canHideBranding}
              onChange={(e) => set("hideBranding", e.target.checked)} />
            <span className={`text-sm ${canHideBranding ? "" : "text-neutral-400"}`}>
              Hide “Powered by Makoya”{!canHideBranding && " (paid plans only)"}
            </span>
          </label>
        </section>

        <div className="flex items-center gap-3">
          <button onClick={save} disabled={saving} className="rounded-lg bg-neutral-900 px-5 py-2 text-sm font-medium text-white disabled:opacity-50">
            {saving ? "Saving…" : "Save changes"}
          </button>
          {saved && <span className="text-sm text-green-600">Saved ✓</span>}
        </div>
      </div>

      <div className="lg:sticky lg:top-6 lg:self-start">
        <WidgetPreview color={cfg.primaryColor} position={cfg.position} icon={cfg.launcherIcon} />
        <p className="mt-2 text-center text-xs text-neutral-400">Live preview</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: The site page (server component) loads config + renders the editor**

`apps/web/app/dashboard/sites/[id]/page.tsx`:
```tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import { getSite, getConfig } from "@/lib/sites";
import { ConfigEditor } from "@/components/ConfigEditor";

export default async function SitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  const site = user ? await getSite(supabase, id) : null;
  if (!site || site.ownerId !== user!.id) notFound();
  const config = await getConfig(supabase, id);
  if (!config) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard" className="text-sm text-neutral-500 hover:text-neutral-900">← Back to sites</Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Customize widget</h1>
        <p className="mt-1 text-sm text-neutral-500">{site.domain}</p>
      </div>
      <ConfigEditor siteId={site.id} plan={site.plan} initial={config} />
    </div>
  );
}
```

- [ ] **Step 4: Typecheck + build**

Run: `cd apps/web && npm run typecheck && npm run build`
Expected: compiles; route `/dashboard/sites/[id]` present.

- [ ] **Step 5: Browser verification (qa)**

With a signed-in session and a created site (from Task 5), the controller loads `/dashboard/sites/[id]`, changes color/position/icon/features, clicks Save, then GETs `/api/config/[siteId]` and confirms the JSON reflects the saved values (e.g. changed `primaryColor`, `launcherIcon`, `featuresEnabled`, and `hideBranding=false` while plan is free even if toggled). Record the before/after config JSON as evidence.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/dashboard/sites apps/web/components/WidgetPreview.tsx apps/web/components/ConfigEditor.tsx
git commit -m "feat(web): customize-widget screen with live preview + save"
```

---

## Self-Review

**Spec coverage (Phase 2 scope):** launcherIcon in shared ✔ (T1); widget honors it ✔ (T2); config write API + public JSON ✔ (T4); owner-scoped data layer + service-role public read ✔ (T3); client customize screen with live preview ✔ (T6); add/list sites + snippet ✔ (T5, the self-contained-site decision); plan-gated branding enforced server-side ✔ (T4 PATCH). Compliance copy avoided; widget backward-compatible (default icon) ✔.

**Placeholder scan:** Every code step contains real code. Browser-verification steps (T5/T6 step 5) are controller-run integration checks with concrete recorded evidence, not vague "test it" steps.

**Type consistency:** `SiteConfig` is defined once in `sites-mappers.ts` and re-exported via `sites.ts`; `rowToConfig`/`configToRow`, `createSite`/`listSites`/`getSite`/`getConfig`/`updateConfig`, `getServerSupabase`/`getAdminSupabase`, and `LAUNCHER_ICONS`/`LauncherIconKey` names are used identically across T3–T6. Snake_case columns (`launcher_icon`, `features_enabled`, `hide_branding`, `primary_color`) match the Phase 1 schema.
