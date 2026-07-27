"use client";

import { useMemo, useState } from "react";
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
import {
  KITCHEN_REQUESTS_PAGE_SIZE,
  useKitchenBranchRequests,
} from "@/lib/hooks/use-kitchen-requests";
import type {
  KitchenBranchRequestStatus,
  KitchenRequestFilters,
} from "@/lib/types/kitchen";
import { isMissingKitchenAssignment } from "@/lib/types/kitchen";

/**
 * Only the statuses a forwarded request can actually be in. PENDING and APPROVED
 * are omitted: a request in those states has not reached this kitchen yet.
 */
const STATUS_OPTIONS: Array<KitchenBranchRequestStatus | "all"> = [
  "all",
  "FORWARDED_TO_KITCHEN",
  "IN_PRODUCTION",
  "PRODUCED",
  "DISPATCHED",
  "RECEIVED",
];

export default function KitchenBranchRequestsPage() {
  const [status, setStatus] = useState<KitchenBranchRequestStatus | "all">("all");
  const [page, setPage] = useState(1);

  const filters: KitchenRequestFilters = useMemo(
    () => ({ status, page, page_size: KITCHEN_REQUESTS_PAGE_SIZE }),
    [status, page],
  );

  const requests = useKitchenBranchRequests(filters);
  const unassigned = isMissingKitchenAssignment(requests.error);

  const total = requests.data?.total ?? 0;
  const pageSize = requests.data?.page_size ?? KITCHEN_REQUESTS_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
          Branch requests
        </h1>
        <p className="mt-1 text-sm text-muted">
          Production work Admin forwarded to your kitchen.
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
                setStatus(value as KitchenBranchRequestStatus | "all");
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
            emptyTitle="Nothing to produce"
            emptyDescription="Branch requests appear here once Admin forwards them to your kitchen. There is nothing to watch for before that."
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
