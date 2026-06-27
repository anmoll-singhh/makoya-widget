/**
 * lib/pdf/ReportDocument.tsx — branded, premium PDF layout for the scan report.
 *
 * Pure presentation: takes a fully-built `ReportContent` (see report-content.ts,
 * where all copy + the honesty guardrail live) and arranges it with
 * @react-pdf/renderer primitives. No data logic here, no I/O.
 *
 * Block 26 redesign:
 *  - Full-width navy (#0D1B4D) cover header + signal-blue (#1E63FF) accent stripe.
 *  - Score hero: large number, verdict, flex-based progress bar.
 *  - Severity breakdown TABLE (header row + data rows + total row).
 *  - Per-issue detail cards: key/value row table with labels, disability chips,
 *    bullet how-to-fix, monospace evidence. Cards sorted critical-first (done in
 *    the content model).
 *  - "Remaining items to fix" punch-list TABLE at the end: # / Severity / Issue / Status.
 *  - Fixed footer with page numbers via react-pdf render prop.
 *
 * Fonts: built-in Helvetica family only — no Font.register() because network
 * fetches at serverless render time are unreliable (widget rule: always fallback).
 */

import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { ReportContent, ReportSeverity } from "./report-content";

// ── Brand palette ────────────────────────────────────────────────────────────
const NAVY = "#0D1B4D";
const BLUE = "#1E63FF";
const GREEN = "#1FA86B";
const WHITE = "#FFFFFF";
const INK = "#0f172a";
const MUTED = "#475569";
const FAINT = "#94a3b8";
const LINE = "#e2e8f0";
const SURF = "#f8fafc";

const SEVERITY_COLOR: Record<ReportSeverity, string> = {
  critical: "#dc2626",
  serious: "#ea580c",
  moderate: "#d97706",
  minor: "#0284c7",
};

const SEVERITY_BG: Record<ReportSeverity, string> = {
  critical: "#fff0f0",
  serious: "#fff7ed",
  moderate: "#fffbeb",
  minor: "#eff6ff",
};

const SEVERITY_DESCRIPTION: Record<ReportSeverity, string> = {
  critical: "Blocks users entirely — fix first.",
  serious: "Significant barrier for many visitors.",
  moderate: "Creates friction; reduces usability.",
  minor: "Small inconvenience; fix when possible.",
};

function scoreColor(score: number): string {
  if (score >= 80) return GREEN;
  if (score >= 60) return "#d97706";
  return "#dc2626";
}

// ── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // Page: no horizontal padding — handled inside coverBand + body so the header
  // can bleed edge-to-edge at its own padding level.
  page: {
    paddingTop: 0,
    paddingBottom: 64,
    paddingHorizontal: 0,
    fontFamily: "Helvetica",
    color: INK,
    fontSize: 10,
    lineHeight: 1.55,
    backgroundColor: WHITE,
  },

  // ── Cover header ──────────────────────────────────────────────────────────
  coverBand: {
    backgroundColor: NAVY,
    paddingTop: 40,
    paddingBottom: 24,
    paddingHorizontal: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  wordmark: {
    fontFamily: "Helvetica-Bold",
    fontSize: 28,
    color: WHITE,
    letterSpacing: 0.4,
  },
  wordmarkDot: { color: BLUE },
  tagline: { fontSize: 8.5, color: "#93c5fd", marginTop: 4 },
  metaBlock: { textAlign: "right" },
  metaReportLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    color: "#cbd5e1",
    letterSpacing: 1.2,
    marginBottom: 5,
  },
  metaUrl: { fontSize: 8.5, color: "#e2e8f0", marginBottom: 2 },
  metaDate: { fontSize: 8, color: "#94a3b8" },

  // Signal-blue stripe under the header
  accentStripe: {
    height: 4,
    backgroundColor: BLUE,
    marginBottom: 26,
  },

  // ── Main body wrapper (provides horizontal padding for all sections) ───────
  body: { paddingHorizontal: 48 },

  // ── Typography ────────────────────────────────────────────────────────────
  reportTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 16,
    color: INK,
    marginBottom: 6,
  },
  intro: { color: MUTED, marginBottom: 20, fontSize: 9.5 },
  sectionTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 12.5,
    color: INK,
    marginBottom: 8,
    marginTop: 2,
  },
  sectionRule: {
    borderBottomWidth: 1,
    borderBottomColor: LINE,
    marginBottom: 14,
  },

  // ── Score hero ────────────────────────────────────────────────────────────
  scoreHero: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 8,
    marginBottom: 22,
    backgroundColor: WHITE,
  },
  scoreLeft: {
    width: 116,
    backgroundColor: SURF,
    borderRightWidth: 1,
    borderRightColor: LINE,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 22,
  },
  scoreNum: {
    fontFamily: "Helvetica-Bold",
    fontSize: 58,
    lineHeight: 1,
    textAlign: "center",
  },
  scoreOf: { fontSize: 11, color: FAINT, textAlign: "center", marginTop: 3 },
  scoreRight: { flex: 1, padding: 18, justifyContent: "center" },
  verdict: { fontFamily: "Helvetica-Bold", fontSize: 13, marginBottom: 5 },
  verdictSub: { color: MUTED, fontSize: 9, marginBottom: 12 },
  scoreBarBg: {
    height: 8,
    backgroundColor: LINE,
    borderRadius: 4,
    flexDirection: "row",
  },
  scoreBarFill: { borderRadius: 4, height: 8 },

  // ── Severity breakdown table ───────────────────────────────────────────────
  table: {
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 6,
    marginBottom: 22,
  },
  tHeadRow: {
    flexDirection: "row",
    backgroundColor: NAVY,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
  },
  tHeadCell: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    color: WHITE,
    letterSpacing: 0.8,
  },
  tRow: {
    flexDirection: "row",
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: LINE,
    alignItems: "center",
  },
  tRowAlt: { backgroundColor: SURF },
  tTotalRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderTopWidth: 2,
    borderTopColor: "#cbd5e1",
    backgroundColor: "#eef2ff",
    borderBottomLeftRadius: 5,
    borderBottomRightRadius: 5,
    alignItems: "center",
  },
  tCell: { fontSize: 9, color: INK },
  tCellMuted: { fontSize: 9, color: MUTED },
  tCellBold: { fontFamily: "Helvetica-Bold", fontSize: 9, color: INK },
  tTotalLabel: { fontFamily: "Helvetica-Bold", fontSize: 9.5, color: NAVY },

  // Severity dot (coloured circle used in the severity table)
  sevDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },

  // ── Issue cards ───────────────────────────────────────────────────────────
  issueCard: {
    marginBottom: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: LINE,
  },
  issueCardHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
    gap: 8,
  },
  issueTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    color: INK,
    flex: 1,
  },
  chip: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    color: WHITE,
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  // Key/value row inside an issue card
  issueRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: LINE,
  },
  issueRowLabel: {
    width: 108,
    paddingVertical: 7,
    paddingHorizontal: 10,
    backgroundColor: SURF,
    borderRightWidth: 1,
    borderRightColor: LINE,
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    color: MUTED,
  },
  issueRowValue: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 10,
    fontSize: 9,
    color: INK,
  },
  // Disability group chips
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  groupChip: {
    fontSize: 7.5,
    color: BLUE,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: "#eff6ff",
  },
  // Bullet row for how-to-fix
  bulletRow: {
    flexDirection: "row",
    gap: 5,
    marginBottom: 2,
  },
  bulletDot: { color: BLUE, fontFamily: "Helvetica-Bold", fontSize: 10 },
  bulletText: { flex: 1, color: MUTED, fontSize: 9 },
  // Monospace evidence block
  evidenceBlock: {
    fontFamily: "Courier",
    fontSize: 8,
    color: "#374151",
    backgroundColor: "#f1f5f9",
    padding: 5,
    borderRadius: 3,
  },

  // ── Empty / all-clear box ─────────────────────────────────────────────────
  emptyBox: {
    borderWidth: 1,
    borderColor: "#bbf7d0",
    backgroundColor: "#f0fdf4",
    borderRadius: 6,
    padding: 14,
    marginBottom: 22,
    color: "#15803d",
    fontSize: 9.5,
  },

  // ── Next steps ────────────────────────────────────────────────────────────
  steps: { marginBottom: 22 },
  step: { flexDirection: "row", gap: 8, marginBottom: 5 },
  stepArrow: { color: BLUE, fontFamily: "Helvetica-Bold", fontSize: 10 },
  stepText: { flex: 1, color: MUTED, fontSize: 9.5 },

  // ── Partial note ──────────────────────────────────────────────────────────
  note: { fontSize: 8.5, color: FAINT, marginBottom: 16 },

  // ── Honest disclaimer box ─────────────────────────────────────────────────
  disclaimer: {
    borderWidth: 1,
    borderColor: "#fde68a",
    backgroundColor: "#fffbeb",
    borderRadius: 6,
    padding: 13,
    marginBottom: 26,
  },
  disclaimerLabel: {
    fontFamily: "Helvetica-Bold",
    color: "#92400e",
    fontSize: 9.5,
    marginBottom: 4,
  },
  disclaimerText: { fontSize: 9, color: "#78350f", lineHeight: 1.6 },

  // ── Remaining items punch-list ────────────────────────────────────────────
  punchTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 12.5,
    color: INK,
    marginBottom: 4,
  },
  punchSub: { fontSize: 9, color: MUTED, marginBottom: 10 },

  // ── Fixed page footer ─────────────────────────────────────────────────────
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 48,
    paddingTop: 10,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: LINE,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: WHITE,
  },
  footerText: { fontSize: 7.5, color: FAINT },
  footerPage: { fontSize: 7.5, color: FAINT },

  // ── Diagonal brand watermark (repeated via `fixed`) ───────────────────────
  watermark: {
    position: "absolute",
    top: "40%",
    left: -20,
    right: -20,
    textAlign: "center",
    transform: "rotate(-28deg)",
    fontFamily: "Helvetica-Bold",
    fontSize: 98,
    letterSpacing: 8,
    color: BLUE,
    opacity: 0.03,
  },
});

