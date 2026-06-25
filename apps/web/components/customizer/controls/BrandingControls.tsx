/**
 * BrandingControls.tsx
 *
 * Controls for white-labelling the widget panel:
 *  - hideBranding          — Switch to remove "Powered by Makoya" link
 *  - panelTitle            — Custom text for the panel heading
 *  - accessibilityStatementUrl — URL for the "Accessibility statement" link
 *                                (empty = link is hidden in the widget)
 *
 * Plan gating:
 *  When plan === "free" ALL three controls are disabled and an inline upsell
 *  notice is shown.  This mirrors the server-side gate; the UI never trusts
 *  itself for enforcement.
 *
 * Copy rules:
 *  - No WCAG / ADA / Section-508 "compliance" or "guaranteed accessible"
 *    language anywhere in this file.
 */

"use client";

import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { SiteConfig } from "@/lib/sites-mappers";

// ─── Props ────────────────────────────────────────────────────────────────

export interface BrandingControlsProps {
  value: SiteConfig;
  plan: string;
  onChange: <K extends keyof SiteConfig>(key: K, val: SiteConfig[K]) => void;
}

// ─── Component ────────────────────────────────────────────────────────────

export function BrandingControls({ value, plan, onChange }: BrandingControlsProps) {
  const isPaid = plan !== "free";

  return (
    <div className="space-y-5">
      {/* ── Plan gate notice ─────────────────────────────────────────────── */}
      {!isPaid && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-medium text-amber-800">
            Branding controls are available on paid plans.
          </p>
          <p className="mt-0.5 text-xs text-amber-700">
            Upgrade to customise the panel title, hide the Makoya link, and
            add your accessibility statement URL.
          </p>
        </div>
      )}

      {/* ── Hide branding toggle ─────────────────────────────────────────── */}
      <div className={cn("flex items-start gap-3", !isPaid && "pointer-events-none opacity-50")}>
        <Switch
          id="branding-hide"
          checked={value.hideBranding}
          onCheckedChange={(v) => onChange("hideBranding", v)}
          disabled={!isPaid}
          aria-describedby="branding-hide-desc"
          className="mt-0.5 shrink-0"
        />
        <div>
          <Label
            htmlFor="branding-hide"
            className="text-sm font-medium text-[var(--ink-900)] cursor-pointer"
          >
            Hide &ldquo;Powered by Makoya&rdquo;
          </Label>
          <p id="branding-hide-desc" className="mt-0.5 text-xs text-[var(--ink-400)]">
            Removes the Makoya attribution link from the bottom of the panel.
          </p>
        </div>
      </div>

      {/* ── Panel title ──────────────────────────────────────────────────── */}
      <div className={cn("space-y-1.5", !isPaid && "pointer-events-none opacity-50")}>
        <Label htmlFor="branding-title" className="text-sm font-medium text-[var(--ink-600)]">
          Panel title
        </Label>
        <Input
          id="branding-title"
          type="text"
          value={value.panelTitle}
          onChange={(e) => onChange("panelTitle", e.target.value)}
          disabled={!isPaid}
          placeholder="Accessibility tools"
          maxLength={60}
          aria-describedby="branding-title-desc"
        />
        <p id="branding-title-desc" className="text-xs text-[var(--ink-400)]">
          Replaces the default panel heading. Leave empty to use the built-in
          localised title.
        </p>
      </div>

      {/* ── Accessibility statement URL ──────────────────────────────────── */}
      <div className={cn("space-y-1.5", !isPaid && "pointer-events-none opacity-50")}>
        <Label htmlFor="branding-statement-url" className="text-sm font-medium text-[var(--ink-600)]">
          Accessibility statement URL
        </Label>
        <Input
          id="branding-statement-url"
          type="url"
          value={value.accessibilityStatementUrl}
          onChange={(e) => onChange("accessibilityStatementUrl", e.target.value)}
          disabled={!isPaid}
          placeholder="https://yoursite.com/accessibility"
          aria-describedby="branding-statement-url-desc"
        />
        <p id="branding-statement-url-desc" className="text-xs text-[var(--ink-400)]">
          Adds a link to your accessibility statement inside the panel. Leave
          empty to hide the link.
        </p>
      </div>
    </div>
  );
}
