"use client";

import { useMemo, useState } from "react";
import { WarehouseRequestList } from "@/components/warehouse/requests/WarehouseRequestList";
import { WarehouseUnassigned } from "@/components/warehouse/WarehouseUnassigned";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useWarehouseKitchenRequests,
  WAREHOUSE_REQUESTS_PAGE_SIZE,
} from "@/lib/hooks/use-warehouse-requests";
import type {
  KitchenRequestStatus,
  WarehouseRequestFilters,
} from "@/lib/types/warehouse";
import { isMissingWarehouseAssignment } from "@/lib/types/warehouse";

/** Kitchen vocabulary only — these requests never reach IN_QUEUE. */
const STATUS_OPTIONS: Array<KitchenRequestStatus | "all"> = [
  "all",
  "PENDING",
  "APPROVED",
  "DISPATCHED",
  "RECEIVED",
];

export default function WarehouseKitchenRequestsPage() {
  const [status, setStatus] = useState<KitchenRequestStatus | "all">("all");
  const [page, setPage] = useState(1);

  const filters: WarehouseRequestFilters = useMemo(
    () => ({ status, page, page_size: WAREHOUSE_REQUESTS_PAGE_SIZE }),
    [status, page],
  );

  const requests = useWarehouseKitchenRequests(filters);
  const unassigned = isMissingWarehouseAssignment(requests.error);

  const total = requests.data?.total ?? 0;
  const pageSize = requests.data?.page_size ?? WAREHOUSE_REQUESTS_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
          Kitchen requests
        </h1>
        <p className="mt-1 text-sm text-muted">
          Stock the kitchen has asked your warehouse to release.
        </p>
      </div>

      {unassigned ? (
        <WarehouseUnassigned />
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

          <WarehouseRequestList
            items={requests.data?.items}
            isLoading={requests.isLoading}
            isError={requests.isError}
            onRetry={() => requests.refetch()}
            emptyTitle="No kitchen requests"
            emptyDescription="Requests from the kitchen will appear here."
          />

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
