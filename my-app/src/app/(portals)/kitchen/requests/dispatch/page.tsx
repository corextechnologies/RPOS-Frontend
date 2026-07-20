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
  useKitchenDispatchRequests,
} from "@/lib/hooks/use-kitchen-requests";
import type { KitchenRequestFilters, KitchenRequestStatus } from "@/lib/types/kitchen";
import { isMissingKitchenAssignment } from "@/lib/types/kitchen";

/** The statuses a kitchen's own dispatch notification passes through. */
const STATUS_OPTIONS: Array<KitchenRequestStatus | "all"> = [
  "all",
  "PENDING",
  "ALLOCATED",
  "DISPATCHED",
  "RECEIVED",
  "REJECTED",
];

/**
 * The kitchen's own dispatch notifications to Admin — what it offered, and
 * whether Admin has allocated it across branches yet. Raising one happens from
 * the Production screen ("Notify Admin").
 */
export default function KitchenDispatchRequestsPage() {
  const [status, setStatus] = useState<KitchenRequestStatus | "all">("all");
  const [page, setPage] = useState(1);

  const filters: KitchenRequestFilters = useMemo(
    () => ({ status, page, page_size: KITCHEN_REQUESTS_PAGE_SIZE }),
    [status, page],
  );

  const requests = useKitchenDispatchRequests(filters);
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
            emptyTitle="No dispatch notifications"
            emptyDescription="Raise one from Production with “Notify Admin” once you have goods ready to send out."
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
