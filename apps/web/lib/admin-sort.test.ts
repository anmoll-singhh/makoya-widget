import { describe, it, expect } from "vitest";
import { sortClients } from "./admin-sort";
import type { AdminSiteRow } from "./admin";

const row = (p: Partial<AdminSiteRow>): AdminSiteRow => ({
  id: p.id ?? "x", domain: p.domain ?? "d", plan: p.plan ?? "free",
  createdAt: "", ownerEmail: p.ownerEmail ?? "a@a.com",
  lastScanScore: p.lastScanScore ?? null, openRequests: p.openRequests ?? 0,
  latestScore: p.latestScore ?? null, issueCount: p.issueCount ?? null,
});

describe("sortClients", () => {
  it("issues desc puts most issues first, nulls last", () => {
    const out = sortClients(
      [row({ id: "a", issueCount: 3 }), row({ id: "b", issueCount: null }), row({ id: "c", issueCount: 10 })],
      "issues", "desc"
    );
    expect(out.map(r => r.id)).toEqual(["c", "a", "b"]);
  });
  it("issues asc keeps nulls last", () => {
    const out = sortClients(
      [row({ id: "a", issueCount: 3 }), row({ id: "b", issueCount: null }), row({ id: "c", issueCount: 10 })],
      "issues", "asc"
    );
    expect(out.map(r => r.id)).toEqual(["a", "c", "b"]);
  });
  it("email sorts alphabetically", () => {
    const out = sortClients([row({ ownerEmail: "z@z.com" }), row({ ownerEmail: "a@a.com" })], "email", "asc");
    expect(out[0].ownerEmail).toBe("a@a.com");
  });
});
