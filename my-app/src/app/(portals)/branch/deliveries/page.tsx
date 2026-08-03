"use client";

import { useMemo, useState } from "react";
import { PackageCheck } from "lucide-react";
import { useBranchDeliveries, useReceiveBranchDelivery } from "@/lib/hooks/use-branch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageState } from "@/components/ui/page-state";
import { BranchDateFilter } from "@/components/branch/BranchDateFilter";
import { formatDate } from "@/lib/utils";
import {
  DEFAULT_DATE_FILTER,
  isWithinRange,
  localDateOf,
  resolveDateRange,
  type DateFilterValue,
} from "@/lib/date-range";
import type { BranchDelivery } from "@/lib/types/branch";

/**
 * Group deliveries by the calendar date they were dispatched, newest first.
 * Deliveries are per-product, so one dated card gathers everything that landed
 * that day; each product keeps its own status and receive action.
 */
function groupDeliveriesByDate(
  rows: BranchDelivery[],
): Array<{ key: string; label: string; items: BranchDelivery[] }> {
  const groups: Array<{ key: string; label: string; items: BranchDelivery[] }> = [];
  const indexByKey = new Map<string, number>();
  for (const d of rows) {
    const key = localDateOf(d.created_at);
    let i = indexByKey.get(key);
    if (i === undefined) {
      i = groups.length;
      indexByKey.set(key, i);
      groups.push({ key, label: formatDate(d.created_at), items: [] });
    }
    groups[i].items.push(d);
  }
  return groups;
}

/**
 * Finished goods the kitchen dispatched to this branch. Confirming receipt
 * credits the branch's stock — the branch side of the kitchen → branch hand-off.
 */
export default function BranchDeliveriesPage() {
  const deliveries = useBranchDeliveries();
  const receive = useReceiveBranchDelivery();
  const [dateFilter, setDateFilter] = useState<DateFilterValue>(DEFAULT_DATE_FILTER);

  const inRange = useMemo(() => {
    const range = resolveDateRange(dateFilter);
    return (deliveries.data ?? []).filter((d) => isWithinRange(d.created_at, range));
  }, [deliveries.data, dateFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
            Incoming
          </h1>
          <p className="mt-1 text-sm text-muted">
            Goods dispatched from the kitchen. Confirm receipt to add them to stock.
          </p>
        </div>
        <BranchDateFilter value={dateFilter} onChange={setDateFilter} />
      </div>

      <PageState
        isLoading={deliveries.isLoading}
        isError={!!deliveries.error}
        data={inRange}
        isEmpty={(rows) => rows.length === 0}
        errorTitle="Couldn't load deliveries"
        errorDescription={deliveries.error instanceof Error ? deliveries.error.message : undefined}
        emptyTitle="Nothing incoming"
        emptyDescription="No deliveries in the selected date range. Try a wider window; new dispatches appear here to receive."
      >
        {(rows) => (
          <div className="space-y-4">
            {groupDeliveriesByDate(rows).map((group) => (
              <section
                key={group.key}
                className="overflow-hidden rounded-2xl border border-line bg-surface"
              >
                <header className="flex items-center justify-between gap-3 border-b border-line bg-surface-2 px-4 py-3">
                  <h2 className="font-display text-sm font-semibold tracking-tight text-content">
                    {group.label}
                  </h2>
                  <span className="text-xs text-muted">
                    {group.items.length} item{group.items.length === 1 ? "" : "s"}
                  </span>
                </header>

                <ul className="divide-y divide-line">
                  {group.items.map((d) => {
                    const received = d.status === "RECEIVED";
                    return (
                      <li
                        key={d.id}
                        className="flex flex-wrap items-center justify-between gap-3 p-4"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-content">
                            {d.quantity}× {d.product_name}
                          </p>
                          <p className="text-xs text-muted">From {d.from_label}</p>
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
              </section>
            ))}
          </div>
        )}
      </PageState>
    </div>
  );
}
