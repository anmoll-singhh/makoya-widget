import { describe, it, expect } from "vitest";
import { rowToRemediation } from "./remediation";

describe("rowToRemediation", () => {
  it("maps a snake_case row to a camelCase RemediationEntry", () => {
    const row = {
      id: "rem-1",
      site_id: "site-1",
      issue_id: "issue-9",
      wcag_criterion: "1.4.3",
      action: "Increased contrast on primary buttons",
      fixed_by: "Mike",
      fixed_at: "2026-06-26T12:00:00Z",
      created_at: "2026-06-26T12:00:00Z",
    };
    const r = rowToRemediation(row);
    expect(r.id).toBe("rem-1");
    expect(r.siteId).toBe("site-1");
    expect(r.issueId).toBe("issue-9");
    expect(r.wcagCriterion).toBe("1.4.3");
    expect(r.action).toBe("Increased contrast on primary buttons");
    expect(r.fixedBy).toBe("Mike");
    expect(r.fixedAt).toBe("2026-06-26T12:00:00Z");
  });

  it("tolerates null issue_id, wcag_criterion and fixed_by", () => {
    const r = rowToRemediation({
      id: "rem-2",
      site_id: "site-1",
      issue_id: null,
      wcag_criterion: null,
      action: "General cleanup",
      fixed_by: null,
      fixed_at: "2026-06-26T12:00:00Z",
      created_at: "2026-06-26T12:00:00Z",
    });
    expect(r.issueId).toBeNull();
    expect(r.wcagCriterion).toBeNull();
    expect(r.fixedBy).toBeNull();
    expect(r.action).toBe("General cleanup");
  });
});
