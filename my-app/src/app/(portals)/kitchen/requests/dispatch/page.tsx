"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { KitchenRequestList } from "@/components/kitchen/requests/KitchenRequestList";
import { KitchenUnassigned } from "@/components/kitchen/KitchenUnassigned";
import { ProductionTargetStatusBadge } from "@/components/production-targets/ProductionTargetStatusBadge";
import { Button } from "@/components/ui/button";
import { PageState } from "@/components/ui/page-state";
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
import {
  KITCHEN_REQUESTS_PAGE_SIZE,
  useKitchenDispatchRequests,
} from "@/lib/hooks/use-kitchen-requests";
import { useCompletedKitchenProductionTargets } from "@/lib/hooks/use-production-targets";
import type { KitchenRequestFilters, KitchenRequestStatus } from "@/lib/types/kitchen";
import { isMissingKitchenAssignment } from "@/lib/types/kitchen";

const STATUS_OPTIONS: Array<KitchenRequestStatus | "all"> = [
  "all",
  "PENDING",
  "ALLOCATED",
  "DISPATCHED",
  "RECEIVED",
  "REJECTED",
];

export default function KitchenDispatchRequestsPage() {
  const router = useRouter();
  const [status, setStatus] = useState<KitchenRequestStatus | "all">("all");
  const [page, setPage] = useState(1);

  const filters: KitchenRequestFilters = useMemo(
    () => ({ status, page, page_size: KITCHEN_REQUESTS_PAGE_SIZE }),
    [status, page],
  );

  const requests = useKitchenDispatchRequests(filters);
  const completedTargets = useCompletedKitchenProductionTargets();
  const unassigned = isMissingKitchenAssignment(requests.error);

  const total = requests.data?.total ?? 0;
  const pageSize = requests.data?.page_size ?? KITCHEN_REQUESTS_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
          Dispatch to Admin
        </h1>
        <p className="mt-1 text-sm text-muted">
          Produced goods you told Admin are ready, and how they were allocated.
        </p>
      </div>

      {unassigned ? (
        <KitchenUnassigned />
      ) : (
        <>
          <div className="flex justify-end">
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value as KitchenRequestStatus | "all");
                setPage(1);
              }}
            >
              <SelectTrigger className="sm:w-56">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option === "all" ? "All statuses" : option.replaceAll("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <KitchenRequestList
            items={requests.data?.items}
            isLoading={requests.isLoading}
            isError={requests.isError}
            onRetry={() => requests.refetch()}
            basePath="/kitchen/requests/dispatch"
            emptyTitle="No dispatch notifications"
            emptyDescription="Raise one from Production once you have goods ready to send out."
          />

          <div className="space-y-4">
            <div>
              <h2 className="font-display text-lg font-semibold text-content">
                Completed production targets
              </h2>
              <p className="text-sm text-muted">
                Targets you completed &mdash; waiting on Admin to allocate, then dispatch
                to branches.
              </p>
            </div>
            <PageState
              isLoading={completedTargets.isLoading}
              isError={completedTargets.isError}
              data={completedTargets.data}
              isEmpty={(rows) => rows.length === 0}
              errorTitle="Couldn't load targets"
              onRetry={() => completedTargets.refetch()}
              emptyTitle="No completed targets"
              emptyDescription="Targets move here once you complete production and notify Admin."
            >
              {(rows) => (
                <div className="rounded-2xl border border-line bg-surface">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Products</TableHead>
                        <TableHead>Note</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((t) => (
                        <TableRow
                          key={t.id}
                          className="cursor-pointer"
                          onClick={() =>
                            router.push(`/kitchen/requests/dispatch/target/${t.id}`)
                          }
                        >
                          <TableCell className="font-medium tabular-nums text-content">
                            {t.target_date}
                          </TableCell>
                          <TableCell>
                            <ProductionTargetStatusBadge status={t.status} />
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-muted">
                            {t.lines.length}
                          </TableCell>
                          <TableCell className="max-w-xs truncate text-muted">
                            {t.note ?? "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </PageState>
          </div>

          {total > pageSize && (
            <div className="flex items-center justify-end gap-3">
              <p className="text-sm text-muted">
                Page {page} of {totalPages}
              </p>
              <Button
                type="button"
                variant="outline"
                disabled={page <= 1 || requests.isFetching}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={page >= totalPages || requests.isFetching}
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
