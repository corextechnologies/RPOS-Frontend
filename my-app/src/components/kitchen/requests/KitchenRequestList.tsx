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
import type { KitchenRequest } from "@/lib/types/kitchen";
import { formatDate } from "@/lib/utils";
import { KitchenStatusBadge } from "./KitchenStatusBadge";

interface KitchenRequestListProps {
  items?: KitchenRequest[];
  isLoading: boolean;
  isError: boolean;
  onRetry?: () => void;
  emptyTitle: string;
  emptyDescription: string;
  /**
   * Where a row links. Dispatch requests have no by-id endpoint, so they route
   * to their own detail (which reads from the list) rather than the shared one.
   */
  basePath?: string;
}

function summarizeLines(request: KitchenRequest): string {
  const [first] = request.line_items;
  if (!first) return "-";
  const extra = request.line_items.length - 1;
  return extra > 0 ? `${first.product_name} +${extra} more` : first.product_name;
}

export function KitchenRequestList({
  items,
  isLoading,
  isError,
  onRetry,
  emptyTitle,
  emptyDescription,
  basePath = "/kitchen/requests",
}: KitchenRequestListProps) {
  const router = useRouter();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="space-y-3 p-4">
          {Array.from({ length: 3 }).map((_, i) => (
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
                onClick={() => router.push(`${basePath}/${request.id}`)}
              >
                <TableCell>
                  <p className="font-medium text-content">{summarizeLines(request)}</p>
                </TableCell>
                <TableCell className="text-muted">
                  {request.line_items.length}
                </TableCell>
                <TableCell>
                  <KitchenStatusBadge status={request.status} />
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
