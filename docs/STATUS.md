# Makoya — STATUS (central memory dashboard)

> **This is the single glance-able source of truth.** Read this first; it answers "where are we, what's in flight, what's blocked, what's next."
> Detailed narrative history lives in [`SESSION.md`](./SESSION.md) (append-only log). This file is the *dashboard view* on top of it.
>
> **Last updated:** 2026-06-24 · **Updated by:** Claude (memory-system block)
>
> **How to ask for an update:** open this file, or tell any agent *"read docs/STATUS.md and tell me the status."*
> **How agents keep it true:** see [§ Update protocol](#-update-protocol) at the bottom. Update this file at the end of every work block — before SESSION.md.

---

## 🚦 At a glance

| | |
|---|---|
| **Current phase** | Phase 3 (demo polish) in progress · Phase 2 (billing) blocked on founder |
| **Prod URL** | https://makoya-gamma.vercel.app (deployed from `main`, manual `vercel --prod`) |
| **Prod = which branch** | `main` (clean: widget + provisioning + Resend email) |
| **You are reading from** | this repo checkout → see the agent board below for which branch |
| **Biggest risk right now** | Unmerged work scattered across 2 worktrees + ~12 stale branches → decide merges |
| **Next founder unblock** | Lemon Squeezy account (billing) · Calendly link · PostHog project · rotate leaked keys |

---

## 🤖 Agent / worktree coordination board

> **You often run 2–3 Claude sessions at once. This board prevents collisions.** Before you start editing, claim your lane here. **Never edit files outside your worktree's lane.** The known past failure: the scanner agent wrote into the *main* checkout despite having its own worktree — that must not repeat.

| Worktree path | Branch | Owner / purpose | Status | Safe to touch |
|---|---|---|---|---|
| `C:\Users\ANMOL\Desktop\makoya` | `feat/dashboards-ui-wip` | **Dashboard/admin/CRM UI** elevation + scanner-evidence display | 🔶 1 commit ahead of main, WIP, unmerged | `apps/web/app/(dashboard)`, `apps/web/app/admin`, UI components |
| `C:\Users\ANMOL\Desktop\makoya-scanner` | `feat/scanner-trustworthy-v2` | **Scanner v2** — deterministic evidence-based scoring + watermarked PDF | 🔶 Isolated, unmerged, **OFF prod**, awaiting founder blessing | `apps/web/lib/scanner`, scan routes, PDF |
| *(none — `main` is for deploys only)* | `main` | Production source of truth | ✅ Clean, deployed | Deploy/merge only — don't develop directly on it |

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
| Scanner v2 (evidence-based scoring) | `feat/scanner-trustworthy-v2` worktree | Bless it → merge to main + redeploy, **or** keep iterating. It's better than what's on prod but currently rolled off. |

---

## ⛔ Blocked on founder (access / accounts)

| Blocker | Unblocks |
|---|---|
| Lemon Squeezy account (test mode ok) | Phase 2 — checkout + webhook → plan gating |
| Calendly link | Phase 3 — book-a-call CTA |
| PostHog project | Phase 3 — funnel analytics dashboard |
| Anthropic API key (confirm/rotate) | Phase 4 — AI remediation suggestions |
| **Rotate keys shared in chat** | Security — `ANTHROPIC_API_KEY`, `RESEND_API_KEY` were pasted in chat earlier |

---

## 🎯 Up next (recommended order)

1. **Decide the two in-flight merges** (scanner v2 + dashboard UI) — unblocks a clean `main`.
2. **Prune stale branches** once merges are decided.
3. **Backend-first push (your stated direction):** Phase 2 billing (needs Lemon Squeezy) → Phase 4 hardening (Inngest queue, scheduled monitoring + "score dropped" alerts, AI remediation).
4. **Then** the strategic frontend rebuild — research-led, every screen placed intentionally (your new rule: no ad-hoc frontend; design after research).

> **Strategy note (locked 2026-06-24):** Build backend + features first behind a *minimal, beautiful* demo frontend. Once the backend is complete, redo the whole frontend strategically. Any new frontend = research first, placed deliberately.

---

## 🗺️ Roadmap phases (one-liners — full detail in SESSION.md)

- **Phase 0 — Foundation:** ✅ done (docs, shared-config drift guard, CI, observability seam).
- **Phase 1 — Revenue loop:** ✅ live (scan → email → lead → admin) + PDF.
- **Phase 2 — Money:** ⛔ Lemon Squeezy checkout + webhook → plan gating. *Blocked on account.*
- **Phase 3 — Demo polish:** 🔶 landing ✅; remaining = Calendly + PostHog.
- **Phase 4 — V1 hardening:** Inngest queue · scheduled monitoring + alerts · AI remediation · WordPress plugin.
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
