// @vitest-environment jsdom
/**
 * _PublicStatementView.test.tsx — render test for the public statement page body.
 * jsdom per-file (docblock) so the global vitest environment stays "node".
 */
import "@testing-library/jest-dom/vitest";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PublicStatementView } from "./_PublicStatementView";

describe("PublicStatementView", () => {
  it("renders the stored statement html inside a landmark", () => {
    const html =
      '<section class="accessibility-statement"><h2 id="h">Accessibility Statement</h2>' +
      "<p>Acme Co is committed to digital accessibility.</p></section>";
    render(<PublicStatementView html={html} />);
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /accessibility statement/i })).toBeInTheDocument();
    expect(screen.getByText(/committed to digital accessibility/i)).toBeInTheDocument();
  });

  it("adds an honest, non-certification footer (no compliance claim)", () => {
    render(<PublicStatementView html="<p>hello</p>" />);
    const text = document.body.textContent ?? "";
    expect(text).toMatch(/not a legal certification/i);
    expect(text.toLowerCase()).not.toContain("certified");
    expect(text.toLowerCase()).not.toContain("guaranteed");
  });
});
