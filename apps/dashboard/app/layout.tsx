import "./globals.css";
import { dbMode } from "@/lib/db";

export const metadata = { title: "Makoya Dashboard" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {dbMode === "mock" && (
          <div className="banner">
            MOCK MODE — running on in-memory demo data (no database). Set DB_MODE=supabase for real data.
          </div>
        )}
        <nav className="nav">
          <span className="brand">Makoya</span>
          <a href="/dashboard">Sites</a>
          <a href="/dashboard/leads">Leads</a>
          <a href="/dashboard/billing">Billing</a>
          <span className="spacer" />
          <form action="/login?logout=1" method="get"><button className="btn secondary" type="submit">Log out</button></form>
        </nav>
        {children}
      </body>
    </html>
  );
}
