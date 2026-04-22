import { useRef, useState, useCallback } from "react";
import { Deal } from "../types";
import { dealsApi } from "../api/deals";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function getDisplayYears() {
  const y = new Date().getFullYear();
  return [y - 1, y, y + 1];
}

function fmt(n: number, currency: string) {
  if (n === 0) return "";
  return new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
}

type RowType = "mg" | "royalty";

interface CellProps {
  value: number;
  currency: string;
  rowType: RowType;
  onSave: (value: number) => void;
  onTabNext: () => void;
  isCurrentMonth: boolean;
}

function EditableCell({ value, currency, rowType, onSave, onTabNext, isCurrentMonth }: CellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const bgBase = rowType === "mg"
    ? isCurrentMonth ? "bg-violet-50" : "bg-white"
    : isCurrentMonth ? "bg-blue-50" : "bg-gray-50";

  const handleFocus = () => { setDraft(value === 0 ? "" : String(value)); setEditing(true); };
  const commit = () => {
    setEditing(false);
    const parsed = parseFloat(draft.replace(/,/g, "")) || 0;
    if (parsed !== value) onSave(parsed);
  };
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Tab") { e.preventDefault(); commit(); onTabNext(); }
    if (e.key === "Enter") commit();
    if (e.key === "Escape") { setDraft(""); setEditing(false); }
  };

  return (
    <td className={`border-r border-gray-100 min-w-[110px] p-0 ${bgBase}`}>
      {editing ? (
        <input
          autoFocus
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          className="w-full h-full px-2 py-2 text-right text-xs font-mono outline-none border-2 border-brand-500 bg-white"
        />
      ) : (
        <div
          onClick={handleFocus}
          className={`px-2 py-2 text-right text-xs font-mono cursor-pointer hover:brightness-95 min-h-[34px] transition-colors ${
            value > 0
              ? rowType === "mg" ? "text-violet-800 font-semibold" : "text-blue-900 font-semibold"
              : "text-gray-300"
          }`}
        >
          {value > 0 ? fmt(value, currency) : "—"}
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
  const totalCells = years.length * 12;

  // pending[`mg-${year}-${month}`] or pending[`royalty-${year}-${month}`]
  const pendingRef = useRef<Map<string, number>>(new Map());
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getVal = (year: number, month: number, type: RowType): number => {
    const key = `${type}-${year}-${month}`;
    if (pendingRef.current.has(key)) return pendingRef.current.get(key)!;
    const entry = deal.monthlyEntries.find((e) => e.year === year && e.month === month);
    return type === "mg" ? (entry?.mgPayment ?? 0) : (entry?.royaltyAmount ?? 0);
  };

  const mutation = useMutation({
    mutationFn: (entries: { year: number; month: number; royaltyAmount?: number; mgPayment?: number }[]) =>
      dealsApi.saveMonthly(deal.id, entries),
    onSuccess: () => {
      pendingRef.current.clear();
      queryClient.invalidateQueries({ queryKey: ["deals", regionId] });
    },
    onError: () => toast.error("Failed to save"),
  });

  const scheduleSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const grouped = new Map<string, { year: number; month: number; royaltyAmount?: number; mgPayment?: number }>();
      for (const [key, val] of pendingRef.current.entries()) {
        const [type, y, m] = key.split("-");
        const k = `${y}-${m}`;
        const existing = grouped.get(k) ?? { year: Number(y), month: Number(m) };
        if (type === "mg") existing.mgPayment = val;
        else existing.royaltyAmount = val;
        grouped.set(k, existing);
      }
      if (grouped.size > 0) mutation.mutate(Array.from(grouped.values()));
    }, 800);
  }, [mutation]);

  const handleSave = (year: number, month: number, type: RowType, value: number) => {
    pendingRef.current.set(`${type}-${year}-${month}`, value);
    scheduleSave();
  };

  // Compute totals
  const totalScheduledMg = years.reduce(
    (a, yr) => a + Array.from({ length: 12 }, (_, i) => getVal(yr, i + 1, "mg")).reduce((s, v) => s + v, 0),
    0
  );
  const totalRoyalties = years.reduce(
    (a, yr) => a + Array.from({ length: 12 }, (_, i) => getVal(yr, i + 1, "royalty")).reduce((s, v) => s + v, 0),
    0
  );
  const mgRemaining = deal.totalContractMg - totalScheduledMg;
  const mgValid = Math.abs(mgRemaining) < 1;
  const mgOver = mgRemaining < -0.5;

  const now = new Date();

  const mgBadge = mgValid
    ? "bg-emerald-100 text-emerald-700 border-emerald-300"
    : mgOver
    ? "bg-rose-100 text-rose-700 border-rose-300"
    : "bg-amber-100 text-amber-700 border-amber-300";

  const mgBadgeText = mgValid
    ? `MG fully scheduled ✓  ${fmt(totalScheduledMg, deal.currency)}`
    : mgOver
    ? `Over-scheduled by ${fmt(Math.abs(mgRemaining), deal.currency)}`
    : `Scheduled ${fmt(totalScheduledMg, deal.currency)} · Remaining ${fmt(mgRemaining, deal.currency)}`;

  const getTabIndex = (year: number, month: number) => (year - years[0]) * 12 + (month - 1);

  const focusCell = (cellIdx: number, type: RowType) => {
    const wrappedIdx = ((cellIdx % totalCells) + totalCells) % totalCells;
    const yr = years[Math.floor(wrappedIdx / 12)];
    const mo = (wrappedIdx % 12) + 1;
    document.getElementById(`cell-${type}-${deal.id}-${yr}-${mo}`)?.click();
  };

  return (
    <div className="border-t border-gray-200 bg-white">
      {/* MG scheduling status bar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 border-b border-gray-200">
        <span className="text-xs font-medium text-gray-500">
          Contract MG: <strong className="text-gray-800">{fmt(deal.totalContractMg, deal.currency)}</strong>
        </span>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${mgBadge}`}>
          {mgBadgeText}
        </span>
        <span className="text-xs text-gray-400 ml-auto">
          Total Royalties Collected: <strong className="text-blue-800">{fmt(totalRoyalties, deal.currency) || fmt(0, deal.currency)}</strong>
        </span>
        {mutation.isPending && <span className="text-xs text-gray-400 animate-pulse">Saving…</span>}
      </div>

      <div className="overflow-x-auto">
        <table className="text-xs border-collapse w-full">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-200">
              <th className="sticky left-0 z-10 bg-gray-100 border-r border-gray-200 px-3 py-2 text-left font-semibold text-gray-500 w-28">
                Type
              </th>
              {years.map((year) =>
                MONTHS.map((mon, mi) => {
                  const isCurrent = now.getFullYear() === year && now.getMonth() === mi;
                  return (
                    <th
                      key={`${year}-${mi + 1}`}
                      className={`min-w-[110px] px-2 py-2 text-center font-medium border-r border-gray-200 ${
                        isCurrent ? "bg-blue-100 text-blue-800" : "text-gray-500"
                      }`}
                    >
                      {mon} {String(year).slice(2)}
                    </th>
                  );
                })
              )}
              <th className="bg-gray-100 px-3 py-2 text-right font-semibold text-gray-500 min-w-[110px]">Total</th>
            </tr>
          </thead>
          <tbody>
            {/* MG Payment row */}
            <tr className="border-b border-gray-200">
              <td className="sticky left-0 z-10 bg-violet-50 border-r border-gray-200 px-3 py-0">
                <div className="flex items-center gap-1.5 py-2">
                  <span className="w-2 h-2 rounded-full bg-violet-400 flex-shrink-0" />
                  <span className="font-semibold text-violet-700 whitespace-nowrap">MG Due</span>
                </div>
              </td>
              {years.map((year) =>
                MONTHS.map((_, mi) => {
                  const month = mi + 1;
                  const isCurrent = now.getFullYear() === year && now.getMonth() === mi;
                  const cellIdx = getTabIndex(year, month);
                  return (
                    <td key={`${year}-${month}`} id={`cell-mg-${deal.id}-${year}-${month}`} className="p-0">
                      <EditableCell
                        value={getVal(year, month, "mg")}
                        currency={deal.currency}
                        rowType="mg"
                        isCurrentMonth={isCurrent}
                        onSave={(v) => handleSave(year, month, "mg", v)}
                        onTabNext={() => focusCell(cellIdx + 1, "mg")}
                      />
                    </td>
                  );
                })
              )}
              <td className="px-3 py-2 text-right font-mono font-semibold text-violet-700 bg-violet-50 whitespace-nowrap">
                {fmt(totalScheduledMg, deal.currency) || "—"}
              </td>
            </tr>

            {/* Royalties / Overages row */}
            <tr>
              <td className="sticky left-0 z-10 bg-blue-50 border-r border-gray-200 px-3 py-0">
                <div className="flex items-center gap-1.5 py-2">
                  <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                  <span className="font-semibold text-blue-700 whitespace-nowrap">Royalties</span>
                </div>
              </td>
              {years.map((year) =>
                MONTHS.map((_, mi) => {
                  const month = mi + 1;
                  const isCurrent = now.getFullYear() === year && now.getMonth() === mi;
                  const cellIdx = getTabIndex(year, month);
                  return (
                    <td key={`${year}-${month}`} id={`cell-royalty-${deal.id}-${year}-${month}`} className="p-0">
                      <EditableCell
                        value={getVal(year, month, "royalty")}
                        currency={deal.currency}
                        rowType="royalty"
                        isCurrentMonth={isCurrent}
                        onSave={(v) => handleSave(year, month, "royalty", v)}
                        onTabNext={() => focusCell(cellIdx + 1, "royalty")}
                      />
                    </td>
                  );
                })
              )}
              <td className="px-3 py-2 text-right font-mono font-semibold text-blue-700 bg-blue-50 whitespace-nowrap">
                {fmt(totalRoyalties, deal.currency) || "—"}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
