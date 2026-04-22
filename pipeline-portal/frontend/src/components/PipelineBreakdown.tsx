import { useState } from "react";
import { Deal, Probability, PROBABILITY_COLORS, PROBABILITY_LABELS, PROBABILITY_WEIGHTS } from "../types";

const PROB_ORDER: Probability[] = ["SIGNED", "HIGH", "MEDIUM", "LOW"];

function fmt(n: number, currency: string) {
  if (n === 0) return "—";
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
    notation: n >= 1_000_000 ? "compact" : "standard",
    compactDisplay: "short",
  }).format(n);
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
      <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

interface Props {
  deals: Deal[];
  currency: string;
}

export function PipelineBreakdown({ deals, currency }: Props) {
  const [open, setOpen] = useState(true);

  const totalCollected = (ds: Deal[]) =>
    ds.reduce((s, d) => s + d.monthlyEntries.reduce((a, e) => a + e.royaltyAmount, 0), 0);
  const totalMg = (ds: Deal[]) => ds.reduce((s, d) => s + d.totalContractMg, 0);
  const totalMgDue = (ds: Deal[]) =>
    ds.reduce((s, d) => s + d.monthlyEntries.reduce((a, e) => a + e.mgPayment, 0), 0);

  // By Brand
  const brandMap = new Map<string, Deal[]>();
  for (const deal of deals) {
    const name = deal.brand.name;
    if (!brandMap.has(name)) brandMap.set(name, []);
    brandMap.get(name)!.push(deal);
  }
  const brandRows = Array.from(brandMap.entries())
    .map(([name, ds]) => ({ name, deals: ds, mg: totalMg(ds), mgDue: totalMgDue(ds), collected: totalCollected(ds) }))
    .sort((a, b) => b.mg - a.mg);

  // By Probability
  const probRows = PROB_ORDER.map((prob) => {
    const ds = deals.filter((d) => d.probability === prob);
    const mg = totalMg(ds);
    const weighted = mg * PROBABILITY_WEIGHTS[prob];
    return { prob, deals: ds, mg, weighted, mgDue: totalMgDue(ds), collected: totalCollected(ds) };
  }).filter((r) => r.deals.length > 0);

  const grandMg = totalMg(deals);

  return (
    <div className="bg-white border-t border-gray-200">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-gray-50 transition-colors"
      >
        <span className="font-semibold text-gray-700 flex items-center gap-2">
          <span>📋</span> Pipeline Breakdown
        </span>
        <span className="text-gray-400 text-xs">{open ? "▲ collapse" : "▼ expand"}</span>
      </button>

      {open && (
        <div className="px-4 pb-6 grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-gray-100">

          {/* By Brand */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-4 mb-3">By Brand</h4>
            <div className="space-y-3">
              {brandRows.length === 0 && <p className="text-sm text-gray-400">No deals</p>}
              {brandRows.map((row) => (
                <div key={row.name} className="bg-gray-50 rounded-lg px-3 py-2.5 border border-gray-100">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-semibold text-sm text-gray-800">{row.name}</span>
                      <span className="ml-2 text-xs text-gray-400">{row.deals.length} deal{row.deals.length !== 1 ? "s" : ""}</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900 font-mono">{fmt(row.mg, currency)}</span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-4 text-xs">
                    <span className="flex items-center gap-1 text-violet-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-400 inline-block" />
                      MG Scheduled: {fmt(row.mgDue, currency)}
                    </span>
                    <span className="flex items-center gap-1 text-blue-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />
                      Collected: {fmt(row.collected, currency)}
                    </span>
                  </div>
                  <ProgressBar value={row.mg} max={grandMg} color="bg-gray-400" />
                </div>
              ))}
            </div>
          </div>

          {/* By Probability */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-4 mb-3">By Probability</h4>
            <div className="space-y-3">
              {probRows.length === 0 && <p className="text-sm text-gray-400">No deals</p>}
              {probRows.map((row) => (
                <div key={row.prob} className="bg-gray-50 rounded-lg px-3 py-2.5 border border-gray-100">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded font-semibold border ${PROBABILITY_COLORS[row.prob]}`}>
                        {PROBABILITY_LABELS[row.prob]}
                      </span>
                      <span className="text-xs text-gray-400">{row.deals.length} deal{row.deals.length !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-gray-900 font-mono">{fmt(row.mg, currency)}</div>
                      <div className="text-xs text-gray-400">
                        Weighted ({Math.round(PROBABILITY_WEIGHTS[row.prob] * 100)}%): {fmt(row.weighted, currency)}
                      </div>
                    </div>
                  </div>
                  <div className="mt-1.5 flex items-center gap-4 text-xs">
                    <span className="flex items-center gap-1 text-violet-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-400 inline-block" />
                      MG Scheduled: {fmt(row.mgDue, currency)}
                    </span>
                    <span className="flex items-center gap-1 text-blue-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />
                      Collected: {fmt(row.collected, currency)}
                    </span>
                  </div>
                  <ProgressBar value={row.mg} max={grandMg} color={
                    row.prob === "SIGNED" ? "bg-emerald-400" :
                    row.prob === "HIGH" ? "bg-blue-400" :
                    row.prob === "MEDIUM" ? "bg-amber-400" : "bg-rose-300"
                  } />
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
