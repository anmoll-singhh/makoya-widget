/**
 * lib/landing-copy.ts — all user-facing copy for the marketing landing page (/).
 *
 * Kept as pure data (no JSX) for two reasons:
 *  1. The honest-hybrid guardrail (see landing-copy.test.ts) can scan every
 *     string for banned compliance claims without rendering React.
 *  2. Copy edits live in one place, separate from layout.
 *
 * HONESTY RULE (non-negotiable, see CLAUDE.md): never say "WCAG/ADA compliant",
 * "fully compliant", "guaranteed", or "lawsuit-proof". We sell real findings +
 * help + monitoring, never a compliance badge. The stats below are cited
 * category facts about overlays as a class — we never name a competitor.
 */

export interface Stat {
  figure: string;
  label: string;
  source: string;
}

export interface Step {
  title: string;
  body: string;
}

export interface Surface {
  name: string;
  body: string;
}

export const hero = {
  // Outcome headline, kept short for the 5-second hero test. "your visitors"
  // is the gradient-highlighted phrase.
  headlineLead: "See what's really blocking",
  headlineAccent: "your visitors",
  subhead:
    "Get a real 0–100 accessibility score and every issue in plain English — before you ever give us an email.",
  inputPlaceholder: "yourwebsite.com",
  cta: "Scan my site free",
  microcopy:
    "We report real issues and never claim a site is “compliant”. No card, no catch — just your score.",
};

export const contrast = {
  heading: "The “one line of code = compliant” era is ending",
  intro:
    "Overlay widgets promised instant compliance. Regulators, courts, and disabled users have shown that promise was empty. Here's the public record:",
  // Category facts about overlays as a class. No company is named.
  stats: [
    {
      figure: "$1M",
      label: "U.S. FTC penalty against an overlay vendor for false automated-compliance claims (2025).",
      source: "FTC",
    },
    {
      figure: "22.6%",
      label: "of 2025 web-accessibility lawsuits hit sites that already had an accessibility overlay installed.",
      source: "H1-2025 lawsuit data",
    },
    {
      figure: "67% / 72%",
      label: "of accessibility practitioners — and of users with disabilities — rate overlays not effective.",
      source: "WebAIM survey",
    },
  ] as Stat[],
  takeaway:
    "We don't sell a compliance badge. We find real problems, help you fix them at the source, and keep watching so they stay fixed.",
  cta: "See your real score",
};

export const howItWorks = {
  heading: "Find it, fix it at the source, keep it fixed",
  steps: [
    {
      title: "Scan",
      body: "A real browser loads your page and checks it against common WCAG 2.x criteria with the same engine accessibility engineers use — then explains each issue in plain English.",
    },
    {
      title: "Fix at the source",
      body: "You get the actual problems and what they mean for real visitors, so you can fix them in your code or CMS — not paper over them with an overlay that screen-reader users switch off.",
    },
    {
      title: "Monitor",
      body: "Re-scan on a schedule and get alerted when a deploy breaks something, so accessibility doesn't quietly regress between releases.",
    },
  ] as Step[],
};

export const surfaces = {
  heading: "One engine, three honest surfaces",
  items: [
    {
      name: "The scanner",
      body: "A real WCAG 2.0 / 2.1 / 2.2 engine (Playwright + axe-core plus our own checks) that scores a site and explains every issue in plain language.",
    },
    {
      name: "The widget",
      body: "A drop-in set of 15 genuine display preferences (text size, contrast, spacing, reading tools, read-aloud). It never auto-detects assistive tech and is dismissed in one click — a convenience, never a “fix”.",
    },
    {
      name: "The dashboard",
      body: "Customize your widget with a live preview, read your scan report, and re-scan — all behind real multi-tenant security.",
    },
  ] as Surface[],
};

export const transparency = {
  heading: "What the scan is — and isn't",
  body:
    "Our scan surfaces real, common accessibility problems and explains them clearly. But automated tools catch only a portion of all barriers, so a clean automated scan is a good sign, not a certificate. Full assurance needs people testing with assistive technology. We tell you exactly what we checked, help you fix what's found, and never pretend a scan makes a site “compliant”.",
};

export const finalCta = {
  heading: "See what your visitors actually experience",
  body: "Run a free scan and get your score in about 30 seconds.",
  primary: "Scan my site free",
  secondary: "Sign in",
};

export const footer = {
  tagline: "Honest web accessibility — find real issues, fix them at the source, monitor over time.",
  disclaimer:
    "Makoya provides accessibility tools and surfaces real issues. It does not sell or imply a compliance guarantee.",
};

/** Every user-facing string, flattened — used by the honesty guardrail test. */
export function allLandingCopy(): string[] {
  return [
    hero.headlineLead,
    hero.headlineAccent,
    hero.subhead,
    hero.inputPlaceholder,
    hero.cta,
    hero.microcopy,
    contrast.heading,
    contrast.intro,
    ...contrast.stats.flatMap((s) => [s.figure, s.label, s.source]),
    contrast.takeaway,
    contrast.cta,
    howItWorks.heading,
    ...howItWorks.steps.flatMap((s) => [s.title, s.body]),
    surfaces.heading,
    ...surfaces.items.flatMap((s) => [s.name, s.body]),
    transparency.heading,
    transparency.body,
    finalCta.heading,
    finalCta.body,
    finalCta.primary,
    finalCta.secondary,
    footer.tagline,
    footer.disclaimer,
  ];
}
