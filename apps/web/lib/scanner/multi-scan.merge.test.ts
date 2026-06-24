/**
 * lib/scanner/multi-scan.merge.test.ts
 *
 * `mergeViolations` is the pure, deterministic core of the multi-page crawl:
 * it folds violations from several pages into one list, deduping shared DOM
 * nodes (e.g. a navbar present on every page) by (ruleId, target) and summing
 * true instance counts. It runs without a browser, so it is unit-testable here.
 *
 * The async orchestrator `runMultiPageScan` launches real Chromium and is NOT
 * exercised in this worktree (no infra) — only the merge logic is.
 */
import { describe, it, expect } from "vitest";
import { mergeViolations } from "./multi-scan";
import type { RawScanResult, RawAxeViolation, RawAxeNode } from "./types";

const node = (target: string[], html = "<x/>"): RawAxeNode => ({
  target,
  html,
  failureSummary: "fails",
});

const violation = (
  id: string,
  totalInstances: number,
  nodes: RawAxeNode[]
): RawAxeViolation => ({
  id,
  description: `${id} desc`,
  help: `${id} help`,
  impact: "serious",
  tags: ["wcag2aa"],
  helpUrl: `https://x/${id}`,
  totalInstances,
  nodes,
});

const page = (violations: RawAxeViolation[]): RawScanResult => ({
  url: "https://site.test/p",
  scannedAt: "2026-06-24T00:00:00.000Z",
  wcagLevel: "AA",
  violations,
  javascriptRendered: true,
  durationMs: 100,
});

describe("mergeViolations", () => {
  it("merges the same rule across pages into a single entry", () => {
    const merged = mergeViolations([
      page([violation("color-contrast", 2, [node(["#a"]), node(["#b"])])]),
      page([violation("color-contrast", 1, [node(["#c"])])]),
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe("color-contrast");
  });

  it("dedups identical nodes (same target) seen on multiple pages", () => {
    // A shared navbar element appears on every page; it must count once in nodes.
    const shared = node(["nav", ".logo"]);
    const merged = mergeViolations([
      page([violation("link-name", 1, [shared])]),
      page([violation("link-name", 1, [shared])]),
      page([violation("link-name", 1, [shared])]),
    ]);
    expect(merged[0].nodes).toHaveLength(1);
  });

  it("keeps distinct nodes from different pages", () => {
    const merged = mergeViolations([
      page([violation("image-alt", 1, [node(["#hero"])])]),
      page([violation("image-alt", 1, [node(["#footer"])])]),
    ]);
    expect(merged[0].nodes).toHaveLength(2);
  });

  it("sums totalInstances across pages (upper-bound prevalence)", () => {
    const merged = mergeViolations([
      page([violation("color-contrast", 5, [node(["#a"])])]),
      page([violation("color-contrast", 7, [node(["#b"])])]),
    ]);
    expect(merged[0].totalInstances).toBe(12);
  });

  it("preserves multiple distinct rules", () => {
    const merged = mergeViolations([
      page([
        violation("image-alt", 1, [node(["#i"])]),
        violation("color-contrast", 1, [node(["#c"])]),
      ]),
      page([violation("region", 1, [node(["#r"])])]),
    ]);
    expect(merged.map((m) => m.id).sort()).toEqual(["color-contrast", "image-alt", "region"]);
  });

  it("returns an empty list for no input / empty pages", () => {
    expect(mergeViolations([])).toEqual([]);
    expect(mergeViolations([page([])])).toEqual([]);
  });

  it("is deterministic for the same input", () => {
    const input = [
      page([violation("a", 2, [node(["#x"])])]),
      page([violation("a", 3, [node(["#y"])]), violation("b", 1, [node(["#z"])])]),
    ];
    expect(mergeViolations(input)).toEqual(mergeViolations(input));
  });
});
