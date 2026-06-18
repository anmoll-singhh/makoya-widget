import { defineConfig } from "vite";
import { resolve } from "node:path";

/**
 * We build TWO separate IIFE bundles from one config, selected by the
 * BUILD_TARGET env var (see package.json scripts):
 *   - loader  → dist/loader.js   (stable URL, tiny, clients paste this)
 *   - core    → dist/core.js     (versioned, holds the actual widget)
 *
 * IIFE format = a self-running bundle that needs no module system, so it
 * works when dropped into any website with a plain <script> tag.
 */
const target = process.env.BUILD_TARGET === "loader" ? "loader" : "core";

export default defineConfig({
  define: {
    // Strip process.env references in browser build.
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  build: {
    // Don't wipe the other bundle when building the second target.
    emptyOutDir: target === "core",
    target: "es2019",
    minify: "esbuild",
    lib: {
      entry:
        target === "loader"
          ? resolve(__dirname, "src/loader.ts")
          : resolve(__dirname, "src/core/index.ts"),
      formats: ["iife"],
      name: target === "loader" ? "MakoyaLoader" : "MakoyaCore",
      fileName: () => `${target}.js`,
    },
    rollupOptions: {
      output: { entryFileNames: `${target}.js` },
    },
  },
  resolve: {
    alias: {
      "@makoya/shared": resolve(__dirname, "../shared/src/index.ts"),
    },
  },
});
