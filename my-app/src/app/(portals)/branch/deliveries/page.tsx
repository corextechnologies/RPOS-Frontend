"use client";

import { PackageCheck } from "lucide-react";
import { useBranchDeliveries, useReceiveBranchDelivery } from "@/lib/hooks/use-branch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageState } from "@/components/ui/page-state";
import { formatDate } from "@/lib/utils";

/**
 * Finished goods the kitchen dispatched to this branch. Confirming receipt
 * credits the branch's stock — the branch side of the kitchen → branch hand-off.
 */
export default function BranchDeliveriesPage() {
  const deliveries = useBranchDeliveries();
  const receive = useReceiveBranchDelivery();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
          Incoming
        </h1>
        <p className="mt-1 text-sm text-muted">
          Goods dispatched from the kitchen. Confirm receipt to add them to stock.
        </p>
      </div>

      <PageState
        isLoading={deliveries.isLoading}
        isError={!!deliveries.error}
        data={deliveries.data}
        isEmpty={(rows) => rows.length === 0}
        errorTitle="Couldn't load deliveries"
        errorDescription={deliveries.error instanceof Error ? deliveries.error.message : undefined}
        emptyTitle="Nothing incoming"
        emptyDescription="When the kitchen dispatches goods allocated to this branch, they appear here to receive."
      >
        {(rows) => (
          <ul className="space-y-3">
            {rows.map((d) => {
              const received = d.status === "RECEIVED";
              return (
                <li
                  key={d.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-content">
                      {d.quantity}× {d.product_name}
                    </p>
                    <p className="text-xs text-muted">
                      From {d.from_label} · {formatDate(d.created_at)}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge variant={received ? "success" : "warning"}>
                      {received ? "Received" : "Dispatched"}
                    </Badge>
                    {!received && (
                      <Button
                        size="sm"
                        disabled={receive.isPending}
                        onClick={() => receive.mutate(d.id)}
                      >
                        <PackageCheck className="mr-1.5 size-4" aria-hidden />
                        Mark received
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </PageState>
    </div>
  );
}
