"use client";

import { CheckCircle2, Flag, ShieldAlert } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Money } from "./Money";
import { usePosFlagged } from "@/lib/hooks/use-pos-flagged";
import { localOrderNo } from "@/lib/pos/offline/local-order";
import { relativeTime } from "@/lib/utils";
import type { FlaggedReason } from "@/lib/types/pos";

/**
 * The manager review view for offline sales the server flagged on sync (§9).
 *
 * Every sale here already went through — the customer paid, the food was made.
 * The server accepted it and raised a hand: the price it computed differs from
 * what the device charged (PRICE_DRIFT), or the sale pushed stock negative
 * (STOCK_OVERSELL). This screen shows the disagreement so a manager can
 * reconcile out of band. "Mark reviewed" clears it locally; it changes nothing
 * on the server, which has already settled the sale.
 */
function reasonCopy(reason: FlaggedReason | null): { label: string; hint: string } {
  switch (reason) {
    case "PRICE_DRIFT":
      return {
        label: "Price drift",
        hint: "The menu moved while offline — the server's total differs from what was charged.",
      };
    case "STOCK_OVERSELL":
      return {
        label: "Stock oversell",
        hint: "This sale took stock below zero. Count and reconcile the item.",
      };
    default:
      return { label: reason ?? "Flagged", hint: "The server accepted this sale but flagged it." };
  }
}

export function FlaggedReviewSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { flagged, dismiss } = usePosFlagged();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="size-5 text-warning" aria-hidden />
            Sales to review
          </DialogTitle>
          <DialogDescription>
            These sales went through offline and synced with a flag. Reconcile, then mark reviewed.
          </DialogDescription>
        </DialogHeader>

        {flagged.length === 0 ? (
          <div className="py-10 text-center">
            <CheckCircle2 className="mx-auto size-7 text-faint" aria-hidden />
            <p className="mt-2 text-sm text-muted">Nothing to review.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {flagged.map((f) => {
              const copy = reasonCopy(f.reason);
              return (
                <li key={f.local_id} className="rounded-xl border border-line p-3">
                  <div className="flex items-center gap-2">
                    <Flag className="size-3.5 text-warning" aria-hidden />
                    <span className="font-mono text-xs text-content">
                      {f.order_id ? `#${f.order_id}` : localOrderNo(f.local_id)}
                    </span>
                    <span className="rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
                      {copy.label}
                    </span>
                    <span className="ml-auto text-xs text-faint">{relativeTime(f.flagged_at)}</span>
                  </div>

                  <p className="mt-1.5 text-xs text-muted">{copy.hint}</p>

                  {(f.device_total_minor != null || f.server_total_minor != null) && (
                    <div className="mt-2 flex items-center gap-4 text-xs">
                      <span className="text-muted">
                        Charged <Money minor={f.device_total_minor} className="text-content" />
                      </span>
                      <span className="text-muted">
                        Server <Money minor={f.server_total_minor} className="text-content" />
                      </span>
                    </div>
                  )}

                  <div className="mt-2 flex justify-end">
                    <Button variant="outline" size="sm" onClick={() => void dismiss(f.local_id)}>
                      <CheckCircle2 className="mr-1.5 size-4" aria-hidden />
                      Mark reviewed
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
