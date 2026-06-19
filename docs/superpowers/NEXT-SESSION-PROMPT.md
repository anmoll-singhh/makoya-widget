# Next-session prompt (copy the block below into a fresh session)

```
Continue the Makoya project. FIRST: read `docs/superpowers/SESSION.md`, then run `git log --oneline -25`, to load full context. The product is LIVE at https://makoya-gamma.vercel.app (Vercel prod; code on GitHub origin/main; widget served from /widget/loader.js). Test logins (password `Makoya2026!`): admin = anmols@wavesmvmnt.com, client = anmol.singhh17@gmail.com.

HOW TO WORK: Use the subagent-driven-development multi-agent pipeline (implementer + independent reviewer + fix loops + final review per workstream). Use the ui-ux-pro-max and frontend-design skills for ALL UI decisions. For the dashboards, use shadcn/ui (init it via the vercel:shadcn skill if not already set up) + the 21st.dev MCP for components if available (else hand-build with Tailwind to the same quality). QA the established way: a node script that stubs globalThis.WebSocket, password-signs-in via GoTrue, mints an @supabase/ssr cookie, and drives the LIVE app with Playwright + screenshots (Playwright pierces shadow DOM; wait state:"attached" for the zero-size widget host). Deploy to Vercel after each workstream (cd apps/web && vercel --prod --yes --scope anmolsinghh17-9375s-projects) and verify on the live URL. Keep SESSION.md current. Constraints: @makoya/shared is VENDORED at apps/web/lib/shared/index.ts (mirror of packages/shared — edit BOTH); rebuild widget then copy dist/{loader,core}.js to apps/web/public/widget; no "WCAG/ADA compliant" legal claims; reuse existing data layers (lib/sites, lib/admin, lib/scans). Work autonomously, don't lose context, summarize at the end.

WORKSTREAM 1 — WIDGET REDESIGN (packages/widget; vanilla TS in a Shadow DOM — NOT React, NO shadcn here; hand-craft premium glass CSS):
- Glassmorphism: translucent panel with backdrop-blur, subtle 1px border + soft shadow, on-brand accent; ensure text stays AA-readable over the glass (use a slightly opaque layer behind text).
- FIX THE MOBILE BUG (today it's unreadable/cut-off on phones): on ≤480px make the panel a full-width BOTTOM SHEET — rounded top corners, max-height ~85dvh with internal scroll, larger 44px+ touch targets, bigger close button, safe-area padding. Verify on a 390×844 viewport screenshot that the whole panel is visible and legible.
- Make it instantly understandable: clear section headers, plain labels, Quick Profiles on top.
- ADD competitor-parity features we're missing (keep all effects attribute-based, no DOM rewriting; keep a11y: aria-modal, focus trap, role=switch/group; keep the contrast/dark "mounted on <html>" fix): saturation modes (grayscale / low / high), reading MASK (dim everything except a moving band), highlight titles/headings, cursor color choice (big black / big white), left-align text, mute sounds, READ-ALOUD via SpeechSynthesis (click text to hear it), an "Accessibility statement" link, and a language selector for the widget's own labels (at least English + 1-2 more). Keep Reset + Save-prefs.
- Verify every new effect actually changes the page, on both desktop and mobile, with screenshots.

WORKSTREAM 2 — CLIENT DASHBOARD REDO (apps/web; React/Next + shadcn + design skills):
- CHANGE THE ONBOARDING MODEL: clients no longer self-add sites. The operator onboards them, so the site is pre-assigned to their email. Implement an admin "Add customer" action (input: client email + domain) that creates the Supabase auth user AND their site (service-role), so when the client logs in their site already exists.
- Client landing page = go STRAIGHT to the widget CUSTOMIZER for their assigned site (big live preview + lots of options), no "add site" step. If a client has multiple sites, show a switcher.
- A SEPARATE page/tab = the Scanner & accessibility report (score + issues + the "get full report / book a call" CTA).
- Keep the account/profile page.
- Maximize customization in a friendly, well-organized customizer: color, launcher icon + size, position, which features show, default profile, panel labels/branding toggle (paid-gated), etc. — all with instant live preview.

WORKSTREAM 3 — ADMIN DASHBOARD REDO (apps/web; shadcn + design skills):
- A clients overview where I see EVERY customer: email, their site(s), latest score, and NUMBER OF ACCESSIBILITY ISSUES (from the latest scan totals), plus plan + open consultation requests.
- DEFAULT SORT = most issues → fewest (worst sites on top). Make key columns sortable.
- Easy management: open a customer to change plan, see scan history + requests, and onboard a new customer (the Add-customer flow from WS2). Fast, clean, easy to manage clients at a glance.

Plan it (brainstorm → spec → plan), then execute with the multi-agent pipeline, deploy, QA on the live site, and give me a summary.
```
