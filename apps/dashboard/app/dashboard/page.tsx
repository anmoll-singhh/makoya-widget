import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { CreateSite } from "@/components/CreateSite";
import { scoreClass } from "@/lib/format";

export default async function Dashboard() {
  const session = await getSession();
  if (!session) redirect("/login");

  const sites = await db.listSites(session.email);
  const leads = await db.listLeads();
  const allScans = (await Promise.all(sites.map((s) => db.listScans(s.id)))).flat();
  const avg = allScans.length ? Math.round(allScans.reduce((a, s) => a + s.score, 0) / allScans.length) : 0;

  return (
    <div className="wrap">
      <h1>Your sites</h1>
      <div className="grid">
        <div className="card"><div className="stat">{sites.length}</div><div className="stat-label">Sites</div></div>
        <div className="card"><div className="stat">{leads.length}</div><div className="stat-label">Leads in funnel</div></div>
        <div className="card"><div className={`stat ${scoreClass(avg)}`}>{avg}</div><div className="stat-label">Avg accessibility score</div></div>
      </div>

      <div className="card">
        <table>
          <thead><tr><th>Domain</th><th>Plan</th><th>Site ID</th><th></th></tr></thead>
          <tbody>
            {sites.map((s) => (
              <tr key={s.id}>
                <td>{s.domain}</td>
                <td><span className={`badge ${s.plan}`}>{s.plan}</span></td>
                <td style={{ fontFamily: "monospace", fontSize: 12 }}>{s.id.slice(0, 8)}…</td>
                <td><a href={`/dashboard/sites/${s.id}`}>Manage →</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CreateSite />
    </div>
  );
}
