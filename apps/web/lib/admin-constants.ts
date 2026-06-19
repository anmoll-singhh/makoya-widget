export const PLANS = ["free", "pro", "managed"] as const;
export type Plan = (typeof PLANS)[number];
export function isValidPlan(v: unknown): v is Plan {
  return typeof v === "string" && (PLANS as readonly string[]).includes(v);
}

export const REQUEST_STATUSES = ["new", "contacted", "won", "lost"] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];
export function isValidStatus(v: unknown): v is RequestStatus {
  return typeof v === "string" && (REQUEST_STATUSES as readonly string[]).includes(v);
}
