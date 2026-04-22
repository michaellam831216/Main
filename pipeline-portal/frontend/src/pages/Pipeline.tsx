import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../store/authStore";
import { dealsApi } from "../api/deals";
import { RegionTabs } from "../components/RegionTabs";
import { PipelineSummary } from "../components/PipelineSummary";
import { DealTable } from "../components/DealTable";
import { ComparisonPanel } from "../components/ComparisonPanel";
import { AdminPanel } from "../components/AdminPanel";
import { Header } from "../components/Header";

export function Pipeline() {
  const { user } = useAuthStore();
  const regions = user?.regions ?? [];
  const [activeRegionId, setActiveRegionId] = useState(regions[0]?.id ?? "");
  const [showAdmin, setShowAdmin] = useState(false);

  const activeRegion = regions.find((r) => r.id === activeRegionId);

  const { data: deals = [], isLoading } = useQuery({
    queryKey: ["deals", activeRegionId],
    queryFn: () => dealsApi.list(activeRegionId),
    enabled: !!activeRegionId,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      {user.role === "ADMIN" && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-3">
          <span className="text-xs text-amber-700 font-medium">Admin view</span>
          <button
            onClick={() => setShowAdmin((s) => !s)}
            className={`text-xs px-3 py-1 rounded-full border font-medium transition-colors ${
              showAdmin
                ? "bg-amber-600 text-white border-amber-600"
                : "border-amber-400 text-amber-700 hover:bg-amber-100"
            }`}
          >
            {showAdmin ? "← Back to Pipeline" : "Open Admin Panel"}
          </button>
        </div>
      )}

      {showAdmin ? (
        <AdminPanel />
      ) : (
        <>
          {regions.length > 0 ? (
            <>
              <RegionTabs regions={regions} activeRegionId={activeRegionId} onSelect={setActiveRegionId} />

              {activeRegion && (
                <>
                  <PipelineSummary deals={deals} currency={activeRegion.currency} />

                  <div className="flex-1 flex flex-col">
                    <div className="flex-1 bg-white">
                      {isLoading ? (
                        <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
                          Loading deals…
                        </div>
                      ) : (
                        <DealTable deals={deals} regionId={activeRegionId} currency={activeRegion.currency} />
                      )}
                    </div>
                    <ComparisonPanel regionId={activeRegionId} currency={activeRegion.currency} />
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <p className="text-lg font-medium mb-2">No regions assigned</p>
                <p className="text-sm">Ask an admin to assign you to a region.</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
