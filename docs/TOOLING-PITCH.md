# Makoya — Tooling Plan (plain-English, for the team)

> A one-page summary of tools that make Makoya more reliable, safer, and ready to make money.
> Written to be read together and decided on. Prices are early-2026 and change.

---

## The headline

**Almost everything here is free to start.** We can do the whole "free now" list for **$0/month**.
We only start paying real money in two cases: (1) when we switch on automatic
site-monitoring, and (2) when we actually make a sale (a payment fee, not a monthly bill).

---

## ✅ Free — let's do these now

| Tool | What problem it fixes | Why it's worth it | Cost |
|---|---|---|---|
| **Supabase leaked-password protection** | People reuse passwords already stolen in other breaches — we currently allow it. | Blocks known-stolen passwords. Protects customer accounts (and our reputation). | **$0**, 30 seconds |
| **Cloudflare R2** (host the widget file) | Every visitor to every customer site downloads our widget. Most hosts charge per download — the bill grows as we succeed. | Cloudflare charges **nothing for downloads**. No surprise bills, and we can update the widget safely on its own. | **~$0** (pennies) |
| **Socket.dev** (malicious-code scanner) | Our app uses hundreds of free code packages. If a hacker poisons one, our widget could infect our customers' sites — business-ending. | Auto-checks every package and warns us. Cheap insurance against the scariest risk we have. | **$0** |
| **Better Stack** (uptime + status page) | If the site goes down at 3am, we find out from an angry customer. | Alerts us the moment we're down, plus a public "system status" page that builds trust. | **$0** (free tier) |
| **Cal.com** (book-a-call button) | We built an empty "book a call" slot. We didn't want Calendly. | Free, open-source Calendly. We own our data. Drops into the slot we already built. | **$0** (free plan) |
| **PostHog funnels + session replay** | We can't see where people drop off in the scan→email→signup flow. | We already pay $0 for PostHog — just switch on funnels + replay to learn what's working. | **$0** (already have it) |

---

## 💰 Costs money only when we grow

| Tool | What it unlocks | Cost |
|---|---|---|
| **Scan service** (Trigger.dev / Browserless) | Removes the 60-second cut-off on scans; **unlocks the auto-monitoring feature we want to SELL** ("we'll re-scan weekly and alert you if your score drops"). | Free tier → ~$25–50/mo |
| **Payment processor** | Taking money. Big choice below. | A % per sale, **$0 until a sale** |

### The one real decision: how we take payments

- **Stripe** (current plan): ~2.9% + 30¢ per sale, BUT **we** must figure out and pay sales tax/VAT
  in every country we sell to. For a small team that's a legal headache.
- **Lemon Squeezy / Paddle / Polar** ("Merchant of Record"): ~5% per sale, but **they handle all
  global tax paperwork for us**. We just get paid.

**Recommendation to discuss:** paying ~2% more to make the entire international-tax problem
disappear is very likely worth it for a small team.

---

## Optional, later (only if we choose)

| Tool | For | Cost |
|---|---|---|
| Loops.so | Automatic email follow-up sequences to scanner leads | $0 free tier → ~$49/mo |
| Chromatic | Catches visual bugs when we change the design | $0 free tier → ~$149/mo |
| BrowserStack | Testing the widget on real phones/browsers | ~$29/mo |

---

## What we need to actually turn the free ones on

Most just need the account owner to click "sign up / enable" — the engineering setup is quick:

1. **Supabase** — flip the leaked-password toggle in the dashboard (you do this).
2. **Cloudflare** — create a free account (you), then we move the widget file over.
3. **Socket.dev** — install their free GitHub app on the repo (you), we configure it.
4. **Better Stack** — sign up (you), we wire the monitor + status page.
5. **Cal.com** — sign up (you), we embed it in the booking slot.
6. **PostHog / Playwright** — nothing needed, we just switch them on / write the tests.

**Bottom line:** the free list costs us $0 and removes our biggest risks (security, outages,
surprise bills). The paid items wait until they either earn us money or we choose them.
