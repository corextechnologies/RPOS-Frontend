"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { IncomeForecast, IncomeSummary } from "@/lib/types/income";
import { formatPlanAmount } from "@/lib/types/super-admin";
import { titleCase } from "@/lib/utils";

const BRAND = "rgb(20, 168, 140)";
const MUTED = "rgb(148, 163, 184)";
const WARN = "rgb(217, 119, 6)";
const PIE = [BRAND, "rgb(0, 71, 65)", WARN, MUTED, "rgb(56, 189, 248)"];
const AXIS = "rgb(var(--muted))";
const GRID = "rgb(var(--line))";
const TRANSPARENT_CURSOR = { fill: "transparent" } as const;

function num(v: string): number {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

function formatDayLabel(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate.slice(5);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Evenly spaced tick keys so ~1 month of dates stays readable. */
function spacedTicks(keys: string[], maxTicks = 8): string[] {
  if (keys.length <= maxTicks) return keys;
  const ticks: string[] = [];
  const last = keys.length - 1;
  for (let i = 0; i < maxTicks; i += 1) {
    const idx = Math.round((i * last) / (maxTicks - 1));
    const key = keys[idx];
    if (ticks[ticks.length - 1] !== key) ticks.push(key);
  }
  return ticks;
}

function TooltipMoney({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string; dataKey?: string | number; payload?: Record<string, unknown> }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  const onboardedToday =
    typeof point?.onboarded_today === "number" ? point.onboarded_today : undefined;

  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs text-content shadow-lift">
      <p className="mb-1 font-medium text-content">{label}</p>
      {payload.map((p) => (
        <p key={String(p.dataKey ?? p.name)} style={{ color: p.color }} className="text-muted">
          {p.name}:{" "}
          <span className="text-content">
            {typeof p.value === "number" &&
            String(p.dataKey ?? p.name)
              .toLowerCase()
              .includes("restaurant")
              ? p.value
              : typeof p.value === "number" &&
                  String(p.name ?? "")
                    .toLowerCase()
                    .includes("onboard")
                ? p.value
                : `$${formatPlanAmount(p.value)}`}
          </span>
        </p>
      ))}
      {typeof onboardedToday === "number" && (
        <p className="mt-1 text-faint">New this day: {onboardedToday}</p>
      )}
    </div>
  );
}

const tickProps = { fontSize: 11, fill: AXIS };
const tooltipProps = {
  content: <TooltipMoney />,
  cursor: TRANSPARENT_CURSOR,
  wrapperStyle: { outline: "none" },
  contentStyle: {
    background: "transparent",
    border: "none",
    boxShadow: "none",
    padding: 0,
  },
};

export function IncomeCharts({
  summary,
  forecast,
}: {
  summary: IncomeSummary;
  forecast: IncomeForecast | undefined;
}) {
  let runningOnboarded = 0;
  const dayData = summary.by_day.map((d) => {
    runningOnboarded += d.restaurants_onboarded;
    return {
      key: d.date,
      label: formatDayLabel(d.date),
      collected: num(d.collected),
      onboarded_today: d.restaurants_onboarded,
      // Cumulative in-period total so the line ends at the period KPI (e.g. 5).
      onboarded: runningOnboarded,
    };
  });
  const dayTicks = spacedTicks(
    dayData.map((d) => d.key),
    dayData.length > 20 ? 7 : 10,
  );
  const maxOnboarded = Math.max(
    summary.restaurants_onboarded,
    ...dayData.map((d) => d.onboarded),
    1,
  );

  const showMonths = summary.by_month.length > 0;
  const monthData = summary.by_month.map((m) => ({
    month: m.month,
    collected: num(m.collected),
    outstanding: num(m.outstanding),
    onboarded: m.restaurants_onboarded,
  }));

  const tierData = summary.by_plan_tier.map((t) => ({
    name: titleCase(t.plan_tier),
    value: num(t.collected) || num(t.mrr),
  }));

  const agingData = summary.aging_unpaid.map((b) => ({
    label: b.label,
    amount: num(b.amount),
    count: b.count,
  }));

  const forecastData =
    forecast?.months.map((m) => ({
      month: m.month,
      collections: num(m.projected_collections),
      restaurants: num(m.projected_restaurants_added),
    })) ?? [];

  return (
    <div className="grid gap-4 lg:grid-cols-2 [&_.recharts-wrapper]:bg-transparent [&_.recharts-surface]:bg-transparent [&_.recharts-cartesian-grid-bg]:fill-transparent">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Daily collections</CardTitle>
          <CardDescription>
            Daily collected payments, with restaurants onboarded as a running total for the period
            ({summary.restaurants_onboarded} total).
          </CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dayData} margin={{ left: 4, right: 8, top: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} fill="transparent" />
              <XAxis
                dataKey="key"
                ticks={dayTicks}
                tickFormatter={(value: string) => formatDayLabel(value)}
                tick={tickProps}
                stroke={GRID}
                minTickGap={28}
                interval="preserveStartEnd"
              />
              <YAxis yAxisId="money" tick={tickProps} stroke={GRID} />
              <YAxis
                yAxisId="count"
                orientation="right"
                tick={tickProps}
                stroke={GRID}
                allowDecimals={false}
                domain={[0, maxOnboarded]}
              />
              <Tooltip
                {...tooltipProps}
                cursor={{ stroke: GRID, strokeWidth: 1 }}
                labelFormatter={(value) => formatDayLabel(String(value))}
              />
              <Legend wrapperStyle={{ color: AXIS }} />
              <Line
                yAxisId="money"
                type="monotone"
                dataKey="collected"
                name="Collected"
                stroke={BRAND}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                yAxisId="count"
                type="monotone"
                dataKey="onboarded"
                name="Restaurants onboarded"
                stroke={WARN}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {showMonths && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">By month</CardTitle>
            <CardDescription>
              Collected vs outstanding by month
              {summary.by_month.length === 1
                ? " for the selected period"
                : " across the selected range"}
              .
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthData}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} fill="transparent" />
                <XAxis dataKey="month" tick={tickProps} stroke={GRID} />
                <YAxis tick={tickProps} stroke={GRID} />
                <Tooltip {...tooltipProps} />
                <Legend wrapperStyle={{ color: AXIS }} />
                <Bar dataKey="collected" name="Collected" fill={BRAND} radius={[4, 4, 0, 0]} />
                <Bar dataKey="outstanding" name="Outstanding" fill={MUTED} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Plan mix</CardTitle>
          <CardDescription>Collected amount (or MRR) by plan tier.</CardDescription>
        </CardHeader>
        <CardContent className="h-64">
          {tierData.every((t) => t.value === 0) ? (
            <p className="grid h-full place-items-center text-sm text-muted">No plan mix data.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={tierData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={48}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {tierData.map((_, i) => (
                    <Cell key={i} fill={PIE[i % PIE.length]} />
                  ))}
                </Pie>
                <Tooltip {...tooltipProps} />
                <Legend wrapperStyle={{ color: AXIS }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Aging unpaid</CardTitle>
          <CardDescription>Open invoice amounts by age bucket.</CardDescription>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={agingData}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} fill="transparent" />
              <XAxis dataKey="label" tick={tickProps} stroke={GRID} />
              <YAxis tick={tickProps} stroke={GRID} />
              <Tooltip {...tooltipProps} />
              <Bar dataKey="amount" name="Amount" fill={WARN} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {forecast && (
        <Card className={showMonths ? "lg:col-span-2" : undefined}>
          <CardHeader>
            <CardTitle className="text-base">Forecast ({forecast.horizon_months} mo)</CardTitle>
            <CardDescription>
              Avg ~{forecast.avg_restaurants_onboarded_per_month} restaurants/month; next{" "}
              {forecast.horizon_months} months ~{forecast.projected_restaurants_added_total}{" "}
              restaurants projected.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={forecastData}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} fill="transparent" />
                <XAxis dataKey="month" tick={tickProps} stroke={GRID} />
                <YAxis yAxisId="money" tick={tickProps} stroke={GRID} />
                <YAxis yAxisId="count" orientation="right" tick={tickProps} stroke={GRID} />
                <Tooltip {...tooltipProps} cursor={{ stroke: GRID, strokeWidth: 1 }} />
                <Legend wrapperStyle={{ color: AXIS }} />
                <Line
                  yAxisId="money"
                  type="monotone"
                  dataKey="collections"
                  name="Projected collections"
                  stroke={BRAND}
                  strokeWidth={2}
                />
                <Line
                  yAxisId="count"
                  type="monotone"
                  dataKey="restaurants"
                  name="Projected restaurants added"
                  stroke={WARN}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
