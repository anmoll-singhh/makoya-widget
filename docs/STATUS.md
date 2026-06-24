# Makoya — STATUS (central memory dashboard)

> **This is the single glance-able source of truth.** Read this first; it answers "where are we, what's in flight, what's blocked, what's next."
> Detailed narrative history lives in [`SESSION.md`](./SESSION.md) (append-only log). This file is the *dashboard view* on top of it.
>
> **Last updated:** 2026-06-25 · **Updated by:** Claude (block 9 — Phase H bulletproofing)
>
> **Backup status:** ✅ All branches pushed to `origin` (github.com/anmoll-singhh/makoya-widget). No work is local-only.
>
> **How to ask for an update:** open this file, or tell any agent *"read docs/STATUS.md and tell me the status."*
> **How agents keep it true:** see [§ Update protocol](#-update-protocol). Update this file at the end of every work block, before SESSION.md.

---

## 🚦 At a glance

| | |
|---|---|
| **Current phase** | **Phase H — bulletproofing (code+DB+CI DONE; rest founder-gated)** · then Phase 2 billing = **Stripe** |
| **Prod URL** | https://makoya-gamma.vercel.app (deployed from `main`, manual `vercel --prod`) |
| **Prod = state** | `main` — **scanner-v2 + security hardening LIVE** (deployed 2026-06-25; example.com→87/100; SSRF+Zod verified live) |
| **Canonical branch** | `main` — all docs, migrations, hardening now live here (the source-of-truth split is fixed) |
| **Biggest risk right now** | Dashboard UI WIP still unmerged + stale branches to prune (all backed up to origin → safe to act) |
| **Next founder unblock** | Stripe account · enable Supabase leaked-password toggle · free accounts (Sentry/PostHog/Upstash/Inngest) · rotate leaked keys |

---

## 🤖 Agent / worktree coordination board

> **You often run 2–3 Claude sessions at once. This board prevents collisions.** Claim your lane before editing. **Never edit files outside your worktree's lane.** Past failure to never repeat: an agent wrote into the *main* checkout despite having its own worktree.

| Worktree | Branch | Owner / purpose | Status |
|---|---|---|---|
| `C:\Users\ANMOL\Desktop\makoya` | `main` (or a feature branch) | Production source of truth | ✅ Has scanner-v2 + Phase H hardening, deployed |
| `C:\Users\ANMOL\Desktop\makoya` | `feat/dashboards-ui-wip` | Dashboard/admin/CRM UI elevation | 🔶 WIP, unmerged — decide: finish→merge or fold into strategic frontend rebuild |
| `C:\Users\ANMOL\Desktop\makoya-scanner` | `feat/scanner-trustworthy-v2` | Scanner v2 | ✅ MERGED to main + deployed — **worktree can be removed** |
| `.claude/worktrees/agent-*` | `harden/*` | Phase H parallel agents (A/B/C) | ✅ MERGED to main — worktrees + branches can be pruned |

**Rules:** one worktree = one branch = one agent · don't develop two features in one checkout · if two lanes need the same shared file (`packages/shared`, `package.json`, `lib/email`), STOP and coordinate · deploy only from clean `main` (`vercel --prod` from `apps/web`; no GitHub auto-deploy) · update this board when a lane merges/ends.

**Branches to prune (merged or superseded — all on origin, safe):** `harden/api-security`, `harden/ci-quality`, `harden/test-depth`, `feat/scanner-trustworthy-v2`, `phase-1-foundation`, `phase-2-widget-customizer`, `phase-3-scanner`, `phase-4-admin-crm`, `phase-5-polish`, `ws2-client-dashboard`, `ws3-admin-dashboard`, `chore/phase-0-foundation`, `feat/landing-page`, `feat/pdf-report-export`, `feat/phase-1-scanner-funnel`, `fix/landing-auth-redirect`, `fix/widget-scroll-contain`. *(Confirm before delete.)*

---

## ✅ Live in production (verified)

| Area | What works | Verified |
|---|---|---|
| Widget | 15 a11y features · en/es/fr/de · 9 profiles · Shadow DOM · loader/core split · mobile sheet · scroll-containment | ✅ live |
| Scanner v2 | Real WCAG engine · deterministic evidence-based scoring + auditable breakdown + provenance · Lambda | ✅ live (87/100 ex.) |
| Public funnel | `/scan` → score + plain-English issues → email capture → `leads` row → `/admin/leads` | ✅ end-to-end live |
| PDF export | "Download PDF" on `/scan` (no SSRF surface, honesty-guarded, input caps) | ✅ live |
| Landing | Honest-hybrid `/`, scores 100/100 on our own scanner | ✅ live |
| Auth / data | Supabase Auth · RLS multi-tenant · admin gating via `ADMIN_EMAILS` | ✅ live |
| Email | Resend (`mailer.jewlx.ai`, verified); send failure never blocks lead | ✅ live + tested |
| **Security (Phase H)** | DNS-rebinding/SSRF resolved-IP block · Zod at all API boundaries · hardened SECURITY DEFINER fn | ✅ live + QA'd |

---

## 🛡️ Phase H — Bulletproofing status

| Item | Status |
|---|---|
| DB: harden SECURITY DEFINER fn (search_path + revoke rpc) | ✅ applied + verified (advisor clean) |
| API: SSRF resolved-IP/DNS-rebinding defense | ✅ live (localhost/metadata → 400) |
| API: Zod validation everywhere (safe generic errors) | ✅ live (malformed/bad-JSON → 400) |
| Tests: 106 → **212** (determinism, email-no-block, PDF caps, RLS suite, E2E) | ✅ green |
| CI: Gitleaks · Semgrep · CodeQL · Dependabot · Lighthouse(a11y=1.0) · axe-dogfood · coverage gate · eslint/prettier | ✅ added (run on push) |
| Supabase leaked-password protection | ⛔ founder toggle (Auth settings) |
| Sentry / PostHog / Upstash / Inngest wiring | ⛔ founder creates free accounts → I wire |
| Rotate Anthropic + Resend keys (leaked in chat) | ⛔ founder |
| PAID (optional, founder decides) | Vercel Pro · Supabase Pro · Snyk/Socket · BrowserStack · pen-test · Stripe Tax |

---

## ⛔ Blocked on founder (access / accounts)

| Blocker | Unblocks | Free? |
|---|---|---|
| **Stripe account** (test mode ok) | Phase 2 billing. ⚠️ Stripe ≠ MoR → founder owns tax/VAT | Free acct; ~2.9%+30¢/txn |
| Enable Supabase leaked-password protection | Phase H security (Auth → toggle) | Free, 30 sec |
| Sentry (DSN) · PostHog (key+host) · Upstash Redis (url+token) · Inngest (keys) | Monitoring · analytics · durable rate-limit · scan queue | Free tiers |
| Rotate Anthropic + Resend keys | Security (pasted in chat earlier) | — |
| Own booking-system embed code | Phase 3 book-a-call (placeholder slot for now) | — |

---

## 🎯 Up next (recommended order)

1. ✅ Scanner-v2 + Phase H code/DB/CI hardening — DONE + deployed + live-QA'd.
2. **Cleanup:** remove merged agent worktrees + scanner worktree; prune merged/stale branches (all backed up).
3. **Wire monitoring** once founder creates the free accounts (Sentry/PostHog/Upstash/Inngest).
4. **Phase 2 — Stripe billing** (test mode): checkout + signature-verified idempotent webhook → plan gating.
5. **Phase 4 — Features:** Inngest scan queue · scheduled monitoring + "score dropped" alerts · AI remediation (human-confirmed) · WordPress plugin.
6. **Booking:** drop founder's real embed into the placeholder slot.
7. **Strategic frontend rebuild** — research-led, deliberate (last, on a finished backend).

> **Strategy (locked 2026-06-24/25):** Backend + features first behind a minimal beautiful demo frontend; harden everything to bulletproof before new features; then redo the whole frontend strategically (research first). Decide the dashboard-UI-wip fate (finish vs fold into rebuild).

---

## 🗺️ Roadmap phases (one-liners — detail in SESSION.md)

- **Phase 0 — Foundation:** ✅ done.
- **Phase 1 — Revenue loop:** ✅ live (scan → email → lead → admin) + PDF.
- **Phase H — Bulletproofing:** ✅ code/DB/CI done + live; founder-gated items remain (above).
- **Phase 2 — Money:** ⛔ Stripe checkout + webhook → plan gating. *Blocked on Stripe account.*
- **Phase 3 — Demo polish:** 🔶 landing ✅; remaining = booking embed (founder's own) + PostHog.
- **Phase 4 — Features:** Inngest queue · monitoring + alerts · AI remediation · WordPress plugin.
- **Phase 5 — V2/Enterprise:** white-label · human-audit · VPAT/ACR · SSO · CI/CD axe gate.

---

## 📋 Update protocol (for every agent, every block)

**START of a block:** read this file + claim/confirm your lane on the agent board.

**END of a block, in order:**
1. **`STATUS.md`** — the dashboard. Edit the table cells, agent board, "Up next", and the `Last updated`/`Updated by` line. Keep it scannable.
2. **`SESSION.md`** — append the detailed narrative entry (what/why/verification).
3. If structure/guardrails changed, reflect it in `CLAUDE.md`.

**Honesty rule:** mark ✅ only when *verified* (tests run, browser/live-checked). 🔶 in-progress, ⛔ blocked. Never claim done without evidence.

**gbrain:** local searchable brain (see CLAUDE.md `## GBrain Configuration`). Re-seed after big changes: `cat docs/STATUS.md | gbrain put "makoya-status-dashboard"`.
