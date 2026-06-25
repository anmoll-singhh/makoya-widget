// @vitest-environment jsdom
/**
 * IssueCard.test.tsx
 *
 * Tests for <IssueCard> — the expandable plain-English finding card used on the
 * scanner results surface. Verifies collapsed state (chip + help headline visible)
 * and expanded state (whatItMeans + howToFix revealed after clicking the trigger).
 *
 * Pattern follows severity-components.test.tsx: jsdom docblock + jest-dom/vitest
 * import so expect.extend() picks up vitest's expect rather than a global.
 */
import "@testing-library/jest-dom/vitest";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { IssueCard } from "./IssueCard";

const baseIssue = {
  id: "issue-1",
  impact: "serious" as const,
  help: "Images must have alternate text",
  whatItMeans: "Screen readers cannot describe the image to blind users.",
  whoItAffects: "Users who rely on screen readers.",
  howToFix: "Add a descriptive alt attribute to each <img> element.",
  wcag: "1.1.1",
  element: '<img src="banner.jpg">',
};

describe("IssueCard", () => {
  it("collapsed: shows help headline and severity chip", () => {
    render(<IssueCard issue={baseIssue} />);
    // headline is always visible in the trigger row
    expect(screen.getByText(/images must have alternate text/i)).toBeInTheDocument();
    // severity chip label
    expect(screen.getByText(/serious/i)).toBeInTheDocument();
  });

  it("collapsed: shows wcag ref when present", () => {
    render(<IssueCard issue={baseIssue} />);
    expect(screen.getByText(/1\.1\.1/)).toBeInTheDocument();
  });

  it("collapsed: does not show expanded content before click", () => {
    render(<IssueCard issue={baseIssue} />);
    // Radix Accordion in jsdom may render content in the DOM but hidden,
    // or not render it at all until open. Either way, it must not be visible.
    const el = screen.queryByText(/screen readers cannot describe/i);
    // null means Radix didn't render it yet (also acceptable)
    if (el !== null) {
      expect(el).not.toBeVisible();
    } else {
      expect(el).toBeNull();
    }
  });

  it("expanded: reveals whatItMeans and howToFix after clicking trigger", () => {
    render(<IssueCard issue={baseIssue} />);
    const trigger = screen.getByRole("button");
    fireEvent.click(trigger);
    expect(screen.getByText(/screen readers cannot describe/i)).toBeVisible();
    expect(screen.getByText(/add a descriptive alt attribute/i)).toBeVisible();
  });

  it("expanded: shows element in a code block after clicking trigger", () => {
    render(<IssueCard issue={baseIssue} />);
    fireEvent.click(screen.getByRole("button"));
    const codeBlock = screen.getByText(/<img src="banner\.jpg">/);
    expect(codeBlock).toBeInTheDocument();
    // The pre element carries font-mono
    expect(codeBlock.closest("pre")).toBeInTheDocument();
  });

  it("handles null impact gracefully (renders without crashing)", () => {
    const issue = { ...baseIssue, impact: null };
    render(<IssueCard issue={issue} />);
    expect(screen.getByText(/images must have alternate text/i)).toBeInTheDocument();
  });

  it("omits howToFix section when not provided", () => {
    const issue = { ...baseIssue, howToFix: undefined };
    render(<IssueCard issue={issue} />);
    fireEvent.click(screen.getByRole("button"));
    // The "How to fix" label should not exist
    expect(screen.queryByText(/how to fix/i)).not.toBeInTheDocument();
  });

  it("omits element block when not provided", () => {
    const issue = { ...baseIssue, element: undefined };
    render(<IssueCard issue={issue} />);
    fireEvent.click(screen.getByRole("button"));
    // The offending element block uses a <pre> — it should not exist
    expect(document.querySelector("pre")).not.toBeInTheDocument();
  });
});
