"use client";

import { useRouter } from "next/navigation";
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
import { RequestStatusBadge } from "@/components/admin/requests/RequestStatusBadge";
import { resolveRequestFromLabel } from "@/lib/requests";
import type { StockRequest, Warehouse } from "@/lib/types/admin";
import { formatDate } from "@/lib/utils";

interface RequestListProps {
  items?: StockRequest[];
  isLoading: boolean;
  isError: boolean;
  onRetry?: () => void;
  emptyTitle: string;
  emptyDescription: string;
  /** Used to resolve the origin name when a PO has no `from_label`. */
  warehouses?: Warehouse[];
}

export function RequestList({
  items,
  isLoading,
  isError,
  onRetry,
  emptyTitle,
  emptyDescription,
  warehouses,
}: RequestListProps) {
  const router = useRouter();

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
          <ErrorState description="Failed to load requests." onRetry={onRetry} />
        </CardContent>
      </Card>
    );
  }

  if (!items || items.length === 0) {
    return (
      <Card>
        <CardContent className="p-0">
          <EmptyState title={emptyTitle} description={emptyDescription} />
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
              <TableHead>From</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((req) => (
              <TableRow
                key={req.id}
                className="cursor-pointer"
                onClick={() => router.push(`/admin/requests/${req.id}`)}
              >
                <TableCell>
                  <p className="font-medium text-content">
                    {resolveRequestFromLabel(req, warehouses) || "—"}
                  </p>
                  <p className="text-xs text-muted">{req.line_items.length} line item(s)</p>
                </TableCell>
                <TableCell>
                  <RequestStatusBadge status={req.status} />
                </TableCell>
                <TableCell className="max-w-[240px] truncate text-muted">
                  {req.notes || "—"}
                </TableCell>
                <TableCell className="text-muted">{formatDate(req.created_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
