"use client";

import { useMemo, useState } from "react";
import { AdminKitchenRequestList } from "@/components/admin/requests/AdminKitchenRequestList";
import { formatStatus } from "@/components/admin/requests/RequestStatusBadge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAdminKitchenRequests } from "@/lib/hooks/use-requests";
import type { RequestFilters, RequestStatus } from "@/lib/types/admin";

/**
 * The whole KITCHEN_TO_WAREHOUSE vocabulary — narrower than Admin's own inbox.
 * PO-only statuses (REPORTED / RESOLVED) and branch-only ones never reach this
 * type, so offering them would only ever return an empty page.
 *
 * DISPATCHED is ambiguous across request types: here it means the warehouse
 * shipped to the kitchen, whereas on a PO it means Admin shipped to the
 * warehouse. Same label, different sender.
 */
const STATUS_OPTIONS: Array<RequestStatus | "all"> = [
  "all",
  "PENDING",
  "APPROVED",
  "DISPATCHED",
  "RECEIVED",
];

export default function AdminKitchenRequestsPage() {
  const [status, setStatus] = useState<RequestStatus | "all">("all");
  const [page, setPage] = useState(1);

  const filters: RequestFilters = useMemo(
    () => ({
      status,
      page,
      page_size: 20,
    }),
    [status, page],
  );

  const requests = useAdminKitchenRequests(filters);

  const total = requests.data?.total ?? 0;
  const pageSize = requests.data?.page_size ?? 20;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
          Kitchen requests
        </h1>
        <p className="mt-1 text-sm text-muted">
          Read-only oversight of kitchen requests to the warehouse. Admin does not action
          these — the kitchen raises them and the warehouse fulfils them.
        </p>
      </div>

      <div className="flex justify-end">
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v as RequestStatus | "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="sm:w-56">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt === "all" ? "All statuses" : formatStatus(opt)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <AdminKitchenRequestList
        items={requests.data?.items}
        isLoading={requests.isLoading}
        isError={requests.isError}
        onRetry={() => requests.refetch()}
        emptyTitle="No kitchen requests"
        emptyDescription="Requests raised by kitchens to the warehouse will appear here."
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
    </div>
  );
}
