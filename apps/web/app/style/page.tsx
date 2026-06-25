/**
 * app/style/page.tsx
 *
 * The Redline design-system style-tile — founder sign-off checkpoint.
 *
 * This page renders EVERY design token + primitive + signature component in
 * clearly-labelled sections on a Paper-grain background. It exists so the
 * founder can visually inspect the entire system in one scroll before any
 * product surface is built.
 *
 * ─ Sections ──────────────────────────────────────────────────────────────────
 * 1. Color palette      — Signal scale, Vellum, warm neutrals, severity swatches
 * 2. Typography         — Newsreader display, Geist UI, Geist Mono, "expensive headline"
 * 3. Primitives         — Button variants, Input, Switch, Tabs, Card, Badge
 * 4. Signature gallery  — All 6 Makoya components with realistic props
 * 5. Light/Dark toggle  — Flips .dark on <html> for both-theme inspection
 *
 * Internal reference page — not indexed, not linked from product nav.
 */

"use client";

import { useState } from "react";
import { ScoreMark } from "@/components/makoya/ScoreMark";
import { SeverityBar } from "@/components/makoya/SeverityBar";
import { SeverityChip } from "@/components/makoya/SeverityChip";
import { IssueCard } from "@/components/makoya/IssueCard";
import { AnnotatedPreview } from "@/components/makoya/AnnotatedPreview";
import { ScanLoading } from "@/components/makoya/ScanLoading";
import { AnnotationMargin } from "@/components/makoya/AnnotationMargin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Labeled color swatch row. */
function Swatch({ name, hex, cssVar }: { name: string; hex: string; cssVar?: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className="h-14 w-14 rounded-md border border-black/10 shadow-sm"
        style={{ backgroundColor: cssVar ? `var(${cssVar})` : hex }}
        title={hex}
      />
      <p className="text-center text-[0.6rem] font-mono leading-tight text-muted-foreground max-w-[4rem] break-words">
        {name}
      </p>
      <p className="text-center text-[0.6rem] font-mono text-muted-foreground/70 uppercase">
        {hex}
      </p>
    </div>
  );
}

/** Section wrapper — title + horizontal rule + content. */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-16">
      <div className="mb-6 flex items-center gap-4">
        <h2
          className="shrink-0 font-mono text-xs font-semibold uppercase tracking-widest"
          style={{ color: "var(--ink-600)" }}
        >
          {title}
        </h2>
        <div className="h-px flex-1" style={{ background: "var(--border-strong)" }} />
      </div>
      {children}
    </section>
  );
}

/** Subsection with a smaller label. */
function Sub({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <p
        className="mb-3 font-mono text-[0.625rem] uppercase tracking-widest"
        style={{ color: "var(--ink-400)" }}
      >
        {label}
      </p>
      {children}
    </div>
  );
}

// ─── Sample issue for IssueCard ──────────────────────────────────────────────

const SAMPLE_ISSUE = {
  id: "image-alt",
  impact: "critical" as const,
  help: "Images are missing alt text",
  whatItMeans:
    "Screen readers can't describe these images to the people using them. A visitor who is blind or has low vision relies on alt text to understand what an image shows — without it, the image is completely invisible to them.",
  whoItAffects: "Blind and low-vision visitors using screen readers.",
  howToFix:
    "Add a concise alt attribute describing each image. Decorative images that convey no meaning should use an empty alt (alt=\"\") so screen readers skip them.",
  wcag: "WCAG 1.1.1",
  element: '<img src="hero.jpg">',
};

// ─── Page ────────────────────────────────────────────────────────────────────

