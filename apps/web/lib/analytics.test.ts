import { describe, it, expect } from "vitest";
import { summarizeDaily, recordEvents, getWidgetAnalytics } from "./analytics";

// ── summarizeDaily: the PURE shaping core (fully unit-tested) ──────────────────
describe("summarizeDaily", () => {
  it("returns the empty shape for no rows", () => {
    expect(summarizeDaily([])).toEqual({
      opens: 0,
      featureActivations: 0,
      mostUsed: null,
      opensOverTime: [],
      usageByFeature: [],
    });
  });

  it("sums opens-only rows and builds an ascending per-day series", () => {
    const out = summarizeDaily([
      { day: "2026-06-03", event: "open", feature_key: "", count: 2 },
      { day: "2026-06-01", event: "open", feature_key: "", count: 5 },
      { day: "2026-06-01", event: "open", feature_key: "", count: 1 }, // same day, accumulates
    ]);
    expect(out.opens).toBe(8);
    expect(out.featureActivations).toBe(0);
    expect(out.mostUsed).toBeNull();
    expect(out.usageByFeature).toEqual([]);
    expect(out.opensOverTime).toEqual([
      { day: "2026-06-01", count: 6 },
      { day: "2026-06-03", count: 2 },
    ]);
  });

  it("aggregates mixed opens + feature activations", () => {
    const out = summarizeDaily([
      { day: "2026-06-01", event: "open", feature_key: "", count: 10 },
      { day: "2026-06-01", event: "feature_activated", feature_key: "contrast", count: 3 },
      { day: "2026-06-02", event: "feature_activated", feature_key: "contrast", count: 4 },
      { day: "2026-06-02", event: "feature_activated", feature_key: "textSize", count: 5 },
    ]);
    expect(out.opens).toBe(10);
    expect(out.featureActivations).toBe(12);
    // descending by count
    expect(out.usageByFeature).toEqual([
      { featureKey: "contrast", count: 7 },
      { featureKey: "textSize", count: 5 },
    ]);
    expect(out.mostUsed).toEqual({ featureKey: "contrast", count: 7 });
    expect(out.opensOverTime).toEqual([{ day: "2026-06-01", count: 10 }]);
  });

  it("breaks ties on equal counts by ascending featureKey (stable order)", () => {
    const out = summarizeDaily([
      { day: "2026-06-01", event: "feature_activated", feature_key: "zoom_unused", count: 2 },
      { day: "2026-06-01", event: "feature_activated", feature_key: "bigCursor", count: 2 },
      { day: "2026-06-01", event: "feature_activated", feature_key: "contrast", count: 2 },
    ]);
    expect(out.usageByFeature.map((u) => u.featureKey)).toEqual([
      "bigCursor",
      "contrast",
      "zoom_unused",
    ]);
    expect(out.mostUsed).toEqual({ featureKey: "bigCursor", count: 2 });
  });

  it("ignores feature_activated rows with an empty feature_key in usageByFeature", () => {
    const out = summarizeDaily([
      { day: "2026-06-01", event: "feature_activated", feature_key: "", count: 4 },
      { day: "2026-06-01", event: "feature_activated", feature_key: "contrast", count: 1 },
    ]);
    // featureActivations still counts the empty-key row's total
    expect(out.featureActivations).toBe(5);
    expect(out.usageByFeature).toEqual([{ featureKey: "contrast", count: 1 }]);
  });
});

