/**
 * app/dashboard/_components/UpgradeNotice.tsx — the soft-lock upsell panel.
 *
 * Rendered by a gated pro screen (Proof, Statement, Analytics, …) IN PLACE of the
 * real client component when the site's effective plan doesn't include the
 * feature. The data client never mounts, so no gated data is fetched — and the
 * matching API route independently returns 403, so this is presentation only, not
 * the security boundary.
 *
 * Pure presentational RSC (no hooks): it derives the required plan + labels from
 * the pure entitlements helpers and links the owner straight to the billing
 * screen for the agent. Honest copy — it sells the tool, never "compliance".
 */
import Link from "next/link";
import {
  requiredPlanFor,
  planLabel,
  type FeatureKey,
} from "@/lib/billing/entitlements";
import type { PlanSlug } from "@/lib/billing/plans";

interface Props {
  /** The feature the owner tried to reach. */
  feature: FeatureKey;
  /** A short human title for the screen, e.g. "Proof of effort". */
  title: string;
  /** The site's current effective plan (for the "you're on X" line). */
  currentPlan: PlanSlug;
  /** Agent id — the billing CTA deep-links to this agent's billing screen. */
  siteId: string;
}

export function UpgradeNotice({ feature, title, currentPlan, siteId }: Props) {
  const required = requiredPlanFor(feature);

  return (
    <>
      <div className="pagehead">
        {title} <b>Upgrade to unlock</b>
      </div>

      <div
        className="card pad"
        style={{
          maxWidth: 560,
          margin: "24px auto 0",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 14,
          padding: "32px 28px",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "var(--primary-soft)",
            color: "var(--primary-hover)",
            display: "grid",
            placeItems: "center",
            fontSize: 26,
          }}
        >
          <i className="ti ti-lock" />
        </div>

        <h2 style={{ fontFamily: "Satoshi", color: "var(--deep)", fontSize: 20, margin: 0 }}>
          {title} is a {planLabel(required)} feature
        </h2>

        <p style={{ fontSize: 14, color: "var(--t2)", lineHeight: 1.55, margin: 0 }}>
          Your agent is on the <b style={{ color: "var(--t1)" }}>{planLabel(currentPlan)}</b> plan.
          Upgrade to <b style={{ color: "var(--primary-hover)" }}>{planLabel(required)}</b> or higher
          to use {title.toLowerCase()}.
        </p>

        <Link
          href={`/dashboard/${siteId}/billing`}
          className="btn pri"
          style={{
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            marginTop: 2,
          }}
        >
          <i className="ti ti-arrow-up-right" aria-hidden="true" />
          See plans &amp; upgrade
        </Link>
      </div>
    </>
  );
}
