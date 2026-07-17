"use client";

import { Loader2, PackageOpen } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Money } from "./Money";
import { useParkedOrders } from "@/lib/hooks/use-pos-orders";
import { relativeTime } from "@/lib/utils";
import type { PosOrder } from "@/lib/types/pos";

/**
 * Recall. The other half of park.
 *
 * A parked order is a real server-side order in PARKED state, so this list is
 * shared across every terminal in the branch — park at till 1, recall at till 2.
 * That is a consequence of parking server-side rather than in local state, and
 * it is the right one: a customer who steps aside at one till and comes back to
 * another should not have to re-order.
 */
export function ParkedOrdersSheet({
  open,
  onOpenChange,
  onRecall,
  busy,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRecall: (order: PosOrder) => void;
  busy?: boolean;
}) {
  const { parked, isLoading } = useParkedOrders();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Parked orders</DialogTitle>
          <DialogDescription>Picked up from any till in this branch.</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="size-5 animate-spin text-brand" aria-label="Loading" />
          </div>
        ) : parked.length === 0 ? (
          <div className="py-10 text-center">
            <PackageOpen className="mx-auto size-7 text-faint" aria-hidden />
            <p className="mt-2 text-sm text-muted">Nothing parked.</p>
          </div>
        ) : (
          <ul className="divide-y divide-line rounded-xl border border-line">
            {parked.map((order) => (
              <li key={order.id} className="flex items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-xs text-content">{order.order_no}</p>
                  <p className="text-xs text-muted">
                    {order.lines.filter((l) => l.parent_line_id === null).length} item(s) ·{" "}
                    {relativeTime(order.created_at)}
                  </p>
                </div>
                <Money minor={order.total_minor} className="text-sm text-content" />
                <Button size="sm" disabled={busy} onClick={() => onRecall(order)}>
                  Recall
                </Button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
