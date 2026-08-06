"use client";

import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { ResolvedMenuItem } from "@/lib/hooks/use-pos-menu";

const MAX_QTY = 99;

/**
 * Log a customer turned away for a sold-out item, offline.
 *
 * Captures the *real* quantity asked for — "wanted 5, had 0" is far more useful
 * to the forecast than a yes/no — but defaults to 1 for the common single-unit
 * case, so the usual turn-away is two taps. The actual queueing (and its
 * `occurred_at` stamp) happens in the caller via `enqueueRefusal`.
 */
export function RefusalSheet({
  item,
  open,
  onOpenChange,
  onRecord,
}: {
  item: ResolvedMenuItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRecord: (item: ResolvedMenuItem, requestedUnits: number) => void;
}) {
  const [qty, setQty] = useState(1);

  // Fresh count each time the sheet opens for an item.
  useEffect(() => {
    if (open) setQty(1);
  }, [open, item?.id]);

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{item.name}</DialogTitle>
          <DialogDescription>
            Sold out. Log how many the customer wanted, so the forecast learns the real demand
            instead of recording a quiet day.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-center gap-5 py-2">
          <Button
            variant="outline"
            size="icon"
            className="size-12"
            onClick={() => setQty((n) => Math.max(1, n - 1))}
            disabled={qty <= 1}
            aria-label="Fewer"
          >
            <Minus className="size-5" aria-hidden />
          </Button>
          <span
            className="min-w-12 text-center font-display text-3xl font-semibold tabular-nums text-content"
            aria-live="polite"
          >
            {qty}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="size-12"
            onClick={() => setQty((n) => Math.min(MAX_QTY, n + 1))}
            disabled={qty >= MAX_QTY}
            aria-label="More"
          >
            <Plus className="size-5" aria-hidden />
          </Button>
        </div>

        <DialogFooter>
          <Button
            className="h-12 w-full text-base"
            onClick={() => {
              onRecord(item, qty);
              onOpenChange(false);
            }}
          >
            Record turn-away
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
