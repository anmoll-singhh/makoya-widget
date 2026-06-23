/**
 * app/page.tsx — the public marketing landing page (honest-hybrid positioning).
 *
 * Server Component (no client JS except the hero scan island) so it loads fast
 * for cold traffic and is SEO-friendly. Design language matches /scan and the
 * dashboard (Tailwind v4 + shadcn + Logo + font-display + text-gradient +
 * glow-brand). All copy lives in lib/landing-copy.ts and is guarded by a unit
 * test against compliance/guarantee claims.
 *
 * Conversion mechanics (from 2026 research): value clear in <3s, the free tool
 * IN the hero, one value-loaded CTA repeated at each scroll depth, and our
 * cited category-fact stats standing in for social proof (we have no customer
 * logos yet and will never fabricate them).
 *
 * Accessibility: this is an accessibility company, so the page itself must pass.
 * Semantic landmarks, real links/buttons, visible focus, AA contrast, ordered
 * headings. We QA it by running our own scanner against the deployed page.
 */

import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { HeroScanInput } from "@/components/landing/HeroScanInput";
import {
  hero,
  contrast,
  howItWorks,
  surfaces,
  transparency,
  finalCta,
  footer,
} from "@/lib/landing-copy";

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-neutral-50 text-neutral-900">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Logo />
          <nav className="flex items-center gap-6" aria-label="Primary">
            <a
              href="#how"
              className="transition-base hidden text-sm font-medium text-neutral-500 hover:text-neutral-900 sm:inline"
            >
              How it works
            </a>
            <a
              href="#why-honest"
              className="transition-base hidden text-sm font-medium text-neutral-500 hover:text-neutral-900 sm:inline"
            >
              Why honest
            </a>
            <Link
              href="/login"
              className="transition-base text-sm font-medium text-neutral-500 hover:text-neutral-900"
            >
              Sign in
            </Link>
            <Button asChild size="sm">
              <Link href="/scan">Scan your site</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="glow-brand relative overflow-hidden">
          <div className="mx-auto max-w-3xl px-5 py-20 text-center sm:py-28">
            <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
              {hero.headlineLead} <span className="text-gradient">{hero.headlineAccent}</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-neutral-600">
              {hero.subhead}
            </p>
            <HeroScanInput cta={hero.cta} placeholder={hero.inputPlaceholder} />
            <p className="mt-3 text-xs text-neutral-400">{hero.microcopy}</p>
          </div>
        </section>

        {/* Why honest — contrast stats (our credibility) */}
        <section id="why-honest" className="border-y border-neutral-200 bg-white">
          <div className="mx-auto max-w-5xl px-5 py-16 sm:py-20">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
                {contrast.heading}
              </h2>
              <p className="mt-4 text-base leading-relaxed text-neutral-600">{contrast.intro}</p>
            </div>
            <ul className="mt-10 grid gap-5 sm:grid-cols-3">
              {contrast.stats.map((s) => (
                <li
                  key={s.label}
                  className="rounded-2xl border border-neutral-200 bg-neutral-50 p-6 text-center"
                >
                  <div className="font-display text-3xl font-extrabold text-brand-600">{s.figure}</div>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-600">{s.label}</p>
                  <p className="mt-3 text-xs font-medium uppercase tracking-wide text-neutral-400">
                    {s.source}
                  </p>
                </li>
              ))}
            </ul>
            <div className="mx-auto mt-10 max-w-2xl text-center">
              <p className="text-base font-medium text-neutral-800">{contrast.takeaway}</p>
              <Button asChild size="lg" className="mt-6 h-11 px-6 text-base">
                <Link href="/scan">{contrast.cta}</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="mx-auto max-w-5xl px-5 py-16 sm:py-20">
          <h2 className="text-center font-display text-2xl font-bold tracking-tight sm:text-3xl">
            {howItWorks.heading}
          </h2>
          <ol className="mt-10 grid gap-6 sm:grid-cols-3">
            {howItWorks.steps.map((step, i) => (
              <li key={step.title} className="rounded-2xl border border-neutral-200 bg-white p-6">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-600 font-display text-sm font-bold text-white">
                  {i + 1}
                </span>
                <h3 className="mt-4 font-display text-lg font-bold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Three surfaces */}
        <section className="border-y border-neutral-200 bg-white">
          <div className="mx-auto max-w-5xl px-5 py-16 sm:py-20">
            <h2 className="text-center font-display text-2xl font-bold tracking-tight sm:text-3xl">
              {surfaces.heading}
            </h2>
            <div className="mt-10 grid gap-6 sm:grid-cols-3">
              {surfaces.items.map((s) => (
                <div key={s.name} className="rounded-2xl border border-neutral-200 bg-neutral-50 p-6">
                  <h3 className="font-display text-lg font-bold">{s.name}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-600">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Transparency (docs-as-product trust) */}
        <section className="mx-auto max-w-3xl px-5 py-16 sm:py-20">
          <div className="rounded-2xl border border-neutral-200 bg-white p-8">
            <h2 className="font-display text-xl font-bold tracking-tight">{transparency.heading}</h2>
            <p className="mt-3 text-sm leading-relaxed text-neutral-600">{transparency.body}</p>
          </div>
        </section>

        {/* Final CTA */}
        <section className="glow-brand border-t border-neutral-200">
          <div className="mx-auto max-w-2xl px-5 py-20 text-center">
            <h2 className="font-display text-3xl font-extrabold tracking-tight">{finalCta.heading}</h2>
            <p className="mt-4 text-base text-neutral-600">{finalCta.body}</p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-12 px-7 text-base">
                <Link href="/scan">{finalCta.primary}</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-12 px-7 text-base">
                <Link href="/login">{finalCta.secondary}</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 bg-white">
        <div className="mx-auto max-w-6xl px-5 py-10">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <Logo />
            <nav className="flex gap-6 text-sm text-neutral-500" aria-label="Footer">
              <Link href="/scan" className="transition-base hover:text-neutral-900">
                Free scan
              </Link>
              <Link href="/login" className="transition-base hover:text-neutral-900">
                Sign in
              </Link>
            </nav>
          </div>
          <p className="mt-6 max-w-2xl text-sm text-neutral-500">{footer.tagline}</p>
          <p className="mt-2 max-w-2xl text-xs text-neutral-400">{footer.disclaimer}</p>
        </div>
      </footer>
    </div>
  );
}
