=== Makoya Accessibility ===
Contributors: makoya
Tags: accessibility, a11y, widget, accessibility toolbar, accessibility menu
Requires at least: 5.0
Tested up to: 6.5
Requires PHP: 7.0
Stable tag: 1.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Add the Makoya accessibility widget to your WordPress site. Paste your Site ID and Token, and visitors get a launcher button with accessibility preferences.

== Description ==

Makoya Accessibility loads the Makoya widget on your WordPress site. The widget renders a small launcher button and a settings panel that lets each visitor adjust how your site looks and behaves for them — without changing what other visitors see.

Visitor preferences include text size, letter/line spacing, contrast modes, stop-motion, a reading ruler and reading mask, highlighting links and headings, a bigger cursor, a more readable font, hiding images, saturation, text alignment, muting sounds, and read-aloud.

This plugin does not change your theme files. You enter your Site ID and Token once on the settings screen, and the plugin emits the Makoya loader script into your site's <head> on every public page.

**Where do I get my Site ID and Token?**
From your Makoya dashboard. Both are values you copy and paste — the Site ID identifies your site, and the Token is an optional signature that ties the snippet to your account.

**A note on claims**
Makoya provides accessibility *preferences and tools* for your visitors. It does not, by itself, make a website legally compliant with any standard.

== Installation ==

1. Upload the `makoya-accessibility` folder to the `/wp-content/plugins/` directory, or install the plugin through the WordPress Plugins screen.
2. Activate the plugin through the "Plugins" screen in WordPress.
3. Go to **Settings → Makoya Accessibility**.
4. Paste your **Site ID** (required) and **Token** (optional) from your Makoya dashboard.
5. Leave **Loader URL** at its default unless Makoya support tells you otherwise.
6. Save. Visit any public page of your site — the launcher button should appear.

== Frequently Asked Questions ==

= Where do I find my Site ID and Token? =

In your Makoya dashboard. Copy the Site ID and Token shown there and paste them into the plugin's settings page.

= The widget is not showing up. What should I check? =

Make sure the **Site ID** field is filled in — the plugin loads nothing without it. Then view the page source (Ctrl/Cmd+U) and confirm a `<script src="https://makoya-gamma.vercel.app/widget/loader.js" ...>` tag is present in the `<head>`. Clear any caching plugin/CDN cache after saving.

= Is the Token required? =

No. A token-less install still works in monitor mode. Adding the Token is recommended so the snippet is tied to your account.

= Does this slow down my site? =

The loader script is small and loads with `defer`, so it does not block your page from rendering.

= Will it conflict with my theme or other plugins? =

The widget's own UI runs inside Shadow DOM, isolated from your theme's CSS, and it applies visitor preferences via attributes and a single stylesheet rather than rewriting your page.

== Changelog ==

= 1.0.0 =
* Initial release.
* Settings page under Settings → Makoya Accessibility with Site ID, Token, and optional Loader URL.
* Emits the Makoya loader snippet into the site <head> on public pages when a Site ID is set.
* Clean uninstall (removes the single stored option, including across multisite).

== Upgrade Notice ==

= 1.0.0 =
Initial release.
