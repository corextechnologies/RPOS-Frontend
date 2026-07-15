"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { KitchenRequestList } from "@/components/kitchen/requests/KitchenRequestList";
import { KitchenUnassigned } from "@/components/kitchen/KitchenUnassigned";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import {
  KITCHEN_REQUESTS_PAGE_SIZE,
  useKitchenWarehouseRequests,
} from "@/lib/hooks/use-kitchen-requests";
import type {
  KitchenRequestFilters,
  KitchenWarehouseRequestStatus,
} from "@/lib/types/kitchen";
import { isMissingKitchenAssignment } from "@/lib/types/kitchen";

/** Warehouse vocabulary only — these requests never reach IN_PRODUCTION. */
const STATUS_OPTIONS: Array<KitchenWarehouseRequestStatus | "all"> = [
  "all",
  "PENDING",
  "APPROVED",
  "DISPATCHED",
  "RECEIVED",
];

export default function KitchenWarehouseRequestsPage() {
  const { can } = useAuth();
  const [status, setStatus] = useState<KitchenWarehouseRequestStatus | "all">("all");
  const [page, setPage] = useState(1);

  const filters: KitchenRequestFilters = useMemo(
    () => ({ status, page, page_size: KITCHEN_REQUESTS_PAGE_SIZE }),
    [status, page],
  );

  const requests = useKitchenWarehouseRequests(filters);
  const unassigned = isMissingKitchenAssignment(requests.error);

  const total = requests.data?.total ?? 0;
  const pageSize = requests.data?.page_size ?? KITCHEN_REQUESTS_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
            Warehouse requests
          </h1>
          <p className="mt-1 text-sm text-muted">
            Raw stock you have asked a warehouse to send.
          </p>
        </div>
        {!unassigned && can("kitchen-warehouse-requests:create") && (
          <Button asChild>
            <Link href="/kitchen/requests/warehouse/new">
              <Plus className="h-4 w-4" />
              Request stock
            </Link>
          </Button>
        )}
      </div>

      {unassigned ? (
        <KitchenUnassigned />
      ) : (
        <>
          <div className="flex justify-end">
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value as KitchenWarehouseRequestStatus | "all");
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
            emptyTitle="No warehouse requests"
            emptyDescription="Stock you request from a warehouse appears here."
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
