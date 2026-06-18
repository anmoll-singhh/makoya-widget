import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { ConfigEditor } from "@/components/ConfigEditor";
import { SnippetBox } from "@/components/SnippetBox";
import { scoreClass, riskLine } from "@/lib/format";

export default async function SitePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;

  const site = await db.getSite(id);
  if (!site || site.ownerEmail !== session.email) notFound();
  const config = await db.getConfig(id);
  const scans = await db.listScans(id);
  const latest = scans[scans.length - 1];

  return (
    <div className="wrap">
      <p><a href="/dashboard">← Sites</a></p>
      <h1>{site.domain} <span className={`badge ${site.plan}`}>{site.plan}</span></h1>

      <div className="card">
        <h2>Install</h2>
        <p className="stat-label">Paste this once. Updates happen automatically — no reinstall.</p>
        <SnippetBox siteId={site.id} />
      </div>

      <div className="card">
        <h2>Widget settings</h2>
        {config && <ConfigEditor siteId={site.id} initial={config} plan={site.plan} />}
      </div>

      <div className="card">
        <h2>Accessibility report</h2>
        {latest ? (
          <>
            <p>Latest scan: <span className={`score ${scoreClass(latest.score)}`}>{latest.score}/100</span> · {new Date(latest.scannedAt).toLocaleDateString()}</p>
            <div className="row">
              <span className="badge" style={{background:"#fee2e2",color:"#b91c1c"}}>{latest.totals.critical} critical</span>
              <span className="badge" style={{background:"#ffedd5",color:"#c2410c"}}>{latest.totals.serious} serious</span>
              <span className="badge" style={{background:"#fef9c3",color:"#a16207"}}>{latest.totals.moderate} moderate</span>
              <span className="badge free">{latest.totals.minor} minor</span>
            </div>
            {riskLine(latest.totals) && (
              <div className="cta" style={{ marginTop: 14 }}>
                <strong>Recommended: full audit + remediation.</strong>
                <p style={{ margin: "6px 0" }}>{riskLine(latest.totals)}</p>
                <a className="btn" href="/dashboard/billing">Book audit →</a>
              </div>
            )}
          </>
        ) : <p className="stat-label">No scan yet. Run the scanner against this domain to populate the report.</p>}
      </div>
    </div>
  );
}
