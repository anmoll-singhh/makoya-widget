/**
 * app/page.tsx — the public marketing landing page ("The Redline" rebuild).
 *
 * Server Component (so it stays fast for cold traffic, SSR'd for SEO, and can do
 * the auth redirect) that composes the client section islands. Each section lives
 * in components/landing/* and is built on the Redline design system (warm document
 * paper, Newsreader serif headlines, Signal cobalt + Vellum amber, scroll-reveal
 * motion via <Reveal>). All copy lives in lib/landing-copy.ts and is guarded by a
 * unit test against compliance/guarantee claims and named competitors.
 *
 * Behaviour preserved from the previous landing:
 *  - Signed-in users skip the marketing page and go straight to /dashboard.
 *  - The hero's scan input deep-links to /scan?url=… which auto-runs the scan.
 *
 * Accessibility: this is an accessibility company, so the page itself must pass.
 * Semantic landmarks (header/main/footer), a single <h1> (the hero), ordered <h2>
 * section headings, real links/buttons, visible focus, AA contrast. We QA it by
 * running our own scanner against it.
 */

import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { Hero } from "@/components/landing/Hero";
import { HonestDifference } from "@/components/landing/HonestDifference";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { ThreeSurfaces } from "@/components/landing/ThreeSurfaces";
import { Transparency } from "@/components/landing/Transparency";
import { FinalCta } from "@/components/landing/FinalCta";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default async function LandingPage() {
  // Anonymous (cold-traffic) visitors see the landing; signed-in users bounce to
  // their dashboard, mirroring the pre-landing `/` behaviour.
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <div className="paper-grain min-h-dvh bg-[var(--paper)] text-[var(--ink-900)]">
      <LandingHeader />
      <main>
        <Hero />
        <HonestDifference />
        <HowItWorks />
        <ThreeSurfaces />
        <Transparency />
        <FinalCta />
      </main>
      <LandingFooter />
    </div>
  );
}
