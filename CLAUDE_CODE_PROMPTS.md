# Claude Code prompts — finish the rest

The widget (`packages/widget`) is DONE and builds. The shared types and the
config API route are real. Use these prompts in Claude Code to complete the
dashboard, billing, and scanner→funnel. Treat Claude Code as a junior dev:
give it one task, review the diff, test, then move on.

---

## PHASE A — Dashboard shell + auth (Supabase)
**Goal:** owner can log in and create a site, get a snippet.

> Build a Next.js 14 App Router app in `apps/dashboard`. Add Supabase Auth
> (email magic link). Pages: `/login`, `/sites` (list my sites), `/sites/new`
> (create a site → inserts a row in `sites` + default `site_config`), and
> `/sites/[id]` (config form). Use the `sites`, `site_config` tables from
> `infra/schema.sql`. After creating a site, show the exact install snippet:
> `<script src="https://cdn.makoya.example/loader.js" data-site="THE_ID" defer></script>`.
> Use server components for data fetching and respect the RLS policies — never
> use the service role key in the browser.

**Review checklist:**
- [ ] Service role key is ONLY in server code / env, never shipped to client.
- [ ] Queries rely on RLS (logged-in user's own rows), not manual filtering only.
- [ ] Creating a site also creates a `site_config` row (one transaction or two awaited inserts).

**Common Claude Code mistakes:** putting the service key in a client component;
forgetting to enable RLS in Supabase before testing; using `useEffect` fetches
instead of server components.

**Test:** sign up → create site → copy snippet → paste into `apps/demo.html`
(swap the inline init for the loader snippet pointing at your dev config route).

---

## PHASE B — Config form → regenerate public JSON
**Goal:** owner changes colour/position/features and the widget reflects it.

> On `/sites/[id]`, build a form to edit `primary_color`, `position`,
> `features_enabled` (checkbox list), `hide_branding` (pro only). On save,
> upsert `site_config` AND revalidate/regenerate the public config endpoint
> `/api/config/[siteId]` cache. Keep `hide_branding` disabled unless
> `sites.plan !== 'free'`.

**Review checklist:**
- [ ] Save writes to DB then busts the CDN/route cache (revalidateTag or purge).
- [ ] Free plan cannot hide branding (enforce on the server, not just the UI).

**Test:** change colour → reload demo page → button colour changes within the
cache TTL.

---

## PHASE C — Scanner → funnel (the money path)
**Goal:** turn the existing scanner from a toy into a lead engine.

> In the scanner app, after a scan completes, add an email-capture step:
> "Enter your email to get the full PDF report." Store the email + scan in the
> `leads` and `scans` tables (server route, service role). Then send one
> follow-up email via Resend at signup and a second 2 days later. Add the
> dollar-risk framing to the report: if the site looks like e-commerce and has
> serious/critical issues, show a line about lawsuit exposure and a "Book a
> 15-min call" CTA. Add rate limiting (per IP) to the scan endpoint.

**Review checklist:**
- [ ] No "WCAG compliant"/"ADA compliant"/"lawsuit-proof" copy anywhere.
- [ ] Email + scan persisted before the PDF is shown.
- [ ] Rate limit actually blocks rapid repeat scans.

**Test:** run a scan → enter email → row appears in `leads` → follow-up email arrives.

---

## PHASE D — Billing (Stripe)
**Goal:** free → pro/managed upgrade.

> Add Stripe Checkout to `apps/dashboard`. Plans: Free (widget + branding),
> Pro (hide branding + monitoring), Managed (audit + remediation retainer).
> On successful checkout webhook, update `sites.plan`. Gate `hide_branding`
> and monitoring on plan.

**Common Claude Code mistakes:** trusting the client to report plan status
instead of the Stripe webhook; not verifying the webhook signature.

**Test:** upgrade in test mode → webhook flips `plan` to `pro` → branding toggle unlocks.

---

## What NOT to prompt for (yet)
- Widget behavioural analytics dashboard
- Browser extension
- Plugins for all 9 platforms (build Shopify OR WordPress first, wrapping the
  same loader)
- White-label, multi-region, deep multi-page crawl
