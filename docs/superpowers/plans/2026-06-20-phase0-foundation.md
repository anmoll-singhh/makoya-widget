# Phase 0 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the shared widget config, add operator-led customer onboarding (service-role auth user + site), and surface per-site accessibility issue counts to the admin layer — the shared foundation for WS1/WS2/WS3.

**Architecture:** Edit the two `@makoya/shared` mirrors in lockstep (canonical `packages/shared/src/index.ts` + vendored `apps/web/lib/shared/index.ts`). Add new dedicated columns to `site_config` via a Supabase migration, thread them through `rowToConfig`/`configToRow`, the public config API allowlist, and the owner PATCH route. Add `createCustomer` to `lib/admin.ts` (service role) + an admin-gated POST route. Extend `listAdminSites()` with latest-scan issue totals.

**Tech Stack:** TypeScript, Next.js 15 (App Router, route handlers), Supabase (`@supabase/supabase-js` service-role + `@supabase/ssr` server), Vitest, Supabase CLI migrations.

## Global Constraints

- Edit BOTH shared mirrors identically: `packages/shared/src/index.ts` AND `apps/web/lib/shared/index.ts`.
- No "WCAG/ADA/Section-508 compliant" / "guaranteed accessible" copy anywhere user-facing.
- Public config endpoint MUST never 500 and MUST use an explicit field allowlist (no spread of DEFAULT_CONFIG).
- Service-role client (`getAdminSupabase`) is server-only; never import into a client component.
- `featuresEnabled` is visibility-only; pref values live in the widget, not config.
- Plan values: `free | pro | managed`. Branding fields (`hideBranding`, `panelTitle`, `accessibilityStatementUrl`) are paid-gated server-side (free plan forced off/empty).
- Run from `apps/web`: `npm run typecheck` and `npx vitest run` must pass before each commit that touches it.

---

### Task 1: Expand shared widget config (both mirrors)

**Files:**
- Modify: `packages/shared/src/index.ts`
- Modify: `apps/web/lib/shared/index.ts` (must stay byte-identical to canonical except the leading mirror doc-comment)
- Test: `apps/web/lib/shared-config.test.ts`

**Interfaces:**
- Produces: extended `FeatureKey` union (adds `saturation | readingMask | highlightTitles | textAlign | muteSounds | readAloud`); `WidgetLauncherSize = "sm" | "md" | "lg"`; `WidgetLanguage = "en" | "es" | "fr" | "de"`; `WidgetProfileKey = "none" | "vision" | "low-vision" | "dyslexia" | "adhd" | "seizure" | "senior" | "cognitive"`; `WidgetConfig` gains `launcherSize: WidgetLauncherSize; defaultProfile: WidgetProfileKey; accessibilityStatementUrl: string; defaultLanguage: WidgetLanguage; panelTitle: string`; `DEFAULT_CONFIG` updated; `resolveConfig` unchanged.

- [ ] **Step 1: Write failing tests** in `apps/web/lib/shared-config.test.ts` (append a new `describe`):

```ts
describe("expanded widget config", () => {
  it("DEFAULT_CONFIG exposes all 15 feature keys", () => {
    expect(DEFAULT_CONFIG.featuresEnabled).toEqual([
      "textSize","lineSpacing","contrast","stopMotion","readingRuler",
      "highlightLinks","bigCursor","readableFont","hideImages",
      "saturation","readingMask","highlightTitles","textAlign","muteSounds","readAloud",
    ]);
  });
  it("DEFAULT_CONFIG has the new scalar fields with safe defaults", () => {
    expect(DEFAULT_CONFIG.launcherSize).toBe("md");
    expect(DEFAULT_CONFIG.defaultProfile).toBe("none");
    expect(DEFAULT_CONFIG.accessibilityStatementUrl).toBe("");
    expect(DEFAULT_CONFIG.defaultLanguage).toBe("en");
    expect(DEFAULT_CONFIG.panelTitle).toBe("");
  });
  it("resolveConfig fills new fields from defaults and keeps provided values", () => {
    expect(resolveConfig("s1", {}).launcherSize).toBe("md");
    expect(resolveConfig("s1", { launcherSize: "lg", defaultLanguage: "es" }).launcherSize).toBe("lg");
    expect(resolveConfig("s1", { defaultLanguage: "es" }).defaultLanguage).toBe("es");
  });
});
```

