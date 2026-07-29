"use client";

import { Car, Loader2, Printer } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useKot } from "@/lib/hooks/use-pos-orders";
import { posErrorMessage } from "@/lib/api/errors";

/**
 * The kitchen ticket.
 *
 * Carries **no prices** — the guide's line is "kitchen makes food, not money" —
 * and there is deliberately no money anywhere in this component, not even a
 * subtotal. It does carry the vehicle details, which is the one thing a runner
 * needs to match a bag of food to a car.
 *
 * Nothing here is derived: it renders `GET /pos/orders/{id}/kot` as the server
 * composed it, so a reprint weeks later is the ticket that was printed then,
 * not a re-derivation from a menu that has since changed.
 */
export function KotDialog({
  orderId,
  open,
  onOpenChange,
}: {
  orderId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: kot, isLoading, error } = useKot(open ? orderId : null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>Kitchen ticket</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="size-5 animate-spin text-brand" aria-label="Loading ticket" />
          </div>
        ) : error ? (
          <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            {posErrorMessage(error)}
          </p>
        ) : kot ? (
          <div className="print-area space-y-3 rounded-xl border border-line p-4 font-mono">
            <div className="text-center">
              <p className="text-base font-semibold text-content">{kot.order_no}</p>
              <p className="text-xs uppercase text-muted">
                {/* Both are display-only labels; the server can omit either, and
                    a missing one must not take the whole ticket down. Drop the
                    separator cleanly when only one is present. */}
                {[kot.order_type?.replace(/_/g, " "), kot.channel?.toLowerCase()]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>

            {(kot.vehicle_plate || kot.bay_no) && (
              <div className="flex items-center justify-center gap-2 rounded-lg bg-surface-2 py-2 text-sm">
                <Car className="size-4 text-muted" aria-hidden />
                <span className="font-semibold text-content">{kot.vehicle_plate}</span>
                {kot.vehicle_colour && <span className="text-muted">{kot.vehicle_colour}</span>}
                {kot.bay_no && <span className="text-muted">bay {kot.bay_no}</span>}
              </div>
            )}

            <ul className="space-y-2 border-t border-line pt-3">
              {kot.lines.map((line, i) => (
                <li key={i}>
                  <p className="text-sm text-content">
                    <span className="mr-2 font-semibold tabular-nums">{line.quantity}×</span>
                    {line.name}
                  </p>
                  {line.modifiers.length > 0 && (
                    <p className="pl-6 text-xs text-muted">+ {line.modifiers.join(", ")}</p>
                  )}
                  {line.note && (
                    <p className="pl-6 text-xs font-semibold uppercase text-danger">
                      {line.note}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button disabled={!kot} onClick={() => window.print()}>
            <Printer className="mr-1.5 size-4" aria-hidden />
            Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
