"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useHotProducts } from "@/lib/hooks/use-forecast";
import { formatMinor } from "@/lib/money";

/**
 * Hot products (§6 hot-products). Ranked by UNITS, not revenue — a combo's
 * money sits on its header line, so revenue understates every dish inside a
 * deal. Revenue is shown for context but never as the ranking basis.
 */
export function HotProductsCard({
  branchId,
  days = 30,
  limit = 10,
}: {
  branchId?: string | number;
  days?: number;
  limit?: number;
}) {
  const { data, isLoading } = useHotProducts({
    branch_id: branchId || undefined,
    days,
    limit,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Hot products</CardTitle>
        <CardDescription>Most sold over the last {days} days, by units.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <p className="px-6 py-10 text-center text-sm text-muted">Loading…</p>
        ) : !data || data.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-muted">No sales in this window.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Units</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.product_id}>
                  <TableCell className="tabular-nums text-muted">{row.rank}</TableCell>
                  <TableCell className="text-content">{row.product_name}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums text-content">
                    {row.units}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted">
                    {formatMinor(row.revenue_minor)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
