/**
 * lib/roles.ts — PURE role logic for the org/team tenancy layer (Wave 3).
 *
 * This is the SINGLE source of truth for "what can a given role do". It is
 * deliberately pure (no I/O, no Supabase) so it is trivially unit-tested and can
 * be imported by both server routes (to gate writes) and, later, UI components
 * (to hide controls). Routes still re-check on the server — UI gating is cosmetic.
 *
 * NOTE: this is distinct from `lib/auth/roles.ts`, which gates the *operator*
 * admin CRM against ADMIN_EMAILS. That is Makoya-staff access; THIS file is
 * per-customer org membership (owner / admin / developer).
 */

export type Role = "owner" | "admin" | "developer";

/**
 * Numeric rank for ordering roles. Higher = more privileged. Used by
 * `isAtLeast` so callers can express "needs at least admin" without hard-coding
 * the role set at each call site.
 */
export function roleRank(role: Role): number {
  switch (role) {
    case "owner":
      return 3;
    case "admin":
      return 2;
    case "developer":
      return 1;
  }
}

/** True when role `a` is at least as privileged as role `b`. */
export function isAtLeast(a: Role, b: Role): boolean {
  return roleRank(a) >= roleRank(b);
}

/**
 * Can this role manage the team (invite/remove members, mint API keys)?
 * Owners and admins can; developers cannot.
 */
export function canManageTeam(role: Role): boolean {
  return isAtLeast(role, "admin");
}

/** Can this role manage billing? Owner only (billing is the most sensitive). */
export function canManageBilling(role: Role): boolean {
  return role === "owner";
}
