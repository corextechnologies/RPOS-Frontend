"use client";

import { useMemo, useState } from "react";
import { Info, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useBranchRefusals } from "@/lib/hooks/use-branch";
import { posErrorMessage } from "@/lib/api/errors";
import { cn } from "@/lib/utils";
import type { BranchRefusalProduct, BranchRefusalReason } from "@/lib/types/branch";

/** Look-back presets, in days. */
const WINDOWS = [7, 30, 90] as const;

const REASON_LABEL: Record<BranchRefusalReason, string> = {
  OUT_OF_STOCK: "Out of stock",
  SHORT_STOCK: "Short stock",
  STAFF_PULLED: "Taken off sale",
};

/**
 * Refusals — demand the till had to turn away.
 *
 * The forecast can only learn from a sell-out if the turn-away was recorded, so
 * this screen is where a manager sees where they're leaving money on the floor.
 * Deliberate pulls (`is_unmet_demand: false`) are shown but rendered distinctly:
 * they are NOT lost demand — we chose not to sell them — so they never feed the
 * forecast and mustn't be read as a shortage.
 */
export default function BranchRefusalsPage() {
  const [days, setDays] = useState<number>(30);
  const [demandOnly, setDemandOnly] = useState(false);

  const refusals = useBranchRefusals({ days, demand_only: demandOnly });
  const products = refusals.data?.products ?? [];

  // Unmet demand first (biggest gap on top), deliberate pulls last.
  const sorted = useMemo(
    () =>
      [...products].sort((a, b) => {
        if (a.is_unmet_demand !== b.is_unmet_demand) return a.is_unmet_demand ? -1 : 1;
        return b.unmet_units - a.unmet_units;
      }),
    [products],
  );

  const totals = useMemo(() => {
    const demand = products.filter((p) => p.is_unmet_demand);
    return {
      unmetUnits: demand.reduce((n, p) => n + p.unmet_units, 0),
      occasions: demand.reduce((n, p) => n + p.occasions, 0),
    };
  }, [products]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
          Refusals
        </h1>
        <p className="mt-1 text-sm text-muted">Demand the till had to turn away.</p>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Window</Label>
          <div className="flex gap-2">
            {WINDOWS.map((w) => (
              <Button
                key={w}
                type="button"
                size="sm"
                variant={days === w ? "default" : "outline"}
                onClick={() => setDays(w)}
              >
                {w} days
              </Button>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2.5 pb-1.5 text-sm text-content">
          <Switch checked={demandOnly} onCheckedChange={setDemandOnly} />
          Only unmet demand
        </label>
      </div>

      {/* A floor, not a measurement — say so plainly and near the numbers. */}
      <p className="flex items-start gap-2 rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm text-muted">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>
          These only count customers who reached the till. Someone who sees the board, notices
          the item is gone and walks out is never counted — so this is a floor on lost demand, not
          a measurement.
        </span>
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="py-5">
            <p className="font-display text-2xl font-semibold tabular-nums text-content">
              {totals.unmetUnits}
            </p>
            <p className="text-sm text-muted">Unmet units</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <p className="font-display text-2xl font-semibold tabular-nums text-content">
              {totals.occasions}
            </p>
            <p className="text-sm text-muted">Times turned away</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">By product</CardTitle>
          <CardDescription>Biggest unmet demand first</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {refusals.isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="size-5 animate-spin text-brand" aria-label="Loading" />
            </div>
          ) : refusals.error ? (
            <p className="p-6 text-center text-sm text-danger">{posErrorMessage(refusals.error)}</p>
          ) : sorted.length === 0 ? (
            <p className="p-10 text-center text-sm text-muted">
              No refusals recorded in this window. Nothing was turned away — or the till hasn&apos;t
              synced any yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Times</TableHead>
                  <TableHead className="text-right">Units</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((row) => (
                  <RefusalRow key={`${row.product_id}-${row.reason}`} row={row} />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * One product's refusals. Deliberate pulls are muted and badged so they read as
 * a different kind of event, not lost demand.
 */
function RefusalRow({ row }: { row: BranchRefusalProduct }) {
  const pulled = !row.is_unmet_demand;
  return (
    <TableRow className={cn(pulled && "text-muted")}>
      <TableCell className={cn(!pulled && "text-content")}>
        <span className="inline-flex items-center gap-2">
          {row.product_name}
          {pulled && (
            <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
              Not lost demand
            </Badge>
          )}
        </span>
      </TableCell>
      <TableCell className="text-muted">{REASON_LABEL[row.reason]}</TableCell>
      <TableCell className="text-right tabular-nums text-muted">{row.occasions}</TableCell>
      <TableCell
        className={cn("text-right tabular-nums", pulled ? "text-muted" : "text-content")}
      >
        {row.unmet_units}
      </TableCell>
    </TableRow>
  );
}
