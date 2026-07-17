"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCashMovement } from "@/lib/hooks/use-pos-shift";
import { usePosCurrency } from "@/lib/pos/pos-session";
import { parseDecimalToMinor } from "@/lib/money";
import { CASH_MOVEMENT_TYPES, type CashMovementType } from "@/lib/types/pos";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const HELP: Record<CashMovementType, string> = {
  PAID_IN: "Money added to the drawer.",
  PAID_OUT: "Money taken out for an expense.",
  DROP: "Cash moved to the safe.",
  PICKUP: "Cash collected from the drawer.",
  NO_SALE: "Opening the drawer without a sale.",
};

/**
 * Every drawer open is logged — including NO_SALE, which is the whole reason
 * that type exists. An unlogged drawer open is the oldest trick there is, so
 * "just open it" is not on offer: the only way to open the drawer from this UI
 * creates an audit row.
 */
export function CashMovementDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [type, setType] = useState<CashMovementType>("NO_SALE");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const { minorUnits } = usePosCurrency();
  const movement = useCashMovement();

  const needsAmount = type !== "NO_SALE";

  function submit() {
    let amountMinor = 0;
    if (needsAmount) {
      try {
        amountMinor = parseDecimalToMinor(amount, minorUnits);
      } catch {
        toast.error("Enter a valid amount");
        return;
      }
    }

    movement.mutate(
      { type, amount_minor: amountMinor, note: note.trim() || undefined },
      {
        onSuccess: () => {
          setAmount("");
          setNote("");
          setType("NO_SALE");
          onOpenChange(false);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Drawer</DialogTitle>
          <DialogDescription>{HELP[type]}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2">
          {CASH_MOVEMENT_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={cn(
                "h-11 rounded-xl border text-sm font-medium capitalize transition",
                type === t
                  ? "border-brand bg-brand/10 text-content"
                  : "border-line bg-surface text-muted hover:border-brand/50",
              )}
            >
              {t.toLowerCase().replace(/_/g, " ")}
            </button>
          ))}
        </div>

        {needsAmount && (
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              inputMode="decimal"
              autoFocus
              className="h-12 text-center text-xl tabular-nums"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="movement-note">Note</Label>
          <Input
            id="movement-note"
            className="h-11"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={movement.isPending || (needsAmount && !amount)} onClick={submit}>
            {type === "NO_SALE" ? "Open drawer" : "Log"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
