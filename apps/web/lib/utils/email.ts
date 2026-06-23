/**
 * lib/utils/email.ts
 *
 * Single source of truth for email validation across public endpoints
 * (scan-ingest, report-pdf). Intentionally a pragmatic check, not full RFC 5322:
 * one `@`, a dot in the domain, no whitespace, and a sane length cap (a DoS
 * guard for unauthenticated routes). Stricter parsing belongs to the email
 * provider, not the gate.
 */
export function isValidEmail(v: unknown): v is string {
  return (
    typeof v === "string" &&
    v.length > 0 &&
    v.length <= 254 &&
    /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)
  );
}
