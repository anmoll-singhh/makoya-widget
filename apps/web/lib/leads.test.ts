import { describe, it, expect } from "vitest";
import { leadRowToRecord } from "./leads";

describe("leadRowToRecord", () => {
  it("maps a snake_case row to a camelCase Lead", () => {
    const row = {
      id: "abc",
      email: "a@b.com",
      url: "https://x.com",
      score: 80,
      totals: { critical: 0, serious: 1, moderate: 2, minor: 3, total: 6 },
      status: "new",
      source: "scanner",
      created_at: "2026-06-22T00:00:00Z",
    };
    const lead = leadRowToRecord(row);
    expect(lead.createdAt).toBe("2026-06-22T00:00:00Z");
    expect(lead.totals.serious).toBe(1);
    expect(lead.status).toBe("new");
  });

  it("tolerates a null score and missing totals", () => {
    const lead = leadRowToRecord({
      id: "x",
      email: "a@b.com",
      url: "https://x.com",
      score: null,
      totals: null,
      status: "new",
      source: "scanner",
      created_at: "2026-06-22T00:00:00Z",
    });
    expect(lead.score).toBeNull();
    expect(lead.totals).toEqual({});
  });
});
