/**
 * next.config.mjs
 *
 * serverExternalPackages: playwright-core and @sparticuz/chromium bundle native
 * binaries / large assets that must NOT be inlined into the server bundle. Marking
 * them external leaves them as runtime require() from node_modules — the only safe
 * approach for the scanner engine (locally and on Vercel Lambda).
 *
 * @type {import('next').NextConfig}
 */
import path from "node:path";

const nextConfig = {
  reactStrictMode: true,

  serverExternalPackages: [
    "playwright-core",
    "@sparticuz/chromium",
    "@axe-core/playwright",
    "axe-core",
  ],

  // Monorepo root so Next can trace files outside apps/web into the function.
  outputFileTracingRoot: path.join(import.meta.dirname, "../../"),

  // The public-scan route reads HTML_CodeSniffer's bundle at runtime (second
  // engine). It's loaded via fs (not a static import), so it must be explicitly
  // traced into the Lambda or it won't exist there.
  outputFileTracingIncludes: {
    "/api/public-scan": ["../../node_modules/html_codesniffer/build/HTMLCS.js"],
  },

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
