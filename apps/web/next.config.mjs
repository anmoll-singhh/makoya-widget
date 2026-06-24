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
const nextConfig = {
  reactStrictMode: true,

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
