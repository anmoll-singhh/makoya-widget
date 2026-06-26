import { describe, it, expect } from "vitest";
import {
  rowToSettings,
  settingsToRow,
  defaultSiteSettings,
  getSiteSettings,
} from "./site-settings";

/**
 * A minimal fake of the Supabase query builder used by site-settings.ts.
 * It records the call and returns the canned `{ data, error }` the test sets,
 * so these tests touch NO live database (mirrors leads.test.ts discipline).
 */
function fakeClient(result: { data: unknown; error: unknown }) {
  const calls: any = {};
  const builder: any = {
    select() {
      return builder;
    },
    eq(col: string, val: unknown) {
      calls.eq = { col, val };
      return builder;
    },
    maybeSingle() {
      return Promise.resolve(result);
    },
  };
  return {
    calls,
    from(table: string) {
      calls.table = table;
      return builder;
    },
  } as any;
}

describe("site-settings mapper", () => {
  it("rowToSettings maps a snake_case row to camelCase", () => {
    const s = rowToSettings({
      site_id: "s1",
      owner_name: "Ada",
      owner_email: "ada@x.com",
      owner_phone: "+1 555 0100",
      notification_prefs: { weeklyReport: true },
      updated_at: "2026-06-26T00:00:00Z",
    });
    expect(s).toEqual({
      siteId: "s1",
      ownerName: "Ada",
      ownerEmail: "ada@x.com",
      ownerPhone: "+1 555 0100",
      notificationPrefs: { weeklyReport: true },
      updatedAt: "2026-06-26T00:00:00Z",
    });
  });

  it("rowToSettings tolerates null/missing optional columns", () => {
    const s = rowToSettings({ site_id: "s1" });
    expect(s.ownerName).toBe("");
    expect(s.ownerEmail).toBe("");
    expect(s.ownerPhone).toBe("");
    expect(s.notificationPrefs).toEqual({});
    expect(s.updatedAt).toBeNull();
  });

  it("settingsToRow only includes provided fields, snake_cased", () => {
    expect(settingsToRow({ ownerName: "Ada", ownerEmail: "ada@x.com" })).toEqual({
      owner_name: "Ada",
      owner_email: "ada@x.com",
    });
    expect(settingsToRow({ notificationPrefs: { a: 1 } })).toEqual({
      notification_prefs: { a: 1 },
    });
    expect(settingsToRow({})).toEqual({});
  });

  it("defaultSiteSettings returns empty defaults for a site", () => {
    expect(defaultSiteSettings("s9")).toEqual({
      siteId: "s9",
      ownerName: "",
      ownerEmail: "",
      ownerPhone: "",
      notificationPrefs: {},
      updatedAt: null,
    });
  });
});

describe("getSiteSettings", () => {
  it("returns defaults when there is no row", async () => {
    const client = fakeClient({ data: null, error: null });
    const s = await getSiteSettings(client, "s1");
    expect(s).toEqual(defaultSiteSettings("s1"));
    expect(client.calls.table).toBe("site_settings");
  });

  it("maps the row when present", async () => {
    const client = fakeClient({
      data: { site_id: "s1", owner_name: "Ada", owner_email: "ada@x.com" },
      error: null,
    });
    const s = await getSiteSettings(client, "s1");
    expect(s.ownerName).toBe("Ada");
    expect(s.ownerEmail).toBe("ada@x.com");
  });

  it("throws on an infra error (does not swallow)", async () => {
    const client = fakeClient({ data: null, error: { message: "boom" } });
    await expect(getSiteSettings(client, "s1")).rejects.toBeTruthy();
  });
});
