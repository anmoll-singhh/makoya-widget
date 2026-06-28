import { describe, it, expect } from "vitest";
import { getScoreTrend } from "./scans";

const SITE = "11111111-1111-1111-1111-111111111111";

/**
 * Minimal in-memory fake of the Supabase query builder for the `scans` table,
 * modelling exactly the chain getScoreTrend uses:
 *   .from("scans").select(...).eq(...).order("created_at",{ascending}).limit(n)
 * The terminal `.limit()` resolves to `{ data, error }`. Rows are stored
 * newest-first or any order; the fake honours the `order`/`limit` so the test
 * exercises the real "fetch newest N, reverse to chronological" logic.
 */
function makeFakeClient(rows: any[], error: any = null) {
  return {
    from() {
      const state = { asc: false as boolean, lim: Infinity };
      const builder: any = {
        select() {
          return builder;
        },
        eq() {
          return builder;
        },
        order(_col: string, opts: { ascending: boolean }) {
          state.asc = opts.ascending;
          return builder;
        },
        limit(n: number) {
          state.lim = n;
          if (error) return Promise.resolve({ data: null, error });
          const sorted = [...rows].sort((a, b) =>
            state.asc
              ? a.created_at.localeCompare(b.created_at)
              : b.created_at.localeCompare(a.created_at)
          );
          return Promise.resolve({ data: sorted.slice(0, n), error: null });
        },
      };
      return builder;
    },
  } as any;
}

describe("getScoreTrend", () => {
  it("returns points oldest → newest with mapped fields", async () => {
    const client = makeFakeClient([
      { score: 70, created_at: "2026-01-01T00:00:00Z" },
      { score: 82, created_at: "2026-03-01T00:00:00Z" },
      { score: 76, created_at: "2026-02-01T00:00:00Z" },
    ]);
    const trend = await getScoreTrend(client, SITE);
    expect(trend).toEqual([
      { scannedAt: "2026-01-01T00:00:00Z", score: 70 },
      { scannedAt: "2026-02-01T00:00:00Z", score: 76 },
      { scannedAt: "2026-03-01T00:00:00Z", score: 82 },
    ]);
  });

  it("keeps only the most recent N then returns them chronologically", async () => {
    const rows = Array.from({ length: 20 }, (_, i) => ({
      score: i,
      created_at: `2026-01-${String(i + 1).padStart(2, "0")}T00:00:00Z`,
    }));
    const trend = await getScoreTrend(client_(rows), SITE, 12);
    expect(trend).toHaveLength(12);
    // Newest 12 are days 9..20 (scores 8..19), returned oldest-first.
    expect(trend[0].score).toBe(8);
    expect(trend[trend.length - 1].score).toBe(19);
  });

  it("drops rows with a non-numeric score defensively", async () => {
    const client = makeFakeClient([
      { score: 90, created_at: "2026-01-01T00:00:00Z" },
      { score: null, created_at: "2026-01-02T00:00:00Z" },
      { score: "x", created_at: "2026-01-03T00:00:00Z" },
    ]);
    const trend = await getScoreTrend(client, SITE);
    expect(trend).toEqual([{ scannedAt: "2026-01-01T00:00:00Z", score: 90 }]);
  });

  it("returns an empty array when there are no scans", async () => {
    expect(await getScoreTrend(makeFakeClient([]), SITE)).toEqual([]);
  });

  it("throws on an infra error", async () => {
    await expect(getScoreTrend(makeFakeClient([], { message: "boom" }), SITE)).rejects.toBeTruthy();
  });
});

// tiny alias so the long-array test reads cleanly
function client_(rows: any[]) {
  return makeFakeClient(rows);
}
