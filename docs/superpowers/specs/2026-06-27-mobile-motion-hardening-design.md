# Mobile-first + Motion + Hardening overhaul — design & checklist

**Date:** 2026-06-27 · **Branch:** `feat/mobile-motion-hardening` · **Deploy:** branch → founder runs `cd apps/web && vercel --prod`

## Goal
Make the whole Makoya app **mobile-first** (most users on phones), **readable** (fix the score card), **engaging** (maximal-but-accessible motion using real libraries), and **safer** (no sensitive data in URL/console + a playful SQL-injection honeypot on login). Plus squeeze every code-side perf win we control now.

## Founder directives (verbatim intent)
- Mobile-first, looks good on every device, **most users on mobile**.
- Score card text is **not readable** — fix it.
- App **feels slow** → do all code-side optimization we can right now (don't gate on Supabase Pro).
- **Maximal, creative** animations using **Framer Motion + shadcn + 21st.dev** components — not plain 3-dot spinners. Every interaction should make the user curious ("what is that?"). Sign-in button gets a creative morph state.
- All screens get a load/entrance animation.
- **Security:** nothing important in query params or console.
- **Login SQL-injection gag:** on injection-looking input show a modal "📷 Caught in 4K — really, SQL injection??".
- Use the multi-agent (ECC) setup. Keep a checklist.

## Honest caveats (locked)
1. **All motion respects `prefers-reduced-motion`.** Over-the-top by default, calm when the OS asks. Non-negotiable for an a11y product.
2. **The SQL gag is theater, not security.** Real protection already exists (Supabase/PostgREST parameterized queries). It's a client-side honeypot for fun + a tiny deterrent.
3. **Cold-start latency** from Supabase free-tier auto-pause only fully resolves on Supabase Pro (founder-gated). We fix everything else: client-fetch waterfalls, bundle, render strategy.

## Tech stack (already installed — verified)
`framer-motion@12`, `shadcn@4` (skeleton, sheet, dialog, progress, sonner, etc.), `radix-ui`, `lucide-react`, `tw-animate-css`. 21st.dev magic MCP available. Two CSS worlds: dashboard/admin = hand-CSS (`dashboard.css`, `admin.css`); landing/scan/login = shadcn+tailwind (`globals.css`) + `login.css`.

## Approach: foundation first, then isolated lanes + ECC review
Parallel agents must own **disjoint files** (STATUS.md worktree rule). Foundation is committed first so every lane branches off it.

### Step 0 — Foundation (owner: lead, committed first)
- [ ] `app/_motion/` shared motion kit: Framer Motion variants (pageEnter, stagger, cardRise, countUp), `<PageTransition>`, `<Reveal>`, `<LoadingButton>` (creative morph states, not 3 dots), `<Skeleton>` wrappers, `<CountUp>`.
- [ ] Creative button state spec: morph fill + sweep + draw-on check on success (themeable per CTA).
- [ ] Mobile-first base: fluid type scale, ≥44px touch targets, safe-area insets, in `globals.css` + a shared `_motion.css` for keyframes (reduced-motion guarded).
- [ ] Wire into `app/layout.tsx`.

### Lane A — Client dashboard (owner: agent, worktree) — `app/dashboard/**`, `dashboard.css`
- [ ] Fix score hero readability: solid high-contrast text, larger min sizes, AA-verified.
- [ ] Mobile-first <768px: sheet/drawer nav, stacked cards, readable charts, big tap targets.
- [ ] Replace text "Loading…" with shadcn skeletons across all sub-screens.
- [ ] Perf: feed server-fetched initial data into client components (kill `useEffect` fetch waterfalls) where the page already runs server-side.
- [ ] Maximal motion: count-up score, animated ring fill, staggered KPI/card entry.

### Lane B — Public + Login (owner: lead) — `app/login/**`, `app/scan/**`, `app/page.tsx`, `components/landing|scan/**`, `login.css`
- [ ] Mobile-first login + scan; maximal motion entrances.
- [ ] **Creative Sign-in button** morph (the showcase interaction).
- [ ] **"Caught in 4K" honeypot**: detect `' OR 1=1`, `--`, `;`, `UNION SELECT`, `xp_`, `<script>` etc. on submit → accessible focus-trapped `role="dialog"` modal, Esc closes, playful copy + camera icon. Honest: gag only.

### Lane C — Admin CRM (owner: agent, worktree) — `app/admin/**`, `admin.css`
- [ ] Mobile-first + motion + readability parity with dashboard.
- [ ] Skeletons + entrance animation on tables/cards.

### Cross-cutting — Security audit (owner: ECC security-reviewer, read-only first)
- [ ] Sweep for site IDs / emails / tokens in query params and `console.*` across app; produce fix list. Fixes applied by lead/lanes to avoid edit collisions.

## QA gate (founder standing rule)
- [ ] ECC `react-reviewer` + `a11y-architect` + `performance-optimizer` review.
- [ ] `npm run ci` green (QA-before on rebased branch) and again post-merge (QA-after).
- [ ] Lead builds on branch; **founder** runs `vercel --prod`.

## Done = `npm run ci` green + local mobile smoke + reduced-motion verified + security sweep clean + STATUS.md/SESSION.md updated.
