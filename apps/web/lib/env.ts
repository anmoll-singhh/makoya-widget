/**
 * lib/env.ts — backward-compat re-export of the PUBLIC env subset.
 *
 * Client components and "use client" files may keep importing from here.
 * They get ONLY the NEXT_PUBLIC_* vars — no server secrets ever reach the
 * client bundle through this path.
 *
 * Server files that need secrets (SERVICE_ROLE_KEY, RESEND_API_KEY, etc.)
 * must import from @/lib/env.server, which carries `import "server-only"`.
 */
export { env } from "./env.public";
