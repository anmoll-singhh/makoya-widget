# Makoya v7 — Product Review & Paid-Tools Register

**Date:** 2026-06-26 · **Author:** Claude (Opus 4.8) · **Build:** `feat/v7-dashboard` → `main` (2f734c3) → prod `dpl_4snDZQbTP8quyZQpoEtTna4UCkzC` (makoya-gamma.vercel.app)

This is the end-of-session deliverable promised in the spec (§16): what shipped, the paid-tools register with **verified** prices, the honest gaps, and a candid product review.

---

## 1. What shipped (live in production)

v7 is now the production `/dashboard` (full cutover — old dashboard + `/v3` deleted). Reframed around **Agents** (a website you own) and **Mike** (the audit/scanner). One account can own many agents and manage them all from one dashboard, with a sidebar agent-switcher.

| Screen / area | Status | Data source |
|---|---|---|
| Login | ✅ Real | Supabase email/password. Splash-bg + card per mockup. Google button = honest disabled stub. |
| Agents portfolio | ✅ Real | `GET /api/sites` (new) — real agents + KPIs, empty state. |
| Add agent (wizard) | ✅ Real | `POST /api/sites` (new) → onboarding trigger → real free scan via the live scanner. |
| Overview | ✅ Real | `/api/sites/[id]/overview` — score, trend, journey, framework, activity, next-best-action. |
| Mike (audit) | ✅ Real | `/api/sites/[id]/issues` — real issues, grouped, real assignment + resolve. |
| Install | ✅ Real | Real snippet + server-minted token; verify hits install-status; "send to dev" = honest mailto. |
| Customize | ✅ Real | `/api/sites/[id]/config` — real toggles, publish, live AA-contrast badge from real color. |
| Statement | ✅ Real | `/api/sites/[id]/statement` — real generated, XSS-escaped HTML. |
| Proof of effort | ✅ Real | `/api/sites/[id]/proof-pack` — real evidence items, honest "not yet" where absent. |
| Reports | ✅ Real | `/reports` + `/remediation` — real monthly + remediation log, honest empty state. |
| Analytics | ✅ Real | `/api/sites/[id]/analytics` — real `widget_events`, honest "no data yet". |
| Billing | ✅ Real state, 🟡 Stripe stub | Real plan/quota/usage; buy-now sets `trialing` (no charge); **invoices = honest empty state**. |
| Agent settings | ✅ Real | `/api/sites/[id]/settings`. |
| Account (org/team/API keys) | ✅ Real | `/api/org` (+ new `POST`), `/api/team` (+ invites), `/api/org/api-keys`. |
| Partners | ✅ Real | `/api/partner` (+ enroll, white-label); revenue = real $0 (honest, until billing). |
| Admin CRM | ✅ Real (restyled) | Reskinned to the v7 design system; functionality unchanged. |

**Quality gates passed:** every lane reviewed by the "R" review agent + fixes; a final whole-branch review (Opus) confirmed the **entitlement contract, honesty rules, security/multi-tenancy, XSS, and cutover integrity all PASS**; `npm run ci` green (605 tests); production build green (35 routes); live prod smoke green (`/login` 200, `/dashboard`→`/login` 307, `/api/sites` 401, widget loader 200).

**Honesty enforced throughout:** every hard-coded mockup number (score 86, "$6.2k", "3,418 opens", "142 days uptime", sample invoice rows, "Industry avg. 89", "$1,490/yr") was replaced with real account data or an honest empty/zero state. A fabricated industry benchmark and an overstated WCAG denominator were caught in review and removed. No compliance/"guaranteed accessible"/"certified" copy ships; the mockup's honest disclaimers are preserved verbatim.

---

## 2. Paid-tools register

