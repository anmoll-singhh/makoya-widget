/**
 * injection-honeypot.ts — the "Caught in 4K" SQL-injection gag detector.
 *
 * ⚠️ HONESTY (read this before you trust it): this is THEATRE, not security.
 * It is a playful, client-side honeypot/deterrent — nothing more. Real protection
 * against SQL injection already exists and lives entirely on the backend: Supabase
 * Auth and PostgREST use parameterised queries, so the credentials below never get
 * concatenated into SQL no matter what a visitor types. This detector:
 *   - runs in the browser, where any attacker can trivially bypass it;
 *   - does NOT weaken, replace, or gate the real `signInWithPassword` call when it
 *     decides input is "clean" — a false negative just means a normal login attempt
 *     that Supabase rejects on bad credentials anyway;
 *   - exists purely so an obvious `' OR 1=1 --` attempt earns a wink instead of a
 *     boring "wrong password".
 *
 * False-positive tradeoff (documented on purpose): passwords can legitimately
 * contain odd characters. We deliberately match only patterns that are very
 * unlikely in a real password (SQL keywords in context, `--` comments, `<script>`,
 * `xp_…`, time-based payloads) rather than bare punctuation like a single quote or
 * semicolon, to keep the gag fun without locking out people with spicy passwords.
 * If the gag ever fires on a real user, they still reach support — it never
 * silently drops them into a broken state.
 */

/**
 * Injection-looking patterns. Case-insensitive. Each is narrow enough that a
 * normal email/password is unlikely to trip it, but classic payloads will.
 */
const INJECTION_PATTERNS: readonly RegExp[] = [
  // Tautologies: OR 1=1, OR 'a'='a, " OR 1 = 1, AND 1=1 — the operands may be
  // bare or wrapped in quotes, so optional quotes surround each side.
  /\b(or|and)\b\s+['"]?\s*\w+\s*['"]?\s*=\s*['"]?\s*\w+/i,
  // UNION-based extraction
  /\bunion\b\s+(all\s+)?\bselect\b/i,
  // Destructive / stacked statements
  /\bdrop\s+table\b/i,
  /;\s*(drop|delete|update|insert|truncate|alter)\b/i,
  // SQL comment markers (classic payload terminators). A double-dash is the
  // canonical inline SQL comment (`admin'--`); it's vanishingly rare in a real
  // password, so we match it anywhere (documented false-positive tradeoff).
  /--/,
  /\/\*/,
  /#\s*$/,
  // SQL Server extended procedures
  /\bxp_\w+/i,
  // Time-based blind payloads
  /\bsleep\s*\(/i,
  /\bbenchmark\s*\(/i,
  /\bwaitfor\s+delay\b/i,
  // Cross-site-scripting probe (often pasted in the same "let me try to break it" spirit)
  /<\s*script/i,
  /\bselect\b.+\bfrom\b/i,
];

/**
 * Returns true if ANY of the supplied strings looks like an injection/probe.
 *
 * Call it on the raw form values BEFORE handing them to Supabase. A `true` result
 * means "show the gag, skip the auth call"; a `false` result means "carry on with
 * the normal, parameterised auth call" — it is NOT a security guarantee.
 */
export function detectSqlInjection(...inputs: Array<string | null | undefined>): boolean {
  for (const raw of inputs) {
    if (!raw) continue;
    const value = raw.trim();
    if (!value) continue;
    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.test(value)) return true;
    }
  }
  return false;
}
