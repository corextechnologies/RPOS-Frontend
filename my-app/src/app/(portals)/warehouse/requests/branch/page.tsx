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
  useWarehouseBranchRequests,
  WAREHOUSE_REQUESTS_PAGE_SIZE,
} from "@/lib/hooks/use-warehouse-requests";
import type {
  KitchenRequestStatus,
  WarehouseRequestFilters,
} from "@/lib/types/warehouse";
import { isMissingWarehouseAssignment } from "@/lib/types/warehouse";

/**
 * A kitchen-off branch's raw-material requests, fulfilled by this warehouse.
 * Same lifecycle as a kitchen request: PENDING → APPROVED/PARTIALLY_APPROVED →
 * DISPATCHED, then the branch confirms RECEIVED on its side.
 */
const STATUS_OPTIONS: Array<KitchenRequestStatus | "all"> = [
  "all",
  "PENDING",
  "APPROVED",
  "PARTIALLY_APPROVED",
  "DISPATCHED",
  "RECEIVED",
];

export default function WarehouseBranchRequestsPage() {
  const [status, setStatus] = useState<KitchenRequestStatus | "all">("all");
  const [page, setPage] = useState(1);

  const filters: WarehouseRequestFilters = useMemo(
    () => ({ status, page, page_size: WAREHOUSE_REQUESTS_PAGE_SIZE }),
    [status, page],
  );

  const requests = useWarehouseBranchRequests(filters);
  const unassigned = isMissingWarehouseAssignment(requests.error);

  const total = requests.data?.total ?? 0;
  const pageSize = requests.data?.page_size ?? WAREHOUSE_REQUESTS_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
          Branch requests
        </h1>
        <p className="mt-1 text-sm text-muted">
          Raw materials a branch has asked your warehouse to release.
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
            emptyTitle="No branch requests"
            emptyDescription="Raw-material requests from branches will appear here."
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
