# Makoya Phase 1: Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the unified Next.js app (`apps/web`) with Supabase auth (magic-link), role-based gating (client vs admin), the database schema, and protected placeholder dashboard/admin shells — the foundation every later phase builds on.

**Architecture:** A new `apps/web` Next.js 15 App Router project joins the existing npm workspace alongside the untouched `packages/widget` and `packages/shared`. Supabase provides Auth + Postgres; the app uses `@supabase/ssr` for cookie-based sessions in Server Components, Route Handlers, and middleware. A small pure `isAdmin()` utility plus middleware enforce the two roles. The existing `apps/dashboard` is left in place but unused (removed in the final polish phase).

**Tech Stack:** Next.js 15 (App Router, RSC), React 19, TypeScript, Tailwind CSS v4, `@supabase/supabase-js`, `@supabase/ssr`, Vitest (unit tests).

## Global Constraints

- Node 20+, Next.js 15.x, React 19.x, Tailwind CSS v4 (align with the scanner's existing setup).
- `apps/web` runs on port **3001** (`next dev -p 3001`).
- Service role key is server-only — never imported into a client component, never committed. Lives in `.env.local` (gitignored).
- Role gating: a user is a **client** by default; **admin** only if their email is in `ADMIN_EMAILS` (comma-separated env var).
- RLS enabled on every table; `consultation_requests` has RLS on with **no client policy** (service-role only).
- No "WCAG compliant" / "ADA compliant" / "lawsuit-proof" copy anywhere.
- Keep `packages/widget` and `packages/shared` source untouched in this phase.
- Commit after each task (frequent commits). Conventional-commit messages.

---

### Task 1: Initialize git + scaffold `apps/web`

**Files:**
- Create: `apps/web/package.json`, `apps/web/next.config.mjs`, `apps/web/tsconfig.json`, `apps/web/postcss.config.mjs`, `apps/web/app/globals.css`, `apps/web/app/layout.tsx`, `apps/web/app/page.tsx`
- Modify: `package.json` (root — add `apps/web` to workspaces; it already globs `apps/dashboard` explicitly)
- Create: `.gitignore` additions for `.env.local`

**Interfaces:**
- Produces: a running Next.js app at `http://localhost:3001` with Tailwind v4 working.

- [ ] **Step 1: Initialize git (repo does not exist yet)**

```bash
cd "C:/Users/ANMOL/Desktop/makoya"
git init
git add -A
git commit -m "chore: snapshot existing makoya state before phase 1"
```

- [ ] **Step 2: Add `apps/web` to the root workspaces**

Edit root `package.json` `workspaces` array to: `["packages/*", "apps/dashboard", "apps/web"]`

- [ ] **Step 3: Create `apps/web/package.json`**

```json
{
  "name": "@makoya/web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3001",
    "build": "next build",
    "start": "next start -p 3001",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "next": "15.5.19",
    "react": "19.0.0",
    "react-dom": "19.0.0",
    "@supabase/supabase-js": "^2.45.0",
    "@supabase/ssr": "^0.5.2"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "typescript": "^5.4.0",
    "tailwindcss": "^4",
    "@tailwindcss/postcss": "^4",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 4: Create config files**

`apps/web/next.config.mjs`:
```js
/** @type {import('next').NextConfig} */
const nextConfig = { reactStrictMode: true };
export default nextConfig;
```

`apps/web/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"],
      "@makoya/shared": ["../../packages/shared/src/index.ts"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

`apps/web/postcss.config.mjs`:
```js
export default { plugins: { "@tailwindcss/postcss": {} } };
```

- [ ] **Step 5: Create Tailwind v4 globals + root layout + temp home**

`apps/web/app/globals.css`:
```css
@import "tailwindcss";
```

`apps/web/app/layout.tsx`:
```tsx
import "./globals.css";
import type { ReactNode } from "react";

export const metadata = { title: "Makoya", description: "Accessibility widget platform" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

`apps/web/app/page.tsx`:
```tsx
export default function Home() {
  return <main className="p-8 text-2xl font-semibold">Makoya web — foundation OK</main>;
}
```

- [ ] **Step 6: Install and run**

```bash
cd "C:/Users/ANMOL/Desktop/makoya" && npm install
cd "C:/Users/ANMOL/Desktop/makoya/apps/web" && npm run build
```
Expected: `npm install` succeeds at root; `next build` completes with the `/` route compiled, no errors.

- [ ] **Step 7: Verify dev server serves the page**

Run `npm run dev` in `apps/web`, then in another shell:
```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001/
```
Expected: `200`. Stop the dev server after.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(web): scaffold apps/web Next.js 15 + Tailwind v4"
```

---

### Task 2: Environment config + Supabase clients

**Files:**
- Create: `apps/web/.env.example`, `apps/web/lib/env.ts`, `apps/web/lib/supabase/client.ts`, `apps/web/lib/supabase/server.ts`
- Create: `SETUP.md` (root)

**Interfaces:**
- Produces:
  - `getBrowserSupabase(): SupabaseClient` from `lib/supabase/client.ts` (client components).
  - `getServerSupabase(): Promise<SupabaseClient>` from `lib/supabase/server.ts` (Server Components / Route Handlers; cookie-bound).
  - `env` object from `lib/env.ts` exposing `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_EMAILS`, `APP_URL`.

- [ ] **Step 1: Create `apps/web/.env.example`**

```bash
# Supabase — Project → Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
# server-only, never commit the real value
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
# comma-separated operator emails that may access /admin
ADMIN_EMAILS=you@example.com
# this app's public URL
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

- [ ] **Step 2: Create `apps/web/lib/env.ts`**

```ts
/** Centralised env access. Throws early in server contexts if required vars are missing. */
function required(name: string, value: string | undefined): string {
  if (!value || value.startsWith("YOUR_") || value.includes("YOUR-PROJECT")) {
    // Allow placeholder during local scaffold; warn instead of crashing the whole app.
    if (typeof window === "undefined") console.warn(`[env] ${name} is not set (placeholder).`);
    return value ?? "";
  }
  return value;
}

export const env = {
  SUPABASE_URL: required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
  SUPABASE_ANON_KEY: required("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  ADMIN_EMAILS: process.env.ADMIN_EMAILS ?? "",
  APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001",
};
```

- [ ] **Step 3: Create `apps/web/lib/supabase/client.ts`**

```ts
"use client";
import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";

export function getBrowserSupabase() {
  return createBrowserClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
}
```

- [ ] **Step 4: Create `apps/web/lib/supabase/server.ts`**

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

/** Cookie-bound Supabase client for Server Components and Route Handlers. */
export async function getServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          /* called from a Server Component render — safe to ignore; middleware refreshes. */
        }
      },
    },
  });
}
```

- [ ] **Step 5: Create root `SETUP.md`**

Document: how to copy `.env.example` → `.env.local`, where each Supabase value is (Project → Settings → API), what `ADMIN_EMAILS` does, and that `.env.local` is gitignored. (Full prose — list each variable from `.env.example` with its source.)

- [ ] **Step 6: Verify typecheck passes**

```bash
cd "C:/Users/ANMOL/Desktop/makoya/apps/web" && npm run typecheck
```
Expected: no type errors.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(web): env config + supabase browser/server clients"
```

---

### Task 3: Database schema + RLS

**Files:**
- Create: `infra/schema.sql` (overwrite the old one with the fresh 4-table model)

**Interfaces:**
- Produces: tables `sites`, `site_config`, `scans`, `consultation_requests` with RLS, applied to Supabase via the SQL editor.

- [ ] **Step 1: Write `infra/schema.sql`**

```sql
-- Makoya schema (Supabase / Postgres). Multi-tenant via RLS.
-- Apply in Supabase → SQL Editor.

create table if not exists sites (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  domain      text not null,
  plan        text not null default 'free',          -- free | pro | managed
  created_at  timestamptz not null default now()
);

create table if not exists site_config (
  site_id          uuid primary key references sites(id) on delete cascade,
  primary_color    text   not null default '#2563eb',
  position         text   not null default 'bottom-right',
  launcher_icon    text   not null default 'accessibility',
  features_enabled text[] not null default array[
    'textSize','lineSpacing','contrast','stopMotion',
    'readingRuler','highlightLinks','bigCursor'
  ],
  hide_branding    boolean not null default false,
  updated_at       timestamptz not null default now()
);

create table if not exists scans (
  id          uuid primary key default gen_random_uuid(),
  site_id     uuid references sites(id) on delete cascade,
  url         text not null,
  score       int  not null,
  totals      jsonb not null,        -- {critical, serious, moderate, minor, total}
  issues      jsonb not null,        -- grouped AccessibilityReport.issues
  created_at  timestamptz not null default now()
);

create table if not exists consultation_requests (
  id          uuid primary key default gen_random_uuid(),
  site_id     uuid references sites(id) on delete cascade,
  scan_id     uuid references scans(id) on delete set null,
  type        text not null default 'full_report',   -- full_report | book_call
  note        text,
  status      text not null default 'new',           -- new | contacted | won | lost
  created_at  timestamptz not null default now()
);

alter table sites                 enable row level security;
alter table site_config           enable row level security;
alter table scans                 enable row level security;
alter table consultation_requests enable row level security;

create policy "owner reads own sites" on sites
  for select using (owner_id = auth.uid());
create policy "owner writes own sites" on sites
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "owner manages own config" on site_config
  for all using (exists (select 1 from sites s where s.id = site_config.site_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from sites s where s.id = site_config.site_id and s.owner_id = auth.uid()));

create policy "owner reads own scans" on scans
  for select using (exists (select 1 from sites s where s.id = scans.site_id and s.owner_id = auth.uid()));

-- consultation_requests: RLS on, NO client policy → service role only.
```

- [ ] **Step 2: Apply the schema**

If Supabase keys are available: hand the file to the operator to paste into Supabase → SQL Editor → Run. Confirm 4 tables exist under Table Editor. (If keys not yet provided, mark this step pending and continue; auth flow in later tasks degrades gracefully with placeholder env.)

- [ ] **Step 3: Commit**

```bash
git add infra/schema.sql
git commit -m "feat(db): fresh 4-table schema with RLS"
```

---

### Task 4: `isAdmin` role utility (TDD)

**Files:**
- Create: `apps/web/lib/auth/roles.ts`, `apps/web/lib/auth/roles.test.ts`
- Create: `apps/web/vitest.config.ts`

**Interfaces:**
- Produces: `isAdmin(email: string | null | undefined, adminEmails: string): boolean` from `lib/auth/roles.ts`.

- [ ] **Step 1: Create `apps/web/vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
export default defineConfig({ test: { environment: "node", include: ["**/*.test.ts"] } });
```

- [ ] **Step 2: Write the failing test**

`apps/web/lib/auth/roles.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { isAdmin } from "./roles";

describe("isAdmin", () => {
  it("returns true for an email in the allowlist (case-insensitive, trimmed)", () => {
    expect(isAdmin("Me@Example.com", "me@example.com, other@x.com")).toBe(true);
  });
  it("returns false for an email not in the allowlist", () => {
    expect(isAdmin("client@site.com", "me@example.com")).toBe(false);
  });
  it("returns false for null/empty email or empty allowlist", () => {
    expect(isAdmin(null, "me@example.com")).toBe(false);
    expect(isAdmin("me@example.com", "")).toBe(false);
  });
});
```

- [ ] **Step 3: Run test, verify it fails**

```bash
cd "C:/Users/ANMOL/Desktop/makoya/apps/web" && npx vitest run lib/auth/roles.test.ts
```
Expected: FAIL — cannot find module `./roles`.

- [ ] **Step 4: Implement `apps/web/lib/auth/roles.ts`**

```ts
/** True if `email` is in the comma-separated `adminEmails` allowlist. Case-insensitive, trimmed. */
export function isAdmin(email: string | null | undefined, adminEmails: string): boolean {
  if (!email || !adminEmails) return false;
  const set = adminEmails
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return set.includes(email.trim().toLowerCase());
}
```

- [ ] **Step 5: Run test, verify it passes**

```bash
cd "C:/Users/ANMOL/Desktop/makoya/apps/web" && npx vitest run lib/auth/roles.test.ts
```
Expected: 3 passing.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(auth): isAdmin role utility with tests"
```

---

### Task 5: Magic-link login + auth callback

**Files:**
- Create: `apps/web/app/login/page.tsx`, `apps/web/app/login/LoginForm.tsx`, `apps/web/app/auth/callback/route.ts`, `apps/web/app/auth/signout/route.ts`

**Interfaces:**
- Consumes: `getBrowserSupabase` (Task 2), `getServerSupabase` (Task 2).
- Produces: a working email magic-link sign-in that redirects to `/dashboard`; a signout route.

- [ ] **Step 1: Create the login page (server) + form (client)**

`apps/web/app/login/page.tsx`:
```tsx
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="min-h-screen grid place-items-center bg-neutral-50 p-6">
      <div className="w-full max-w-sm rounded-2xl border bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold">Sign in to Makoya</h1>
        <p className="mt-1 text-sm text-neutral-500">We&apos;ll email you a magic link.</p>
        <LoginForm />
      </div>
    </main>
  );
}
```

`apps/web/app/login/LoginForm.tsx`:
```tsx
"use client";
import { useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const supabase = getBrowserSupabase();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setError(error.message);
    else setSent(true);
  }

  if (sent) return <p className="mt-6 text-sm text-green-700">Check your email for the sign-in link.</p>;

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-3">
      <input
        type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="w-full rounded-lg border px-3 py-2 text-sm"
      />
      <button className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white">
        Send magic link
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
```

- [ ] **Step 2: Create the auth callback route**

`apps/web/app/auth/callback/route.ts`:
```ts
import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  if (code) {
    const supabase = await getServerSupabase();
    await supabase.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(`${origin}/dashboard`);
}
```

- [ ] **Step 3: Create the signout route**

`apps/web/app/auth/signout/route.ts`:
```ts
import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await getServerSupabase();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
```

- [ ] **Step 4: Verify build + typecheck**

```bash
cd "C:/Users/ANMOL/Desktop/makoya/apps/web" && npm run typecheck && npm run build
```
Expected: compiles; routes `/login`, `/auth/callback`, `/auth/signout` present in build output.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(auth): magic-link login + callback + signout"
```

---

### Task 6: Middleware — session refresh + route protection

**Files:**
- Create: `apps/web/middleware.ts`, `apps/web/lib/supabase/middleware.ts`

**Interfaces:**
- Consumes: `isAdmin` (Task 4), env (Task 2).
- Produces: unauthenticated users hitting `/dashboard` or `/admin` are redirected to `/login`; non-admins hitting `/admin` are redirected to `/dashboard`.

- [ ] **Step 1: Create `apps/web/lib/supabase/middleware.ts`**

```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { isAdmin } from "@/lib/auth/roles";

/** Refreshes the session cookie and enforces route protection. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const needsAuth = path.startsWith("/dashboard") || path.startsWith("/admin");

  if (needsAuth && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (path.startsWith("/admin") && !isAdmin(user?.email, env.ADMIN_EMAILS)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return response;
}
```

- [ ] **Step 2: Create `apps/web/middleware.ts`**

```ts
import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
```

- [ ] **Step 3: Verify build**

```bash
cd "C:/Users/ANMOL/Desktop/makoya/apps/web" && npm run build
```
Expected: build succeeds, middleware compiled.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(auth): middleware session refresh + dashboard/admin gating"
```

---

### Task 7: App shell + protected placeholder dashboard & admin

**Files:**
- Create: `apps/web/app/dashboard/layout.tsx`, `apps/web/app/dashboard/page.tsx`, `apps/web/app/admin/layout.tsx`, `apps/web/app/admin/page.tsx`, `apps/web/components/SignOutButton.tsx`
- Modify: `apps/web/app/page.tsx` (redirect `/` → `/dashboard`)

**Interfaces:**
- Consumes: `getServerSupabase` (Task 2), `isAdmin` (Task 4).
- Produces: `/dashboard` greets the logged-in user; `/admin` renders only for admins; both have sign-out.

- [ ] **Step 1: Redirect home to dashboard**

`apps/web/app/page.tsx`:
```tsx
import { redirect } from "next/navigation";
export default function Home() { redirect("/dashboard"); }
```

- [ ] **Step 2: Sign-out button**

`apps/web/components/SignOutButton.tsx`:
```tsx
export function SignOutButton() {
  return (
    <form action="/auth/signout" method="post">
      <button className="text-sm text-neutral-500 hover:text-neutral-900">Sign out</button>
    </form>
  );
}
```

- [ ] **Step 3: Dashboard layout + page**

`apps/web/app/dashboard/layout.tsx`:
```tsx
import type { ReactNode } from "react";
import { SignOutButton } from "@/components/SignOutButton";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="flex items-center justify-between border-b bg-white px-6 py-4">
        <span className="font-semibold">Makoya</span>
        <SignOutButton />
      </header>
      <main className="mx-auto max-w-5xl p-6">{children}</main>
    </div>
  );
}
```

`apps/web/app/dashboard/page.tsx`:
```tsx
import { getServerSupabase } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/roles";
import { env } from "@/lib/env";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  const admin = isAdmin(user?.email, env.ADMIN_EMAILS);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Welcome{user?.email ? `, ${user.email}` : ""}</h1>
      <p className="text-neutral-600">Your dashboard foundation is live. Widget customization, your accessibility report, and billing arrive in the next phases.</p>
      {admin && <Link href="/admin" className="inline-block rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white">Go to Admin CRM →</Link>}
    </div>
  );
}
```

- [ ] **Step 4: Admin layout + page**

`apps/web/app/admin/layout.tsx`:
```tsx
import type { ReactNode } from "react";
import { SignOutButton } from "@/components/SignOutButton";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="flex items-center justify-between border-b border-neutral-800 px-6 py-4">
        <span className="font-semibold">Makoya · Admin</span>
        <SignOutButton />
      </header>
      <main className="mx-auto max-w-6xl p-6">{children}</main>
    </div>
  );
}
```

`apps/web/app/admin/page.tsx`:
```tsx
export default function AdminHome() {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">Admin CRM</h1>
      <p className="text-neutral-400">Customers, scans, and consultation requests arrive in Phase 4. Access confirmed: you are an operator.</p>
    </div>
  );
}
```

- [ ] **Step 5: Verify build + typecheck + run**

```bash
cd "C:/Users/ANMOL/Desktop/makoya/apps/web" && npm run typecheck && npm run build
```
Expected: compiles; `/dashboard` and `/admin` present.

- [ ] **Step 6: Browser verification (qa loop)**

Start `npm run dev`. With placeholder env (no real Supabase), verify: `GET /login` → 200 and renders the form; `GET /dashboard` → redirects to `/login` (302/307). With real Supabase env + an `ADMIN_EMAILS` match, a full magic-link sign-in lands on `/dashboard` and `/admin` is reachable; a non-admin is bounced from `/admin` to `/dashboard`. Record the observed status codes / redirects as evidence.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(web): protected dashboard + admin shells with sign-out"
```

---

## Self-Review

**Spec coverage (Phase 1 scope):** monorepo restructure ✔ (Task 1), Supabase client ✔ (Task 2), schema + RLS ✔ (Task 3), auth magic-link ✔ (Task 5), role gating ✔ (Tasks 4 + 6), dashboard/admin shells ✔ (Task 7), `.env`/SETUP ✔ (Task 2). Widget/shared untouched ✔. Deferred items (Stripe, email, scanner) correctly absent from Phase 1.

**Placeholder scan:** No "TBD"/"add error handling"-style steps; every code step contains real code. The only intentionally-deferred action is Task 3 Step 2 (applying SQL), which depends on operator-provided keys and is explicitly gated.

**Type consistency:** `getBrowserSupabase`, `getServerSupabase`, `isAdmin(email, adminEmails)`, and `env.*` names are used identically across Tasks 2, 4, 5, 6, 7. Schema column names (`launcher_icon`, `features_enabled`, `hide_branding`) match the spec's data model.
