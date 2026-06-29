# Makoya — Decision Log (ADR index)

> One line per locked decision so future sessions don't re-litigate them. Detail lives in
> `SESSION.md` / the linked spec. Add a row when a decision is locked; mark `Reversed` (don't
> delete) when it changes. Newest at top.

| Date | Decision | Status | Why / source |
|---|---|---|---|
| 2026-06-24 | **Stripe** is the payment processor (not Lemon Squeezy / Paddle) | Locked | Founder choice. Stripe ≠ Merchant-of-Record → founder owns tax/VAT. `CLAUDE.md`, `STATUS.md` |
| 2026-06-25 | **QA gate** (QA-before + QA-after `npm run ci`) around every merge to `main` | Locked | Founder directive. `GOVERNANCE.md §7` |
| 2026-06-25 | **Deploy is CLI-only** (`cd apps/web && vercel --prod`); GitHub auto-deploy disconnected | Locked | Auto-deploy built from repo-root → 404'd prod. `STATUS.md §DEPLOY` |
| 2026-06-25 | **Bulletproof before features** (Phase H), then strategic frontend rebuild last | Locked | Founder directive. `SESSION.md` Phase H |
| 2026-06-25 | **Protect the license, not the code** — gate at the public config endpoint, not the JS | Locked | Widget JS is copyable. `docs/plans/PHASE-1-LICENSING.md` |
| 2026-06-25 | Widget licensing **ships OFF** (`WIDGET_ENFORCE` unset) until signed-token wall proven | Locked | Origin-lock alone is spoofable. `docs/plans/PHASE-1.5-AND-DELIVERY.md` |
| 2026-06-25 | **Decline Sentry `withSentryConfig`/wizard**; use manual `instrumentation.ts` | Locked | Wizard's webpack plugin risks the fragile native-dep area for marginal benefit. `SESSION.md` block 14 |
| 2026-06-24 | `pro→growth`, `managed→scale` plan-slug map; dual plan system bridged by adapter, unify later | Open | `docs/PRICING-STRATEGY-V3.1.md` |
| 2026-06-22 | **Positioning: honest hybrid** (real scan + tools), never overlay-compliance claims | Locked | Legal risk; FTC AccessiBe fine. `MAKOYA_OVERVIEW.md`, compliance guardrail |
| 2026-06-22 | **Canonical `packages/shared` + generated mirror**; CI drift gate; never hand-edit mirror | Locked | Vercel uploads only `apps/web`. `ARCHITECTURE.md §2` |
| 2026-06-22 | **No mock mode** — app talks to real Supabase (auth + RLS) | Locked | `CLAUDE.md` |
| 2026-06-29 | Entitlement gating MUST key off `status === 'active'`, NOT `!= inactive` | Locked | `trialing` = selected-not-paid; else Buy-now grants free plans. `STATUS.md` security review M1 |

## Founder-gated (decided in principle, awaiting founder action)
- Enable Supabase **leaked-password protection** (Auth toggle).
- **Stripe** account + real prices → wire checkout/webhook (schema + catalog already built).
- **Supabase Pro** ($25/mo — free tier auto-pauses a live project).
- **Vercel Pro** — required to restore the every-minute `scan-dispatch` cron (Hobby = daily).
- Own **booking-system** embed code (placeholder slot in UI; NOT Calendly).
- Rotate Anthropic + Resend keys pasted in chat earlier.
