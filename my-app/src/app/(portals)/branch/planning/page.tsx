"use client";

import { useState } from "react";
import { LineChart, Loader2 } from "lucide-react";
import { useBranchPlanning } from "@/lib/hooks/use-branch-planning";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * Branch — Expected stock (§9). Read-only, confirmed plans only.
 *
 * The response is two shapes in one, keyed on `ready`: the not-ready form
 * carries `forecast: []` and a human `reason`; the ready form carries
 * `expected_stock`. We branch on `ready` and never assume a key is present.
 * Any change goes back through the Admin — there is nothing to act on here.
 */
const DAY_OPTIONS = ["7", "14", "30"] as const;

export default function BranchPlanningPage() {
  const [days, setDays] = useState<string>("7");
  const { data, isLoading, error } = useBranchPlanning(Number(days));

  const expected = data?.ready ? (data.expected_stock ?? []) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
            Planning
          </h1>
          <p className="mt-1 text-sm text-muted">
            Expected stock for this branch, from the plans Admin has confirmed.
          </p>
        </div>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DAY_OPTIONS.map((d) => (
              <SelectItem key={d} value={d}>
                Next {d} days
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-5 animate-spin text-brand" aria-label="Loading" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm text-danger">
              {error instanceof Error ? error.message : "Couldn't load planning"}
            </p>
          </CardContent>
        </Card>
      ) : !data?.ready ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center">
            <LineChart className="size-8 text-faint" aria-hidden />
            <p className="mt-3 font-display text-base font-semibold text-content">
              No confirmed plan yet
            </p>
            <p className="mt-1 max-w-md text-sm text-muted">
              {data?.reason ??
                "Forecasting is running, but no plan has been confirmed for this branch yet."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Expected stock</CardTitle>
            <CardDescription>
              {data.from && data.to ? `${data.from} → ${data.to}` : "Confirmed plan"}
              {data.generated_at ? ` · updated ${formatWhen(data.generated_at)}` : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {expected.length === 0 ? (
              <p className="px-6 py-10 text-center text-sm text-muted">
                Nothing scheduled in this window.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Expected units</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expected.map((row, i) => (
                    <TableRow key={`${row.date}-${row.product_id}-${i}`}>
                      <TableCell className="tabular-nums text-muted">{row.date}</TableCell>
                      <TableCell className="text-content">{row.product_name}</TableCell>
                      <TableCell className="text-right tabular-nums text-content">
                        {row.expected_units}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/** A short local time for "updated ...". ISO timestamp in, human string out. */
function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
