import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { metaApi } from "../api/meta";
import { CompareType, DeltaMetric, Probability } from "../types";
import { format } from "date-fns";

const PROB_LABELS: Record<Probability, string> = { SIGNED: "Signed", HIGH: "High", MEDIUM: "Medium", LOW: "Low" };

interface Props {
  regionId: string;
  currency: string;
}

function DeltaBadge({ metric, currency, label, isCount }: { metric: DeltaMetric; currency: string; label: string; isCount?: boolean }) {
  const { absolute, percent, direction, current, previous } = metric;

  const fmtVal = (n: number) =>
    isCount
      ? String(n)
      : new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 0, notation: "compact", compactDisplay: "short" }).format(n);

  const arrow = direction === "up" ? "▲" : direction === "down" ? "▼" : "—";
  const color = direction === "up" ? "text-emerald-600" : direction === "down" ? "text-rose-600" : "text-gray-400";
  const pctStr = percent !== null ? ` (${percent > 0 ? "+" : ""}${percent}%)` : "";

  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <div>
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <div className="text-xs text-gray-400">
          {fmtVal(previous)} → {fmtVal(current)}
        </div>
      </div>
      <div className={`text-right font-mono text-sm font-semibold ${color}`}>
        <span>{arrow} {isCount ? String(Math.abs(absolute)) : fmtVal(Math.abs(absolute))}</span>
        {pctStr && <span className="ml-1 text-xs font-normal opacity-75">{pctStr}</span>}
      </div>
    </div>
  );
}

export function ComparisonPanel({ regionId, currency }: Props) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<CompareType>("week");

  const { data, isLoading } = useQuery({
    queryKey: ["compare", regionId, type],
    queryFn: () => metaApi.compare(regionId, type),
    enabled: open,
    staleTime: 60_000,
  });

  return (
    <div className="border-t border-gray-200 bg-white">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
      >
        <span className="font-medium flex items-center gap-2">
          <span>📊</span> Pipeline Comparison
        </span>
        <span className="text-gray-400 text-xs">{open ? "▲ collapse" : "▼ expand"}</span>
      </button>

      {open && (
        <div className="px-4 pb-5 border-t border-gray-100">
          <div className="flex items-center gap-2 mt-3 mb-4">
            <span className="text-xs text-gray-500 font-medium">Compare vs.</span>
            {(["week", "month"] as CompareType[]).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`text-xs px-3 py-1 rounded-full border font-medium transition-colors ${
                  type === t ? "bg-brand-600 text-white border-brand-600" : "border-gray-300 text-gray-600 hover:border-brand-400"
                }`}
              >
                Last {t === "week" ? "Week" : "Month"}
              </button>
            ))}
          </div>

          {isLoading && <div className="text-sm text-gray-400 py-4 text-center">Loading comparison…</div>}

          {data && !data.available && (
            <div className="text-sm text-gray-400 py-4 text-center bg-gray-50 rounded-lg">
              {data.message ?? "No comparison data available"}
            </div>
          )}

          {data?.available && data.snapshotName && (
            <div className="mb-3 text-xs text-gray-400">
              Comparing current vs. <strong className="text-gray-600">{data.snapshotName}</strong>
              {data.snapshotDate && ` (${format(new Date(data.snapshotDate), "dd MMM yyyy")})`}
            </div>
          )}

          {data?.available && data.totalMg && (
            <div className="space-y-0 rounded-lg border border-gray-200 bg-gray-50 px-4 divide-y divide-gray-100">
              <DeltaBadge metric={data.totalMg} currency={currency} label="Total MG Pipeline" />
              {data.totalRoyalties && (
                <DeltaBadge metric={data.totalRoyalties} currency={currency} label="Total Royalties Collected" />
              )}
              {data.dealCount && (
                <DeltaBadge metric={data.dealCount} currency={currency} label="Deal Count" isCount />
              )}
              {data.byProbability && (
                <>
                  {(["SIGNED", "HIGH", "MEDIUM", "LOW"] as Probability[]).map((prob) => (
                    <DeltaBadge
                      key={prob}
                      metric={data.byProbability![prob]}
                      currency={currency}
                      label={`${PROB_LABELS[prob]} MG`}
                    />
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
