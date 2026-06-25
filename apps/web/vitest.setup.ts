// Mock server-only for test environments
import { vi } from "vitest";
vi.mock("server-only", () => ({}))

// Note on jest-dom: the plain `@testing-library/jest-dom` entry point calls
// `expect.extend()` expecting `expect` to be a global. Because `globals: true`
// is NOT set in vitest.config.ts, that global isn't available in setupFiles.
// Instead, each jsdom component test imports `@testing-library/jest-dom/vitest`
// directly — that entry point imports `expect` from the `vitest` module itself,
// so it works regardless of globals configuration.
// See components/makoya/severity-components.test.tsx for the established pattern.