Per your directive: free tools were used now (Sentry, PostHog, Upstash — already provisioned; PostHog product events added for `agent_added`/`free_scan_viewed`/`widget_published`/`plan_buy_now`). **No paid tool was enabled this session.** The following would each *enhance* the product; prices were verified against the vendor on 2026-06-26 (flagged where the tool geolocated or couldn't be confirmed).

| Tool | What it does for Makoya | Verified price (2026-06-26) | Priority |
|---|---|---|---|
| **Stripe** | The single blocker to **real revenue**: checkout + signature-verified, idempotent webhook → `status:'active'` → paid entitlements. Schema + catalog + `lib/billing/stripe.ts` seam already built; only the SDK + secret + webhook remain. | No monthly/setup fee. Fees follow your **account country**: the pricing page geolocated to **India = 2% domestic / 3% international cards**. US-based accounts: **2.9% + $0.30** per successful card charge (standard, long-published). **Stripe Tax** add-on ≈ **0.5%/transaction**. ⚠️ Confirm the exact % against *your* account country at stripe.com — it geolocates. | **P0** — without it there is no money. |
| **Supabase Pro** | Removes the free-tier 500 MB DB cap + auto-pause (free projects pause after 1 wk idle — fatal for a live SaaS), adds daily backups (7-day retention), more egress/MAU. | **$25/mo** base (8 GB disk included, then $0.125/GB). | **P0/P1** — needed before real customers; auto-pause alone makes free untenable in prod. |
| **Vercel Pro** | Removes Hobby limits, team seats, faster builds, no queues, spend management; $20 usage credit included. | **$20/user/mo** + usage. | **P1** — recommended once traffic/team grows; Hobby is fine for now. |
| **Inngest** | Durable **scan queue** + scheduled monitoring/alerts ("score dropped") without long serverless functions. | Free **50k executions/mo**; Pro from **$75/mo** (1M executions, 100+ concurrency). | **P2** — when scan volume outgrows inline/cron. |
| **BrowserStack** | Real cross-browser + assistive-tech testing of the widget and dashboard (we dogfood axe/Lighthouse free in CI, but real AT/devices need this). | Live (manual) from **$29/mo**; Automate from **$59/mo** (billed annually). | **P2** — quality/credibility for an a11y product. |
| **Resend (paid)** | Higher email volume for invites/reports/alerts beyond the free tier. | Free 3k emails/mo; first paid tier **≈$20/mo for 50k** (verify current tier at resend.com/pricing). | **P2** — when email volume grows. |
| **Snyk / Socket (paid)** | Deeper supply-chain/vuln scanning beyond the free CI tier. | Free tiers exist; Snyk Team **≈$25/contributor/mo** (verify — pricing not re-confirmed this session). | **P3** — nice-to-have hardening. |

> Accuracy note: Vercel Pro, Supabase Pro, Inngest, and BrowserStack prices were fetched live and are quoted exactly. Stripe's page geolocated to India, so US per-transaction % is the long-published standard (not re-fetchable from this location) — **verify against your own Stripe account country**. Resend/Snyk tiers are marked "verify" rather than asserted.

---

## 3. Honest gaps (not fully real — and why)

- **Real card payments** — Stripe not wired (no account/secret). Buy-now selects a plan as `trialing` with **no charge**; the billing screen says payments connect soon; invoices show an honest empty state. When wired, paid features must gate on `status === 'active'` only (contract enforced in code + review).
- **Google sign-in** — rendered per mockup but **disabled** ("coming soon"); enable the Google provider in Supabase to activate.
- **Self-serve password reset** — "Forgot password?" routes to support mailto (no reset flow built this session).
- **Partner commission $ / real invoices** — depend on Stripe; shown as honest $0 / empty until then.
- **Preview deploy** — skipped by your choice; we deployed straight to prod (the project's env vars are Production-scoped only and there's no connected Git repo, so a faithful preview would have needed env setup). If you want branch previews later, either connect the GitHub repo or add the env vars to the Preview scope.

---

## 4. Product review (candid)

**Strengths.** The product now hangs together as one coherent, premium-feeling system: a single design language across the client dashboard, login, and admin; a genuinely multi-tenant, RLS-scoped backend; and a real WCAG scanner at the core. The **"Agents + Mike"** framing is strong — it makes "manage many sites" and "the auditor found X" intuitive. The **honesty posture is a real moat**: by refusing overlay-style "instantly compliant" claims and showing real data or honest empty states, Makoya avoids the exact thing that gets accessibility-overlay vendors sued. The a11y scaffolding (reduced-motion / reduced-transparency / forced-colors, real keyboard controls, focus management) is dogfooded, which is the right credibility signal for an accessibility company.

**Risks / watch-items.**
1. **Revenue is gated entirely on Stripe.** Everything else is live; this is the one thing between you and income. Prioritize it. (India vs US account-country materially changes your take rate — decide where the merchant account lives.)
2. **Free-tier Supabase auto-pause** will pause a live prod project after a week idle. Move to Pro before onboarding paying customers.
3. **The free scan → install funnel** is the top of the funnel and now real end-to-end — instrument and watch the PostHog events (`agent_added` → `free_scan_viewed` → `widget_published`) to find drop-off.
4. **Portfolio roll-up is O(N) per-agent reads** — fine now, add a batched SQL roll-up before large agencies (Partners) onboard many agents.
5. **Trust badges on login** ("SOC 2") are your claims to stand behind — confirm SOC 2 is actually held or drop the token before it's a liability.

**Recommended next order:** (1) Stripe (test mode → live) + Supabase Pro; (2) Google OAuth + password reset to round out auth; (3) Inngest-backed scheduled monitoring + "score dropped" alerts (this is the recurring-value hook that justifies subscriptions); (4) batched portfolio roll-up for the Partners path; (5) a11y polish pass on the small deferred items (Note live-regions, admin table aria-colspan).

**Bottom line:** the mockup is real, reviewed, and live. The product is in a credible, honest, shippable state. The gap between "live demo" and "live business" is now almost entirely **Stripe + Supabase Pro** — both small, well-understood steps with the seams already built.
