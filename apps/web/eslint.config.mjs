/**
 * eslint.config.mjs — ESLint 9 flat config for apps/web.
 *
 * Strategy: NON-BLOCKING on legacy code. This repo predates linting, so a strict
 * config would mass-fail hundreds of existing lines and block every PR. Instead we:
 *   - extend Next.js' recommended + core-web-vitals rules (the de-facto standard
 *     for a Next 15 app) via FlatCompat, and
 *   - downgrade the noisiest rules to "warn" so `eslint .` reports issues without
 *     a non-zero exit on legacy patterns.
 *
 * The CI lint job runs `eslint . --max-warnings=-1` (warnings allowed) so it
 * surfaces problems without gating merges.
 *
 * HOW TO TIGHTEN LATER:
 *   1. Fix the warnings in a focused PR.
 *   2. Flip rules from "warn" -> "error" below (or remove the override).
 *   3. Change the CI step to `eslint . --max-warnings=0` to make it blocking.
 */
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "coverage/**",
      "lib/shared/**", // generated mirror — never lint
      "public/**", // shipped widget bundles (minified) — not source
      "next-env.d.ts",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // Legacy-friendly downgrades. Remove these as the codebase is cleaned up.
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      "react/no-unescaped-entities": "warn",
      "@next/next/no-img-element": "warn",
    },
  },
];

export default config;
