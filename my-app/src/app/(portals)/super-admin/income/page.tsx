"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { IncomeCharts } from "@/components/income/IncomeCharts";
import { IncomeKpiCard, moneyLabel } from "@/components/income/IncomeKpis";
import { IncomeRestaurantTable } from "@/components/income/IncomeRestaurantTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/state";
import {
  downloadIncomeCsvFile,
  useIncomeForecast,
  useIncomeSummary,
} from "@/lib/hooks/use-income";
import {
  currentIncomeMonth,
  type IncomeForecastHorizon,
  type IncomePeriodFilter,
} from "@/lib/types/income";
import { ApiError } from "@/lib/types/super-admin";
import { toast } from "sonner";

type FilterMode = "month" | "range";

export default function SuperAdminIncomePage() {
  const [mode, setMode] = useState<FilterMode>("month");
  const [month, setMonth] = useState(currentIncomeMonth);
  const [fromDate, setFromDate] = useState(`${currentIncomeMonth()}-01`);
  const [toDate, setToDate] = useState(() => {
    const [y, m] = currentIncomeMonth().split("-").map(Number);
    const last = new Date(y, m, 0).getDate();
    return `${currentIncomeMonth()}-${String(last).padStart(2, "0")}`;
  });
  const [horizon, setHorizon] = useState<IncomeForecastHorizon>(6);
  const [exporting, setExporting] = useState(false);

  const filter: IncomePeriodFilter = useMemo(() => {
    if (mode === "month") return { month };
    return { from_date: fromDate, to_date: toDate };
  }, [mode, month, fromDate, toDate]);

  const summaryQuery = useIncomeSummary(filter);
  const forecastQuery = useIncomeForecast(horizon);

  const onExport = async () => {
    setExporting(true);
    try {
      await downloadIncomeCsvFile(filter);
      toast.success("CSV downloaded");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-content">Income</h1>
          <p className="mt-1 text-sm text-muted">
            Platform subscription collections and restaurants sold — not branch POS sales.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={String(horizon)}
            onValueChange={(v) => setHorizon(Number(v) as IncomeForecastHorizon)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Forecast" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Forecast 1 mo</SelectItem>
              <SelectItem value="6">Forecast 6 mo</SelectItem>
              <SelectItem value="12">Forecast 12 mo</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={onExport}
            disabled={exporting || summaryQuery.isLoading}
          >
            <Download className="h-4 w-4" />
            {exporting ? "Exporting…" : "Download CSV"}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="space-y-2">
            <Label>Filter mode</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as FilterMode)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Month</SelectItem>
                <SelectItem value="range">Date range</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {mode === "month" ? (
            <div className="space-y-2">
              <Label htmlFor="income-month">Month</Label>
              <Input
                id="income-month"
                type="month"
                className="w-[180px]"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="income-from">From</Label>
                <Input
                  id="income-from"
                  type="date"
                  className="w-[180px]"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="income-to">To</Label>
                <Input
                  id="income-to"
                  type="date"
                  className="w-[180px]"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {summaryQuery.isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      )}

      {summaryQuery.isError && (
        <ErrorState
          title="Could not load income"
          description={
            summaryQuery.error instanceof ApiError
              ? summaryQuery.error.message
              : "Check filters and try again."
          }
          onRetry={() => summaryQuery.refetch()}
        />
      )}

      {summaryQuery.data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <IncomeKpiCard
              label="Collected"
              value={moneyLabel(summaryQuery.data.total_collected)}
              hint={`${summaryQuery.data.invoice_count_paid} paid invoices`}
              change={summaryQuery.data.compare.collected_change_pct}
            />
            <IncomeKpiCard
              label="Outstanding"
              value={moneyLabel(summaryQuery.data.total_outstanding)}
              hint={`${summaryQuery.data.invoice_count_unpaid} unpaid invoices`}
              change={summaryQuery.data.compare.outstanding_change_pct}
            />
            <IncomeKpiCard
              label="Collection rate"
              value={`${formatPct(summaryQuery.data.collection_rate)}%`}
              hint={`Platform ${formatPct(summaryQuery.data.platform.collection_rate)}%`}
            />
            <IncomeKpiCard
              label="Restaurants onboarded"
              value={String(summaryQuery.data.restaurants_onboarded)}
              hint={`${summaryQuery.data.from_date} → ${summaryQuery.data.to_date}`}
              change={summaryQuery.data.compare.restaurants_onboarded_change_pct}
            />
            <IncomeKpiCard
              label="MRR"
              value={moneyLabel(summaryQuery.data.platform.mrr)}
              hint={`Lost from halted ${moneyLabel(summaryQuery.data.platform.mrr_lost_from_halted)}`}
            />
            <IncomeKpiCard label="ARR" value={moneyLabel(summaryQuery.data.platform.arr)} />
            <IncomeKpiCard
              label="Active restaurants"
              value={String(summaryQuery.data.platform.restaurants_active)}
              hint={`${summaryQuery.data.platform.restaurants_halted} halted · ${summaryQuery.data.platform.restaurants_total} total`}
            />
            <IncomeKpiCard
              label="Period compare"
              value={`${summaryQuery.data.compare.previous_from_date.slice(5)}–${summaryQuery.data.compare.previous_to_date.slice(5)}`}
              hint={`Prev collected ${moneyLabel(summaryQuery.data.compare.previous_collected)}`}
            />
          </div>

          {summaryQuery.data.by_day.length === 0 ? (
            <EmptyState title="No activity" description="No income series for this period." />
          ) : (
            <IncomeCharts summary={summaryQuery.data} forecast={forecastQuery.data} />
          )}

          <IncomeRestaurantTable rows={summaryQuery.data.by_restaurant} />
        </>
      )}
    </div>
  );
}

function formatPct(value: string): string {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n.toFixed(2) : value;
}
