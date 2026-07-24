"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CompletedTargetsList } from "@/components/admin/requests/CompletedTargetsList";
import { RequestList } from "@/components/admin/requests/RequestList";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWarehouses } from "@/lib/hooks/use-locations";
import {
  useDistributionRequests,
  useProductRequests,
} from "@/lib/hooks/use-requests";
import { useAcknowledgedProductionTargets } from "@/lib/hooks/use-production-targets";
import type { RequestFilters, RequestStatus } from "@/lib/types/admin";
import { cn } from "@/lib/utils";

type InboxTab = "products" | "Distribution" | "Dispatch";

const STATUS_OPTIONS: Array<RequestStatus | "all"> = [
  "all",
  "PENDING",
  "APPROVED",
  "REJECTED",
  "PARTIALLY_APPROVED",
  "FORWARDED_TO_KITCHEN",
  "DISPATCHED",
  "REPORTED",
  "RESOLVED",
  "IN_PRODUCTION",
  "PRODUCED",
  "ALLOCATED",
  "RECEIVED",
];

export default function AdminRequestsPage() {
  const [tab, setTab] = useState<InboxTab>("products");
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

  const products = useProductRequests(filters);
  // Warehouse POs (WAREHOUSE_TO_ADMIN_PO) — surfaced under the Dispatch tab.
  const warehouseRequests = useDistributionRequests(filters);
  const acknowledgedTargets = useAcknowledgedProductionTargets();
  // Warehouse POs arrive without a `from_label`; resolve the warehouse name.
  const warehouses = useWarehouses();

  // The Distribution tab is production-targets only; the other two list requests.
  const active = tab === "products" ? products : warehouseRequests;

  const total = active.data?.total ?? 0;
  const pageSize = active.data?.page_size ?? 20;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
          Requests
        </h1>
        <p className="mt-1 text-sm text-muted">
          Branch product requests, production target distribution, and warehouse dispatch.
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          <Button
            type="button"
            variant={tab === "products" ? "default" : "outline"}
            className={cn(tab === "products" && "pointer-events-none")}
            onClick={() => {
              setTab("products");
              setPage(1);
            }}
          >
            Product requests
          </Button>
          <Button
            type="button"
            variant={tab === "Distribution" ? "default" : "outline"}
            className={cn(tab === "Distribution" && "pointer-events-none")}
            onClick={() => {
              setTab("Distribution");
              setPage(1);
            }}
          >
            Distribution
          </Button>
          <Button
            type="button"
            variant={tab === "Dispatch" ? "default" : "outline"}
            className={cn(tab === "Dispatch" && "pointer-events-none")}
            onClick={() => {
              setTab("Dispatch");
              setPage(1);
            }}
          >
            Dispatch
          </Button>
          {/* A route rather than a tab: kitchen → warehouse requests are oversight
              only, so they do not belong on a screen about pending Admin action. */}
          <Button asChild variant="ghost">
            <Link href="/admin/requests/kitchen">Kitchen oversight</Link>
          </Button>
        </div>

        {tab !== "Distribution" && (
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
                  {opt === "all" ? "All statuses" : opt.replaceAll("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {tab === "Distribution" ? (
        <div className="space-y-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-content">
              Production targets
            </h2>
            <p className="text-sm text-muted">
              Targets acknowledged by the kitchen — track progress and allocate once complete.
            </p>
          </div>
          <CompletedTargetsList
            targets={acknowledgedTargets.data}
            isLoading={acknowledgedTargets.isLoading}
            isError={acknowledgedTargets.isError}
            onRetry={() => acknowledgedTargets.refetch()}
          />
        </div>
      ) : (
        <>
          <RequestList
            items={active.data?.items}
            isLoading={active.isLoading}
            isError={active.isError}
            onRetry={() => active.refetch()}
            warehouses={warehouses.data}
            emptyTitle={
              tab === "products" ? "No product requests" : "No warehouse requests"
            }
            emptyDescription={
              tab === "products"
                ? "Branch product requests will appear here."
                : "Warehouse dispatch requests will appear here."
            }
          />

          {total > pageSize && (
            <div className="flex items-center justify-end gap-3">
              <p className="text-sm text-muted">
                Page {page} of {totalPages}
              </p>
              <Button
                type="button"
                variant="outline"
                disabled={page <= 1 || active.isFetching}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={page >= totalPages || active.isFetching}
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
