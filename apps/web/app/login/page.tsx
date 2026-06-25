import { LoginForm } from "./LoginForm";
import { Logo } from "@/components/Logo";

/**
 * /login — the auth entry, rebuilt on the "Redline" design system.
 *
 * Two-pane: a warm-dark brand panel (a marketing moment — Newsreader serif +
 * Vellum accent, like the landing's closing band) on the left, and the calm
 * sign-in card on the right. All auth logic lives in <LoginForm>.
 */
export default function LoginPage() {
  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      {/* Brand panel (warm-dark, marketing voice) */}
      <div className="relative hidden overflow-hidden bg-[var(--ink-900)] p-12 text-[var(--paper)] lg:flex lg:flex-col lg:justify-between">
        {/* A single soft Signal bloom for depth — no busy grid. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-20 top-1/3 h-80 w-80 rounded-full blur-3xl"
          style={{ background: "color-mix(in oklch, var(--color-signal-500) 30%, transparent)" }}
        />
        <div className="relative">
          <Logo dark />
        </div>
        <div className="relative max-w-md">
          <h2 className="font-display text-4xl font-medium leading-tight tracking-tight">
            Stop losing customers to a site they{" "}
            <span className="relative whitespace-nowrap">
              can&apos;t use
              <span
                aria-hidden="true"
                className="absolute inset-x-0 -bottom-1 h-[4px] rounded-sm"
                style={{ background: "var(--color-vellum-500)" }}
              />
            </span>
            .
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-[var(--paper)]/80">
            Scan your site in seconds, see exactly what&apos;s turning visitors away, and turn an
            inaccessible site into one that works for everyone.
          </p>
        </div>
        <div className="relative text-sm text-[var(--paper)]/60">
          © Makoya · accessibility that pays for itself
        </div>
      </div>

      {/* Sign-in card (calm, light) */}
      <div className="paper-grain flex items-center justify-center bg-[var(--paper)] p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[var(--shadow-sm)]">
            <h1 className="font-display text-2xl font-medium tracking-tight text-[var(--ink-900)]">
              Welcome back
            </h1>
            <p className="mt-1.5 text-sm text-[var(--ink-600)]">
              Sign in with your email and password — or get a one-tap magic link instead.
            </p>
            <LoginForm />
          </div>
          <p className="mt-6 text-center text-xs text-[var(--ink-600)]">
            New here? Signing in creates your account automatically.
          </p>
        </div>
      </div>
    </main>
  );
}
