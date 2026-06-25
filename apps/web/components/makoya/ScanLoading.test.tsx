// @vitest-environment jsdom
/**
 * ScanLoading.test.tsx
 *
 * Component tests for <ScanLoading> — the methodical margin-fill line-tick loader.
 *
 * TDD step 1: failing tests that drive the implementation.
 * Pattern: jsdom docblock + jest-dom/vitest import (see AnnotationMargin.test.tsx).
 */
import "@testing-library/jest-dom/vitest";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ScanLoading } from "./ScanLoading";

describe("ScanLoading", () => {
  it("renders the root with role=status and aria-live=polite", () => {
    render(<ScanLoading />);
    const root = screen.getByRole("status");
    expect(root).toBeInTheDocument();
    expect(root).toHaveAttribute("aria-live", "polite");
  });

  it("renders the label text when provided", () => {
    render(<ScanLoading label="Scanning your site…" />);
    expect(screen.getByText("Scanning your site…")).toBeInTheDocument();
  });

  it("renders no label text when label is omitted", () => {
    const { container } = render(<ScanLoading />);
    // The status region should exist but carry no visible label text
    const root = container.querySelector('[role="status"]');
    expect(root).toBeInTheDocument();
    // No text content beyond what the ticks produce (ticks are aria-hidden)
    expect(root?.textContent?.trim()).toBe("");
  });

  it("renders a column of tick elements (at least 10 ticks)", () => {
    const { container } = render(<ScanLoading />);
    const ticks = container.querySelectorAll("[data-testid='scan-tick']");
    expect(ticks.length).toBeGreaterThanOrEqual(10);
  });

  it("all ticks are aria-hidden (decorative)", () => {
    const { container } = render(<ScanLoading />);
    const ticks = container.querySelectorAll("[data-testid='scan-tick']");
    ticks.forEach((tick) => {
      expect(tick).toHaveAttribute("aria-hidden", "true");
    });
  });

  it("with progress=0.5, roughly half the ticks are marked filled", () => {
    const { container } = render(<ScanLoading progress={0.5} />);
    const filled = container.querySelectorAll("[data-testid='scan-tick'][data-filled='true']");
    const total = container.querySelectorAll("[data-testid='scan-tick']");
    expect(filled.length).toBeGreaterThan(0);
    expect(filled.length).toBeLessThan(total.length);
    // Should be approximately half (within ±2)
    const expected = Math.round(total.length * 0.5);
    expect(Math.abs(filled.length - expected)).toBeLessThanOrEqual(2);
  });

  it("with progress=1, all ticks are marked filled", () => {
    const { container } = render(<ScanLoading progress={1} />);
    const filled = container.querySelectorAll("[data-testid='scan-tick'][data-filled='true']");
    const total = container.querySelectorAll("[data-testid='scan-tick']");
    expect(filled.length).toBe(total.length);
  });

  it("with progress=0, no ticks are marked filled", () => {
    const { container } = render(<ScanLoading progress={0} />);
    const filled = container.querySelectorAll("[data-testid='scan-tick'][data-filled='true']");
    expect(filled.length).toBe(0);
  });
});
