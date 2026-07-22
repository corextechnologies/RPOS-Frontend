"use client";

import { useMemo, useState } from "react";
import { Loader2, TriangleAlert } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  daysAgo,
  useInventorySnapshot,
  useSalesHistory,
  useWasteHistory,
  windowDays,
  windowTooLarge,
  ymd,
} from "@/lib/hooks/use-pos-feed";
import { FEED_MAX_DAYS } from "@/lib/api/pos-admin.api";
import { formatMinor, sumMinor } from "@/lib/money";
import { stockUnitLabel } from "@/lib/stock-unit";
import { posErrorMessage } from "@/lib/api/errors";

/**
 * Daily sales — the branch's own numbers, from the Phase 7 feed.
 *
 * The feed is branch-scoped raw facts, built for Phase 7 to consume. It is
 * surfaced to humans here because a branch asking "what did we sell yesterday"
 * shouldn't have to wait for a forecasting engine to exist.
 *
 * Money here is **minor units** (`revenue_minor`) — this is a POS-surface feed,
 * unlike the rest of the branch portal which speaks decimal strings. Formatting
 * goes through `formatMinor` and nothing on this page sums across the two.
 */
export default function BranchSalesPage() {
  const [start, setStart] = useState(daysAgo(29));
  const [end, setEnd] = useState(ymd(new Date()));

  const tooLarge = windowTooLarge(start, end);
  const invalid = windowDays(start, end) <= 0;
  const ok = !tooLarge && !invalid;

  const sales = useSalesHistory({ start, end }, ok);
  const waste = useWasteHistory({ start, end }, ok);
  const snapshot = useInventorySnapshot();

  const totals = useMemo(() => {
    const rows = sales.data ?? [];
    return {
      units: rows.reduce((n, r) => n + r.units, 0),
      // Integer arithmetic — `sumMinor` throws rather than silently truncate if
      // a float ever leaks into this feed.
      revenueMinor: rows.length ? sumMinor(rows.map((r) => r.revenue_minor)) : 0,
      // The feed's currency isn't in its payload; the till's pack is not in
      // scope on a portal screen, so PKR is the documented default. If a branch
      // bills in AED this needs the currency on the feed rows — noted for the
      // backend rather than guessed at per-row.
      currency: "PKR",
    };
  }, [sales.data]);

  const byProduct = useMemo(() => {
    const acc = new Map<number, { name: string; units: number; revenueMinor: number }>();
    for (const row of sales.data ?? []) {
      const key = row.product_id;
      const prev = acc.get(key) ?? {
        name: row.product_name ?? `#${row.product_id}`,
        units: 0,
        revenueMinor: 0,
      };
      acc.set(key, {
        name: prev.name,
        units: prev.units + row.units,
        revenueMinor: prev.revenueMinor + row.revenue_minor,
      });
    }
    return [...acc.values()].sort((a, b) => b.revenueMinor - a.revenueMinor);
  }, [sales.data]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-content">Sales</h1>
        <p className="mt-1 text-sm text-muted">What this branch sold, and what it wasted.</p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs" htmlFor="start">
            From
          </Label>
          <Input
            id="start"
            type="date"
            className="h-10 w-44"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs" htmlFor="end">
            To
          </Label>
          <Input
            id="end"
            type="date"
            className="h-10 w-44"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </div>
      </div>

      {/* Checked before asking: the server caps the window at 400 days and
          would 409 `window_too_large`. A round trip whose only outcome is an
          error we could have predicted isn't worth making. */}
      {tooLarge && (
        <p className="flex items-center gap-2 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
          <TriangleAlert className="size-4 shrink-0" aria-hidden />
          That range is {windowDays(start, end)} days. The most that can be fetched at once is{" "}
          {FEED_MAX_DAYS}.
        </p>
      )}

      {invalid && !tooLarge && (
        <p className="rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm text-muted">
          Pick an end date on or after the start date.
        </p>
      )}

      {ok && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardContent className="py-5">
                <p className="font-display text-2xl font-semibold tabular-nums text-content">
                  {totals.units}
                </p>
                <p className="text-sm text-muted">Units sold</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-5">
                <p className="font-display text-2xl font-semibold tabular-nums text-content">
                  {formatMinor(totals.revenueMinor, totals.currency)}
                </p>
                <p className="text-sm text-muted">Revenue</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">By product</CardTitle>
              <CardDescription>Best sellers first</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {sales.isLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="size-5 animate-spin text-brand" aria-label="Loading" />
                </div>
              ) : sales.error ? (
                <p className="p-6 text-center text-sm text-danger">
                  {posErrorMessage(sales.error)}
                </p>
              ) : byProduct.length === 0 ? (
                <p className="p-10 text-center text-sm text-muted">
                  Nothing sold in this range.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Units</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {byProduct.map((row) => (
                      <TableRow key={row.name}>
                        <TableCell className="text-content">{row.name}</TableCell>
                        <TableCell className="text-right tabular-nums text-muted">
                          {row.units}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-content">
                          {formatMinor(row.revenueMinor, totals.currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Waste</CardTitle>
                <CardDescription>Logged in this range</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {waste.isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="size-4 animate-spin text-brand" aria-label="Loading" />
                  </div>
                ) : !waste.data?.length ? (
                  <p className="p-8 text-center text-sm text-muted">No waste logged.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {waste.data.map((row, i) => (
                        <TableRow key={`${row.date}-${row.product_id}-${i}`}>
                          <TableCell className="text-muted">{row.date}</TableCell>
                          <TableCell className="text-content">
                            {row.product_name ?? `#${row.product_id}`}
                            {row.reason_code && (
                              <span className="ml-1.5 text-xs text-faint">
                                {row.reason_code.toLowerCase().replace(/_/g, " ")}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-muted">
                            {row.quantity}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Stock now</CardTitle>
                <CardDescription>A snapshot, not a range</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {snapshot.isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="size-4 animate-spin text-brand" aria-label="Loading" />
                  </div>
                ) : !snapshot.data?.length ? (
                  <p className="p-8 text-center text-sm text-muted">No stock reported.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">On hand</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {snapshot.data.map((row) => (
                        <TableRow key={row.product_id}>
                          <TableCell className="text-content">
                            {row.product_name ?? `#${row.product_id}`}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-muted">
                            {row.on_hand}
                            {stockUnitLabel(row.stock_unit) && (
                              <span className="ml-1 text-xs text-faint">
                                {stockUnitLabel(row.stock_unit)}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
