/**
 * next.config.mjs
 *
 * serverExternalPackages: playwright-core and @sparticuz/chromium bundle native
 * binaries / large assets that must NOT be inlined into the server bundle. Marking
 * them external leaves them as runtime require() from node_modules — the only safe
 * approach for the scanner engine (locally and on Vercel Lambda).
 *
 * Security headers: a conservative, embedding-safe baseline applied to every
 * response. We deliberately DO NOT set X-Frame-Options / CSP frame-ancestors or
 * a content CSP here — the widget bundle (`/widget/core.js`) and the public
 * config API are meant to be loaded cross-origin by client sites, and the
 * dashboard renders a live-preview iframe, so a blanket framing/CSP lock would
 * break legitimate embedding. The headers we DO set (nosniff, Referrer-Policy,
 * Permissions-Policy, HSTS) harden the app without touching that contract.
 *
 * @type {import('next').NextConfig}
 */
const securityHeaders = [
  // Stop browsers from MIME-sniffing a response away from its declared type.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Send only the origin (not the full path/query) on cross-origin requests.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The app uses none of these powerful features — disable them outright.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  // Force HTTPS for a year (the app is HTTPS-only on Vercel). No `preload` so the
  // founder is never auto-committed to the browser preload list.
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const nextConfig = {
  reactStrictMode: true,

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },

  serverExternalPackages: [
    "playwright-core",
    "@sparticuz/chromium",
    "@axe-core/playwright",
    "axe-core",
  ],

  webpack: (config, { isServer }) => {
    if (isServer) {
      // playwright-core optionally imports a devtools channel package we don't need.
      config.resolve.alias = {
        ...config.resolve.alias,
        "playwright-core/lib/server/chromium/crDevTools": false,
      };
    }
    return config;
  },
};

export default nextConfig;
