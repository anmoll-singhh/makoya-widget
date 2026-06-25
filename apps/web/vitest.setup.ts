// Mock server-only for test environments
import { vi, afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
vi.mock("server-only", () => ({}))

// React Testing Library cleanup after each test.
// `globals: true` is NOT set in vitest.config.ts, so RTL's automatic cleanup
// (which depends on a global `afterEach`) does not run. We wire it here at the
// setup level so every component test gets isolation without having to import
// cleanup individually.
afterEach(() => cleanup());

// Note on jest-dom: the plain `@testing-library/jest-dom` entry point calls
// `expect.extend()` expecting `expect` to be a global. Because `globals: true`
// is NOT set in vitest.config.ts, that global isn't available in setupFiles.
// Instead, each jsdom component test imports `@testing-library/jest-dom/vitest`
// directly — that entry point imports `expect` from the `vitest` module itself,
// so it works regardless of globals configuration.
// See components/makoya/severity-components.test.tsx for the established pattern.
