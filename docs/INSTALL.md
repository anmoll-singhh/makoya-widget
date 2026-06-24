# Installing the Makoya widget

The Makoya accessibility widget is a single `<script>` tag you paste once. It
loads a launcher button and a settings panel that lets each visitor adjust your
site for their needs (text size, spacing, contrast, reading aids, and more).

## Where do I get my Site ID and Token?

Both come from your **Makoya dashboard**:

- **Site ID** — the UUID that identifies your site.
- **Token** — an optional signature that ties the snippet to your account.

Open your dashboard, copy the Site ID and Token, and substitute them into the
snippet below wherever you see `SITE_ID` and `SITE_TOKEN`.

## The snippet

This is the exact snippet every install path uses. Paste it just before the
closing `</head>` tag of your site:

```html
<script src="https://makoya-gamma.vercel.app/widget/loader.js" data-site="SITE_ID" data-token="SITE_TOKEN" defer></script>
```

> **The Token is optional.** If you don't have one yet, you can paste a token-less
> snippet and it still works in monitor mode:
>
> ```html
> <script src="https://makoya-gamma.vercel.app/widget/loader.js" data-site="SITE_ID" defer></script>
> ```
>
> Adding the Token later is recommended.

You only paste this **once**. The `loader.js` URL never changes; new widget
features ship automatically.

---

## Shopify

You have two options.

### Option A — Theme code (fastest)

1. In your Shopify admin, go to **Online Store → Themes**.
2. On your live theme, click **⋯ → Edit code**.
3. Open **`layout/theme.liquid`**.
4. Paste the snippet immediately **before** the `</head>` tag:
   ```html
   <script src="https://makoya-gamma.vercel.app/widget/loader.js" data-site="SITE_ID" data-token="SITE_TOKEN" defer></script>
   ```
5. **Save.**

### Option B — Makoya app embed (no code)

If you have installed the Makoya Shopify app:

1. **Online Store → Themes → Customize.**
2. **Theme settings → App embeds.**
3. Enable **Makoya Accessibility**.
4. Paste your **Site ID** and **Token**.
5. **Save.**

---

## WordPress

You have two options.

### Option A — Makoya Accessibility plugin (recommended)

1. Install and activate the **Makoya Accessibility** plugin
   (`wordpress-plugin/makoya-accessibility/`).
2. Go to **Settings → Makoya Accessibility**.
3. Paste your **Site ID** (required) and **Token** (optional).
4. **Save Changes.** The plugin emits the snippet into your site `<head>`
   automatically.

### Option B — A generic header-snippet plugin

If you prefer not to install the Makoya plugin, use any "insert headers and
footers" / "header scripts" plugin:

1. Install a header-snippet plugin (e.g. one that adds code to the `<head>`).
2. Paste the snippet into its **Header / `<head>`** field:
   ```html
   <script src="https://makoya-gamma.vercel.app/widget/loader.js" data-site="SITE_ID" data-token="SITE_TOKEN" defer></script>
   ```
3. **Save.**

---

## Wix

1. In your Wix dashboard, go to **Settings → Custom Code** (under "Advanced").
2. Click **+ Add Custom Code**.
3. Paste the snippet:
   ```html
   <script src="https://makoya-gamma.vercel.app/widget/loader.js" data-site="SITE_ID" data-token="SITE_TOKEN" defer></script>
   ```
4. Set **Add Code to Pages** → **All pages**.
5. Set **Place Code in** → **Head**.
6. **Apply.**

---

## Squarespace

1. Go to **Settings → Advanced → Code Injection**.
2. Paste the snippet into the **Header** box:
   ```html
   <script src="https://makoya-gamma.vercel.app/widget/loader.js" data-site="SITE_ID" data-token="SITE_TOKEN" defer></script>
   ```
3. **Save.**

> Code Injection requires a Business or Commerce plan on Squarespace.

---

## Webflow

1. Open your project, then go to **Project settings → Custom code**.
2. Paste the snippet into the **Head code** box:
   ```html
   <script src="https://makoya-gamma.vercel.app/widget/loader.js" data-site="SITE_ID" data-token="SITE_TOKEN" defer></script>
   ```
3. **Save changes**, then **Publish** your site (custom code only runs on
   published sites).

---

## Raw HTML / any other site

Paste the snippet just before `</head>` in your page template:

```html
<head>
  <!-- ... your existing head ... -->
  <script src="https://makoya-gamma.vercel.app/widget/loader.js" data-site="SITE_ID" data-token="SITE_TOKEN" defer></script>
</head>
```

That's it — load any page and the launcher button appears.

---

## Verifying it works

1. Open your published site in a normal browser tab.
2. Look for the Makoya launcher button (in a corner of the screen).
3. Click it — the settings panel should open and toggles should affect the page.

If you don't see it: view the page source and confirm the
`https://makoya-gamma.vercel.app/widget/loader.js` script tag is present in the
`<head>`, that `data-site` matches your Site ID, and (if you have a caching
plugin/CDN) clear the cache after pasting.

---

## A note on claims

Makoya offers accessibility **preferences and tools** for your visitors. It does
not, by itself, make your website legally compliant with any accessibility
standard.
