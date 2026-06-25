/**
 * Customizer.tsx
 *
 * The centrepiece UI for the Makoya client dashboard.  Holds all config state,
 * ties together the four control sections (Appearance / Features / Behaviour /
 * Branding), drives the LivePreview, and autosaves via useAutosave.
 *
 * Layout (ui-ux-pro-max / frontend-design):
 *  - Two-column on lg+: scrollable controls on the left (max-w ~440 px),
 *    LivePreview sticky on the right.  The preview is the signature element —
 *    it is given the majority of horizontal space and stays in view while the
 *    user scrolls through controls.
 *  - On small screens the preview moves below the controls so the most
 *    important editing surface (the controls) is reached first.
 *  - Each section lives in a Card with a titled CardHeader so hierarchy is
 *    clear at a glance.
 *  - The site switcher is hidden when there is only one site (nothing to
 *    switch to).
 *  - Autosave status line sits below the controls, out of the way but
 *    immediately readable.  "Couldn't save" shows a retry link.
 *
 * State strategy:
 *  - `config` is local state initialised from `initialConfig` (server-loaded).
 *  - Every control calls `set(key, value)` → instant preview update.
 *  - useAutosave debounces the PATCH; no explicit save button is needed.
 *
 * Routing:
 *  - Site switcher uses Next's useRouter to navigate to /dashboard?site=<id>
 *    so the server re-loads the correct initialConfig.
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

import type { SiteConfig } from "@/lib/sites-mappers";
import type { Site } from "@/lib/sites";
import type { FeatureKey } from "@/lib/shared";

import { useAutosave } from "@/components/customizer/useAutosave";
import { LivePreview } from "@/components/customizer/LivePreview";
import { AppearanceControls } from "@/components/customizer/controls/AppearanceControls";
import { FeatureList } from "@/components/customizer/controls/FeatureList";
import { BehaviorControls } from "@/components/customizer/controls/BehaviorControls";
import { BrandingControls } from "@/components/customizer/controls/BrandingControls";

// ─── Props ────────────────────────────────────────────────────────────────

export interface CustomizerProps {
  sites: Site[];
  activeSiteId: string;
  initialConfig: SiteConfig;
  plan: string;
}

// ─── Component ────────────────────────────────────────────────────────────

export function Customizer({ sites, activeSiteId, initialConfig, plan }: CustomizerProps) {
  const router = useRouter();
  const [config, setConfig] = useState<SiteConfig>(initialConfig);
  const { status, saveNow } = useAutosave(activeSiteId, config);

  // Debounced copy of config passed to LivePreview to prevent iframe thrash
  // while the user drags a color picker or types quickly. useAutosave still
  // receives the live `config` above (it debounces internally).
  const [previewConfig, setPreviewConfig] = useState(config);
  useEffect(() => {
    const t = setTimeout(() => setPreviewConfig(config), 300);
    return () => clearTimeout(t);
  }, [config]);

  // Generic setter — updates a single key and triggers instant preview update.
  function set<K extends keyof SiteConfig>(key: K, val: SiteConfig[K]) {
    setConfig((prev) => ({ ...prev, [key]: val }));
  }

  // Feature list has its own internal row state; it calls back with the new
  // enabled array when toggles or reorders happen.
  function handleFeaturesChange(enabled: FeatureKey[]) {
    set("featuresEnabled", enabled);
  }

  return (
    <div className="space-y-6">
      {/* ── Site switcher (hidden when only one site) ─────────────────── */}
      {sites.length > 1 && (
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-[var(--ink-600)] shrink-0">Site:</span>
          <Select
            value={activeSiteId}
            onValueChange={(id) => router.push(`/dashboard?site=${id}`)}
          >
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sites.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.domain}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* ── Main two-column layout ────────────────────────────────────── */}
      <div className="grid gap-8 lg:grid-cols-[1fr_440px] xl:grid-cols-[1fr_480px]">

        {/* Left column — control sections */}
        <div className="space-y-5 min-w-0">

          {/* Appearance */}
          <Card className="rounded-2xl border-[var(--border)] shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="font-sans text-base font-semibold text-[var(--ink-900)]">
                Appearance
              </CardTitle>
              <p className="text-xs text-[var(--ink-400)]">
                Colour, icon, size, and position of the launcher button.
              </p>
            </CardHeader>
            <CardContent>
              <AppearanceControls value={config} onChange={set} />
            </CardContent>
          </Card>

          {/* Features */}
          <Card className="rounded-2xl border-[var(--border)] shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="font-sans text-base font-semibold text-[var(--ink-900)]">
                Features
              </CardTitle>
              <p className="text-xs text-[var(--ink-400)]">
                Choose which tools to show and drag to set their order in the panel.
              </p>
            </CardHeader>
            <CardContent>
              <FeatureList
                enabled={config.featuresEnabled}
                onChange={handleFeaturesChange}
              />
            </CardContent>
          </Card>

          {/* Behaviour */}
          <Card className="rounded-2xl border-[var(--border)] shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="font-sans text-base font-semibold text-[var(--ink-900)]">
                Behaviour
              </CardTitle>
              <p className="text-xs text-[var(--ink-400)]">
                Default profile and language for first-time visitors.
              </p>
            </CardHeader>
            <CardContent>
              <BehaviorControls value={config} onChange={set} />
            </CardContent>
          </Card>

          {/* Branding */}
          <Card className="rounded-2xl border-[var(--border)] shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="font-sans text-base font-semibold text-[var(--ink-900)]">
                Branding
              </CardTitle>
              <p className="text-xs text-[var(--ink-400)]">
                Customise the panel title and attribution.
              </p>
            </CardHeader>
            <CardContent>
              <BrandingControls value={config} plan={plan} onChange={set} />
            </CardContent>
          </Card>

          {/* ── Autosave status line ─────────────────────────────────── */}
          <div className="flex items-center gap-2 py-1" aria-live="polite" aria-atomic="true">
            {status === "saving" && (
              <>
                <span className="h-2 w-2 animate-pulse rounded-full bg-signal-500" aria-hidden="true" />
                <span className="text-sm text-[var(--ink-600)]">Saving…</span>
              </>
            )}
            {status === "saved" && (
              <>
                <span className="h-2 w-2 rounded-full bg-green-500" aria-hidden="true" />
                <span className="text-sm text-green-600 font-medium">Saved ✓</span>
              </>
            )}
            {status === "error" && (
              <>
                <span className="h-2 w-2 rounded-full bg-red-500" aria-hidden="true" />
                <span className="text-sm text-red-600">
                  Couldn&apos;t save —{" "}
                  <button
                    type="button"
                    onClick={saveNow}
                    className="underline hover:no-underline font-medium transition-colors"
                  >
                    retry
                  </button>
                </span>
              </>
            )}
            {status === "idle" && (
              <span className="text-xs text-[var(--ink-400)]">Changes save automatically.</span>
            )}
          </div>
        </div>

        {/* Right column — sticky live preview */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="font-sans text-sm font-semibold text-[var(--ink-600)]">
                Live preview
              </span>
              <span className={cn(
                "h-1.5 w-1.5 rounded-full transition-colors",
                status === "saving" ? "bg-amber-400 animate-pulse" : "bg-green-400",
              )} aria-hidden="true" />
            </div>
            <LivePreview config={previewConfig} />
          </div>
        </div>
      </div>
    </div>
  );
}
