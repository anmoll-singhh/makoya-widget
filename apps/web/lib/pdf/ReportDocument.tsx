/**
 * lib/pdf/ReportDocument.tsx — the visual layout of the scan report PDF.
 *
 * Pure presentation: it takes a fully-built `ReportContent` (see report-content.ts,
 * where all copy + the honesty guardrail live) and arranges it with
 * @react-pdf/renderer primitives. No data logic here, no I/O.
 *
 * Fonts: we deliberately use the built-in Helvetica family (no Font.register).
 * Registering web fonts means a network fetch at render time, which is exactly
 * the kind of thing that breaks intermittently on serverless — and our widget
 * rules ("always render with a fallback") apply in spirit here too.
 */

import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { ReportContent, ReportSeverity } from "./report-content";

const BRAND = "#2563eb";
const INK = "#0f172a";
const MUTED = "#475569";
const FAINT = "#94a3b8";
const LINE = "#e2e8f0";

const SEVERITY_COLOR: Record<ReportSeverity, string> = {
  critical: "#dc2626",
  serious: "#ea580c",
  moderate: "#d97706",
  minor: "#0284c7",
};

function scoreColor(score: number): string {
  if (score >= 80) return "#059669";
  if (score >= 60) return "#d97706";
  return "#dc2626";
}

const s = StyleSheet.create({
  page: { paddingTop: 48, paddingBottom: 56, paddingHorizontal: 48, fontFamily: "Helvetica", color: INK, fontSize: 10.5, lineHeight: 1.5 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", borderBottomWidth: 1, borderBottomColor: LINE, paddingBottom: 12, marginBottom: 20 },
  wordmark: { fontFamily: "Helvetica-Bold", fontSize: 18, color: INK },
  wordmarkDot: { color: BRAND },
  tagline: { fontSize: 8.5, color: FAINT, marginTop: 2 },
  metaRight: { textAlign: "right", fontSize: 8.5, color: FAINT },
  h1: { fontFamily: "Helvetica-Bold", fontSize: 15, marginBottom: 4 },
  intro: { color: MUTED, marginBottom: 18 },
  scoreRow: { flexDirection: "row", alignItems: "center", gap: 18, padding: 16, borderWidth: 1, borderColor: LINE, borderRadius: 8, marginBottom: 16 },
  scoreNum: { fontFamily: "Helvetica-Bold", fontSize: 40, lineHeight: 1 },
  scoreOf: { fontSize: 11, color: FAINT },
  verdict: { fontFamily: "Helvetica-Bold", fontSize: 11.5, marginBottom: 2 },
  verdictSub: { color: MUTED, fontSize: 10 },
  sevGrid: { flexDirection: "row", gap: 8, marginBottom: 22 },
  sevCell: { flex: 1, borderWidth: 1, borderColor: LINE, borderRadius: 6, paddingVertical: 8, paddingHorizontal: 10 },
  sevCount: { fontFamily: "Helvetica-Bold", fontSize: 16 },
  sevLabel: { fontSize: 8.5, color: MUTED, marginTop: 1 },
  sectionTitle: { fontFamily: "Helvetica-Bold", fontSize: 12, marginBottom: 10 },
  issue: { borderWidth: 1, borderColor: LINE, borderRadius: 6, padding: 11, marginBottom: 8 },
  issueHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 4 },
  issueTitle: { fontFamily: "Helvetica-Bold", fontSize: 10.5, flex: 1 },
  chip: { fontFamily: "Helvetica-Bold", fontSize: 7.5, color: "#ffffff", borderRadius: 8, paddingVertical: 2, paddingHorizontal: 7 },
  issueBody: { color: MUTED },
  issueAffects: { color: FAINT, fontSize: 9, marginTop: 3 },
  emptyBox: { borderWidth: 1, borderColor: "#bbf7d0", backgroundColor: "#f0fdf4", borderRadius: 6, padding: 12, marginBottom: 22, color: "#15803d" },
  steps: { marginBottom: 20 },
  step: { flexDirection: "row", gap: 6, marginBottom: 4 },
  stepBullet: { color: BRAND, fontFamily: "Helvetica-Bold" },
  stepText: { flex: 1, color: MUTED },
  note: { fontSize: 9, color: FAINT, marginBottom: 14 },
  disclaimer: { borderWidth: 1, borderColor: LINE, backgroundColor: "#f8fafc", borderRadius: 6, padding: 12, fontSize: 9, color: MUTED },
  disclaimerLabel: { fontFamily: "Helvetica-Bold", color: INK, fontSize: 9.5, marginBottom: 3 },
  footer: { position: "absolute", left: 48, right: 48, bottom: 28, borderTopWidth: 1, borderTopColor: LINE, paddingTop: 8, fontSize: 8, color: FAINT, textAlign: "center" },
  // Diagonal brand watermark, repeated on EVERY page via `fixed`. Faint enough
  // not to impair reading, present enough to mark provenance on every sheet.
  watermark: {
    position: "absolute",
    top: "42%",
    left: -40,
    right: -40,
    textAlign: "center",
    transform: "rotate(-28deg)",
    fontFamily: "Helvetica-Bold",
    fontSize: 96,
    letterSpacing: 6,
    color: BRAND,
    opacity: 0.06,
  },
  watermarkFoot: {
    position: "absolute",
    left: 48,
    right: 48,
    bottom: 14,
    textAlign: "center",
    fontSize: 7,
    color: FAINT,
    opacity: 0.8,
  },
});

