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
import type { StockRequest } from "@/lib/types/admin";
import { formatDate } from "@/lib/utils";

interface AdminKitchenRequestListProps {
  items?: StockRequest[];
  isLoading: boolean;
  isError: boolean;
  onRetry?: () => void;
  emptyTitle: string;
  emptyDescription: string;
}

function summarizeLines(request: StockRequest): string {
  const [first] = request.line_items;
  if (!first) return "—";
  const extra = request.line_items.length - 1;
  return extra > 0 ? `${first.product_name} +${extra} more` : first.product_name;
}

/**
 * Oversight only: there is no action column, because Admin has no transition to
 * make on a kitchen → warehouse request — those moves belong to the kitchen and
 * the warehouse, and the API answers 403.
 *
 * Rows DO open the detail. They were inert while `GET /admin/requests/{id}`
 * still 404'd on this type; since Phase 4.1 it returns 200, and the detail is
 * read-only on its own terms (the transition map has no entry for this type).
 */
export function AdminKitchenRequestList({
  items,
  isLoading,
  isError,
  onRetry,
  emptyTitle,
  emptyDescription,
}: AdminKitchenRequestListProps) {
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
              <TableHead>Items</TableHead>
              <TableHead>Lines</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Raised</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((request) => (
              <TableRow
                key={request.id}
                className="cursor-pointer"
                onClick={() => router.push(`/admin/requests/${request.id}`)}
              >
                <TableCell>
                  <p className="font-medium text-content">{summarizeLines(request)}</p>
                  {request.notes && (
                    <p className="mt-1 text-sm text-muted">{request.notes}</p>
                  )}
                </TableCell>
                <TableCell className="text-muted">{request.line_items.length}</TableCell>
                <TableCell>
                  <RequestStatusBadge status={request.status} />
                </TableCell>
                <TableCell className="text-muted">
                  {formatDate(request.created_at)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