// ── A minimal in-memory fake Supabase client (no live DB) ──────────────────────
function makeFakeClient() {
  const daily = new Map<
    string,
    { site_id: string; day: string; event: string; feature_key: string; count: number }
  >();
  const raw: any[] = [];
  const keyOf = (r: { site_id: string; day: string; event: string; feature_key: string }) =>
    `${r.site_id}|${r.day}|${r.event}|${r.feature_key}`;

  function from(table: string) {
    const state: { filters: Record<string, any>; gte?: { col: string; val: string } } = {
      filters: {},
    };
    const builder: any = {
      select() {
        return builder;
      },
      insert(rows: any[]) {
        if (table === "widget_events") raw.push(...rows);
        return Promise.resolve({ error: null });
      },
      upsert(row: any) {
        if (table === "widget_event_daily") daily.set(keyOf(row), row);
        return Promise.resolve({ error: null });
      },
      eq(col: string, val: any) {
        state.filters[col] = val;
        return builder;
      },
      gte(col: string, val: string) {
        state.gte = { col, val };
        return builder;
      },
      maybeSingle() {
        if (table === "widget_event_daily") {
          const k = `${state.filters.site_id}|${state.filters.day}|${state.filters.event}|${state.filters.feature_key}`;
          return Promise.resolve({ data: daily.get(k) ?? null, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      },
      then(resolve: (v: any) => void) {
        let rows = [...daily.values()].filter((r) => r.site_id === state.filters.site_id);
        if (state.gte && state.gte.col === "day")
          rows = rows.filter((r) => r.day >= state.gte!.val);
        resolve({ data: rows, error: null });
      },
    };
    return builder;
  }

  // Mirrors the increment_widget_event_daily RPC: INSERT … ON CONFLICT DO UPDATE
  // SET count = count + delta, applied atomically over all rows in the batch.
  function rpc(
    name: string,
    args: {
      p_site_id: string;
      p_rows: { day: string; event: string; feature_key: string; delta: number }[];
    }
  ) {
    if (name === "increment_widget_event_daily") {
      for (const r of args.p_rows) {
        const k = keyOf({
          site_id: args.p_site_id,
          day: r.day,
          event: r.event,
          feature_key: r.feature_key,
        });
        const prev = daily.get(k)?.count ?? 0;
        daily.set(k, {
          site_id: args.p_site_id,
          day: r.day,
          event: r.event,
          feature_key: r.feature_key,
          count: prev + r.delta,
        });
      }
    }
    return Promise.resolve({ error: null });
  }

  return { from, rpc, _daily: daily, _raw: raw } as any;
}

const SITE = "11111111-1111-1111-1111-111111111111";

describe("recordEvents", () => {
  it("drops invalid event names and invalid feature keys silently", async () => {
    const client = makeFakeClient();
    const accepted = await recordEvents(client, SITE, [
      { event: "open" },
      { event: "feature_activated", featureKey: "contrast" },
      { event: "feature_activated", featureKey: "not-a-real-feature" }, // dropped
      { event: "bogus" as any }, // dropped
      { event: "feature_activated" }, // no featureKey → dropped
    ]);
    expect(accepted).toBe(2);
    expect(client._raw.length).toBe(2);
  });

  it("increments widget_event_daily per (day, event, featureKey)", async () => {
    const client = makeFakeClient();
    const ts = Date.parse("2026-06-10T09:00:00Z");
    await recordEvents(client, SITE, [
      { event: "open", ts },
      { event: "open", ts },
      { event: "feature_activated", featureKey: "contrast", ts },
    ]);
    // second batch on the same day must accumulate, not overwrite
    await recordEvents(client, SITE, [{ event: "open", ts }]);

    const openRow = client._daily.get(`${SITE}|2026-06-10|open|`);
    const featRow = client._daily.get(`${SITE}|2026-06-10|feature_activated|contrast`);
    expect(openRow.count).toBe(3);
    expect(featRow.count).toBe(1);
  });

  it("returns 0 and writes nothing when every event is invalid", async () => {
    const client = makeFakeClient();
    const accepted = await recordEvents(client, SITE, [{ event: "nope" as any }]);
    expect(accepted).toBe(0);
    expect(client._raw.length).toBe(0);
    expect(client._daily.size).toBe(0);
  });
});

describe("getWidgetAnalytics", () => {
  it("reads the daily rollup and returns the summarized shape", async () => {
    const client = makeFakeClient();
    const ts = Date.parse("2026-06-10T09:00:00Z");
    await recordEvents(client, SITE, [
      { event: "open", ts },
      { event: "open", ts },
      { event: "feature_activated", featureKey: "contrast", ts },
    ]);
    const out = await getWidgetAnalytics(client, SITE, 3650);
    expect(out.opens).toBe(2);
    expect(out.featureActivations).toBe(1);
    expect(out.mostUsed).toEqual({ featureKey: "contrast", count: 1 });
    expect(out.opensOverTime).toEqual([{ day: "2026-06-10", count: 2 }]);
  });
});
