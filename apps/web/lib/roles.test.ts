import { describe, it, expect } from "vitest";
import { canManageTeam, canManageBilling, roleRank, isAtLeast, type Role } from "./roles";

describe("roleRank", () => {
  it("ranks owner > admin > developer", () => {
    expect(roleRank("owner")).toBeGreaterThan(roleRank("admin"));
    expect(roleRank("admin")).toBeGreaterThan(roleRank("developer"));
  });
});

describe("isAtLeast", () => {
  it("is true when a outranks or equals b", () => {
    expect(isAtLeast("owner", "developer")).toBe(true);
    expect(isAtLeast("admin", "admin")).toBe(true);
    expect(isAtLeast("owner", "owner")).toBe(true);
  });
  it("is false when a is below b", () => {
    expect(isAtLeast("developer", "admin")).toBe(false);
    expect(isAtLeast("admin", "owner")).toBe(false);
  });
});

describe("canManageTeam", () => {
  it("allows owner and admin, denies developer", () => {
    const cases: [Role, boolean][] = [
      ["owner", true],
      ["admin", true],
      ["developer", false],
    ];
    for (const [role, expected] of cases) expect(canManageTeam(role)).toBe(expected);
  });
});

describe("canManageBilling", () => {
  it("allows owner only", () => {
    expect(canManageBilling("owner")).toBe(true);
    expect(canManageBilling("admin")).toBe(false);
    expect(canManageBilling("developer")).toBe(false);
  });
});