export default function StylePage() {
  const [dark, setDark] = useState(false);

  function toggleDark() {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }

  return (
    <div
      className="paper-grain relative min-h-screen"
      style={{ background: "var(--paper)", color: "var(--ink-900)" }}
    >
      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div
        className="sticky top-0 z-50 flex items-center justify-between border-b px-8 py-3"
        style={{
          background: "var(--paper)",
          borderColor: "var(--border-strong)",
          backdropFilter: "blur(8px)",
        }}
      >
        <div>
          <span className="font-mono text-xs uppercase tracking-widest" style={{ color: "var(--ink-400)" }}>
            Makoya /
          </span>{" "}
          <span className="font-mono text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--ink-600)" }}>
            Redline Design System — Style Tile
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={toggleDark}
          className="font-mono text-xs"
        >
          {dark ? "☀ Light" : "☾ Dark"}
        </Button>
      </div>

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <main className="mx-auto max-w-5xl px-8 py-16">

        {/* ── 1. Color Palette ──────────────────────────────────────────────── */}
        <Section title="01 — Color Palette">

          <Sub label="Signal — cobalt-indigo ink">
            <div className="flex flex-wrap gap-4">
              <Swatch name="signal-50"  hex="#F0F1FE" cssVar="--color-signal-50" />
              <Swatch name="signal-100" hex="#E0E2FD" cssVar="--color-signal-100" />
              <Swatch name="signal-300" hex="#A9ACF5" cssVar="--color-signal-300" />
              <Swatch name="signal-500" hex="#4A4FE8" cssVar="--color-signal-500" />
              <Swatch name="signal-600" hex="#3B40E0" cssVar="--color-signal-600" />
              <Swatch name="signal-700" hex="#2E32B8" cssVar="--color-signal-700" />
              <Swatch name="signal-900" hex="#1A1C66" cssVar="--color-signal-900" />
            </div>
          </Sub>

          <Sub label="Vellum — annotation amber">
            <div className="flex flex-wrap gap-4">
              <Swatch name="vellum-500" hex="#C8821E" cssVar="--color-vellum-500" />
            </div>
          </Sub>

          <Sub label="Warm neutrals — document paper &amp; ink">
            <div className="flex flex-wrap gap-4">
              <Swatch name="paper"        hex="#FBFAF8" cssVar="--paper" />
              <Swatch name="surface"      hex="#FFFFFF" cssVar="--surface" />
              <Swatch name="border"       hex="#ECE9E3" cssVar="--border" />
              <Swatch name="border-strong" hex="#DCD8D0" cssVar="--border-strong" />
              <Swatch name="ink-900"      hex="#1A1815" cssVar="--ink-900" />
              <Swatch name="ink-600"      hex="#6B6760" cssVar="--ink-600" />
              <Swatch name="ink-400"      hex="#9A958C" cssVar="--ink-400" />
            </div>
          </Sub>

          <Sub label="Severity — earth/clay (not traffic-light)">
            <div className="flex flex-wrap gap-4">
              <Swatch name="critical"  hex="#C5403B" cssVar="--color-sev-critical" />
              <Swatch name="serious"   hex="#C8821E" cssVar="--color-sev-serious" />
              <Swatch name="moderate"  hex="#8A7D2E" cssVar="--color-sev-moderate" />
              <Swatch name="minor"     hex="#6B6760" cssVar="--color-sev-minor" />
              <Swatch name="passed"    hex="#3E8E6E" cssVar="--color-sev-passed" />
            </div>
            <div className="mt-4 flex flex-wrap gap-4">
              <Swatch name="crit-bg"   hex="#FBEFEE" cssVar="--color-sev-critical-bg" />
              <Swatch name="ser-bg"    hex="#FBF1E2" cssVar="--color-sev-serious-bg" />
              <Swatch name="mod-bg"    hex="#F4F1E2" cssVar="--color-sev-moderate-bg" />
              <Swatch name="min-bg"    hex="#F2F1EE" cssVar="--color-sev-minor-bg" />
              <Swatch name="pass-bg"   hex="#E9F4EF" cssVar="--color-sev-passed-bg" />
            </div>
          </Sub>
        </Section>

        {/* ── 2. Typography ─────────────────────────────────────────────────── */}
        <Section title="02 — Typography">

          <Sub label="Newsreader — editorial display serif">
            <div className="space-y-4">
              <p
                className="font-display text-[clamp(2rem,6vw,4.5rem)] font-bold leading-none tracking-tight"
                style={{ color: "var(--ink-900)" }}
              >
                Accessibility matters.
              </p>
              <p
                className="font-display text-[clamp(1.5rem,4vw,3rem)] font-semibold leading-tight"
                style={{ color: "var(--ink-900)" }}
              >
                Every visitor deserves access.
              </p>
              {/* "Expensive headline" — Newsreader serif + one Vellum-amber underlined word */}
              <p
                className="font-display text-[clamp(1.25rem,3vw,2.25rem)] font-semibold leading-snug"
                style={{ color: "var(--ink-900)" }}
              >
                Make your site{" "}
                <span
                  className="font-display"
                  style={{
                    color: "var(--color-vellum-500)",
                    textDecoration: "underline",
                    textDecorationThickness: "2px",
                    textUnderlineOffset: "4px",
                  }}
                >
                  inclusive
                </span>{" "}
                — not just compliant.
              </p>
            </div>
          </Sub>

          <Sub label="Geist Sans — UI type scale">
            <div className="space-y-3" style={{ fontFamily: "var(--font-sans)" }}>
              <p className="text-4xl font-semibold leading-tight" style={{ color: "var(--ink-900)" }}>
                H1 — Scan results for example.com
              </p>
              <p className="text-2xl font-semibold leading-tight" style={{ color: "var(--ink-900)" }}>
                H2 — 11 issues found across 3 severities
              </p>
              <p className="text-base leading-relaxed" style={{ color: "var(--ink-600)" }}>
                Body — Your site has 1 critical issue and 3 serious issues that affect screen-reader users
                and keyboard navigators. Each finding below explains what's wrong, who it hurts,
                and how to fix it in plain English.
              </p>
              <p className="text-sm font-medium uppercase tracking-wide" style={{ color: "var(--ink-400)" }}>
                Label / Caption — WCAG 2.1 AA · Last scanned today
              </p>
            </div>
          </Sub>

          <Sub label="Geist Mono — tabular numbers &amp; code">
            <div className="space-y-3" style={{ fontFamily: "var(--font-mono)" }}>
              <p
                className="text-[5rem] font-bold leading-none tabular-nums"
                style={{ color: "var(--color-signal-600)" }}
              >
                87
              </p>
              <p className="text-sm" style={{ color: "var(--ink-600)" }}>
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">&lt;img src=&quot;hero.jpg&quot;&gt;</code>
                {" "}→ missing alt attribute
              </p>
            </div>
          </Sub>
        </Section>

        {/* ── 3. Primitives ─────────────────────────────────────────────────── */}
        <Section title="03 — Primitives">

          <Sub label="Button variants">
            <div className="flex flex-wrap gap-3">
              <Button variant="default">Default</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
            </div>
          </Sub>

          <Sub label="Input">
            <div className="max-w-xs space-y-2">
              <Label htmlFor="style-input" className="text-sm font-medium">
                Website URL
              </Label>
              <Input
                id="style-input"
                type="url"
                placeholder="https://example.com"
                className="w-full"
              />
            </div>
          </Sub>

          <Sub label="Switch">
            <div className="flex items-center gap-3">
              <Switch id="style-switch" defaultChecked />
              <Label htmlFor="style-switch" className="text-sm">
                Enable read-aloud mode
              </Label>
            </div>
          </Sub>

          <Sub label="Tabs">
            <Tabs defaultValue="overview" className="w-full max-w-lg">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="issues">Issues (11)</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>
              <TabsContent value="overview">
                <p className="text-sm text-muted-foreground pt-3">
                  Overview tab content — summary stats and score.
                </p>
              </TabsContent>
              <TabsContent value="issues">
                <p className="text-sm text-muted-foreground pt-3">
                  Issues tab content — the ranked finding list.
                </p>
              </TabsContent>
              <TabsContent value="history">
                <p className="text-sm text-muted-foreground pt-3">
                  History tab content — previous scan dates + scores.
                </p>
              </TabsContent>
            </Tabs>
          </Sub>

          <Sub label="Card">
            <Card className="max-w-sm">
              <CardHeader>
                <CardTitle className="text-base">Site health summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Your score improved from 72 → 87 this week. One critical issue remains open.
                </p>
              </CardContent>
            </Card>
          </Sub>

          <Sub label="Badge">
            <div className="flex flex-wrap gap-2">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="destructive">Destructive</Badge>
            </div>
          </Sub>
        </Section>

        {/* ── 4. Signature components ───────────────────────────────────────── */}
        <Section title="04 — Signature Components">

          {/* ScoreMark */}
          <Sub label="ScoreMark — the still, centrepiece score display">
            <div className="flex flex-wrap items-start gap-16">
              <div className="flex flex-col items-center gap-3">
                <p className="font-mono text-[0.6rem] uppercase tracking-widest" style={{ color: "var(--ink-400)" }}>
                  hero size
                </p>
                <ScoreMark
                  score={87}
                  verdict="Good — a few real issues to fix"
                  size="hero"
                />
              </div>
              <div className="flex flex-col items-center gap-3">
                <p className="font-mono text-[0.6rem] uppercase tracking-widest" style={{ color: "var(--ink-400)" }}>
                  app size
                </p>
                <ScoreMark score={42} size="app" />
              </div>
              <div className="flex flex-col items-center gap-3">
                <p className="font-mono text-[0.6rem] uppercase tracking-widest" style={{ color: "var(--ink-400)" }}>
                  passed
                </p>
                <ScoreMark score={96} size="app" />
              </div>
            </div>
          </Sub>

          {/* SeverityBar */}
          <Sub label="SeverityBar — stacked issue distribution bar">
            <div className="max-w-lg space-y-3">
              <SeverityBar
                totals={{ critical: 1, serious: 3, moderate: 2, minor: 5 }}
                heightClass="h-3"
              />
              <p className="font-mono text-xs" style={{ color: "var(--ink-400)" }}>
                critical:1 · serious:3 · moderate:2 · minor:5
              </p>
            </div>
          </Sub>

          {/* SeverityChip row */}
          <Sub label="SeverityChip — severity pill chips">
            <div className="flex flex-wrap gap-3">
              <SeverityChip severity="critical" count={1} />
              <SeverityChip severity="serious" count={3} />
              <SeverityChip severity="moderate" count={2} />
              <SeverityChip severity="minor" count={5} />
            </div>
          </Sub>

          {/* IssueCard */}
          <Sub label="IssueCard — plain-English finding (click to expand)">
            <div className="max-w-2xl">
              <IssueCard issue={SAMPLE_ISSUE} />
            </div>
          </Sub>

          {/* AnnotatedPreview */}
          <Sub label="AnnotatedPreview — mock-browser with Vellum marks">
            <div className="max-w-xl">
              <AnnotatedPreview
                annotations={[
                  { x: 10, y: 20, w: 30, h: 8, severity: "critical", label: "Missing alt text" },
                  { x: 15, y: 55, w: 40, h: 8, severity: "serious", label: "Low contrast button" },
                ]}
                mode="reveal"
              />
            </div>
          </Sub>

          {/* ScanLoading */}
          <Sub label="ScanLoading — methodical tick-column loader">
            <div className="flex flex-wrap gap-16 items-start">
              <div className="flex flex-col gap-2">
                <p className="font-mono text-[0.6rem] uppercase tracking-widest mb-2" style={{ color: "var(--ink-400)" }}>
                  indeterminate (one-shot)
                </p>
                <ScanLoading label="Scanning your page…" />
              </div>
              <div className="flex flex-col gap-2">
                <p className="font-mono text-[0.6rem] uppercase tracking-widest mb-2" style={{ color: "var(--ink-400)" }}>
                  determinate 60%
                </p>
                <ScanLoading progress={0.6} label="Checking colour contrast…" />
              </div>
            </div>
          </Sub>

          {/* AnnotationMargin */}
          <Sub label="AnnotationMargin — left-gutter layout primitive">
            <div className="max-w-xl">
              <AnnotationMargin
                lineCount={6}
                marks={[
                  { at: 1, severity: "critical" },
                  { at: 4, severity: "serious" },
                ]}
              >
                <div
                  className="space-y-3 pl-4 text-sm leading-relaxed"
                  style={{ color: "var(--ink-600)" }}
                >
                  <p>
                    The AnnotationMargin wraps any content in a grid with a thin left gutter.
                    Line-number spans and severity-coloured tick marks appear in the gutter.
                  </p>
                  <p>
                    Critical marks (clay red) and serious marks (Vellum amber) are positioned
                    at the corresponding line index, giving a code-review / manuscript feel.
                  </p>
                  <p>
                    This primitive is the structural fingerprint of the Redline aesthetic —
                    it unifies hero, report, and app surfaces without any motion of its own.
                  </p>
                  <p>
                    The gutter is <code className="rounded bg-muted px-1 py-0.5 text-xs">aria-hidden</code>,
                    so screen readers skip it entirely and only read the content column.
                  </p>
                  <p>Callers own animation; this component is purely structural.</p>
                  <p>Width: 2rem gutter + 1fr content via CSS grid.</p>
                </div>
              </AnnotationMargin>
            </div>
          </Sub>
        </Section>

        {/* ── Footer ──────────────────────────────────────────────────────────── */}
        <footer
          className="border-t pt-8 pb-4 text-center font-mono text-[0.625rem] uppercase tracking-widest"
          style={{ borderColor: "var(--border-strong)", color: "var(--ink-400)" }}
        >
          Makoya · Redline Design System · Internal reference · Not indexed
        </footer>
      </main>
    </div>
  );
}
