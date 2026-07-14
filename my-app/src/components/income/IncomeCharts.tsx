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

function num(v: string): number {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

function TooltipMoney({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-lift">
      <p className="mb-1 font-medium text-content">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="text-muted">
          {p.name}:{" "}
          <span className="text-content">
            {typeof p.value === "number" && (p.name ?? "").toLowerCase().includes("restaurant")
              ? p.value
              : `$${formatPlanAmount(p.value)}`}
          </span>
        </p>
      ))}
    </div>
  );
}

export function IncomeCharts({
  summary,
  forecast,
}: {
  summary: IncomeSummary;
  forecast: IncomeForecast | undefined;
}) {
  const dayData = summary.by_day.map((d) => ({
    date: d.date.slice(5),
    collected: num(d.collected),
    onboarded: d.restaurants_onboarded,
  }));

  const showMonths = summary.by_month.length > 1;
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
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Daily collections</CardTitle>
          <CardDescription>
            Collected subscription payments and restaurants onboarded by day.
          </CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dayData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-line" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="money" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="count" orientation="right" tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip content={<TooltipMoney />} />
              <Legend />
              <Line
                yAxisId="money"
                type="monotone"
                dataKey="collected"
                name="Collected"
                stroke={BRAND}
                strokeWidth={2}
                dot={false}
              />
              <Line
                yAxisId="count"
                type="monotone"
                dataKey="onboarded"
                name="Restaurants onboarded"
                stroke={WARN}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {showMonths && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">By month</CardTitle>
            <CardDescription>Collected vs outstanding across months in range.</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-line" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<TooltipMoney />} />
                <Legend />
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
                <Tooltip content={<TooltipMoney />} />
                <Legend />
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
              <CartesianGrid strokeDasharray="3 3" className="stroke-line" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip content={<TooltipMoney />} />
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
                <CartesianGrid strokeDasharray="3 3" className="stroke-line" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="money" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="count" orientation="right" tick={{ fontSize: 11 }} />
                <Tooltip content={<TooltipMoney />} />
                <Legend />
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
