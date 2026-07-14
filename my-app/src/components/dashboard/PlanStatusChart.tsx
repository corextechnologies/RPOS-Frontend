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

/**
 * Plan-status bar chart for the Super Admin dashboard. Split into its own
 * component so `recharts` can be lazy-loaded via `next/dynamic` and kept out of
 * the dashboard's initial bundle.
 */
export function PlanStatusChart({
  data,
}: {
  data: Array<{ name: string; count: number }>;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--line))" />
        <XAxis dataKey="name" tick={{ fill: "rgb(var(--muted))", fontSize: 12 }} />
        <YAxis allowDecimals={false} tick={{ fill: "rgb(var(--muted))", fontSize: 12 }} />
        <Tooltip
          cursor={{ fill: "transparent" }}
          contentStyle={{
            background: "rgb(var(--surface))",
            border: "1px solid rgb(var(--line))",
            borderRadius: "0.75rem",
            color: "rgb(var(--content))",
          }}
        />
        <Bar dataKey="count" fill="rgb(var(--brand))" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
