export function scoreClass(score: number): "bad" | "mid" | "good" {
  if (score < 50) return "bad";
  if (score < 75) return "mid";
  return "good";
}
/** Rough "is this likely an e-commerce/high-risk site" + dollar-risk line for the report CTA. */
export function riskLine(totals: { critical: number; serious: number }): string | null {
  if (totals.critical > 0 || totals.serious > 2) {
    return "Sites with issues like these are common ADA-lawsuit targets; SMB settlements typically run $5,000–$20,000.";
  }
  return null;
}
