/**
 * Logo.tsx — the Makoya brand mark, used in every surface's header.
 *
 * Redline brand: a solid Signal-cobalt rounded mark + the "Makoya" wordmark in
 * the Newsreader display serif (the editorial voice). Tokenised so it stays
 * correct in light and dark contexts (pass `dark` on dark panels).
 */
export function Logo({ className = "", dark = false }: { className?: string; dark?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span className="grid h-8 w-8 place-items-center rounded-xl bg-signal-600 text-white shadow-sm">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="4" r="2" />
          <path d="M21 9c0 .55-.45 1-1 1h-4v11a1 1 0 0 1-2 0v-5h-4v5a1 1 0 0 1-2 0V10H4a1 1 0 0 1 0-2h16c.55 0 1 .45 1 1z" />
        </svg>
      </span>
      <span
        className={`font-display text-lg font-semibold tracking-tight ${
          dark ? "text-[var(--paper)]" : "text-[var(--ink-900)]"
        }`}
      >
        Makoya
      </span>
    </span>
  );
}
