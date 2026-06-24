# Manual test — Makoya Accessibility (WordPress plugin)

This plugin could **not** be syntax-checked on the build machine: `php` is **not
installed** there, so `php -l makoya-accessibility.php` (and the same for
`uninstall.php`) was **NOT run**. The code was reviewed structurally only
(balanced braces, matching `<?php` with no closing `?>`, escaping/sanitization).
**You must verify PHP syntax at install time** on a real WordPress box.

> Quick syntax check on any machine with PHP:
> ```
> php -l makoya-accessibility.php
> php -l uninstall.php
> ```
> Both should print `No syntax errors detected ...`.

---

## 1. Install on a local WordPress

Use any local WP stack (Local by Flywheel, wp-env, MAMP, XAMPP, or a Docker
`wordpress` image).

1. Copy the whole `makoya-accessibility/` folder into
   `wp-content/plugins/makoya-accessibility/`.
   (Or zip the folder and upload via **Plugins → Add New → Upload Plugin**.)
2. Log in to `/wp-admin`.
3. Go to **Plugins**, find **Makoya Accessibility**, click **Activate**.
   - PASS: it activates with no PHP fatal error / white screen.
   - If you see a parse error here, run `php -l` (above) and fix the syntax.

## 2. Configure Site ID + Token

1. Go to **Settings → Makoya Accessibility**.
2. Enter:
   - **Site ID:** a real site UUID from your Makoya dashboard
     (for a smoke test you can paste any non-empty string).
   - **Token:** the token from your Makoya dashboard (optional — try once with,
     once without).
   - **Loader URL:** leave as the default
     `https://makoya-gamma.vercel.app/widget/loader.js`.
3. Click **Save Changes**.
   - PASS: the page reloads showing your saved values, with an admin notice
     "Settings saved."

## 3. Confirm the contract snippet renders in `<head>`

1. Open the **public** site (not wp-admin) in a normal browser tab.
2. View source (**Ctrl/Cmd + U**) and search for `makoya`.
3. With **both** Site ID and Token set, the `<head>` must contain **exactly**:

   ```html
   <script src="https://makoya-gamma.vercel.app/widget/loader.js" data-site="YOUR_SITE_ID" data-token="YOUR_TOKEN" defer></script>
   ```

   - The `src` must be your saved Loader URL (default above).
   - `data-site` must equal your Site ID; `data-token` your Token.
   - `defer` must be present.

4. With **Token blank**, the snippet must omit `data-token` entirely (back-compat):

   ```html
   <script src="https://makoya-gamma.vercel.app/widget/loader.js" data-site="YOUR_SITE_ID" defer></script>
   ```

5. With **Site ID blank**, there must be **no** Makoya `<script>` in the page at all.

## 4. Confirm the launcher renders

1. On the public site, with a valid Site ID, look for the Makoya launcher
   button (corner of the viewport).
2. Click it → the settings panel opens.
3. Toggle a preference (e.g. larger text) → the page reflects it.
   - PASS: launcher appears and the panel works. (If the loader 404s, the button
     will not appear — check that the Site ID is provisioned and the Loader URL
     is reachable.)

## 5. Uninstall cleanup

1. **Deactivate** then **Delete** the plugin from the Plugins screen.
2. Confirm the `makoya_settings` option is gone, e.g.:
   ```
   wp option get makoya_settings
   ```
   - PASS: returns "Could not get ... option does not exist" (i.e. removed).

---

## Reviewer checklist (what to look for in code review)

- `if ( ! defined( 'ABSPATH' ) ) exit;` guards the main file.
- `if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) exit;` guards `uninstall.php`.
- No PHP closing tag (`?>`) at the end of either file.
- Inputs sanitized: `sanitize_text_field` (Site ID, Token), `esc_url_raw` (Loader URL).
- Output escaped: `esc_attr` (data-* values), `esc_url` (src).
- Snippet only emitted when Site ID is non-empty and not in admin.
- All functions and the option name prefixed `makoya_`.
