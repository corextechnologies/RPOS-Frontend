"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SalesPeriod, SalesSummaryBucket } from "@/lib/types/admin";
import { formatPlanAmount } from "@/lib/types/super-admin";

const BRAND = "rgb(20, 168, 140)";
const AXIS = "rgb(var(--muted))";
const GRID = "rgb(var(--line))";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function bucketLabel(iso: string, period: SalesPeriod): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  const month = MONTHS[d.getUTCMonth()];
  if (period === "monthly") return `${month} ${d.getUTCFullYear()}`;
  const day = d.getUTCDate();
  if (period === "weekly") return `Wk ${month} ${day}`;
  return `${month} ${day}`;
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: { label?: string; amount?: number; count?: number } }>;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point) return null;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-lift">
      <p className="mb-1 font-medium text-content">{point.label}</p>
      <p className="text-muted">
        Total: <span className="text-content">{formatPlanAmount(point.amount ?? 0)}</span>
      </p>
      <p className="text-muted">
        Sales: <span className="text-content">{point.count ?? 0}</span>
      </p>
    </div>
  );
}

export function SalesSummaryChart({
  buckets,
  period,
}: {
  buckets: SalesSummaryBucket[];
  period: SalesPeriod;
}) {
  const data = buckets.map((b) => ({
    label: bucketLabel(b.period_start, period),
    amount: parseFloat(b.total_amount) || 0,
    count: b.count,
  }));

  if (data.length === 0) {
    return (
      <p className="grid h-full place-items-center text-sm text-muted">
        No sales in this range.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ left: 4, right: 8, top: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} fill="transparent" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: AXIS }}
          stroke={GRID}
          interval="preserveStartEnd"
          minTickGap={20}
        />
        <YAxis tick={{ fontSize: 11, fill: AXIS }} stroke={GRID} />
        <Tooltip
          content={<ChartTooltip />}
          cursor={{ fill: "transparent" }}
          wrapperStyle={{ outline: "none" }}
          contentStyle={{
            background: "transparent",
            border: "none",
            boxShadow: "none",
            padding: 0,
          }}
        />
        <Bar dataKey="amount" name="Total" fill={BRAND} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
