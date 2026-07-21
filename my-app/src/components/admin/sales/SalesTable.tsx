"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { SalesRecord } from "@/lib/types/admin";
import { formatPlanAmount } from "@/lib/types/super-admin";
import { formatDate } from "@/lib/utils";

interface SalesTableProps {
  items?: SalesRecord[];
  isLoading: boolean;
  isError: boolean;
  onRetry?: () => void;
  branchLabel: (sale: SalesRecord) => string;
}

export function SalesTable({
  items,
  isLoading,
  isError,
  onRetry,
  branchLabel,
}: SalesTableProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="space-y-3 p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="p-0">
          <ErrorState description="Failed to load sales." onRetry={onRetry} />
        </CardContent>
      </Card>
    );
  }

  if (!items || items.length === 0) {
    return (
      <Card>
        <CardContent className="p-0">
          <EmptyState
            title="No sales recorded yet"
            description="Record your first sale to start tracking revenue."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Note</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((sale) => (
              <TableRow key={sale.id}>
                <TableCell className="text-muted">{formatDate(sale.occurred_at)}</TableCell>
                <TableCell className="text-muted">{branchLabel(sale)}</TableCell>
                <TableCell className="text-right font-medium text-content">
                  {formatPlanAmount(sale.amount)}
                </TableCell>
                <TableCell className="text-muted">{sale.note || "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
