import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  // Match Next.js: use the automatic JSX runtime so rendering TSX components
  // under test (e.g. the PDF document) doesn't require a manual `import React`.
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "@makoya/shared": path.resolve(__dirname, "./lib/shared/index.ts"),
    },
  },
  test: {
    environment: "node",
    // IMPORTANT: keep this broad. Other agents add `*.test.ts` files across the
    // tree that must still be discovered. Do NOT narrow this glob.
    include: ["**/*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],

    coverage: {
      // v8 is the fast, zero-instrumentation provider (already installed as
      // @vitest/coverage-v8). text -> human-readable CI log; lcov -> machine
      // report consumable by Codecov / SonarCloud / VS Code coverage gutters.
      provider: "v8",
      reporter: ["text", "lcov"],
      reportsDirectory: "./coverage",

      // Only measure the code we actually ship + unit-test: the `lib/` data,
      // scanner, pdf and util layer. App routes / React pages are exercised by
      // the (separate) Playwright + axe e2e jobs, not by vitest, so including
      // them here would report misleadingly low numbers and fight the e2e lane.
      include: ["lib/**/*.ts"],
      exclude: [
        "**/*.test.ts",
        "lib/shared/**", // generated mirror of packages/shared — not our code
        "lib/**/*.d.ts",
      ],

      // Thresholds are a REGRESSION FLOOR, intentionally set a few points below
      // the current measured numbers so CI fails when coverage drops but passes
      // today. Raise these as coverage improves — never lower them silently.
      // Measured 2026-06 on lib/**: lines 39.67 / branches 76.82 /
      // functions 58.76 / statements 39.67. Floors sit a few points under each
      // so today passes but any regression fails.
      thresholds: {
        lines: 35,
        functions: 54,
        branches: 72,
        statements: 35,
      },
    },
  },
});