// ── Component ────────────────────────────────────────────────────────────────

export function ReportDocument({ content }: { content: ReportContent }) {
  const c = content;
  const sc = scoreColor(c.score);

  return (
    <Document title={`Accessibility report — ${c.host}`} author="Makoya">
      <Page size="A4" style={s.page}>
        {/* Faint brand watermark — `fixed` repeats on every page */}
        <Text style={s.watermark} fixed>
          Makoya
        </Text>

        {/* ── Cover header band ──────────────────────────────────────────── */}
        <View style={s.coverBand}>
          <View>
            <Text style={s.wordmark}>
              Makoya<Text style={s.wordmarkDot}>.</Text>
            </Text>
            <Text style={s.tagline}>Honest web accessibility</Text>
          </View>
          <View style={s.metaBlock}>
            <Text style={s.metaReportLabel}>ACCESSIBILITY REPORT</Text>
            <Text style={s.metaUrl}>{c.url}</Text>
            <Text style={s.metaDate}>{c.dateLabel}</Text>
          </View>
        </View>

        {/* Signal-blue accent stripe */}
        <View style={s.accentStripe} />

        {/* ── Body (all sections share this horizontal padding) ──────────── */}
        <View style={s.body}>
          {/* Site title & intro */}
          <Text style={s.reportTitle}>Accessibility scan — {c.host}</Text>
          <Text style={s.intro}>{c.intro}</Text>

          {/* ── Score hero ────────────────────────────────────────────────── */}
          <View style={s.scoreHero}>
            <View style={s.scoreLeft}>
              <Text style={[s.scoreNum, { color: sc }]}>{c.score}</Text>
              <Text style={s.scoreOf}>/ 100</Text>
            </View>
            <View style={s.scoreRight}>
              <Text style={[s.verdict, { color: sc }]}>{c.scoreVerdict}</Text>
              <Text style={s.verdictSub}>
                {c.totals.total} {c.totals.total === 1 ? "issue" : "issues"} detected across
                Critical, Serious, Moderate, and Minor categories.
              </Text>
              {/* Proportional score bar built with flex so no % widths needed */}
              <View style={s.scoreBarBg}>
                {c.score > 0 && (
                  <View style={[s.scoreBarFill, { flex: c.score, backgroundColor: sc }]} />
                )}
                {c.score < 100 && <View style={{ flex: 100 - c.score }} />}
              </View>
            </View>
          </View>

          {/* ── Severity breakdown table ─────────────────────────────────── */}
          <Text style={s.sectionTitle}>Severity breakdown</Text>
          <View style={s.table}>
            {/* Header */}
            <View style={s.tHeadRow}>
              <Text style={[s.tHeadCell, { flex: 1.4 }]}>Severity</Text>
              <Text style={[s.tHeadCell, { flex: 0.5 }]}>Count</Text>
              <Text style={[s.tHeadCell, { flex: 3 }]}>What it means</Text>
            </View>
            {/* Data rows */}
            {c.severityRows.map((row, idx) => (
              <View key={row.key} style={[s.tRow, idx % 2 === 1 ? s.tRowAlt : {}]}>
                <View style={{ flex: 1.4, flexDirection: "row", alignItems: "center" }}>
                  <View style={[s.sevDot, { backgroundColor: SEVERITY_COLOR[row.key] }]} />
                  <Text style={[s.tCellBold, { color: SEVERITY_COLOR[row.key] }]}>{row.label}</Text>
                </View>
                <Text style={[s.tCellBold, { flex: 0.5 }]}>{row.count}</Text>
                <Text style={[s.tCellMuted, { flex: 3 }]}>{SEVERITY_DESCRIPTION[row.key]}</Text>
              </View>
            ))}
            {/* Total row */}
            <View style={s.tTotalRow}>
              <Text style={[s.tTotalLabel, { flex: 1.4 }]}>Total issues</Text>
              <Text style={[s.tTotalLabel, { flex: 0.5 }]}>{c.totals.total}</Text>
              <Text style={[s.tCellMuted, { flex: 3 }]}>
                All detected accessibility barriers on this page
              </Text>
            </View>
          </View>

          {/* ── Issues section ───────────────────────────────────────────── */}
          {c.issues.length > 0 ? (
            <>
              <Text style={s.sectionTitle}>Issues found</Text>
              <View style={s.sectionRule} />

              {c.issues.map((issue, idx) => (
                <View key={`${issue.id}-${idx}`} style={s.issueCard} wrap={false}>
                  {/* Card header: title + severity chip on tinted background */}
                  <View
                    style={[
                      s.issueCardHead,
                      { backgroundColor: issue.impact ? SEVERITY_BG[issue.impact] : SURF },
                    ]}
                  >
                    <Text style={s.issueTitle}>{issue.title}</Text>
                    {issue.impact && (
                      <Text style={[s.chip, { backgroundColor: SEVERITY_COLOR[issue.impact] }]}>
                        {issue.impactLabel}
                      </Text>
                    )}
                  </View>

                  {/* Key/value detail rows */}
                  {issue.whatItMeans ? (
                    <View style={s.issueRow}>
                      <Text style={s.issueRowLabel}>What it means</Text>
                      <Text style={s.issueRowValue}>{issue.whatItMeans}</Text>
                    </View>
                  ) : null}

                  {issue.whoItAffects ? (
                    <View style={s.issueRow}>
                      <Text style={s.issueRowLabel}>Who it affects</Text>
                      <Text style={s.issueRowValue}>{issue.whoItAffects}</Text>
                    </View>
                  ) : null}

                  {issue.disabilityGroups.length > 0 ? (
                    <View style={s.issueRow}>
                      <Text style={s.issueRowLabel}>Groups affected</Text>
                      <View style={[s.issueRowValue, { paddingVertical: 6 }]}>
                        <View style={s.chipsRow}>
                          {issue.disabilityGroups.map((grp, gi) => (
                            <Text key={gi} style={s.groupChip}>
                              {grp}
                            </Text>
                          ))}
                        </View>
                      </View>
                    </View>
                  ) : null}

                  {issue.howToFix ? (
                    <View style={s.issueRow}>
                      <Text style={s.issueRowLabel}>How to fix</Text>
                      <View style={[s.issueRowValue, { paddingTop: 6, paddingBottom: 4 }]}>
                        <View style={s.bulletRow}>
                          <Text style={s.bulletDot}>•</Text>
                          <Text style={s.bulletText}>{issue.howToFix}</Text>
                        </View>
                      </View>
                    </View>
                  ) : null}

                  {issue.measuredEvidence ? (
                    <View style={s.issueRow}>
                      <Text style={s.issueRowLabel}>Evidence</Text>
                      <View style={s.issueRowValue}>
                        <Text style={s.evidenceBlock}>{issue.measuredEvidence}</Text>
                      </View>
                    </View>
                  ) : null}
                </View>
              ))}
            </>
          ) : (
            <View style={s.emptyBox}>
              <Text>
                No issues flagged in this automated pass. That is a good sign — but see the note
                below on what automated scans can and cannot catch.
              </Text>
            </View>
          )}

          {c.partialNote ? <Text style={s.note}>Note: {c.partialNote}</Text> : null}

          {/* ── Next steps ───────────────────────────────────────────────── */}
          <Text style={s.sectionTitle}>What to do next</Text>
          <View style={s.steps}>
            {c.nextSteps.map((step, i) => (
              <View key={i} style={s.step}>
                <Text style={s.stepArrow}>-</Text>
                <Text style={s.stepText}>{step}</Text>
              </View>
            ))}
          </View>

          {/* ── Honest disclaimer ────────────────────────────────────────── */}
          <View style={s.disclaimer}>
            <Text style={s.disclaimerLabel}>What this report is — and is not</Text>
            <Text style={s.disclaimerText}>{c.disclaimer}</Text>
          </View>

          {/* ── Remaining items punch-list ───────────────────────────────── */}
          {c.remainingItems.length > 0 ? (
            <>
              <Text style={s.punchTitle}>Remaining items to fix</Text>
              <Text style={s.punchSub}>
                {c.remainingItems.length} {c.remainingItems.length === 1 ? "item" : "items"}{" "}
                outstanding — sorted by severity. Use this as your checklist.
              </Text>
              <View style={s.table}>
                {/* Header */}
                <View style={s.tHeadRow}>
                  <Text style={[s.tHeadCell, { flex: 0.4 }]}>#</Text>
                  <Text style={[s.tHeadCell, { flex: 1.1 }]}>Severity</Text>
                  <Text style={[s.tHeadCell, { flex: 5 }]}>Issue</Text>
                  <Text style={[s.tHeadCell, { flex: 0.8 }]}>Status</Text>
                </View>
                {c.remainingItems.map((item, idx) => (
                  <View
                    key={item.num}
                    style={[
                      s.tRow,
                      idx % 2 === 1 ? s.tRowAlt : {},
                      { alignItems: "flex-start", paddingVertical: 6 },
                    ]}
                  >
                    <Text style={[s.tCellMuted, { flex: 0.4, fontSize: 8 }]}>{item.num}</Text>
                    <Text style={[s.tCellBold, { flex: 1.1, fontSize: 8 }]}>{item.severity}</Text>
                    <Text style={[s.tCell, { flex: 5, fontSize: 8.5 }]}>{item.title}</Text>
                    <Text
                      style={{
                        flex: 0.8,
                        fontSize: 8,
                        color: "#ea580c",
                        fontFamily: "Helvetica-Bold",
                      }}
                    >
                      {item.status}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}
        </View>
        {/* /body */}

        {/* ── Fixed footer with page numbers — repeats every page ───────── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>{c.footer}</Text>
          <Text
            style={s.footerPage}
            render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
