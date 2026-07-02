/**
 * lib/pdf/AuditDocument.tsx — branded PDF layout for the Full Audit report.
 *
 * Pure presentation over a fully-built `AuditReportContent` (see
 * lib/audit/audit-content.ts, where all copy + the honesty guardrail live). No
 * data logic, no I/O. Mirrors the on-screen accessScan-style layout: a navy
 * score header, per-rule rows (outcome + WCAG chip + severity), and monospace
 * code snapshots. Same brand palette + built-in-font approach as ReportDocument.
 *
 * Honesty: this file writes NO verdict copy of its own — every string comes from
 * the content model. Not-applicable rules are listed compactly as "not relevant",
 * never as a green pass.
 */

import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { AuditReportContent, AuditRuleRow } from "@/lib/audit/audit-content";

const NAVY = "#0D1B4D";
const BLUE = "#1E63FF";
const WHITE = "#FFFFFF";
const INK = "#0f172a";
const MUTED = "#475569";
const FAINT = "#94a3b8";
const LINE = "#e2e8f0";
const SURF = "#f8fafc";

const OUTCOME_COLOR: Record<AuditRuleRow["outcome"], string> = {
  fail: "#dc2626",
  review: "#b45309",
  pass: "#15803d",
  "not-applicable": "#64748b",
};
const OUTCOME_BG: Record<AuditRuleRow["outcome"], string> = {
  fail: "#fff0f0",
  review: "#fffbeb",
  pass: "#f0fdf4",
  "not-applicable": "#f1f5f9",
};

function scoreColor(score: number): string {
  if (score >= 80) return "#1FA86B";
  if (score >= 60) return "#d97706";
  return "#dc2626";
}

const s = StyleSheet.create({
  page: {
    paddingTop: 0,
    paddingBottom: 56,
    paddingHorizontal: 0,
    fontFamily: "Helvetica",
    color: INK,
    fontSize: 9.5,
    lineHeight: 1.5,
    backgroundColor: WHITE,
  },
  coverBand: { backgroundColor: NAVY, paddingTop: 34, paddingBottom: 22, paddingHorizontal: 44 },
  wordmark: { fontFamily: "Helvetica-Bold", fontSize: 22, color: WHITE },
  wordmarkDot: { color: BLUE },
  label: { fontFamily: "Helvetica-Bold", fontSize: 7.5, color: "#93c5fd", letterSpacing: 1, marginTop: 10 },
  host: { fontFamily: "Helvetica-Bold", fontSize: 15, color: WHITE, marginTop: 3 },
  metaUrl: { fontSize: 8.5, color: "#cbd5e1", marginTop: 2 },
  verdict: { fontSize: 9.5, color: "#e2e8f0", marginTop: 10, maxWidth: 380 },
  scoreWrap: { position: "absolute", right: 44, top: 34, alignItems: "center" },
  scoreNum: { fontFamily: "Helvetica-Bold", fontSize: 44, lineHeight: 1 },
  scoreOf: { fontSize: 9, color: "#94a3b8", textAlign: "center" },
  accentStripe: { height: 3, backgroundColor: BLUE, marginBottom: 18 },

  body: { paddingHorizontal: 44 },

  // Summary row
  summaryRow: { flexDirection: "row", gap: 8, marginBottom: 18 },
  summaryCell: {
    flex: 1,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 6,
    padding: 8,
    alignItems: "center",
  },
  summaryNum: { fontFamily: "Helvetica-Bold", fontSize: 16 },
  summaryLabel: { fontSize: 7, color: MUTED, marginTop: 2, textAlign: "center" },

  sectionTitle: { fontFamily: "Helvetica-Bold", fontSize: 12, color: INK, marginBottom: 8, marginTop: 4 },

  // Rule card
  ruleCard: { borderWidth: 1, borderColor: LINE, borderRadius: 6, marginBottom: 8, padding: 10 },
  ruleTitle: { fontFamily: "Helvetica-Bold", fontSize: 10, color: INK, marginBottom: 5 },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, alignItems: "center" },
  outcomeChip: { fontFamily: "Helvetica-Bold", fontSize: 7, borderRadius: 4, paddingVertical: 2, paddingHorizontal: 6 },
  metaChip: {
    fontSize: 7,
    color: MUTED,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 5,
    backgroundColor: SURF,
  },
  sampleHeading: { fontFamily: "Helvetica-Bold", fontSize: 7.5, color: MUTED, marginTop: 8, marginBottom: 4 },
  codeChip: {
    fontFamily: "Courier",
    fontSize: 7,
    color: "#e2e8f0",
    backgroundColor: "#0d1b2a",
    padding: 6,
    borderRadius: 3,
    marginBottom: 4,
  },

  naItem: { fontSize: 8, color: MUTED, marginBottom: 2 },

  disclaimer: {
    borderWidth: 1,
    borderColor: "#fde68a",
    backgroundColor: "#fffbeb",
    borderRadius: 6,
    padding: 11,
    marginTop: 14,
  },
  disclaimerText: { fontSize: 8.5, color: "#78350f", lineHeight: 1.6 },

  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 44,
    paddingTop: 8,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: LINE,
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: WHITE,
  },
  footerText: { fontSize: 7, color: FAINT },
});

