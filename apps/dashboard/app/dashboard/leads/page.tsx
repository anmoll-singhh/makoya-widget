import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";

const STAGES = ["new","contacted","audit","won","lost"] as const;

export default async function Leads() {
  const session = await getSession();
  if (!session) redirect("/login");
  const leads = await db.listLeads();
  const counts = Object.fromEntries(STAGES.map((s) => [s, leads.filter((l) => l.status === s).length]));

  return (
    <div className="wrap">
      <h1>Lead funnel</h1>
      <p className="stat-label">Leads come from the public scanner (email-for-report). This is your real sales pipeline — not widget usage.</p>
      <div className="grid">
        {STAGES.map((s) => (
          <div className="card" key={s}><div className="stat">{counts[s]}</div><div className="stat-label">{s}</div></div>
        ))}
      </div>
      <div className="card">
        <table>
          <thead><tr><th>Email</th><th>URL</th><th>Status</th><th>Date</th></tr></thead>
          <tbody>
            {leads.map((l) => (
              <tr key={l.id}>
                <td>{l.email}</td>
                <td>{l.url}</td>
                <td><span className="badge free">{l.status}</span></td>
                <td>{new Date(l.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
