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
    include: ["**/*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
  },
});