export function ReportDocument({ content }: { content: ReportContent }) {
  const c = content;
  return (
    <Document title={`Accessibility report — ${c.host}`} author="Makoya">
      <Page size="A4" style={s.page}>
        {/* Brand watermark — `fixed` repeats it on every page */}
        <Text style={s.watermark} fixed>
          Makoya
        </Text>
        <Text style={s.watermarkFoot} fixed>
          Makoya — honest web accessibility · makoya
        </Text>

        {/* Brand header */}
        <View style={s.header}>
          <View>
            <Text style={s.wordmark}>
              Makoya<Text style={s.wordmarkDot}>.</Text>
            </Text>
            <Text style={s.tagline}>Honest web accessibility</Text>
          </View>
          <View>
            <Text style={s.metaRight}>Accessibility report</Text>
            <Text style={s.metaRight}>{c.url}</Text>
            <Text style={s.metaRight}>{c.dateLabel}</Text>
          </View>
        </View>

        <Text style={s.h1}>Accessibility scan for {c.host}</Text>
        <Text style={s.intro}>{c.intro}</Text>

        {/* Score */}
        <View style={s.scoreRow}>
          <Text>
            <Text style={[s.scoreNum, { color: scoreColor(c.score) }]}>{c.score}</Text>
            <Text style={s.scoreOf}> / 100</Text>
          </Text>
          <View style={{ flex: 1 }}>
            <Text style={s.verdict}>{c.scoreVerdict}</Text>
            <Text style={s.verdictSub}>
              {c.totals.total} {c.totals.total === 1 ? "issue" : "issues"} found on this page.
            </Text>
          </View>
        </View>

        {/* Severity breakdown */}
        <View style={s.sevGrid}>
          {c.severityRows.map((row) => (
            <View key={row.key} style={s.sevCell}>
              <Text style={[s.sevCount, { color: SEVERITY_COLOR[row.key] }]}>{row.count}</Text>
              <Text style={s.sevLabel}>{row.label}</Text>
            </View>
          ))}
        </View>

        {/* Issues or clean state */}
        {c.issues.length > 0 ? (
          <>
            <Text style={s.sectionTitle}>Top things to fix</Text>
            {c.issues.map((issue, idx) => (
              <View key={`${issue.id}-${idx}`} style={s.issue} wrap={false}>
                <View style={s.issueHead}>
                  <Text style={s.issueTitle}>{issue.title}</Text>
                  {issue.impact && (
                    <Text style={[s.chip, { backgroundColor: SEVERITY_COLOR[issue.impact] }]}>
                      {issue.impactLabel}
                    </Text>
                  )}
                </View>
                <Text style={s.issueBody}>{issue.whatItMeans}</Text>
                {issue.whoItAffects ? (
                  <Text style={s.issueAffects}>Affects: {issue.whoItAffects}</Text>
                ) : null}
              </View>
            ))}
          </>
        ) : (
          <View style={s.emptyBox}>
            <Text>
              No issues flagged in this automated pass. That&apos;s a good sign — but see the note
              below on what automated scans can and can&apos;t catch.
            </Text>
          </View>
        )}

        {c.partialNote && <Text style={s.note}>{c.partialNote}</Text>}

        {/* Next steps */}
        <View style={s.steps}>
          <Text style={s.sectionTitle}>What to do next</Text>
          {c.nextSteps.map((step, i) => (
            <View key={i} style={s.step}>
              <Text style={s.stepBullet}>•</Text>
              <Text style={s.stepText}>{step}</Text>
            </View>
          ))}
        </View>

        {/* Honest disclaimer */}
        <View style={s.disclaimer}>
          <Text style={s.disclaimerLabel}>What this report is — and isn&apos;t</Text>
          <Text>{c.disclaimer}</Text>
        </View>

        <Text style={s.footer} fixed>
          {c.footer}
        </Text>
      </Page>
    </Document>
  );
}
