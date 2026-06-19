/** True if `email` is in the comma-separated `adminEmails` allowlist. Case-insensitive, trimmed. */
export function isAdmin(email: string | null | undefined, adminEmails: string): boolean {
  if (!email || !adminEmails) return false;
  const set = adminEmails
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return set.includes(email.trim().toLowerCase());
}
