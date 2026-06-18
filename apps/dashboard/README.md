# Makoya Dashboard (scaffold)

Next.js App Router app. The config API route is real (`app/api/config/[siteId]/route.ts`).
The rest (auth, pages, billing) is built via the prompts in `/CLAUDE_CODE_PROMPTS.md`.

## Setup
```
npm install
# add .env.local: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_ANON_KEY,
# RESEND_API_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
```
Run `infra/schema.sql` in Supabase first.
