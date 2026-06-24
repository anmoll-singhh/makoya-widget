# Shopify setup runbook — Makoya Accessibility (theme app extension)

This folder ships the **code** for a Shopify Theme App Extension (an app-embed
block that injects the Makoya loader snippet into a storefront `<head>`). It is a
**scaffold + runbook**, not a published app.

## Honest status — what is and isn't done

- DONE: the app-embed block (`extensions/makoya-widget/blocks/makoya.liquid`) and
  its extension config (`extensions/makoya-widget/shopify.extension.toml`).
- NOT done / **founder-gated** (needs the founder's accounts and a dev store —
  none of this can run or be QA'd on the build machine):
  - A **Shopify Partner account**.
  - The **Shopify CLI** and an **app** created via `shopify app init` (provides
    OAuth, the app's API credentials, and `shopify.app.toml`).
  - A **development store** to install + visually QA the embed.
  - A **billing-model decision** (see "Open decision" below) before any public
    App Store listing.

Because of the above, the storefront `<head>` injection and the launcher render
have **not** been verified live — they must be QA'd on a dev store.

## The snippet this extension emits (the contract)

When the merchant enables the embed and fills in Site ID (+ optional Token):

```html
<script src="https://makoya-gamma.vercel.app/widget/loader.js" data-site="SITE_ID" data-token="SITE_TOKEN" defer></script>
```

With the Token left blank, `data-token` is omitted (back-compat / monitor mode).

## Steps for the founder

1. **Create a Shopify Partner account:** https://partners.shopify.com
2. **Create a development store** from the Partners dashboard (Stores → Add store
   → Development store) for testing.
3. **Install the Shopify CLI:**
   ```bash
   npm install -g @shopify/cli @shopify/theme
   shopify version
   ```
4. **Scaffold an app** (this creates the OAuth app + `shopify.app.toml`):
   ```bash
   shopify app init
   ```
   Follow the prompts; pick a JS/remix template or "start with none" — we only
   need it as the container for the theme app extension.
5. **Drop in this extension.** Copy this repo's `extensions/makoya-widget/` folder
   into the generated app's `extensions/` directory (so you end up with
   `<your-app>/extensions/makoya-widget/blocks/makoya.liquid` and
   `.../shopify.extension.toml`).
   - If you prefer, generate a fresh extension with
     `shopify app generate extension` (type: **Theme app extension**) and then
     replace the generated `blocks/` file with our `makoya.liquid`.
6. **Run locally against the dev store:**
   ```bash
   shopify app dev
   ```
   Then in the dev store: **Online Store → Themes → Customize → Theme settings →
   App embeds**, enable **Makoya Accessibility**, paste a Site ID + Token, Save.
7. **QA on the dev store:**
   - View storefront source and confirm the contract snippet is in `<head>`
     (exact `src`, `data-site`, `data-token`, `defer`).
   - With Token blank, confirm `data-token` is omitted.
   - Confirm the launcher button renders and the panel opens.
8. **Deploy:**
   ```bash
   shopify app deploy
   ```
9. **(Later) App Store submission** — only if distributing publicly. Requires app
   review, listing assets, and a chosen billing model.

## Open decision — billing model

The billing model is **still open**: charge through the founder's **own Stripe**
(Makoya bills the merchant directly, Shopify app is "free" / bring-your-own
account) **vs. Shopify Billing** (Shopify collects, takes its revenue share, but
gives one-click install in the App Store). This choice only affects
**publishing/monetization**, not the embed code in this folder. Decide before App
Store submission.

## File map

```
shopify-app/
  SHOPIFY-SETUP.md                                  (this file)
  extensions/
    makoya-widget/
      shopify.extension.toml                        (extension config)
      blocks/
        makoya.liquid                               (the app-embed block)
```
