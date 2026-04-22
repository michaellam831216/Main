import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../store/authStore";
import { dealsApi } from "../api/deals";
import { Deal, Region } from "../types";
import { RegionTabs } from "../components/RegionTabs";
import { PipelineSummary } from "../components/PipelineSummary";
import { CollectionSummary } from "../components/CollectionSummary";
import { DealTable } from "../components/DealTable";
import { PipelineBreakdown } from "../components/PipelineBreakdown";
import { ComparisonPanel } from "../components/ComparisonPanel";
import { AdminPanel } from "../components/AdminPanel";
import { Header } from "../components/Header";

function useRegionDeals(regionId: string) {
  return useQuery({
    queryKey: ["deals", regionId],
    queryFn: () => dealsApi.list(regionId),
    enabled: !!regionId,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });
}

function RegionView({ regionId, region }: { regionId: string; region: Region }) {
  const { data: deals = [], isLoading } = useRegionDeals(regionId);
  return (
    <div className="flex-1 flex flex-col">
      <PipelineSummary deals={deals} currency={region.currency} />
      <CollectionSummary deals={deals} currency={region.currency} />
      <div className="flex-1 bg-white">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-gray-400 text-sm">Loading deals…</div>
        ) : (
          <DealTable deals={deals} regionId={regionId} currency={region.currency} />
        )}
      </div>
      <PipelineBreakdown deals={deals} currency={region.currency} />
      <ComparisonPanel regionId={regionId} currency={region.currency} />
    </div>
  );
}

function AllRegionSection({ region }: { region: Region }) {
  const { data: deals = [], isLoading } = useRegionDeals(region.id);
  return (
    <div>
      <div className="px-4 py-2 bg-gray-100 border-b border-gray-200 flex items-center gap-2">
        <span className="font-semibold text-sm text-gray-700">{region.name}</span>
        <span className="text-xs font-mono bg-white border border-gray-200 text-gray-500 px-1.5 py-0.5 rounded">
          {region.currency}
        </span>
        <span className="text-xs text-gray-400 ml-1">{deals.length} deal{deals.length !== 1 ? "s" : ""}</span>
      </div>
      {isLoading ? (
        <div className="py-6 text-center text-gray-400 text-sm">Loading…</div>
      ) : (
        <>
          <PipelineSummary deals={deals} currency={region.currency} />
          <CollectionSummary deals={deals} currency={region.currency} />
          <PipelineBreakdown deals={deals} currency={region.currency} />
        </>
      )}
    </div>
  );
}

export function Pipeline() {
  const { user } = useAuthStore();
  const regions = user?.regions ?? [];
  const [activeRegionId, setActiveRegionId] = useState(regions[0]?.id ?? "");
  const [showAdmin, setShowAdmin] = useState(false);

  const activeRegion = regions.find((r) => r.id === activeRegionId);

  // All Regions tab shown when user has 2+ regions
  const allTab: Region = { id: "all", name: "All Regions", currency: "—" };
  const tabs: Region[] = regions.length >= 2 ? [...regions, allTab] : regions;

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
      ) : regions.length > 0 ? (
        <>
          <RegionTabs regions={tabs} activeRegionId={activeRegionId} onSelect={setActiveRegionId} />

          {activeRegionId === "all" ? (
            <div className="flex-1 flex flex-col divide-y divide-gray-200">
              {regions.map((r) => <AllRegionSection key={r.id} region={r} />)}
            </div>
          ) : activeRegion ? (
            <RegionView regionId={activeRegionId} region={activeRegion} />
          ) : null}
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-400">
            <p className="text-lg font-medium mb-2">No regions assigned</p>
            <p className="text-sm">Ask an admin to assign you to a region.</p>
          </div>
        </div>
      )}
    </div>
  );
}
