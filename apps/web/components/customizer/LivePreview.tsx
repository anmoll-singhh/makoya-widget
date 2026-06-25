/**
 * LivePreview.tsx
 *
 * Renders the REAL Makoya widget bundle inside a sandboxed iframe so clients
 * see their exact configuration — color, position, icon, enabled features —
 * live as they edit, with the panel auto-opened for immediate exploration.
 *
 * Architecture decisions:
 * - We use `srcDoc` (not `src`) so the config is inlined; no round-trip to a
 *   config API is needed, and same-origin restrictions don't apply (the
 *   browser treats srcDoc iframes as about:blank origin, but `src="/widget/core.js"`
 *   is resolved against the *parent* page's origin at load time, which works
 *   perfectly for same-origin scripts).
 * - `sandbox="allow-scripts"` is the minimum surface needed.  allow-same-origin
 *   is intentionally omitted so the iframe document stays opaque and can't
 *   access the parent window's cookies / localStorage.
 * - The widget's `data-no-auto` attribute prevents the bundle's auto-init path
 *   from running; we then call `MakoyaWidget.init(config)` ourselves in an
 *   inline script after the bundle has loaded (via onload).
 * - Auto-open: 150 ms after init we simulate a click on the launcher button
 *   inside the Shadow DOM so the panel is already expanded when the preview
 *   is first seen.
 * - Each `config` change causes React to update the `srcDoc` prop, which
 *   forces the iframe to reload — the cleanest reset given the widget has no
 *   teardown/remount API.  Debouncing is the parent's responsibility (this
 *   component reacts to every prop change directly, as specified).
 * - The sample page includes a heading, body copy, a link, and a coloured
 *   image placeholder so every widget effect (contrast, text-size, highlight-
 *   links, reading-ruler …) has visible content to act on.
 */

"use client";

import { useMemo } from "react";
import type { SiteConfig } from "@/lib/sites-mappers";

// ---------------------------------------------------------------------------
// Helper — build the full HTML document that will run inside the iframe
// ---------------------------------------------------------------------------
function buildSrcDoc(config: SiteConfig): string {
  // Serialise config to JSON so we can safely embed it in the inline script.
  // JSON.stringify produces valid JS; no XSS risk here because this content
  // never reaches the DOM as HTML (it's a JS string literal in a script block).
  // Escape </ to prevent owner-editable strings from breaking the script tag.
  const configJson = JSON.stringify(config).replace(/<\//g, "<\\/");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Widget preview</title>
  <style>
    /* ── Reset & base ── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 16px;
      line-height: 1.6;
      color: #1a1a2e;
      background: #f8f9ff;
      padding: 2rem;
      min-height: 100vh;
    }

    /* ── Sample page layout ── */
    .page-wrap   { max-width: 560px; margin: 0 auto; }
    .hero-img    {
      width: 100%; height: 140px;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #06b6d4 100%);
      border-radius: 12px;
      margin-bottom: 1.5rem;
      display: flex; align-items: center; justify-content: center;
      color: #fff; font-size: 0.8rem; letter-spacing: 0.05em; font-weight: 600;
      text-transform: uppercase; opacity: 0.9;
    }
    h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.75rem; line-height: 1.3; }
    p  { margin-bottom: 1rem; color: #444; font-size: 0.95rem; }
    a  { color: #6366f1; text-decoration: underline; }
    .card {
      background: #fff; border-radius: 10px; padding: 1.25rem 1.5rem;
      box-shadow: 0 1px 4px rgba(0,0,0,.06);
      margin-top: 1.25rem;
    }
    .card h2 { font-size: 1rem; font-weight: 600; margin-bottom: 0.5rem; }
    .card p  { margin-bottom: 0; font-size: 0.875rem; }
  </style>
</head>
<body>
  <main class="page-wrap" role="main">
    <div class="hero-img" aria-hidden="true">Image placeholder</div>

    <h1>Welcome to the live preview</h1>

    <p>
      This sample page lets you see your widget exactly as visitors will.
      Try the accessibility tools in the panel — text size, contrast,
      reading ruler, and more all act on <a href="#">real page content</a>.
    </p>

    <p>
      Adjust any setting in the customiser on the left and watch this preview
      update instantly. The launcher button appears at your chosen position and
      in your chosen colour.
    </p>

    <div class="card">
      <h2>Sample card</h2>
      <p>
        A card element gives the contrast and spacing controls something
        clearly visible to act on — handy for quickly judging how your
        colour choice looks in a realistic layout.
      </p>
    </div>
  </main>

  <!-- The real Makoya widget bundle.  data-no-auto prevents the bundle's
       own auto-init from running; we call MakoyaWidget.init() below. -->
  <script src="/widget/core.js" data-no-auto></script>

  <script>
    (function () {
      var config = ${configJson};

      function openPanel () {
        try {
          var host = document.getElementById('makoya-widget-root');
          if (!host || !host.shadowRoot) return;
          var btn = host.shadowRoot.querySelector('button[aria-expanded]');
          if (btn) btn.click();
        } catch (_) {}
      }

      function initWidget () {
        try {
          if (typeof window.MakoyaWidget !== 'undefined' && window.MakoyaWidget.init) {
            window.MakoyaWidget.init(config);
            setTimeout(openPanel, 150);
          }
        } catch (err) {
          // Preview still shows the sample page; widget init failure is non-fatal.
          console.warn('[LivePreview] MakoyaWidget.init failed:', err);
        }
      }

      // The bundle is loaded synchronously before this inline script runs,
      // so MakoyaWidget should already be available.  Use DOMContentLoaded
      // as the safety net in case the bundle is still being evaluated.
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initWidget);
      } else {
        initWidget();
      }
    })();
  </script>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function LivePreview({ config }: { config: SiteConfig }) {
  const srcDoc = useMemo(() => buildSrcDoc(config), [config]);

  return (
    <div className="flex flex-col gap-3">
      {/* Browser-chrome frame — inspired by WidgetPreview.tsx */}
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] shadow-md ring-1 ring-black/[0.04]">
        {/* Traffic-light header */}
        <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--paper)] px-4 py-3">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" aria-hidden="true" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" aria-hidden="true" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" aria-hidden="true" />

          {/* Fake address bar */}
          <div className="ml-3 flex-1">
            <div className="flex items-center gap-1.5 rounded-md bg-[var(--surface-2)] px-3 py-1.5">
              <svg
                width="11"
                height="11"
                viewBox="0 0 12 12"
                fill="none"
                aria-hidden="true"
                className="shrink-0 text-[var(--ink-400)]"
              >
                <path
                  d="M6 1a3.5 3.5 0 1 0 0 7A3.5 3.5 0 0 0 6 1Zm0 9.5c-2.25 0-4.5-.75-4.5-2v-.5C1.5 7.12 3.5 6.5 6 6.5s4.5.62 4.5 1.5v.5c0 1.25-2.25 2-4.5 2Z"
                  fill="currentColor"
                />
              </svg>
              <span className="truncate font-mono text-[10px] text-[var(--ink-400)] select-none">
                yoursite.com
              </span>
            </div>
          </div>
        </div>

        {/* The live iframe */}
        <iframe
          key={srcDoc}          /* forces a fresh mount on every srcDoc change */
          title="Widget preview"
          srcDoc={srcDoc}
          sandbox="allow-scripts"
          className="block h-[560px] w-full bg-[#f8f9ff]"
        />
      </div>

      {/* Caption — no compliance claims per project rules */}
      <p className="text-center text-xs text-[var(--ink-400)]">
        Live preview — your real widget. Click the button to explore the panel.
      </p>
    </div>
  );
}
