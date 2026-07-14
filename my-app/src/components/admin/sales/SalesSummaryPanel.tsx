"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/state";
import { useSalesSummary } from "@/lib/hooks/use-sales";
import { formatPlanAmount } from "@/lib/types/super-admin";
import type { Branch, SalesPeriod } from "@/lib/types/admin";

const SalesSummaryChart = dynamic(
  () => import("./SalesSummaryChart").then((m) => m.SalesSummaryChart),
  {
    ssr: false,
    loading: () => <Skeleton className="h-full w-full rounded-xl" />,
  },
);

const ALL_BRANCHES = "all";

const PERIOD_NOUN: Record<SalesPeriod, string> = {
  daily: "day",
  weekly: "week",
  monthly: "month",
};

export function SalesSummaryPanel({ branches }: { branches: Branch[] }) {
  const [period, setPeriod] = useState<SalesPeriod>("daily");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [branchFilter, setBranchFilter] = useState<string>(ALL_BRANCHES);

  const filters = useMemo(
    () => ({
      period,
      start: start ? `${start}T00:00:00Z` : undefined,
      end: end ? `${end}T23:59:59Z` : undefined,
      branch_id: branchFilter === ALL_BRANCHES ? undefined : branchFilter,
    }),
    [period, start, end, branchFilter],
  );

  const summary = useSalesSummary(filters);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted">Period</p>
          <Select value={period} onValueChange={(v) => setPeriod(v as SalesPeriod)}>
            <SelectTrigger className="sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted">Start</p>
          <Input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="sm:w-44"
          />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted">End</p>
          <Input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="sm:w-44"
          />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted">Branch</p>
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="sm:w-48">
              <SelectValue placeholder="All branches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_BRANCHES}>All branches</SelectItem>
              {branches.map((branch) => (
                <SelectItem key={branch.id} value={branch.id}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted">Total sales</CardTitle>
          </CardHeader>
          <CardContent>
            {summary.isLoading ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              <p className="font-display text-3xl font-semibold text-content">
                {formatPlanAmount(summary.data?.total_amount)}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted">Number of sales</CardTitle>
          </CardHeader>
          <CardContent>
            {summary.isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="font-display text-3xl font-semibold text-content">
                {summary.data?.total_count ?? 0}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Revenue per {PERIOD_NOUN[period]}</CardTitle>
        </CardHeader>
        <CardContent className="h-72 [&_.recharts-cartesian-grid-bg]:fill-transparent [&_.recharts-surface]:bg-transparent [&_.recharts-wrapper]:bg-transparent">
          {summary.isLoading ? (
            <Skeleton className="h-full w-full rounded-xl" />
          ) : summary.isError ? (
            <ErrorState
              description="Failed to load sales summary."
              onRetry={() => summary.refetch()}
            />
          ) : (
            <SalesSummaryChart buckets={summary.data?.buckets ?? []} period={period} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