- [ ] **Step 2: Run tests, verify they FAIL**

Run: `cd apps/web && npx vitest run lib/shared-config.test.ts`
Expected: FAIL (`launcherSize` undefined / featuresEnabled length mismatch).

- [ ] **Step 3: Edit `packages/shared/src/index.ts`** — extend the union and config. Replace the `FeatureKey` block:

```ts
export type FeatureKey =
  | "textSize"
  | "lineSpacing"
  | "contrast"
  | "stopMotion"
  | "readingRuler"
  | "highlightLinks"
  | "bigCursor"
  | "readableFont"
  | "hideImages"
  | "saturation"
  | "readingMask"
  | "highlightTitles"
  | "textAlign"
  | "muteSounds"
  | "readAloud";

export type WidgetLauncherSize = "sm" | "md" | "lg";
export type WidgetLanguage = "en" | "es" | "fr" | "de";
export type WidgetProfileKey =
  | "none" | "vision" | "low-vision" | "dyslexia"
  | "adhd" | "seizure" | "senior" | "cognitive";
```

Then add the new fields to the `WidgetConfig` interface (after `position`/before `featuresEnabled` is fine; keep doc comments):

```ts
  /** Launcher button size. */
  launcherSize: WidgetLauncherSize;
  /** Profile auto-applied on a visitor's first open ("none" = no auto-apply). */
  defaultProfile: WidgetProfileKey;
  /** URL for the "Accessibility statement" link (empty = link hidden). */
  accessibilityStatementUrl: string;
  /** Default language for the widget's OWN labels. */
  defaultLanguage: WidgetLanguage;
  /** Optional custom panel title (paid). Empty = built-in localized title. */
  panelTitle: string;
```

And update `DEFAULT_CONFIG` — append the 6 new keys to `featuresEnabled` and add the 5 scalar fields:

```ts
  featuresEnabled: [
    "textSize","lineSpacing","contrast","stopMotion","readingRuler",
    "highlightLinks","bigCursor","readableFont","hideImages",
    "saturation","readingMask","highlightTitles","textAlign","muteSounds","readAloud",
  ],
  launcherSize: "md",
  defaultProfile: "none",
  accessibilityStatementUrl: "",
  defaultLanguage: "en",
  panelTitle: "",
```

- [ ] **Step 4: Mirror the exact same changes** into `apps/web/lib/shared/index.ts` (keep its top mirror doc-comment; everything below must match canonical).

- [ ] **Step 5: Run tests + typecheck, verify PASS**

Run: `cd apps/web && npx vitest run lib/shared-config.test.ts && npm run typecheck`
Expected: PASS (typecheck may surface `SiteConfig`/route gaps — those are Task 2; if so, note and proceed to Task 2 before committing).

- [ ] **Step 6: Verify the two mirrors agree** (below the header):

Run: `diff <(tail -n +11 packages/shared/src/index.ts) <(tail -n +11 apps/web/lib/shared/index.ts)`
Expected: empty diff (no output).

- [ ] **Step 7: Commit**

```bash
git add packages/shared/src/index.ts apps/web/lib/shared/index.ts apps/web/lib/shared-config.test.ts
git commit -m "feat(shared): expand widget config — 6 new features + launcher size/profile/lang/statement/title"
```

---

### Task 2: Persist new config fields (migration + mappers + API)

**Files:**
- Create: `supabase/migrations/20260620010000_widget_config_v3.sql`
- Modify: `apps/web/lib/sites-mappers.ts`
- Modify: `apps/web/app/api/config/[siteId]/route.ts`
- Modify: `apps/web/app/api/sites/[id]/config/route.ts`
- Test: `apps/web/lib/sites-mappers.test.ts`

