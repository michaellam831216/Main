import { useRef, useState, useCallback } from "react";
import { Deal, MonthlyEntry } from "../types";
import { dealsApi } from "../api/deals";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function getDisplayYears() {
  const now = new Date();
  const currentYear = now.getFullYear();
  return [currentYear - 1, currentYear, currentYear + 1];
}

function fmtAmount(n: number, currency: string) {
  if (n === 0) return "";
  return new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
}

interface CellProps {
  dealId: string;
  year: number;
  month: number;
  currency: string;
  value: number;
  onSave: (year: number, month: number, value: number) => void;
  onTabNext: () => void;
}

function MonthCell({ year, month, currency, value, onSave, onTabNext }: CellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const now = new Date();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() + 1 === month;

  const handleFocus = () => {
    setDraft(value === 0 ? "" : String(value));
    setEditing(true);
  };

  const handleBlur = () => {
    setEditing(false);
    const parsed = parseFloat(draft.replace(/,/g, "")) || 0;
    if (parsed !== value) onSave(year, month, parsed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Tab") { e.preventDefault(); handleBlur(); onTabNext(); }
    if (e.key === "Enter") { handleBlur(); }
    if (e.key === "Escape") { setDraft(""); setEditing(false); }
  };

  return (
    <td className={`border-r border-gray-100 min-w-[100px] p-0 ${isCurrentMonth ? "bg-blue-50" : ""}`}>
      {editing ? (
        <input
          autoFocus
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="w-full h-full px-2 py-2 text-right text-sm font-mono outline-none bg-blue-100 focus:bg-white border-2 border-brand-500"
        />
      ) : (
        <div
          onClick={handleFocus}
          className={`px-2 py-2 text-right text-sm font-mono cursor-pointer hover:bg-blue-50 min-h-[38px] ${value > 0 ? "text-gray-900" : "text-gray-300"}`}
        >
          {value > 0 ? fmtAmount(value, currency) : "—"}
        </div>
      )}
    </td>
  );
}

interface Props {
  deal: Deal;
  regionId: string;
}

export function MonthlyGrid({ deal, regionId }: Props) {
  const queryClient = useQueryClient();
  const years = getDisplayYears();
  const pendingRef = useRef<Map<string, number>>(new Map());
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getEntry = (year: number, month: number): number => {
    const key = `${year}-${month}`;
    if (pendingRef.current.has(key)) return pendingRef.current.get(key)!;
    return deal.monthlyEntries.find((e) => e.year === year && e.month === month)?.royaltyAmount ?? 0;
  };

  const mutation = useMutation({
    mutationFn: (entries: { year: number; month: number; royaltyAmount: number }[]) =>
      dealsApi.saveMonthly(deal.id, entries),
    onSuccess: () => {
      pendingRef.current.clear();
      queryClient.invalidateQueries({ queryKey: ["deals", regionId] });
    },
    onError: () => toast.error("Failed to save monthly entry"),
  });

  const scheduleSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const entries = Array.from(pendingRef.current.entries()).map(([key, royaltyAmount]) => {
        const [y, m] = key.split("-").map(Number);
        return { year: y, month: m, royaltyAmount };
      });
      if (entries.length > 0) mutation.mutate(entries);
    }, 800);
  }, [mutation]);

  const handleSave = (year: number, month: number, value: number) => {
    pendingRef.current.set(`${year}-${month}`, value);
    scheduleSave();
  };

  // Totals per month
  const totals: Record<string, number> = {};
  for (const year of years) {
    for (let m = 1; m <= 12; m++) {
      totals[`${year}-${m}`] = getEntry(year, m);
    }
  }

  return (
    <div className="border-t border-gray-200 bg-gray-50 overflow-x-auto">
      <table className="text-xs border-collapse w-full">
        <thead>
          <tr className="bg-gray-100">
            <th className="sticky left-0 z-10 bg-gray-100 border-r border-gray-200 px-3 py-2 text-left font-semibold text-gray-600 w-24">
              Royalties
            </th>
            {years.map((year) =>
              MONTHS.map((mon, mi) => {
                const now = new Date();
                const isCurrent = now.getFullYear() === year && now.getMonth() === mi;
                return (
                  <th
                    key={`${year}-${mi + 1}`}
                    className={`min-w-[100px] px-2 py-2 text-center font-medium border-r border-gray-200 ${isCurrent ? "bg-blue-100 text-blue-800" : "text-gray-600"}`}
                  >
                    {mon} {String(year).slice(2)}
                  </th>
                );
              })
            )}
          </tr>
        </thead>
        <tbody>
          <tr className="bg-white hover:bg-gray-50">
            <td className="sticky left-0 z-10 bg-white border-r border-gray-200 px-3 py-0 font-medium text-gray-700 whitespace-nowrap">
              {deal.licenseeName.length > 18 ? deal.licenseeName.slice(0, 17) + "…" : deal.licenseeName}
            </td>
            {years.map((year) =>
              MONTHS.map((_, mi) => {
                const month = mi + 1;
                const cellIndex = (year - years[0]) * 12 + mi;
                const totalCells = years.length * 12;
                const nextCell = (cellIndex + 1) % totalCells;
                return (
                  <MonthCell
                    key={`${year}-${month}`}
                    dealId={deal.id}
                    year={year}
                    month={month}
                    currency={deal.currency}
                    value={getEntry(year, month)}
                    onSave={handleSave}
                    onTabNext={() => {
                      const nextYear = years[Math.floor(nextCell / 12)];
                      const nextMonth = (nextCell % 12) + 1;
                      document.getElementById(`cell-${deal.id}-${nextYear}-${nextMonth}`)?.focus();
                    }}
                  />
                );
              })
            )}
          </tr>
        </tbody>
        <tfoot>
          <tr className="bg-gray-100 font-semibold text-gray-700 border-t border-gray-300">
            <td className="sticky left-0 z-10 bg-gray-100 border-r border-gray-200 px-3 py-2 text-xs uppercase tracking-wide">
              Total
            </td>
            {years.map((year) =>
              MONTHS.map((_, mi) => {
                const month = mi + 1;
                const total = totals[`${year}-${month}`];
                const now = new Date();
                const isCurrent = now.getFullYear() === year && now.getMonth() === mi;
                return (
                  <td
                    key={`${year}-${month}`}
                    className={`px-2 py-2 text-right font-mono border-r border-gray-200 ${isCurrent ? "bg-blue-100" : ""} ${total > 0 ? "text-gray-900" : "text-gray-300"}`}
                  >
                    {total > 0 ? fmtAmount(total, deal.currency) : "—"}
                  </td>
                );
              })
            )}
          </tr>
        </tfoot>
      </table>
      {mutation.isPending && (
        <div className="text-right text-xs text-gray-400 px-3 py-1">Saving…</div>
      )}
    </div>
  );
}
