/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@makoya/shared"],
  // Supabase is optional in mock mode; don't fail the build if it's absent.
  webpack: (config) => {
    config.resolve.fallback = { ...config.resolve.fallback };
    return config;
  },
};
export default nextConfig;
