"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PageState } from "@/components/ui/page-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ForecastTable } from "@/components/forecast/ForecastTable";
import { HotProductsCard } from "@/components/forecast/HotProductsCard";
import { UpcomingEventsStrip } from "@/components/forecast/UpcomingEventsStrip";
import { CreatePlanDialog } from "@/components/forecast/CreatePlanDialog";
import { useBranches } from "@/lib/hooks/use-locations";
import { useForecast } from "@/lib/hooks/use-forecast";
import { forecastErrorMessage } from "@/lib/forecast/errors";
import { toLocalDateString } from "@/lib/date-range";

function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d + n);
  return toLocalDateString(date);
}

/**
 * Admin — Forecast & Planning (§11, the main screen).
 *   1. Upcoming-events alert strip
 *   2. Branch + date-range picker → forecast table (§6), with hot products
 *   3. "Create plan" → a draft the Admin can edit and confirm (§7)
 */
export default function AdminForecastPage() {
  const branches = useBranches();
  const today = toLocalDateString(new Date());

  const [branchId, setBranchId] = useState<string>("");
  const [start, setStart] = useState<string>(today);
  const [end, setEnd] = useState<string>(() => addDays(today, 6));
  const [includeAll, setIncludeAll] = useState(false);

  // Default to the first branch until the Admin picks one.
  const effectiveBranch = branchId || branches.data?.[0]?.id || "";

  const query =
    effectiveBranch && start
      ? {
          branch_id: effectiveBranch,
          start,
          end: end || start,
          include_all: includeAll,
        }
      : null;

  const forecast = useForecast(query);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
            Forecast &amp; Planning
          </h1>
          <p className="mt-1 text-sm text-muted">
            What each branch is likely to sell, and the plans you confirm from it.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/forecast/plans">All plans</Link>
          </Button>
          <CreatePlanDialog
            defaultBranchId={effectiveBranch}
            defaultStart={start}
            defaultEnd={end}
            branches={branches.data ?? []}
          />
        </div>
      </div>

      <UpcomingEventsStrip branchId={effectiveBranch} />

      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 py-4">
          <div className="space-y-1.5">
            <Label htmlFor="branch">Branch</Label>
            <Select value={effectiveBranch} onValueChange={setBranchId}>
              <SelectTrigger id="branch" className="w-56">
                <SelectValue placeholder="Choose a branch" />
              </SelectTrigger>
              <SelectContent>
                {(branches.data ?? []).map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="start">From</Label>
            <Input
              id="start"
              type="date"
              className="w-44"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="end">To</Label>
            <Input
              id="end"
              type="date"
              className="w-44"
              value={end}
              min={start}
              onChange={(e) => setEnd(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 pb-2">
            <Switch id="all" checked={includeAll} onCheckedChange={setIncludeAll} />
            <Label htmlFor="all" className="cursor-pointer">
              Show every product
            </Label>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PageState
            isLoading={forecast.isLoading}
            isError={forecast.isError}
            data={forecast.data}
            isEmpty={(rows) => rows.length === 0}
            errorTitle="Couldn't load the forecast"
            errorDescription={
              forecast.error ? forecastErrorMessage(forecast.error) : undefined
            }
            onRetry={() => forecast.refetch()}
            emptyTitle="Nothing to forecast"
            emptyDescription={
              includeAll
                ? "No products for this branch and date range."
                : "Products with no history and no expected daily amount are hidden. Turn on “Show every product” to include them."
            }
            emptyAction={
              !includeAll ? (
                <Button variant="outline" onClick={() => setIncludeAll(true)}>
                  Show every product
                </Button>
              ) : undefined
            }
          >
            {(rows) => <ForecastTable rows={rows} />}
          </PageState>
        </div>
        <div>
          <HotProductsCard branchId={effectiveBranch} />
        </div>
      </div>
    </div>
  );
}
