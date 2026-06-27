/**
 * app/admin/requests/loading.tsx — instant skeleton for the Requests inbox.
 *
 * Suspense fallback shown while the server component awaits the consultation
 * requests. Mirrors requests/page.tsx (header + subtitle + rows). shadcn
 * <Skeleton> is stilled under prefers-reduced-motion by the globals.css guard.
 */
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading consultation requests">
      {/* Header + subtitle */}
      <div className="between" style={{ marginBottom: "22px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-3.5 w-48" />
        </div>
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>

      {/* Request rows */}
      <div className="tcard">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="trow"
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}
          >
            <Skeleton className="h-4 w-40" />
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-9 w-28 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
