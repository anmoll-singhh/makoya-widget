/**
 * app/admin/loading.tsx — instant skeleton for the Customers list.
 *
 * Next.js renders this as the Suspense fallback the moment the operator
 * navigates to /admin, while the server component awaits Supabase (which can
 * cold-start on the free tier). Founder: "the whole app feels slow" — a
 * shaped skeleton makes the wait feel instant instead of a blank/Loading… gap.
 *
 * Shape mirrors page.tsx: header, onboarding card, 3 stat cards, customer rows.
 * shadcn <Skeleton> (animate-pulse) is auto-stilled under prefers-reduced-motion
 * by the globals.css guard. Rows use flex so the shimmer stays tidy on phones.
 */
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading customers">
      {/* Header */}
      <div className="between" style={{ marginBottom: "22px" }}>
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>

      {/* Onboarding card */}
      <Skeleton className="h-44 w-full rounded-2xl" />

      {/* Stat cards */}
      <div className="admin-stats" style={{ marginTop: "24px" }}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-2xl" />
        ))}
      </div>

      {/* Customer rows */}
      <div className="tcard" style={{ marginTop: "24px" }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="trow"
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <Skeleton className="h-9 w-9 rounded-[10px]" />
              <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3 w-44" />
              </div>
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
