"use client";

import { useQuery } from "@tanstack/react-query";
import { LineChart, Loader2 } from "lucide-react";
import { posAdminApi } from "@/lib/api/pos-admin.api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * Planning & forecasting.
 *
 * The backend returns `ready: false` with an empty forecast rather than zeros,
 * specifically so this screen cannot ship a forecast that silently lies. The
 * response SHAPE is final, so this is wired against the real contract today and
 * will start rendering data when Phase 7 lands — with no change here.
 *
 * That is the whole point of building it now: the alternative is discovering at
 * Phase 7 that the screen assumed a different shape.
 */
export default function BranchPlanningPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["branch-planning"],
    queryFn: () => posAdminApi.planning(),
    retry: false,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
          Planning
        </h1>
        <p className="mt-1 text-sm text-muted">
          Demand forecast and suggested orders for this branch.
        </p>
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
            <p className="mt-1 text-sm text-muted">
              Planning reads branch-scoped facts from the POS feed.
            </p>
          </CardContent>
        </Card>
      ) : !data?.ready ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center">
            <LineChart className="size-8 text-faint" aria-hidden />
            <p className="mt-3 font-display text-base font-semibold text-content">
              Forecasting isn&apos;t switched on yet
            </p>
            <p className="mt-1 max-w-sm text-sm text-muted">
              {data?.reason ??
                "This will fill in once forecasting is available. Nothing is missing from your data."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Forecast</CardTitle>
              <CardDescription>Predicted demand per product</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Units</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.forecast.map((row, i) => (
                    <TableRow key={`${row.date}-${row.product_id}-${i}`}>
                      <TableCell className="text-muted">{row.date}</TableCell>
                      <TableCell className="text-content">
                        {row.product_name ?? row.product_id}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-content">
                        {row.predicted_units}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Suggested orders</CardTitle>
              <CardDescription>What to request, based on the forecast</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Suggested</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.suggested_orders.map((row, i) => (
                    <TableRow key={`${row.product_id}-${i}`}>
                      <TableCell className="text-content">
                        {row.product_name ?? row.product_id}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-content">
                        {row.suggested_qty}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
