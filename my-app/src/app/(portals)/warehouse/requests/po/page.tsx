"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
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
import { useAuth } from "@/lib/auth";
import {
  useWarehousePos,
  WAREHOUSE_REQUESTS_PAGE_SIZE,
} from "@/lib/hooks/use-warehouse-requests";
import type {
  PurchaseOrderStatus,
  WarehouseRequestFilters,
} from "@/lib/types/warehouse";
import { isMissingWarehouseAssignment } from "@/lib/types/warehouse";

/** PO vocabulary only — a PO never reaches DISPATCHED. */
const STATUS_OPTIONS: Array<PurchaseOrderStatus | "all"> = [
  "all",
  "PENDING",
  "APPROVED",
  "PARTIALLY_APPROVED",
  "IN_QUEUE",
  "RECEIVED",
];

export default function WarehousePurchaseOrdersPage() {
  const { can } = useAuth();
  const [status, setStatus] = useState<PurchaseOrderStatus | "all">("all");
  const [page, setPage] = useState(1);

  const filters: WarehouseRequestFilters = useMemo(
    () => ({ status, page, page_size: WAREHOUSE_REQUESTS_PAGE_SIZE }),
    [status, page],
  );

  const pos = useWarehousePos(filters);
  const unassigned = isMissingWarehouseAssignment(pos.error);

  const total = pos.data?.total ?? 0;
  const pageSize = pos.data?.page_size ?? WAREHOUSE_REQUESTS_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
            Purchase orders
          </h1>
          <p className="mt-1 text-sm text-muted">
            Stock you have requested from Admin.
          </p>
        </div>
        {!unassigned && can("po:create") && (
          <Button asChild>
            <Link href="/warehouse/requests/po/new">
              <Plus className="h-4 w-4" />
              New purchase order
            </Link>
          </Button>
        )}
      </div>

      {unassigned ? (
        <WarehouseUnassigned />
      ) : (
        <>
          <div className="flex justify-end">
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value as PurchaseOrderStatus | "all");
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
            items={pos.data?.items}
            isLoading={pos.isLoading}
            isError={pos.isError}
            onRetry={() => pos.refetch()}
            emptyTitle="No purchase orders"
            emptyDescription="Purchase orders you raise to Admin will appear here."
          />

          {total > pageSize && (
            <div className="flex items-center justify-end gap-3">
              <p className="text-sm text-muted">
                Page {page} of {totalPages}
              </p>
              <Button
                type="button"
                variant="outline"
                disabled={page <= 1 || pos.isFetching}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={page >= totalPages || pos.isFetching}
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
