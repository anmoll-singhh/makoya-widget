import { describe, it, expect } from "vitest";
import { renderReportPdf, reportFilename } from "./render-report";

describe("renderReportPdf", () => {
  it("renders valid, non-trivial PDF bytes", async () => {
    const buf = await renderReportPdf({
      url: "https://shop.example/products",
      score: 72,
      totals: { critical: 1, serious: 3, moderate: 2, minor: 4 },
      topIssues: [
        {
          id: "color-contrast",
          impact: "serious",
          help: "Text is hard to read against its background",
          whatItMeans: "Some text doesn't stand out enough from its background colour.",
          whoItAffects: "People with low vision or colour blindness.",
        },
      ],
      isPartialScan: false,
    });
    // %PDF magic header + a real page worth of bytes.
    expect(buf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(buf.length).toBeGreaterThan(1000);
  }, 20_000);

  it("renders a clean (zero-issue) report without throwing", async () => {
    const buf = await renderReportPdf({
      url: "https://clean.example",
      score: 100,
      totals: { critical: 0, serious: 0, moderate: 0, minor: 0 },
      topIssues: [],
    });
    expect(buf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  }, 20_000);

  it("tolerates a hostile/invalid impact value without crashing", async () => {
    const buf = await renderReportPdf({
      url: "https://x.example",
      score: 50,
      totals: { critical: 0, serious: 0, moderate: 0, minor: 1 },
      // @ts-expect-error — deliberately invalid impact to prove the coercion guard
      topIssues: [{ id: "x", impact: "EXPLODE", help: "h", whatItMeans: "w", whoItAffects: "a" }],
    });
    expect(buf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  }, 20_000);

  it("derives a safe filename from the host", () => {
    expect(reportFilename("https://shop.example/x")).toBe("makoya-report-shop.example.pdf");
    expect(reportFilename("not a url")).toBe("makoya-report-site.pdf");
  });
});
