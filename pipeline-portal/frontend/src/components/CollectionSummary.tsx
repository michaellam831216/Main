import { Deal } from "../types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function getDisplayMonths() {
  const now = new Date();
  const months: { year: number; month: number; label: string; isCurrent: boolean }[] = [];
  // 3 months back to 12 months forward = 16 months total
  for (let offset = -3; offset <= 12; offset++) {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    months.push({
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      label: `${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
      isCurrent: offset === 0,
    });
  }
  return months;
}

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

interface Props {
  deals: Deal[];
  currency: string;
  title?: string;
}

export function CollectionSummary({ deals, currency, title }: Props) {
  const months = getDisplayMonths();

  const getMgDue = (year: number, month: number) =>
    deals.reduce((sum, d) => sum + (d.monthlyEntries.find((e) => e.year === year && e.month === month)?.mgPayment ?? 0), 0);

  const getRoyalties = (year: number, month: number) =>
    deals.reduce((sum, d) => sum + (d.monthlyEntries.find((e) => e.year === year && e.month === month)?.royaltyAmount ?? 0), 0);

  const totalMgDue = months.reduce((s, m) => s + getMgDue(m.year, m.month), 0);
  const totalRoyalties = months.reduce((s, m) => s + getRoyalties(m.year, m.month), 0);

  return (
    <div className="bg-white border-b border-gray-200">
      {title && (
        <div className="px-4 pt-3 pb-1">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</span>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="text-xs border-collapse w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="sticky left-0 z-10 bg-gray-50 border-r border-gray-200 px-4 py-2 text-left font-semibold text-gray-500 w-28 whitespace-nowrap">
                Monthly View
              </th>
              {months.map((m) => (
                <th
                  key={`${m.year}-${m.month}`}
                  className={`min-w-[90px] px-2 py-2 text-center font-medium border-r border-gray-100 whitespace-nowrap ${
                    m.isCurrent ? "bg-blue-100 text-blue-800" : "text-gray-500"
                  }`}
                >
                  {m.label}
                </th>
              ))}
              <th className="bg-gray-100 px-3 py-2 text-right font-semibold text-gray-600 min-w-[90px] border-l border-gray-200">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-100">
              <td className="sticky left-0 z-10 bg-violet-50 border-r border-gray-200 px-4 py-2 font-semibold text-violet-700 whitespace-nowrap">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-violet-400" />
                  MG Due
                </div>
              </td>
              {months.map((m) => {
                const val = getMgDue(m.year, m.month);
                return (
                  <td
                    key={`mg-${m.year}-${m.month}`}
                    className={`px-2 py-2 text-right font-mono border-r border-gray-100 ${
                      m.isCurrent ? "bg-violet-50/50" : ""
                    } ${val > 0 ? "text-violet-800 font-semibold" : "text-gray-300"}`}
                  >
                    {fmt(val, currency)}
                  </td>
                );
              })}
              <td className="px-3 py-2 text-right font-mono font-bold text-violet-800 bg-violet-50 border-l border-gray-200">
                {fmt(totalMgDue, currency)}
              </td>
            </tr>
            <tr>
              <td className="sticky left-0 z-10 bg-blue-50 border-r border-gray-200 px-4 py-2 font-semibold text-blue-700 whitespace-nowrap">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                  Royalties
                </div>
              </td>
              {months.map((m) => {
                const val = getRoyalties(m.year, m.month);
                const mg = getMgDue(m.year, m.month);
                const isOverage = val > mg && mg > 0;
                return (
                  <td
                    key={`roy-${m.year}-${m.month}`}
                    className={`px-2 py-2 text-right font-mono border-r border-gray-100 ${
                      m.isCurrent ? "bg-blue-50/50" : ""
                    } ${val > 0 ? (isOverage ? "text-emerald-700 font-bold" : "text-blue-800 font-semibold") : "text-gray-300"}`}
                    title={isOverage ? "Overage" : undefined}
                  >
                    {fmt(val, currency)}
                    {isOverage && <span className="ml-0.5 text-emerald-500">↑</span>}
                  </td>
                );
              })}
              <td className="px-3 py-2 text-right font-mono font-bold text-blue-800 bg-blue-50 border-l border-gray-200">
                {fmt(totalRoyalties, currency)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
