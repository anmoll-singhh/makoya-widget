// @vitest-environment jsdom
/**
 * ScoreTrendChart.test.tsx — render tests for the Overview score-trend sparkline.
 * jsdom per-file (docblock) so the global vitest environment stays "node".
 */
import "@testing-library/jest-dom/vitest";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ScoreTrendChart } from "./ScoreTrendChart";

describe("ScoreTrendChart", () => {
  it("shows an honest empty state when there are fewer than two points", () => {
    render(<ScoreTrendChart points={[{ scannedAt: "2026-01-01T00:00:00Z", score: 80 }]} />);
    expect(screen.getByText(/not enough scan history/i)).toBeInTheDocument();
    // No chart drawn.
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("shows the empty state with no points at all", () => {
    render(<ScoreTrendChart points={[]} />);
    expect(screen.getByText(/not enough scan history/i)).toBeInTheDocument();
  });

  it("renders an accessible line chart with a text summary when ≥2 points", () => {
    render(
      <ScoreTrendChart
        points={[
          { scannedAt: "2026-01-01T00:00:00Z", score: 60 },
          { scannedAt: "2026-02-01T00:00:00Z", score: 75 },
          { scannedAt: "2026-03-01T00:00:00Z", score: 88 },
        ]}
      />
    );
    const chart = screen.getByRole("img");
    expect(chart).toBeInTheDocument();
    // Accessible summary names the latest score + upward direction.
    expect(chart).toHaveAttribute("aria-label", expect.stringContaining("latest 88"));
    expect(chart).toHaveAttribute("aria-label", expect.stringContaining("up 28"));
  });
});
