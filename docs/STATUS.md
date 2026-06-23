# Makoya — STATUS (central memory dashboard)

> **This is the single glance-able source of truth.** Read this first; it answers "where are we, what's in flight, what's blocked, what's next."
> Detailed narrative history lives in [`SESSION.md`](./SESSION.md) (append-only log). This file is the *dashboard view* on top of it.
>
> **Last updated:** 2026-06-24 · **Updated by:** Claude (memory-system block)
>
> **Backup status:** ✅ All 16 branches pushed to `origin` (github.com/anmoll-singhh/makoya-widget) on 2026-06-24 — no work is local-only anymore.
>
> **How to ask for an update:** open this file, or tell any agent *"read docs/STATUS.md and tell me the status."*
> **How agents keep it true:** see [§ Update protocol](#-update-protocol) at the bottom. Update this file at the end of every work block — before SESSION.md.

---

## 🚦 At a glance

| | |
|---|---|
| **Current phase** | **Phase H — bulletproofing (NEXT, founder directive)** · then Phase 2 billing = **Stripe** |
| **Prod URL** | https://makoya-gamma.vercel.app (deployed from `main`, manual `vercel --prod`) |
| **Prod = which branch** | `main` @ `ac82c9e` — **scanner-v2 LIVE** (deployed 2026-06-24 dpl_7QD4ri…, verified example.com→87/100) |
| **You are reading from** | this repo checkout → see the agent board below for which branch |
| **Biggest risk right now** | Dashboard UI WIP still unmerged + ~13 stale branches to prune (all backed up to origin, so safe to act) |
| **Next founder unblock** | Lemon Squeezy account (billing) · Calendly link · PostHog project · rotate leaked keys |

---

## 🤖 Agent / worktree coordination board

> **You often run 2–3 Claude sessions at once. This board prevents collisions.** Before you start editing, claim your lane here. **Never edit files outside your worktree's lane.** The known past failure: the scanner agent wrote into the *main* checkout despite having its own worktree — that must not repeat.

| Worktree path | Branch | Owner / purpose | Status | Safe to touch |
|---|---|---|---|---|
| `C:\Users\ANMOL\Desktop\makoya` | `feat/dashboards-ui-wip` | **Dashboard/admin/CRM UI** elevation + scanner-evidence display | 🔶 1 commit ahead of main, WIP, unmerged | `apps/web/app/(dashboard)`, `apps/web/app/admin`, UI components |
| `C:\Users\ANMOL\Desktop\makoya-scanner` | `feat/scanner-trustworthy-v2` | **Scanner v2** — deterministic evidence-based scoring + watermarked PDF | ✅ **MERGED to main `ac82c9e` (2026-06-24)**, CI-verified, DB columns live. Worktree can be removed. | (merged — done) |
| *(none — `main` is for deploys only)* | `main` | Production source of truth | ✅ Has scanner-v2; **needs redeploy** to go live | Deploy/merge only — don't develop directly on it |

**Rules of the board**
1. One worktree = one branch = one agent. Don't develop two features in one checkout.
2. If two lanes both need to touch shared code (e.g. `packages/shared`, `lib/email`), **stop and coordinate via the founder** — don't race.
3. Deploys happen only from a clean `main` worktree (`vercel --prod` from `apps/web`). There is **no GitHub auto-deploy.**
4. When a lane's work merges to `main` or is abandoned, update its row here.

**Stale branches to prune (no unique unmerged value / superseded):** `phase-1-foundation`, `phase-2-widget-customizer`, `phase-3-scanner`, `phase-4-admin-crm`, `phase-5-polish`, `ws2-client-dashboard`, `ws3-admin-dashboard`, `chore/phase-0-foundation`, `feat/landing-page`, `feat/pdf-report-export`, `feat/phase-1-scanner-funnel`, `fix/landing-auth-redirect`, `fix/widget-scroll-contain`. *(Confirm with founder before `git branch -D`.)*

---

## ✅ Live in production (verified)

| Area | What works | Verified |
|---|---|---|
| Widget | 15 a11y features · en/es/fr/de · 9 profiles · Shadow DOM · loader/core split · mobile sheet · scroll-containment | ✅ live |
| Scanner | Real WCAG 2.0/2.1/2.2 A+AA · Playwright + axe-core + 6 custom checks · screenshot · multi-page (Lambda only) | ✅ live |
| Public funnel | `/scan` → score + plain-English top issues → email capture → `leads` row → `/admin/leads` | ✅ end-to-end live |
| PDF export | "Download PDF" on `/scan` → `/api/report-pdf` (no SSRF surface, honesty-guarded) | ✅ QA'd live |
| Landing page | Honest-hybrid `/` with inline scan deep-link; scores 100/100 on our own scanner | ✅ QA'd live |
| Auth / data | Supabase Auth (@supabase/ssr) · RLS multi-tenant · admin gating via `ADMIN_EMAILS` | ✅ live |
| Email | Resend provider behind the seam (`mailer.jewlx.ai`, verified) | ✅ verified send |
| Provisioned | Site for `anmols@wavesmvmnt.com` (domain `wavesmvmnt.com`, plan free) | ✅ config live |

---

## 🔶 In flight (decisions needed)

| Item | Where | What's needed from founder |
|---|---|---|
| Dashboard/admin/CRM UI elevation | `feat/dashboards-ui-wip` (here) | Review the WIP UI direction, then decide: finish → merge, or fold into the planned strategic frontend rebuild |
| ~~Scanner v2~~ | ~~worktree~~ | ✅ Done — merged to `main` `ac82c9e` 2026-06-24 (CI-verified, DB live). Pending: a `vercel --prod` redeploy to make it live. |

---

## ⛔ Blocked on founder (access / accounts)

| Blocker | Unblocks | Free? |
|---|---|---|
| **Stripe account** (test mode ok) | Phase 2 — checkout + webhook → plan gating. ⚠️ Stripe is a *processor, not* a Merchant-of-Record → founder owns sales-tax/VAT (Stripe Tax add-on = +0.5%/txn, or handle manually). | Free acct; ~2.9%+30¢/txn |
| Sentry project (DSN) | Hardening — error monitoring | Free (5k err/mo) |
| PostHog project (key+host) | Hardening/Phase 3 — funnel analytics | Free (1M ev/mo) |
| Upstash Redis (REST url+token) | Hardening — durable cross-instance rate limit | Free tier |
| Inngest account (keys) | Phase 4 — scan queue + scheduled monitoring | Free tier |
| Anthropic API key (rotate) | Phase 4 — AI remediation suggestions | Paid (usage) |
| **Rotate keys shared in chat** | Security — `ANTHROPIC_API_KEY`, `RESEND_API_KEY` were pasted in chat | — |
| ~~Calendly~~ | Dropped — founder uses own booking system; embed code added later (placeholder for now) | — |

---

## 🎯 Up next (recommended order)

1. ✅ Scanner-v2 merged + **deployed to prod** (2026-06-24, dpl_7QD4ri…, verified: example.com → 87/100 v2 model).
2. **Phase H — Bulletproofing pass (DO THIS FIRST, founder directive 2026-06-24):** make everything already built solid/trustworthy/industry-grade — close every gap/loophole. See `## Phase H` in SESSION.md for the full checklist + tool list. Free tools wired directly; paid ones listed for founder approval.
3. **Phase 2 — Billing (Stripe):** Checkout + webhook (signature-verified, idempotent) → plan; server-side plan gating. Test mode first.
4. **Phase 4 — Features:** Inngest scan queue · scheduled monitoring + "score dropped" alerts · AI remediation (Claude, human-confirmed) · WordPress plugin.
5. **Booking:** founder's own system — leave a placeholder/demo embed slot; drop the real embed code in later. (Not Calendly.)
6. **Then** the strategic frontend rebuild — research-led, every screen placed intentionally.

> **Strategy note (locked 2026-06-24):** Build backend + features first behind a *minimal, beautiful* demo frontend, then redo the whole frontend strategically (research first). **Hardening priority (2026-06-24):** before adding new features, prove everything built is bulletproof — no gaps/loopholes, best achievable state.

---

## 🗺️ Roadmap phases (one-liners — full detail in SESSION.md)

- **Phase 0 — Foundation:** ✅ done (docs, shared-config drift guard, CI, observability seam).
- **Phase 1 — Revenue loop:** ✅ live (scan → email → lead → admin) + PDF.
- **Phase H — Bulletproofing:** 🔶 NEXT (founder directive). Test depth (E2E/coverage), RLS-isolation proofs, SSRF hardening, durable rate limit, runtime input validation (Zod), error monitoring (Sentry), uptime, dependency/secret/static scanning in CI, Lighthouse + our-own-a11y gate. Full checklist in SESSION.md.
- **Phase 2 — Money:** ⛔ **Stripe** checkout + webhook → plan gating. *Blocked on Stripe account.* (Was Lemon Squeezy — founder switched to Stripe; note: Stripe ≠ MoR, founder owns tax.)
- **Phase 3 — Demo polish:** 🔶 landing ✅; remaining = booking embed placeholder (founder's own system) + PostHog.
- **Phase 4 — Features:** Inngest queue · scheduled monitoring + alerts · AI remediation · WordPress plugin.
- **Phase 5 — V2/Enterprise:** white-label portal · human-audit · VPAT/ACR · SSO · CI/CD axe gate.

---

## 📋 Update protocol (for every agent, every block)

**At the START of a block:** read this file + claim/confirm your lane on the agent board.

**At the END of a block, update in this order:**
1. **This file (`STATUS.md`)** — the dashboard. Edit the relevant table cells, the agent board row, "Up next", and the `Last updated` / `Updated by` line at the top. Keep it *scannable* — tables and one-liners, not prose.
2. **`SESSION.md`** — append the detailed narrative entry (what/why/verification).
3. If structure or guardrails changed, reflect it in `CLAUDE.md`.

**Honesty rule:** mark things ✅ only when *verified* (tests run, browser-checked, or live-confirmed). Use 🔶 for in-progress, ⛔ for blocked. Never claim done without evidence.

**gbrain:** this repo also has a searchable memory brain (see CLAUDE.md). Agents can query it via MCP for deeper history; STATUS.md remains the human-glance source of truth.
