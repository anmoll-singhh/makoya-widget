/**
 * posthog-provider.tsx — client-side PostHog bootstrap (product analytics / the funnel).
 *
 * Mounted once in the root layout. It initialises posthog-js in the browser so we
 * capture pageviews + autocaptured clicks across the whole app (land → /scan →
 * results → /login → /dashboard), which is the funnel the founder needs to see
 * drop-off in. Server-side funnel events (scan_started, etc.) are sent separately
 * through lib/observability.ts#track using the same project.
 *
 * Bootstrap-safe: with no key configured (`env.POSTHOG_KEY === ""`) this renders
 * children untouched and never initialises PostHog — the app works identically
 * without analytics (OSS-first / no hard dependency).
 *
 * Manual pageview capture: we disable posthog-js's default `capture_pageview`
 * (which only fires on hard loads) and send `$pageview` ourselves on every App
 * Router navigation, so client-side route changes (the norm in this SPA) are not
 * silently missed.
 */
"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { env } from "@/lib/env";

const enabled = !!env.POSTHOG_KEY;

if (typeof window !== "undefined" && enabled && !posthog.__loaded) {
  posthog.init(env.POSTHOG_KEY, {
    api_host: env.POSTHOG_HOST,
    // We send $pageview manually (see PageviewTracker) so SPA navigations count.
    capture_pageview: false,
    capture_pageleave: true,
    // Respect Do Not Track; keep it privacy-conscious (matches our honest brand).
    respect_dnt: true,
  });
}

/** Fires a $pageview on every App Router navigation (path or query change). */
function PageviewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!enabled) return;
    let url = window.location.origin + pathname;
    const qs = searchParams?.toString();
    if (qs) {
      // Strip sensitive query params before forwarding to PostHog so tokens /
      // OAuth codes never escape to a third party (Finding 2, security audit).
      const SENSITIVE = ["token", "code", "state", "access_token", "refresh_token"];
      const safe = new URLSearchParams(qs);
      SENSITIVE.forEach((k) => safe.delete(k));
      const safeQs = safe.toString();
      if (safeQs) url += `?${safeQs}`;
    }
    posthog.capture("$pageview", { $current_url: url });
  }, [pathname, searchParams]);

  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  // No key → render children directly, no provider, no PostHog. Zero overhead.
  if (!enabled) return <>{children}</>;
  return (
    <PHProvider client={posthog}>
      {/* useSearchParams must sit under Suspense (Next 15) or it forces the whole
          tree to client-render. The tracker renders nothing, so the fallback is null. */}
      <Suspense fallback={null}>
        <PageviewTracker />
      </Suspense>
      {children}
    </PHProvider>
  );
}
