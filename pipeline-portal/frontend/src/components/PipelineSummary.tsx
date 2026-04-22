import { Deal, Probability } from "../types";

interface Props {
  deals: Deal[];
  currency: string;
}

const PROB_ORDER: Probability[] = ["SIGNED", "HIGH", "MEDIUM", "LOW"];
const PROB_LABEL: Record<Probability, string> = { SIGNED: "Signed", HIGH: "High", MEDIUM: "Medium", LOW: "Low" };
const PROB_COLOR: Record<Probability, string> = {
  SIGNED: "text-emerald-700 bg-emerald-50 border-emerald-200",
  HIGH: "text-blue-700 bg-blue-50 border-blue-200",
  MEDIUM: "text-amber-700 bg-amber-50 border-amber-200",
  LOW: "text-rose-700 bg-rose-50 border-rose-200",
};

function fmt(n: number, currency: string) {
  return new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 0, notation: "compact", compactDisplay: "short" }).format(n);
}

export function PipelineSummary({ deals, currency }: Props) {
  const totalMg = deals.reduce((a, d) => a + d.totalContractMg, 0);
  const totalRoyalties = deals.reduce(
    (a, d) => a + d.monthlyEntries.reduce((s, e) => s + e.royaltyAmount, 0),
    0
  );

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="max-w-screen-2xl mx-auto flex flex-wrap items-center gap-4">
        <div className="flex items-baseline gap-1.5">
          <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">Total MG</span>
          <span className="text-lg font-bold text-gray-900">{fmt(totalMg, currency)}</span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">Collected</span>
          <span className="text-lg font-bold text-gray-700">{fmt(totalRoyalties, currency)}</span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">Deals</span>
          <span className="text-lg font-bold text-gray-700">{deals.length}</span>
        </div>
        <div className="flex items-center gap-2 ml-auto flex-wrap">
          {PROB_ORDER.map((prob) => {
            const probDeals = deals.filter((d) => d.probability === prob);
            if (probDeals.length === 0) return null;
            const mg = probDeals.reduce((a, d) => a + d.totalContractMg, 0);
            return (
              <div key={prob} className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border font-medium ${PROB_COLOR[prob]}`}>
                <span>{PROB_LABEL[prob]}</span>
                <span className="font-mono">{fmt(mg, currency)}</span>
                <span className="opacity-60">({probDeals.length})</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
