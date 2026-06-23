# Competitive Teardown — Accessibility Widget/Platform Market

> Living research doc. Legend: **[C]** = confirmed (cited source / read directly) · **[I]** = inference (login-gated or reconstructed) · **[A]** = assumption.
> Last updated: 2026-06-22.

## 0. The one decision this research forces

The overlay-as-compliance model is being demolished from three directions simultaneously:
1. **Regulator** — FTC fined accessiBe **$1,000,000** (final order Apr 2025) and *barred* it from claiming its AI makes sites WCAG-compliant; also fined for **astroturfed reviews**. [C]
2. **Courts** — Sites running overlays still get sued. accessiBe on 258 ADA suits (2024), UserWay on 187. **22.6% of all H1-2025 web-a11y lawsuits hit sites that already had an overlay.** [C]
3. **The users themselves** — WebAIM practitioner survey: **67% rate overlays "not at all / not very effective"; 72% of respondents *with disabilities*; only 2.4% "very effective."** Screen-reader users actively block overlays (hosts-file, Firefox detection-blocking). [C]

**Strategic verdict:** Do not sell "one line of code = compliance." Sell **honest hybrid**: real source-level scanning + remediation guidance + monitoring, with the preferences widget positioned as a *usability convenience for the general public*, never as a screen-reader fix or a compliance guarantee.

## 1. What overlays FAKE (per Overlay Fact Sheet, signed by spec authors) [C]
- **"Makes your site compliant / ADA-safe."** False — conformance = meeting ALL success criteria; automated repair cannot meet all, so cannot confer compliance.
- **"AI auto-fixes accessibility."** Auto alt-text, form labels, error handling, keyboard access, focus control are **all unreliable** when automated.
- **"Works on modern sites."** React/Vue/Angular re-render and blow away overlay patches.
- **"Helps screen-reader users."** Majority report it makes sites *worse* (heading floods, focus jumps, can't disable it to navigate).
- **Silent on:** cannot touch Flash/Java/PDF/Canvas/SVG/media. accessiBe itself admits it can't fix video captions or PDFs. [C]
- **Privacy landmine:** auto-detecting assistive tech exposes disability status (sensitive data → GDPR/CCPA risk); cross-site setting cookies = tracking with no opt-out. [C]

> Note: **AudioEye, UserWay, EqualWeb are ALL on the overlay fact sheet list too.** "Hybrid" doesn't exempt you. Our widget must be honest by design: no AT auto-detection without consent, trivially dismissable, never claims to fix the site.

## 2. accessiBe teardown [C unless noted]
- **Product line:** accessWidget (overlay), accessFlow (dev platform), accessScan (free scanner = funnel), accessServices (manual audits).
- **Claims still on site:** "remediates according to WCAG 2.1 AA," "mitigate legal risk," scans + auto-fixes every 24h, accessibility statement auto-gen, 33 languages, 6 profiles.
- **Pricing (annual, traffic-gated):** Micro $490 (≤5k visits/mo) · Growth $1,490 (≤30k) · Scale $3,990 (≤100k) · Enterprise custom.
  - Higher tiers now bundle **litigation case manager, ADA attorney hours, yearly manual testing, custom fixes** → they are quietly becoming AudioEye. The overlay alone is no longer the pitch even for them.
- **accessScan funnel (model to adapt):** enter URL only → instant **binary pass/fail** ("not accessible … not ADA compliant") → full report **email-gated** → primary CTA **"Start Free Trial"** → dashboard signup; secondary "Book a Demo."
  - **Our improvement:** give a real 0–100 score + the top real issues in plain language (we already have the engine + plain-language layer), honest framing, then offer monitoring+widget. Don't use fear-binary; use credible specifics. That earns the trust accessiBe is now legally barred from buying with claims.
- **Dashboard (login-gated) [I]:** monthly audit reports, usage/impact stats (loads, most-used adjustments), accessibility statement, widget branding/config.
- **Reputation tax:** FTC fine + fake-review finding + active advocate hostility. Their brand is a liability we can position against.

## 3. AudioEye — the model to emulate (and undercut) [C]
- **Hybrid:** automation + certified human auditors ("A11iance" team of people with disabilities testing with real AT).
- Claims **37/55 WCAG 2.2 A/AA criteria** automatically testable; ~50% of detected issues auto-fixable on install; developer tools.
- **Pricing:** ~$199–$799/mo. Public company → overhead → we can undercut and move faster on SMB.
- **Take:** the hybrid + "real disabled testers" trust signal + dev tools. **Leave:** the overlay exposure, the price.

## 4. UserWay (now Level Access) [C]
- Overlay + scanning add-on. Widget ~$49–199/mo; scanning $990–$10,990/yr by page count.
- "$1M legal support" hook. **No refund policy**, 10-day trial. Trustpilot gripes about unsubscribe loops / sales emails.
- Sued despite the widget (Bloomsybox). Take: page-count scan pricing tiers. Leave: everything else.

## 5. Deque / axe — the respected camp [C/A]
- **axe-core (MPL-2.0, free) is literally our engine.** Plus axe DevTools, axe Monitor (scheduled drift), axe Auditor, Intelligent Guided Tests (semi-automated manual checks), Deque University (education = trust).
- Dev/enterprise focus → leaves SMBs unserved = **our wedge**. Take: IGT-style guided manual checks, Monitor-style drift detection, education-as-trust. Leave: dev-only positioning.

## 6. Real user voice (X/Twitter via Overlay Fact Sheet) [C]
- "any site which has deployed an overlay … has been less useable for both my wife and me—both blind."
- "I finally managed to gain access to my account by blocking #AccessiBe in my Windows Hosts file."
- "When #AccessiBe is enabled, the page is flooded with headings."
- "Thank goodness Firefox blocks their accessibility detection. Focus jumps all over the place."
- Practitioner: "0 automated tools detect a11y problems accurately above ~30% of the time."

## 7. What this means for Makoya (decisions)
| Decision | Call |
|---|---|
| Core promise | "Find, fix at the source, and monitor" — NOT "instant compliance" |
| Widget role | Honest public-usability convenience + lead capture; never a screen-reader "fix"; no AT auto-detect w/o consent; one-click dismiss |
| Scanner | Lead magnet + product core (our moat); real score + real issues, honest |
| Remediation | AI-*suggested*, human-confirmed (alt-text, plain-language, code snippets) — the thing overlays fake, we do transparently |
| Monitoring | Scheduled re-scan + drift alerts (steal axe Monitor) |
| Pricing | Undercut AudioEye, beat accessiBe on honesty; page-count scan tiers (steal UserWay structure) |
| Trust | Education content + transparent methodology + (later) real human audit partner. Never astroturf. |

## Sources
- FTC: ftc.gov/news-events/news/press-releases/2025/01 & /2025/04 (accessiBe $1M)
- Overlay Fact Sheet: overlayfactsheet.com (signatories: WCAG/ARIA authors; a11y leads at Google/Apple/MS/Shopify/etc.)
- WebAIM practitioner survey #3 overlay section (67% / 72% / 2.4%)
- Lainey Feingold: lflegal.com/2025/02/userway-overlay-lawsuit
- TestParty: testparty.ai/blog/why-800-businesses-with-accessibe-were-still-sued
- AudioEye: audioeye.com/solution/wcag-audit
- accessiBe accessWidget / pricing / accessScan pages (read 2026-06-22)
- Hounder vendor comparison; G2/Trustpilot/Capterra listings
