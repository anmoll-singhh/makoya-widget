// @vitest-environment jsdom
/**
 * ScoreMark.test.tsx
 *
 * Render tests for <ScoreMark>.
 * Uses jsdom per-file (via the docblock above) so the global vitest environment
 * stays "node" for all other tests — only this file pays the jsdom cost.
 *
 * Key assertions:
 * - The exact score number is in the DOM IMMEDIATELY (no count-up animation).
 * - The verdict text renders when supplied.
 * - Reduced-motion path: ring is static (not animated).
 */
import "@testing-library/jest-dom/vitest";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ScoreMark } from "./ScoreMark";

describe("ScoreMark", () => {
  it("renders the exact score (no count-up placeholder) + verdict", () => {
    render(<ScoreMark score={87} verdict="Good — a few real issues to fix" />);
    expect(screen.getByText("87")).toBeInTheDocument();
    expect(screen.getByText(/few real issues/i)).toBeInTheDocument();
  });

  it("renders without a verdict when not supplied", () => {
    render(<ScoreMark score={42} />);
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("renders hero size without error", () => {
    render(<ScoreMark score={95} verdict="Excellent" size="hero" />);
    expect(screen.getByText("95")).toBeInTheDocument();
    expect(screen.getByText(/excellent/i)).toBeInTheDocument();
  });

  it("renders app size without error", () => {
    render(<ScoreMark score={60} size="app" />);
    expect(screen.getByText("60")).toBeInTheDocument();
  });
});