**Interfaces:**
- Consumes: `SiteConfig` (extended here), shared `DEFAULT_CONFIG`.
- Produces: `SiteConfig` gains `launcherSize: WidgetLauncherSize; defaultProfile: WidgetProfileKey; accessibilityStatementUrl: string; defaultLanguage: WidgetLanguage; panelTitle: string`; `rowToConfig`/`configToRow` handle the snake_case columns; public config API returns the new fields; PATCH route gates `panelTitle`/`accessibilityStatementUrl` on free plan.

- [ ] **Step 1: Write the migration** `supabase/migrations/20260620010000_widget_config_v3.sql`:

```sql
-- Widget config v3: new per-site scalar options + 6 new default features.
alter table site_config
  add column if not exists launcher_size              text not null default 'md',
  add column if not exists default_profile            text not null default 'none',
  add column if not exists accessibility_statement_url text not null default '',
  add column if not exists default_language           text not null default 'en',
  add column if not exists panel_title                text not null default '';

-- New sites get all 15 features in the customizer by default.
alter table site_config
  alter column features_enabled set default array[
    'textSize','lineSpacing','contrast','stopMotion','readingRuler',
    'highlightLinks','bigCursor','readableFont','hideImages',
    'saturation','readingMask','highlightTitles','textAlign','muteSounds','readAloud'
  ];

-- Backfill existing rows so current sites also expose the new toggles.
update site_config
  set features_enabled = array[
    'textSize','lineSpacing','contrast','stopMotion','readingRuler',
    'highlightLinks','bigCursor','readableFont','hideImages',
    'saturation','readingMask','highlightTitles','textAlign','muteSounds','readAloud'
  ]
  where not ('saturation' = any(features_enabled));
```

- [ ] **Step 2: Write failing tests** in `apps/web/lib/sites-mappers.test.ts` (append):

```ts
describe("widget config v3 mapping", () => {
  it("rowToConfig maps the new columns", () => {
    const cfg = rowToConfig({
      site_id: "s1", primary_color: "#000", position: "bottom-right",
      launcher_icon: "eye", features_enabled: ["textSize"], hide_branding: true,
      launcher_size: "lg", default_profile: "dyslexia",
      accessibility_statement_url: "https://x/a11y", default_language: "fr", panel_title: "Help",
    });
    expect(cfg.launcherSize).toBe("lg");
    expect(cfg.defaultProfile).toBe("dyslexia");
    expect(cfg.accessibilityStatementUrl).toBe("https://x/a11y");
    expect(cfg.defaultLanguage).toBe("fr");
    expect(cfg.panelTitle).toBe("Help");
  });
  it("configToRow writes only provided new fields in snake_case", () => {
    const row = configToRow({ launcherSize: "sm", panelTitle: "Hi" });
    expect(row.launcher_size).toBe("sm");
    expect(row.panel_title).toBe("Hi");
    expect(row.default_language).toBeUndefined();
  });
});
```

- [ ] **Step 3: Run tests, verify FAIL**

Run: `cd apps/web && npx vitest run lib/sites-mappers.test.ts`
Expected: FAIL (`launcherSize` undefined).

- [ ] **Step 4: Extend `SiteConfig` + mappers** in `apps/web/lib/sites-mappers.ts`. Update the import and interface:

```ts
import type { WidgetPosition, FeatureKey, LauncherIconKey, WidgetLauncherSize, WidgetLanguage, WidgetProfileKey } from "@makoya/shared";

export interface SiteConfig {
  siteId: string;
  primaryColor: string;
  position: WidgetPosition;
  launcherIcon: LauncherIconKey;
  featuresEnabled: FeatureKey[];
  hideBranding: boolean;
  launcherSize: WidgetLauncherSize;
  defaultProfile: WidgetProfileKey;
  accessibilityStatementUrl: string;
  defaultLanguage: WidgetLanguage;
  panelTitle: string;
}
```

