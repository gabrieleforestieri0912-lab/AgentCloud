"use client";

/**
 * DashboardCharts — Grafici e diagrammi della dashboard.
 *
 * Usa Recharts per visualizzare:
 * - Bar chart: esecuzioni giornaliere ultimi 7 giorni
 * - Area chart: token utilizzati per giorno
 * - Pie chart: distribuzione uso per agente
 * - Stat cards: riepilogo numerico
 */
import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  BarChart3,
  Activity,
  Coins,
  Zap,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

type DailyPoint = {
  label: string;
  date: string;
  runs: number;
  tokens: number;
};

type AgentUsage = {
  slug: string;
  name: string;
  runs: number;
  tokens: number;
};

type DashboardChartsProps = {
  daily: DailyPoint[];
  totalTokens: number;
  totalRuns: number;
  estimatedCostCents: number;
  overageCents: number;
  locale: string;
  agentUsage?: AgentUsage[];
};

const PIE_COLORS = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#f43f5e", // rose
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#14b8a6", // teal
  "#06b6d4", // cyan
  "#3b82f6", // blue
];

function formatCurrency(cents: number, locale: string) {
  return (cents / 100).toLocaleString(locale === "it" ? "it-IT" : "en-US", {
    style: "currency",
    currency: "EUR",
  });
}

function formatCompact(n: number, locale: string) {
  if (n >= 1_000_000)
    return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString(locale === "it" ? "it-IT" : "en-US");
}

function CustomTooltip({ active, payload, label, locale }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/[0.08] bg-neutral-900/95 backdrop-blur-xl px-4 py-3 shadow-xl">
      <p className="text-xs font-bold text-white mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-xs text-neutral-400">
          <span style={{ color: entry.color }} className="font-bold">
            {entry.name}:{" "}
          </span>
          {entry.value.toLocaleString(locale === "it" ? "it-IT" : "en-US")}
        </p>
      ))}
    </div>
  );
}

