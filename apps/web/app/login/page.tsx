import { LoginForm } from "./LoginForm";
import { Logo } from "@/components/Logo";

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-neutral-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-70" />
        <div className="pointer-events-none absolute -left-20 top-1/3 h-80 w-80 rounded-full bg-brand-600/30 blur-3xl" />
        <div className="relative">
          <Logo dark />
        </div>
        <div className="relative max-w-md">
          <h2 className="font-display text-4xl font-extrabold leading-tight tracking-tight">
            Stop losing customers to a site they <span className="text-gradient">can&apos;t use</span>.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-neutral-300">
            Scan your site in seconds, see exactly what&apos;s turning visitors away, and turn an
            inaccessible site into one that converts everyone.
          </p>
        </div>
        <div className="relative text-sm text-neutral-500">© Makoya · accessibility that pays for itself</div>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center bg-neutral-50 p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <div className="rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm">
            <h1 className="font-display text-2xl font-bold tracking-tight text-neutral-900">Welcome back</h1>
            <p className="mt-1.5 text-sm text-neutral-500">
              Sign in with your email and password — or get a one-tap magic link instead.
            </p>
            <LoginForm />
          </div>
          <p className="mt-6 text-center text-xs text-neutral-400">
            New here? Signing in creates your account automatically.
          </p>
        </div>
      </div>
    </main>
  );
}
