import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Deal, PROBABILITY_COLORS, PROBABILITY_LABELS } from "../types";
import { dealsApi } from "../api/deals";
import { MonthlyGrid } from "./MonthlyGrid";
import { DealFormModal } from "./DealFormModal";
import { format } from "date-fns";
import toast from "react-hot-toast";

interface Props {
  deals: Deal[];
  regionId: string;
  currency: string;
}

function fmtMg(n: number, currency: string) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
    notation: n >= 1_000_000 ? "compact" : "standard",
    compactDisplay: "short",
  }).format(n);
}

function RelativeTime({ date }: { date: string }) {
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  const label = days > 0 ? `${days}d ago` : hrs > 0 ? `${hrs}h ago` : mins > 0 ? `${mins}m ago` : "just now";
  return <span title={format(d, "dd MMM yyyy HH:mm")} className="text-gray-400 text-xs">{label}</span>;
}

export function DealTable({ deals, regionId, currency }: Props) {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editDeal, setEditDeal] = useState<Deal | null>(null);
  const [showForm, setShowForm] = useState(false);

  const deleteMut = useMutation({
    mutationFn: dealsApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals", regionId] });
      toast.success("Deal removed");
    },
    onError: () => toast.error("Failed to remove deal"),
  });

  const handleDelete = (deal: Deal) => {
    if (!window.confirm(`Remove deal "${deal.licenseeName}"? This action is reversible by admin.`)) return;
    deleteMut.mutate(deal.id);
  };

  const toggleExpand = (id: string) => setExpandedId((prev) => (prev === id ? null : id));

  // Totals row per month across all deals (for visible years)
  const now = new Date();
  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];
  const monthTotals: Record<string, number> = {};
  for (const year of years) {
    for (let m = 1; m <= 12; m++) {
      const key = `${year}-${m}`;
      monthTotals[key] = deals.reduce(
        (a, d) => a + (d.monthlyEntries.find((e) => e.year === year && e.month === m)?.royaltyAmount ?? 0),
        0
      );
    }
  }
  const grandTotalRoyalties = Object.values(monthTotals).reduce((a, b) => a + b, 0);

  return (
    <>
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <p className="text-sm text-gray-500">
          {deals.length} deal{deals.length !== 1 ? "s" : ""}
          {grandTotalRoyalties > 0 && (
            <span className="ml-2 text-gray-400">· {fmtMg(grandTotalRoyalties, currency)} collected</span>
          )}
        </p>
        <button
          onClick={() => { setEditDeal(null); setShowForm(true); }}
          className="flex items-center gap-1.5 bg-brand-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-brand-700 transition-colors font-medium"
        >
          <span className="text-base leading-none">+</span> New Deal
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <th className="px-4 py-3 w-6"></th>
              <th className="px-4 py-3 min-w-[200px]">Licensee</th>
              <th className="px-4 py-3">Brand</th>
              <th className="px-4 py-3">Probability</th>
              <th className="px-4 py-3">Contract Start</th>
              <th className="px-4 py-3 text-right">Total MG</th>
              <th className="px-4 py-3">Categories</th>
              <th className="px-4 py-3">Entered by</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {deals.length === 0 && (
              <tr>
                <td colSpan={10} className="text-center py-16 text-gray-400">
                  No deals yet. Click <strong>+ New Deal</strong> to get started.
                </td>
              </tr>
            )}
            {deals.map((deal) => (
              <>
                <tr
                  key={deal.id}
                  className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${expandedId === deal.id ? "bg-blue-50/50" : ""}`}
                  onClick={() => toggleExpand(deal.id)}
                >
                  <td className="px-4 py-3 text-gray-400 text-center">
                    <span className="text-base">{expandedId === deal.id ? "▾" : "▸"}</span>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {deal.licenseeName}
                    {deal.notes && (
                      <span title={deal.notes} className="ml-1.5 text-gray-400 cursor-help text-xs">📝</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{deal.brand.name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${PROBABILITY_COLORS[deal.probability]}`}>
                      {PROBABILITY_LABELS[deal.probability]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                    {format(new Date(deal.contractStartDate), "MMM yyyy")}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-gray-900">
                    {fmtMg(deal.totalContractMg, deal.currency)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {deal.categories.map((dc) => (
                        <span key={dc.categoryId} className="bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded">
                          {dc.category.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{deal.createdBy.name}</td>
                  <td className="px-4 py-3"><RelativeTime date={deal.updatedAt} /></td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1">
                      <button
                        onClick={() => { setEditDeal(deal); setShowForm(true); }}
                        className="text-xs px-2 py-1 text-brand-600 border border-brand-200 rounded hover:bg-brand-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(deal)}
                        className="text-xs px-2 py-1 text-red-500 border border-red-200 rounded hover:bg-red-50"
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
                {expandedId === deal.id && (
                  <tr key={`${deal.id}-grid`}>
                    <td colSpan={10} className="p-0">
                      <MonthlyGrid deal={deal} regionId={regionId} />
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <DealFormModal
          regionId={regionId}
          deal={editDeal}
          onClose={() => { setShowForm(false); setEditDeal(null); }}
        />
      )}
    </>
  );
}