export default function DashboardCharts({
  daily,
  totalTokens,
  totalRuns,
  estimatedCostCents,
  overageCents,
  locale,
  agentUsage = [],
}: DashboardChartsProps) {
  const isIt = locale === "it";
  const maxRuns = Math.max(1, ...daily.map((d) => d.runs));
  const maxTokens = Math.max(1, ...daily.map((d) => d.tokens));

  // Calcola trend (confronto prima vs seconda metà della settimana)
  const half = Math.floor(daily.length / 2);
  const firstHalf = daily.slice(0, half);
  const secondHalf = daily.slice(half);
  const runsFirstHalf = firstHalf.reduce((sum, d) => sum + d.runs, 0);
  const runsSecondHalf = secondHalf.reduce((sum, d) => sum + d.runs, 0);
  const trend =
    runsFirstHalf === 0
      ? 0
      : Math.round(
          ((runsSecondHalf - runsFirstHalf) / runsFirstHalf) * 100
        );

  // Pie data per agent usage
  const pieData = useMemo(() => {
    if (agentUsage.length === 0) return [];
    return agentUsage.map((a) => ({
      name: a.name,
      value: a.runs,
    }));
  }, [agentUsage]);

  return (
    <div className="space-y-6">
      {/* Stat cards row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Runs */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/15">
              <Activity size={18} className="text-brand-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {formatCompact(totalRuns, locale)}
              </p>
              <p className="text-xs text-neutral-500">
                {isIt ? "Esecuzioni" : "Runs"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {trend > 0 ? (
              <TrendingUp size={12} className="text-emerald-400" />
            ) : trend < 0 ? (
              <TrendingDown size={12} className="text-red-400" />
            ) : null}
            <span
              className={`text-xs font-bold ${
                trend > 0
                  ? "text-emerald-400"
                  : trend < 0
                  ? "text-red-400"
                  : "text-neutral-500"
              }`}
            >
              {trend > 0 ? `+${trend}%` : trend < 0 ? `${trend}%` : "—"}
            </span>
            <span className="text-xs text-neutral-500">
              {isIt ? "vs prima metà" : "vs first half"}
            </span>
          </div>
        </div>

        {/* Tokens */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/15">
              <Coins size={18} className="text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {formatCompact(totalTokens, locale)}
              </p>
              <p className="text-xs text-neutral-500">
                {isIt ? "Token utilizzati" : "Tokens used"}
              </p>
            </div>
          </div>
          <p className="text-xs text-neutral-500">
            {isIt ? "questo mese" : "this month"}
          </p>
        </div>

        {/* Cost */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15">
              <Zap size={18} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(estimatedCostCents, locale)}
              </p>
              <p className="text-xs text-neutral-500">
                {isIt ? "Costo stimato" : "Estimated cost"}
              </p>
            </div>
          </div>
          <p className="text-xs text-neutral-500">
            {isIt ? "incluso nel piano" : "included in plan"}
          </p>
        </div>

        {/* Overage */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/15">
              <BarChart3 size={18} className="text-orange-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(overageCents, locale)}
              </p>
              <p className="text-xs text-neutral-500">
                {isIt ? "Overage" : "Overage"}
              </p>
            </div>
          </div>
          <p className="text-xs text-neutral-500">
            {overageCents === 0
              ? isIt
                ? "Nessun extra"
                : "No overage"
              : isIt
              ? "额外费用"
              : "extra charges"}
          </p>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Runs bar chart */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
          <h3 className="flex items-center gap-2 text-sm font-bold text-white mb-4">
            <BarChart3 size={16} className="text-brand-400" />
            {isIt ? "Esecuzioni · ultimi 7 giorni" : "Runs · last 7 days"}
          </h3>

          {daily.every((d) => d.runs === 0) ? (
            <p className="py-16 text-center text-sm text-neutral-500">
              {isIt
                ? "Nessuna esecuzione negli ultimi 7 giorni."
                : "No runs in the last 7 days."}
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={daily} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#737373", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#737373", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={35}
                />
                <Tooltip content={<CustomTooltip locale={locale} />} />
                <Bar
                  dataKey="runs"
                  name={isIt ? "Esecuzioni" : "Runs"}
                  fill="#6366f1"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Agent usage pie chart */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
          <h3 className="flex items-center gap-2 text-sm font-bold text-white mb-4">
            <Zap size={16} className="text-purple-400" />
            {isIt ? "Uso per agente" : "Usage by agent"}
          </h3>

          {pieData.length === 0 ? (
            <p className="py-16 text-center text-sm text-neutral-500">
              {isIt
                ? "Nessun dato di utilizzo."
                : "No usage data yet."}
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={PIE_COLORS[index % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={<CustomTooltip locale={locale} />}
                />
              </PieChart>
            </ResponsiveContainer>
          )}

          {/* Legend */}
          {pieData.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {pieData.slice(0, 5).map((entry, i) => (
                <div key={entry.name} className="flex items-center gap-2 text-xs">
                  <div
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                  />
                  <span className="truncate text-neutral-400 flex-1">
                    {entry.name}
                  </span>
                  <span className="font-bold text-white">{entry.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Token usage area chart */}
      {daily.some((d) => d.tokens > 0) && (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
          <h3 className="flex items-center gap-2 text-sm font-bold text-white mb-4">
            <Coins size={16} className="text-purple-400" />
            {isIt ? "Token al giorno" : "Tokens per day"}
          </h3>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={daily}>
              <defs>
                <linearGradient id="tokenGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="label"
                tick={{ fill: "#737373", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#737373", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={50}
                tickFormatter={(v) => formatCompact(v, locale)}
              />
              <Tooltip content={<CustomTooltip locale={locale} />} />
              <Area
                type="monotone"
                dataKey="tokens"
                name={isIt ? "Token" : "Tokens"}
                stroke="#8b5cf6"
                strokeWidth={2}
                fill="url(#tokenGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
