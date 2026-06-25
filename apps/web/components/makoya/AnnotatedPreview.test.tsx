// @vitest-environment jsdom
/**
 * AnnotatedPreview.test.tsx
 *
 * Component tests for <AnnotatedPreview> — the mock-browser frame with
 * Vellum-amber annotation strokes that draw on once.
 *
 * Pattern: jsdom docblock + jest-dom/vitest import (same as ScoreMark.test.tsx).
 */
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AnnotatedPreview } from "./AnnotatedPreview";
import type { Annotation } from "./AnnotatedPreview";

// framer-motion uses ResizeObserver in jsdom; stub it to avoid warnings.
global.ResizeObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

const SAMPLE_ANNOTATIONS: Annotation[] = [
  { x: 10, y: 20, w: 30, h: 5, severity: "critical", label: "Missing alt text on hero image" },
  { x: 5, y: 60, w: 40, h: 5, severity: "serious", label: "Insufficient color contrast on nav links" },
  { x: 50, y: 80, w: 20, h: 5, severity: "minor", label: "Heading hierarchy skips a level" },
];

describe("AnnotatedPreview", () => {
  it("renders the mock-browser chrome frame", () => {
    const { container } = render(
      <AnnotatedPreview annotations={[]} />
    );
    // The chrome bar (3 dots + address pill) must be present
    expect(container.querySelector("[data-testid='browser-chrome']")).toBeInTheDocument();
    // The viewport area must be present
    expect(container.querySelector("[data-testid='browser-viewport']")).toBeInTheDocument();
  });

  it("renders one annotation marker per annotations entry", () => {
    const { container } = render(
      <AnnotatedPreview annotations={SAMPLE_ANNOTATIONS} />
    );
    const markers = container.querySelectorAll("[data-testid='annotation-marker']");
    expect(markers).toHaveLength(3);
  });

  it("exposes each annotation label as accessible text", () => {
    render(<AnnotatedPreview annotations={SAMPLE_ANNOTATIONS} />);
    // Each label appears in a visually-hidden sr-only span; now that afterEach
    // cleanup runs (wired in vitest.setup.ts), each test gets a clean DOM so
    // getByText (singular) is safe — no cross-test DOM accumulation.
    expect(screen.getByText("Missing alt text on hero image")).toBeInTheDocument();
    expect(screen.getByText("Insufficient color contrast on nav links")).toBeInTheDocument();
    expect(screen.getByText("Heading hierarchy skips a level")).toBeInTheDocument();
  });

  it("renders zero annotation markers when annotations is empty", () => {
    const { container } = render(
      <AnnotatedPreview annotations={[]} />
    );
    const markers = container.querySelectorAll("[data-testid='annotation-marker']");
    expect(markers).toHaveLength(0);
  });

  it("renders a neutral placeholder when src is omitted", () => {
    const { container } = render(
      <AnnotatedPreview annotations={[]} />
    );
    expect(container.querySelector("[data-testid='viewport-placeholder']")).toBeInTheDocument();
  });

  it("renders an <img> when src is a string URL", () => {
    const { container } = render(
      <AnnotatedPreview src="https://example.com/screenshot.png" annotations={[]} />
    );
    const img = container.querySelector("img");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "https://example.com/screenshot.png");
  });

  it("renders ReactNode children when src is a ReactNode", () => {
    render(
      <AnnotatedPreview src={<div>Custom page content</div>} annotations={[]} />
    );
    expect(screen.getByText("Custom page content")).toBeInTheDocument();
  });

  it("renders in static mode without animation errors", () => {
    const { container } = render(
      <AnnotatedPreview annotations={SAMPLE_ANNOTATIONS} mode="static" />
    );
    const markers = container.querySelectorAll("[data-testid='annotation-marker']");
    expect(markers).toHaveLength(3);
  });

  it("accepts beforeAfter prop (reserved — renders after content by default)", () => {
    render(
      <AnnotatedPreview
        annotations={[]}
        beforeAfter={{
          before: <div>Before content</div>,
          after: <div>After content</div>,
        }}
      />
    );
    // Renders the "after" content by default (split-drag deferred)
    expect(screen.getByText("After content")).toBeInTheDocument();
  });
});
