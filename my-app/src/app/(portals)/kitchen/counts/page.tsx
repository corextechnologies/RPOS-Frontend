"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { CountVariance } from "@/components/kitchen/counts/CountVariance";
import { KitchenNoAccess } from "@/components/kitchen/KitchenNoAccess";
import { KitchenUnassigned } from "@/components/kitchen/KitchenUnassigned";
import { Button } from "@/components/ui/button";
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
import { useAuth } from "@/lib/auth";
import {
  KITCHEN_COUNTS_PAGE_SIZE,
  useKitchenCounts,
} from "@/lib/hooks/use-kitchen-counts";
import { isMissingKitchenAssignment } from "@/lib/types/kitchen";
import { formatDate } from "@/lib/utils";

export default function KitchenCountsPage() {
  const { can } = useAuth();
  const [page, setPage] = useState(1);
  // Counts are manager-only to read as well as submit, so a sub-chef must not
  // fire the query at all — it would only 403.
  const allowed = can("kitchen-counts:read");
  const counts = useKitchenCounts(page, allowed);

  const unassigned = isMissingKitchenAssignment(counts.error);
  const total = counts.data?.total ?? 0;
  const pageSize = counts.data?.page_size ?? KITCHEN_COUNTS_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
            Product counts
          </h1>
          <p className="mt-1 text-sm text-muted">
            Counts you have submitted, newest first. Each one corrects on-hand
            stock to the counted numbers.
          </p>
        </div>
        {!unassigned && can("kitchen-counts:create") && (
          <Button asChild>
            <Link href="/kitchen/counts/new">
              <Plus className="h-4 w-4" />
              New count
            </Link>
          </Button>
        )}
      </div>

      {!allowed ? (
        <KitchenNoAccess />
      ) : unassigned ? (
        <KitchenUnassigned />
      ) : counts.isPending ? (
        <Card>
          <CardContent className="space-y-3 p-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : counts.isError ? (
        <Card>
          <CardContent className="p-0">
            <ErrorState
              description="Failed to load counts."
              onRetry={() => counts.refetch()}
            />
          </CardContent>
        </Card>
      ) : (counts.data?.items.length ?? 0) === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              title="No counts yet"
              description="Submit a count to reconcile what is physically on the shelf against system stock."
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-4">
            {counts.data?.items.map((count) => {
              const differed = count.lines.filter((l) => l.variance !== 0).length;
              return (
                <Card key={count.id}>
                  <CardContent className="space-y-4 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-content">
                          {formatDate(count.created_at)}
                        </p>
                        <p className="text-sm text-muted">
                          {differed === 0
                            ? `${count.lines.length} ${count.lines.length === 1 ? "product" : "products"} counted, all matching`
                            : `${differed} of ${count.lines.length} differed from system stock`}
                        </p>
                        {count.notes && (
                          <p className="mt-1 text-sm text-muted">{count.notes}</p>
                        )}
                      </div>
                    </div>

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Batch</TableHead>
                          <TableHead className="text-right">System</TableHead>
                          <TableHead className="text-right">Counted</TableHead>
                          <TableHead className="text-right">Variance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {count.lines.map((line) => (
                          <TableRow key={line.id}>
                            <TableCell className="font-medium text-content">
                              {line.product_name}
                            </TableCell>
                            <TableCell className="text-muted">
                              {line.batch_code || "No batch"}
                            </TableCell>
                            <TableCell className="text-right text-muted">
                              {line.system_quantity}
                            </TableCell>
                            <TableCell className="text-right text-content">
                              {line.counted_quantity}
                            </TableCell>
                            <TableCell className="text-right">
                              <CountVariance value={line.variance} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {total > pageSize && (
            <div className="flex items-center justify-end gap-3">
              <p className="text-sm text-muted">
                Page {page} of {totalPages}
              </p>
              <Button
                type="button"
                variant="outline"
                disabled={page <= 1 || counts.isFetching}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={page >= totalPages || counts.isFetching}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