Add to `rowToConfig` (with safe fallbacks so rows read before the migration don't crash):

```ts
    launcherSize: row.launcher_size ?? "md",
    defaultProfile: row.default_profile ?? "none",
    accessibilityStatementUrl: row.accessibility_statement_url ?? "",
    defaultLanguage: row.default_language ?? "en",
    panelTitle: row.panel_title ?? "",
```

Add to `configToRow`:

```ts
  if (patch.launcherSize !== undefined) out.launcher_size = patch.launcherSize;
  if (patch.defaultProfile !== undefined) out.default_profile = patch.defaultProfile;
  if (patch.accessibilityStatementUrl !== undefined) out.accessibility_statement_url = patch.accessibilityStatementUrl;
  if (patch.defaultLanguage !== undefined) out.default_language = patch.defaultLanguage;
  if (patch.panelTitle !== undefined) out.panel_title = patch.panelTitle;
```

- [ ] **Step 5: Run tests, verify PASS**

Run: `cd apps/web && npx vitest run lib/sites-mappers.test.ts`
Expected: PASS.

- [ ] **Step 6: Extend the public config API allowlist** in `apps/web/app/api/config/[siteId]/route.ts`. In BOTH the fallback object and the happy-path object add (fallback uses `DEFAULT_CONFIG.*`, happy path uses `cfg.*`):

Fallback block adds:
```ts
      launcherSize: DEFAULT_CONFIG.launcherSize,
      defaultProfile: DEFAULT_CONFIG.defaultProfile,
      accessibilityStatementUrl: DEFAULT_CONFIG.accessibilityStatementUrl,
      defaultLanguage: DEFAULT_CONFIG.defaultLanguage,
      panelTitle: DEFAULT_CONFIG.panelTitle,
```
Happy-path block adds:
```ts
    launcherSize: cfg.launcherSize,
    defaultProfile: cfg.defaultProfile,
    accessibilityStatementUrl: cfg.accessibilityStatementUrl,
    defaultLanguage: cfg.defaultLanguage,
    panelTitle: cfg.panelTitle,
```

- [ ] **Step 7: Gate branding fields on free plan** in `apps/web/app/api/sites/[id]/config/route.ts`. Replace the single free-plan line with:

```ts
  // Server-side plan gating: free plan cannot use branding controls.
  if (site.plan === "free") {
    patch.hideBranding = false;
    delete patch.panelTitle;
    delete patch.accessibilityStatementUrl;
  }
```

- [ ] **Step 8: Apply the migration to Supabase.**

Run: `cd /c/Users/ANMOL/Desktop/makoya && supabase db push`
Expected: applies `20260620010000_widget_config_v3.sql`. If it prompts for the DB password non-interactively (this tool can't answer prompts), STOP and ask the user to run `! supabase db push` in their session, then continue.

- [ ] **Step 9: Typecheck + full unit run**

Run: `cd apps/web && npm run typecheck && npx vitest run`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add supabase/migrations/20260620010000_widget_config_v3.sql apps/web/lib/sites-mappers.ts apps/web/lib/sites-mappers.test.ts "apps/web/app/api/config/[siteId]/route.ts" "apps/web/app/api/sites/[id]/config/route.ts"
git commit -m "feat(config): persist v3 widget options (migration + mappers + public API + plan-gated PATCH)"
```

---

### Task 3: Operator-led customer onboarding (service role)

**Files:**
- Modify: `apps/web/lib/admin.ts`
- Create: `apps/web/app/api/admin/customers/route.ts`

**Interfaces:**
- Consumes: `getAdminSupabase()`, `createSite(client, ownerId, domain)`, `getAdminUser()`, `isValidPlan`, `updateSitePlan`.
- Produces: `createCustomer(args: { email: string; domain: string; plan?: Plan }): Promise<{ email: string; tempPassword: string; siteId: string; created: boolean }>`; route `POST /api/admin/customers` returning that payload (201) or `{ error }`.

- [ ] **Step 1: Add `createCustomer` to `apps/web/lib/admin.ts`** (after the imports add a small password generator, then the function). Add `import { createSite } from "@/lib/sites";` and `import type { Plan } from "@/lib/admin-constants";` is already partially there (extend the existing import to include `Plan`):

```ts
function generateTempPassword(): string {
  // 16 url-safe chars; not security-critical (operator hands it over, user can reset).
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return "Mk-" + Buffer.from(bytes).toString("base64url");
}

/**
 * Operator-led onboarding: ensure a Supabase auth user exists for `email`
 * (idempotent), then create a site owned by them. Returns a handover payload
 * the operator can give the client. No email vendor required.
 */
export async function createCustomer(args: { email: string; domain: string; plan?: Plan }): Promise<{
  email: string; tempPassword: string; siteId: string; created: boolean;
}> {
  const admin = getAdminSupabase();
  const email = args.email.trim().toLowerCase();
  const tempPassword = generateTempPassword();

  // Try to create; if the user already exists, find their id instead.
  let userId: string | null = null;
  let created = false;
  const { data: createdData, error: createErr } = await admin.auth.admin.createUser({
    email, password: tempPassword, email_confirm: true,
  });
  if (createdData?.user) { userId = createdData.user.id; created = true; }
  else if (createErr) {
    // Already registered → look the user up by paging the user list.
    for (let page = 1; !userId; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error || !data?.users?.length) break;
      const hit = data.users.find((u) => u.email?.toLowerCase() === email);
      if (hit) userId = hit.id;
      if (data.users.length < 1000) break;
    }
    if (!userId) throw createErr;
  }
  if (!userId) throw new Error("could not resolve user id for customer");

  const site = await createSite(admin, userId, args.domain.trim());
  if (args.plan && args.plan !== "free") await updateSitePlan(site.id, args.plan);
  return { email, tempPassword: created ? tempPassword : "(existing user — unchanged)", siteId: site.id, created };
}
```

- [ ] **Step 2: Create the route** `apps/web/app/api/admin/customers/route.ts`:

```ts
import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/require-admin";
import { isValidPlan } from "@/lib/admin-constants";
import { createCustomer } from "@/lib/admin";

export async function POST(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: { email?: unknown; domain?: unknown; plan?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const domain = typeof body.domain === "string" ? body.domain.trim() : "";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: "invalid email" }, { status: 400 });
  if (!domain) return NextResponse.json({ error: "domain required" }, { status: 400 });
  const plan = isValidPlan(body.plan) ? body.plan : undefined;

  try {
    const result = await createCustomer({ email, domain, plan });
    return NextResponse.json(result, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "create failed" }, { status: 500 });
  }
}
```

- [ ] **Step 3: Typecheck**

Run: `cd apps/web && npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Verify against LIVE with a scratch script** `apps/web/_verify-onboarding.mjs` (gitignored pattern). It signs in as admin via GoTrue password, mints the `@supabase/ssr` cookie, POSTs to the live `/api/admin/customers` with a throwaway email, asserts 201 + payload shape, then cleans up the created auth user + site via the service role. (Stub `globalThis.WebSocket` first per the SESSION QA pattern.) Run it, confirm PASS, then delete it.

