export const PLANS = ["free", "pro", "managed"] as const;
export type Plan = (typeof PLANS)[number];
export function isValidPlan(v: unknown): v is Plan {
  return typeof v === "string" && (PLANS as readonly string[]).includes(v);
}

// Mirrors the sites_license_status_chk constraint in the widget_licensing
// migration. The licensing gate reads license_status; `past_due` is a grace
// state (stays active). Admin can set any of these to drive enforcement.
export const LICENSE_STATUSES = ["active", "trial", "past_due", "suspended", "canceled"] as const;
export type LicenseStatus = (typeof LICENSE_STATUSES)[number];
export function isValidLicenseStatus(v: unknown): v is LicenseStatus {
  return typeof v === "string" && (LICENSE_STATUSES as readonly string[]).includes(v);
}

export const REQUEST_STATUSES = ["new", "contacted", "won", "lost"] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];
export function isValidStatus(v: unknown): v is RequestStatus {
  return typeof v === "string" && (REQUEST_STATUSES as readonly string[]).includes(v);
}
