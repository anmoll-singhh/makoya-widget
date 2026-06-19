# Makoya — Local Setup

This document explains how to configure environment variables and get the app running locally.

## 1. Copy the environment template

```bash
cp apps/web/.env.example apps/web/.env.local
```

`.env.local` is listed in `.gitignore` and will never be committed. It contains real secret keys. Never commit it.

## 2. Fill in the variables

Open `apps/web/.env.local` in your editor and replace every placeholder with the real value. Below is a description of each variable and where to find it.

### `NEXT_PUBLIC_SUPABASE_URL`

The public HTTPS URL for your Supabase project.

**Where to find it:** Supabase dashboard → your project → Settings → API → Project URL.

It looks like `https://abcdefghijklmno.supabase.co`. This value is safe to expose in the browser (it is prefixed `NEXT_PUBLIC_`).

### `NEXT_PUBLIC_SUPABASE_ANON_KEY`

The anonymous (public) API key for your Supabase project. This key respects Row Level Security (RLS) policies.

**Where to find it:** Supabase dashboard → your project → Settings → API → Project API keys → `anon` `public`.

This value is safe to expose in the browser.

### `SUPABASE_SERVICE_ROLE_KEY`

The service-role (admin) API key. This key **bypasses RLS** and has full database access. It must never be sent to the browser or committed to version control.

**Where to find it:** Supabase dashboard → your project → Settings → API → Project API keys → `service_role` `secret`.

Only used in server-side code (Server Components, Route Handlers, Edge Functions).

### `ADMIN_EMAILS`

A comma-separated list of email addresses that are permitted to access the `/admin` section of the application. Only authenticated users whose email appears in this list will be granted admin access.

Example value: `alice@example.com,bob@example.com`

There is no Supabase dashboard entry for this — you define the list yourself.

### `NEXT_PUBLIC_APP_URL`

The base URL of this application. Used when constructing absolute URLs (e.g. OAuth callback URLs, email links).

For local development the default is `http://localhost:3001`. For production deployments, set this to your public domain, e.g. `https://makoya.example.com`.

## 3. Start the dev server

```bash
cd apps/web
npm run dev
```

The app will be available at `http://localhost:3001`.

## Security notes

- `.env.local` is gitignored — check `.gitignore` if you are unsure.
- `.env.example` contains only placeholder values and is safe to commit. It serves as a template for new developers.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` in client-side code or in any file that gets committed.
