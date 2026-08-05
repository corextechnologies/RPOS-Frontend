"use client";

import { useState } from "react";
import { CalendarClock, Loader2 } from "lucide-react";
import { useKitchenPlanning } from "@/lib/hooks/use-kitchen-planning";
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
 * Kitchen — Production plan (§8). Read-only, confirmed plans only.
 *
 * Quantities are summed across branches — a central kitchen makes one batch for
 * the chain, so `branches` tells you how many contributed. There is no write
 * route; nothing here acts.
 */
const DAY_OPTIONS = ["7", "14", "30"] as const;

export default function KitchenPlanningPage() {
  const [days, setDays] = useState<string>("7");
  const { data, isLoading, error } = useKitchenPlanning(Number(days));

  const targets = data?.ready ? data.targets : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
            Production plan
          </h1>
          <p className="mt-1 text-sm text-muted">
            How many of each product to make, from the plans Admin has confirmed.
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
              {error instanceof Error ? error.message : "Couldn't load the production plan"}
            </p>
          </CardContent>
        </Card>
      ) : !data?.ready || targets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center">
            <CalendarClock className="size-8 text-faint" aria-hidden />
            <p className="mt-3 font-display text-base font-semibold text-content">
              Nothing to make yet
            </p>
            <p className="mt-1 max-w-md text-sm text-muted">
              No confirmed plan covers this window. Production targets appear here once
              Admin confirms a plan.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Targets</CardTitle>
            <CardDescription>
              {data.from} → {data.to} · summed across branches
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Make</TableHead>
                  <TableHead className="text-right">Branches</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {targets.map((row, i) => (
                  <TableRow key={`${row.date}-${row.product_id}-${i}`}>
                    <TableCell className="tabular-nums text-muted">{row.date}</TableCell>
                    <TableCell className="text-content">{row.product_name}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums text-content">
                      {row.target_units}
                    </TableCell>
                    <TableCell
                      className="text-right tabular-nums text-muted"
                      title={`${row.branches} branch${row.branches === 1 ? "" : "es"} contributed`}
                    >
                      {row.branches}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
