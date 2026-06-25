// @vitest-environment jsdom
/**
 * severity-components.test.tsx
 *
 * Render tests for <SeverityChip> and <SeverityBar>.
 * Uses jsdom per-file (via the docblock above) so the global vitest environment
 * stays "node" for all existing node tests — only this file pays the jsdom cost.
 *
 * Why jest-dom is imported here and not in vitest.setup.ts:
 * @testing-library/jest-dom calls expect.extend() at module load time. In the
 * global "node" setupFiles context vitest's `expect` global isn't injected yet,
 * causing a ReferenceError. Importing it here — after the jsdom docblock ensures
 * the correct environment is active — lets expect.extend() succeed every time.
 */
// Use the vitest-specific jest-dom entry which imports `expect` from vitest
// rather than relying on a global — required because globals: true is not set.
import "@testing-library/jest-dom/vitest";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SeverityChip } from "./SeverityChip";
import { SeverityBar } from "./SeverityBar";

describe("severity components", () => {
  it("chip shows label + count", () => {
    render(<SeverityChip severity="critical" count={3} />);
    expect(screen.getByText(/critical/i)).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });
  it("bar summarizes counts in an accessible label", () => {
    render(<SeverityBar totals={{ critical: 1, serious: 2, moderate: 0, minor: 4 }} />);
    expect(screen.getByLabelText(/1 critical/i)).toBeInTheDocument();
  });
});
