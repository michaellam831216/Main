import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from "recharts";
import { dashboardApi } from "../api/dashboard";
import { useAuthStore } from "../store/authStore";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

function fmt(n: number) {
  if (n === 0) return "—";
  return new Intl.NumberFormat("en", {
    style: "decimal",
    maximumFractionDigits: 0,
    notation: n >= 1_000_000 ? "compact" : "standard",
    compactDisplay: "short",
  }).format(n);
}

function KpiCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className={`rounded-xl border p-5 bg-white shadow-sm flex flex-col gap-1 ${color}`}>
      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</span>
      <span className="text-2xl font-bold text-gray-900 font-mono">{value}</span>
      {sub && <span className="text-xs text-gray-400">{sub}</span>}
    </div>
  );
}

const PROB_COLORS: Record<string, string> = {
  SIGNED: "#10b981",
  HIGH: "#3b82f6",
  MEDIUM: "#f59e0b",
  LOW: "#f87171",
};

function CustomBarTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {fmt(p.value)}
        </p>
      ))}
    </div>
  );
}

interface NamedRow {
  name: string;
  dealCount: number;
  totalMg: number;
  weightedMg: number;
  collected: number;
}

function HorizontalBarSection({ title, rows, valueKey }: {
  title: string;
  rows: NamedRow[];
  valueKey: "totalMg" | "weightedMg" | "collected";
}) {
  const max = Math.max(...rows.map((r) => r[valueKey]), 1);
  const colors = ["bg-brand-500", "bg-blue-500", "bg-violet-500", "bg-emerald-500", "bg-amber-500", "bg-rose-400"];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <h3 className="font-semibold text-gray-800 mb-4 text-sm">{title}</h3>
      <div className="space-y-3">
        {rows.length === 0 && <p className="text-sm text-gray-400">No data</p>}
        {rows.map((row, i) => {
          const val = row[valueKey];
          const pct = max > 0 ? (val / max) * 100 : 0;
          return (
            <div key={row.name + i}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-700 truncate max-w-[60%]">{row.name}</span>
                <span className="text-xs font-mono text-gray-600 ml-2">{fmt(val)}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full">
                <div
                  className={`h-2 rounded-full ${colors[i % colors.length]} transition-all`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{row.dealCount} deal{row.dealCount !== 1 ? "s" : ""}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AskQuestion() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<{ q: string; a: string }[]>([]);

  const askMut = useMutation({
    mutationFn: () => dashboardApi.ask(question),
    onSuccess: (answer) => {
      setHistory((h) => [...h, { q: question, a: answer }]);
      setQuestion("");
    },
    onError: (e: { response?: { data?: { error?: string } } }) => {
      const msg = e?.response?.data?.error ?? "Failed to get answer";
      toast.error(msg);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim()) askMut.mutate();
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
      >
        <span className="font-semibold text-gray-800 flex items-center gap-2 text-sm">
          <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-xs font-bold">AI</span>
          Ask a Question about the Pipeline
        </span>
        <span className="text-gray-400 text-xs">{open ? "▲ collapse" : "▼ expand"}</span>
      </button>

      {open && (
        <div className="border-t border-gray-100 px-5 pb-5">
          {history.length > 0 && (
            <div className="mt-4 space-y-4 max-h-96 overflow-y-auto">
              {history.map((item, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-end">
                    <div className="bg-brand-50 border border-brand-200 text-brand-900 text-sm rounded-xl rounded-tr-sm px-4 py-2 max-w-[80%]">
                      {item.q}
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl rounded-tl-sm px-4 py-2 max-w-[85%] whitespace-pre-wrap">
                      {item.a}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. Which brand has the highest weighted MG? What is the collection rate?"
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              disabled={askMut.isPending}
            />
            <button
              type="submit"
              disabled={askMut.isPending || !question.trim()}
              className="bg-brand-600 text-white text-sm px-5 py-2.5 rounded-lg hover:bg-brand-700 disabled:opacity-50 font-medium transition-colors whitespace-nowrap"
            >
              {askMut.isPending ? "Thinking…" : "Ask"}
            </button>
          </form>
          <p className="text-xs text-gray-400 mt-2">Powered by Claude. Answers are based on current pipeline data.</p>
        </div>
      )}
    </div>
  );
}

export function Dashboard() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const [chartMetric, setChartMetric] = useState<"totalMg" | "weightedMg" | "collected">("totalMg");

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: dashboardApi.summary,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });

  const handleSignOut = () => {
    clearAuth();
    navigate("/login");
  };

  const metricLabels = {
    totalMg: "Total MG",
    weightedMg: "Weighted MG",
    collected: "Collected",
  };

  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading dashboard…</p>
      </div>
    );
  }

  const { kpi, byBrand, byRegion, byPerson, byProbability, trend } = data;

  const trendData = trend.map((t) => ({
    name: t.label,
    "MG Scheduled": t.mgScheduled,
    Collected: t.collected,
  }));

  const probData = byProbability.map((p) => ({
    name: p.probability.charAt(0) + p.probability.slice(1).toLowerCase(),
    "Total MG": p.totalMg,
    "Weighted MG": p.weightedMg,
    Collected: p.collected,
    fill: PROB_COLORS[p.probability],
  }));

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-600 text-white text-sm font-bold flex items-center justify-center">BP</div>
          <div>
            <h1 className="font-bold text-gray-900 text-sm leading-none">Business Pipeline</h1>
            <p className="text-xs text-gray-400">Analytics Dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">{user?.name}</span>
          <span className="text-xs bg-violet-100 text-violet-700 font-semibold px-2 py-0.5 rounded">DASHBOARD</span>
          <button onClick={handleSignOut} className="text-xs text-gray-500 hover:text-gray-700 border border-gray-300 px-3 py-1 rounded-lg transition-colors">
            Sign Out
          </button>
        </div>
      </header>

      <div className="flex-1 p-6 max-w-screen-2xl mx-auto w-full space-y-6">

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Total Deals" value={String(kpi.dealCount)} color="border-gray-200" />
          <KpiCard
            label="Total MG"
            value={fmt(kpi.totalMg)}
            sub="Sum of all contract MGs"
            color="border-violet-200"
          />
          <KpiCard
            label="Weighted MG"
            value={fmt(kpi.weightedMg)}
            sub="Probability-adjusted pipeline"
            color="border-blue-200"
          />
          <KpiCard
            label="Total Collected"
            value={fmt(kpi.totalCollected)}
            sub={`${kpi.totalMg > 0 ? Math.round((kpi.totalCollected / kpi.totalMg) * 100) : 0}% of total MG`}
            color="border-emerald-200"
          />
        </div>

        {/* Trend Line Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4 text-sm">Pipeline Trend — Last 13 Months</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => fmt(v)} width={70} />
              <Tooltip content={<CustomBarTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="MG Scheduled" stroke="#7c3aed" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Collected" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Breakdown Charts — By Brand, Region, Person */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-gray-500">Show metric:</span>
          {(["totalMg", "weightedMg", "collected"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setChartMetric(m)}
              className={`text-xs px-3 py-1 rounded-full border font-medium transition-colors ${
                chartMetric === m
                  ? "bg-brand-600 text-white border-brand-600"
                  : "border-gray-300 text-gray-600 hover:border-brand-400"
              }`}
            >
              {metricLabels[m]}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <HorizontalBarSection title="By Brand" rows={byBrand} valueKey={chartMetric} />
          <HorizontalBarSection title="By Region" rows={byRegion} valueKey={chartMetric} />
          <HorizontalBarSection title="By Person" rows={byPerson} valueKey={chartMetric} />
        </div>

        {/* By Probability Bar Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4 text-sm">By Probability</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={probData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => fmt(v)} width={70} />
              <Tooltip content={<CustomBarTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Total MG" fill="#7c3aed" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Weighted MG" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Collected" fill="#10b981" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* AI Ask Question */}
        <AskQuestion />

      </div>
    </div>
  );
}
