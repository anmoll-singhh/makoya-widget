/**
 * PageHead — kicker + title row.
 *
 * Mirrors .pagehead from dashboard.css:
 *   <div class="pagehead">Good afternoon, Vikram <b>Dashboard</b></div>
 *
 * The kicker is the greyed text above the bold title.
 */

interface PageHeadProps {
  /** Greyed upper-line, e.g. "Good afternoon, Vikram" */
  kicker?: string;
  /** Bold Satoshi title */
  title: string;
}

export function PageHead({ kicker, title }: PageHeadProps) {
  return (
    <div className="pagehead">
      {kicker && <>{kicker}</>}
      <b>{title}</b>
    </div>
  );
}
