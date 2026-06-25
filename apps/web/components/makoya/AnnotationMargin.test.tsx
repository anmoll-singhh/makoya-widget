// @vitest-environment jsdom
/**
 * AnnotationMargin.test.tsx
 *
 * Component tests for <AnnotationMargin> — the structural gutter primitive.
 *
 * Pattern follows severity-components.test.tsx: jsdom docblock, jest-dom imported
 * at file scope so expect.extend() runs after vitest's expect is injected.
 */
import "@testing-library/jest-dom/vitest";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AnnotationMargin } from "./AnnotationMargin";

describe("AnnotationMargin", () => {
  it("renders children in the content column", () => {
    render(
      <AnnotationMargin>
        <p>Hello margin world</p>
      </AnnotationMargin>,
    );
    expect(screen.getByText("Hello margin world")).toBeInTheDocument();
  });

  it("renders a decorative gutter element with role=presentation", () => {
    const { container } = render(
      <AnnotationMargin>
        <span>content</span>
      </AnnotationMargin>,
    );
    // The gutter div must carry role="presentation" so assistive tech skips it
    const gutter = container.querySelector('[role="presentation"]');
    expect(gutter).toBeInTheDocument();
  });

  it("renders exactly one tick per marks entry", () => {
    const marks = [
      { at: 0, severity: "critical" as const },
      { at: 2, severity: "moderate" as const },
      { at: 5 }, // no severity — neutral tick
    ];
    const { container } = render(
      <AnnotationMargin marks={marks}>
        <div>content</div>
      </AnnotationMargin>,
    );
    // Ticks are aria-hidden decorative elements with data-testid="annotation-tick"
    const ticks = container.querySelectorAll("[data-testid='annotation-tick']");
    expect(ticks).toHaveLength(3);
  });

  it("renders zero ticks when marks is empty", () => {
    const { container } = render(
      <AnnotationMargin marks={[]}>
        <div>content</div>
      </AnnotationMargin>,
    );
    const ticks = container.querySelectorAll("[data-testid='annotation-tick']");
    expect(ticks).toHaveLength(0);
  });

  it("renders zero ticks when marks is omitted", () => {
    const { container } = render(
      <AnnotationMargin>
        <div>content</div>
      </AnnotationMargin>,
    );
    const ticks = container.querySelectorAll("[data-testid='annotation-tick']");
    expect(ticks).toHaveLength(0);
  });

  it("renders line numbers when lineCount is given", () => {
    const { container } = render(
      <AnnotationMargin lineCount={3}>
        <div>content</div>
      </AnnotationMargin>,
    );
    // Line numbers are aria-hidden spans with data-testid="annotation-line"
    const lines = container.querySelectorAll("[data-testid='annotation-line']");
    expect(lines).toHaveLength(3);
  });
});
