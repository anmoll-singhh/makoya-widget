import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

/**
 * Billing placeholder. REQUIRED_MANUAL_SETUP (Stripe):
 *   STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, price IDs.
 *   Get them at dashboard.stripe.com → Developers → API keys / Webhooks.
 *   On checkout.session.completed webhook → update sites.plan.
 */
const PLANS = [
  { name: "Free", price: "$0", features: ["Widget", "Powered by Makoya badge", "Monthly scan"] },
  { name: "Pro", price: "$49/mo", features: ["Hide branding", "Weekly monitoring", "Priority support"] },
  { name: "Managed", price: "From $1,500 setup", features: ["Full audit", "Human remediation", "Signed compliance file", "Ongoing monitoring"] },
];

export default async function Billing() {
  const session = await getSession();
  if (!session) redirect("/login");
  return (
    <div className="wrap">
      <h1>Plans & billing</h1>
      <div className="banner">Stripe not wired yet — buttons are placeholders. See REQUIRED_MANUAL_SETUP in the code.</div>
      <div className="grid">
        {PLANS.map((p) => (
          <div className="card" key={p.name}>
            <h2>{p.name}</h2>
            <div className="stat">{p.price}</div>
            <ul>{p.features.map((f) => <li key={f}>{f}</li>)}</ul>
            <button className="btn" disabled>Choose {p.name}</button>
          </div>
        ))}
      </div>
    </div>
  );
}