function RuleCard({ row, index }: { row: AuditRuleRow; index: number }) {
  const color = OUTCOME_COLOR[row.outcome];
  return (
    <View style={s.ruleCard} wrap={false}>
      <Text style={s.ruleTitle}>
        {index}. {row.title}
      </Text>
      <View style={s.chipsRow}>
        <Text style={[s.outcomeChip, { color, backgroundColor: OUTCOME_BG[row.outcome] }]}>
          {row.outcomeLabel}
          {row.relevant && row.outcome === "fail" ? ` · ${row.count}` : ""}
        </Text>
        {row.wcagCriterion ? <Text style={s.metaChip}>{row.wcagCriterion}</Text> : null}
        <Text style={s.metaChip}>{row.levelLabel}</Text>
        {row.severityLabel ? <Text style={s.metaChip}>{row.severityLabel}</Text> : null}
      </View>
      {row.sample.length > 0 && row.sampleHeading ? (
        <>
          <Text style={s.sampleHeading}>{row.sampleHeading}</Text>
          {row.sample.map((sample, i) => (
            <Text key={i} style={s.codeChip}>
              {sample.html || sample.target}
            </Text>
          ))}
        </>
      ) : null}
    </View>
  );
}

export function AuditDocument({ content }: { content: AuditReportContent }) {
  const c = content;
  const applicable = c.scoredRules.filter((r) => r.outcome !== "not-applicable");
  const notApplicable = c.scoredRules.filter((r) => r.outcome === "not-applicable");
  const bestPractice = c.bestPracticeRules.filter((r) => r.outcome !== "not-applicable");

  return (
    <Document title={`Full accessibility audit — ${c.host}`} author="Makoya">
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.coverBand}>
          <Text style={s.wordmark}>
            Makoya<Text style={s.wordmarkDot}>.</Text>
          </Text>
          <Text style={s.label}>FULL ACCESSIBILITY AUDIT</Text>
          <Text style={s.host}>{c.host}</Text>
          <Text style={s.metaUrl}>
            {c.url} · {c.dateLabel}
          </Text>
          <Text style={s.verdict}>{c.scoreVerdict}</Text>
          <View style={s.scoreWrap}>
            <Text style={[s.scoreNum, { color: scoreColor(c.score) }]}>{c.score}</Text>
            <Text style={s.scoreOf}>/ 100</Text>
          </View>
        </View>
        <View style={s.accentStripe} />

        <View style={s.body}>
          {/* Summary */}
          <View style={s.summaryRow}>
            {[
              { n: c.summary.failed, l: "Failing", col: "#dc2626" },
              { n: c.summary.review, l: "Needs review", col: "#b45309" },
              { n: c.summary.passed, l: "No issue found", col: "#15803d" },
              { n: c.summary.notApplicable, l: "Not relevant", col: "#64748b" },
              { n: c.summary.totalRules, l: "Checks run", col: NAVY },
            ].map((cell, i) => (
              <View key={i} style={s.summaryCell}>
                <Text style={[s.summaryNum, { color: cell.col }]}>{cell.n}</Text>
                <Text style={s.summaryLabel}>{cell.l}</Text>
              </View>
            ))}
          </View>

          {/* Applicable checks */}
          <Text style={s.sectionTitle}>Checks that applied to this page ({applicable.length})</Text>
          {applicable.map((row, i) => (
            <RuleCard key={row.id} row={row} index={i + 1} />
          ))}

          {/* Best practices */}
          {bestPractice.length > 0 ? (
            <>
              <Text style={s.sectionTitle}>Best practices — not included in the score</Text>
              {bestPractice.map((row, i) => (
                <RuleCard key={row.id} row={row} index={i + 1} />
              ))}
            </>
          ) : null}

          {/* Not applicable */}
          {notApplicable.length > 0 ? (
            <>
              <Text style={s.sectionTitle}>Checks that didn&apos;t apply to this page ({notApplicable.length})</Text>
              {notApplicable.map((row) => (
                <Text key={row.id} style={s.naItem}>
                  • {row.title}
                  {row.wcagCriterion ? ` — ${row.wcagCriterion}` : ""}
                </Text>
              ))}
            </>
          ) : null}

          {/* Disclaimer */}
          <View style={s.disclaimer}>
            <Text style={s.disclaimerText}>{c.disclaimer}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>{c.footer}</Text>
          <Text
            style={s.footerText}
            render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