Run: `cd apps/web && node _verify-onboarding.mjs`
Expected: prints `ONBOARDING OK { created: true, siteId: ... }` then `CLEANED UP`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/admin.ts "apps/web/app/api/admin/customers/route.ts"
git commit -m "feat(admin): operator-led customer onboarding — createCustomer + POST /api/admin/customers (service role)"
```

---

### Task 4: Admin issue counts for worst-first sort

**Files:**
- Modify: `apps/web/lib/admin.ts`
- Test: `apps/web/lib/admin-issues.test.ts` (new)

**Interfaces:**
- Consumes: `getAdminSupabase`, scans `totals` jsonb (`{ critical, serious, moderate, minor, total }`).
- Produces: `AdminSiteRow` gains `latestScore: number | null` and `issueCount: number | null`; helper `issueCountFromTotals(totals: unknown): number | null` exported for testing.

- [ ] **Step 1: Write failing test** `apps/web/lib/admin-issues.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { issueCountFromTotals } from "./admin";

describe("issueCountFromTotals", () => {
  it("returns the total field when present", () => {
    expect(issueCountFromTotals({ critical: 2, serious: 3, moderate: 1, minor: 4, total: 10 })).toBe(10);
  });
  it("sums severities when total is absent", () => {
    expect(issueCountFromTotals({ critical: 2, serious: 3, moderate: 1, minor: 4 })).toBe(10);
  });
  it("returns null for missing/garbage totals", () => {
    expect(issueCountFromTotals(null)).toBeNull();
    expect(issueCountFromTotals("nope")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test, verify FAIL**

Run: `cd apps/web && npx vitest run lib/admin-issues.test.ts`
Expected: FAIL (`issueCountFromTotals` is not exported).

- [ ] **Step 3: Add helper + extend `AdminSiteRow`/`listAdminSites`** in `apps/web/lib/admin.ts`. Add the exported helper near the top (after `emailMap`):

```ts
/** Total accessibility issues from a scan's `totals` jsonb. Null if unusable. */
export function issueCountFromTotals(totals: unknown): number | null {
  if (!totals || typeof totals !== "object") return null;
  const t = totals as Record<string, unknown>;
  if (typeof t.total === "number") return t.total;
  const parts = ["critical", "serious", "moderate", "minor"].map((k) => (typeof t[k] === "number" ? (t[k] as number) : 0));
  const sum = parts.reduce((a, b) => a + b, 0);
  return sum > 0 ? sum : (Object.keys(t).length ? 0 : null);
}
```

Extend the interface:

```ts
export interface AdminSiteRow {
  id: string; domain: string; plan: string; createdAt: string;
  ownerEmail: string; lastScanScore: number | null; openRequests: number;
  latestScore: number | null; issueCount: number | null;
}
```

In `listAdminSites`, change the per-site scan select to also pull `totals`, and populate the new fields. Replace the scan query + return object:

```ts
    const [{ data: latest }, { count }] = await Promise.all([
      admin.from("scans").select("score, totals").eq("site_id", s.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      admin.from("consultation_requests").select("id", { count: "exact", head: true }).eq("site_id", s.id).eq("status", "new"),
    ]);
    return {
      id: s.id, domain: s.domain, plan: s.plan, createdAt: s.created_at,
      ownerEmail: emails.get(s.owner_id) ?? "(unknown)",
      lastScanScore: latest?.score ?? null,
      latestScore: latest?.score ?? null,
      issueCount: issueCountFromTotals(latest?.totals ?? null),
      openRequests: count ?? 0,
    };
```

(`lastScanScore` is kept for any existing consumer; `latestScore` is its semantic alias used by WS3.)

- [ ] **Step 4: Run test + typecheck, verify PASS**

Run: `cd apps/web && npx vitest run lib/admin-issues.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/admin.ts apps/web/lib/admin-issues.test.ts
git commit -m "feat(admin): per-site issue counts from latest scan totals for worst-first sort"
```

---

## Phase 0 exit criteria (verify before checking in)

- [ ] `cd apps/web && npm run typecheck` passes.
- [ ] `cd apps/web && npx vitest run` passes (all suites).
- [ ] Both shared mirrors agree (`diff` empty below the header).
- [ ] Migration applied; the live config API (`/api/config/<siteId>`) returns the 5 new fields with safe defaults for the existing demo site.
- [ ] `POST /api/admin/customers` creates a working auth user + site (verified live, then cleaned up).
- [ ] Deploy: `cd apps/web && vercel --prod --yes --scope anmolsinghh17-9375s-projects`; smoke-check the live config API.
- [ ] Update `docs/superpowers/SESSION.md` (new config fields, onboarding route, issue counts) and commit.

## Spec coverage self-check
- Spec §0.1 (shared config) → Task 1 + Task 2. ✓
- Spec §0.2 (onboarding) → Task 3. ✓
- Spec §0.3 (admin issue counts) → Task 4. ✓
- Migration correction (dedicated columns) → Task 2. ✓
