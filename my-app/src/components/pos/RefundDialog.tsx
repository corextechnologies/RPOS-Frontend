"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRefund } from "@/lib/hooks/use-pos-payments";
import { usePosBootstrap, usePosCurrency } from "@/lib/pos/pos-session";
import { minorToDecimalString, parseDecimalToMinor } from "@/lib/money";
import { REFUND_REASON_CODES, type PaymentMethod, type PosOrder, type RefundReasonCode } from "@/lib/types/pos";
import { toast } from "sonner";

/**
 * Refunds are always LINKED to an original order and always reason-coded —
 * never a negative line on a new order. That is what makes "why did this branch
 * refund PKR 40,000 last week" a query rather than an investigation.
 */
export function RefundDialog({
  order,
  open,
  onOpenChange,
}: {
  order: PosOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const bootstrap = usePosBootstrap();
  const { minorUnits } = usePosCurrency();
  const refund = useRefund();

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [reason, setReason] = useState<RefundReasonCode>("CUSTOMER_CHANGED_MIND");
  const [note, setNote] = useState("");

  if (!order) return null;

  function submit() {
    if (!order) return;
    let amountMinor: number;
    try {
      amountMinor = parseDecimalToMinor(amount, minorUnits);
    } catch {
      toast.error("Enter a valid amount");
      return;
    }
    if (amountMinor <= 0) {
      toast.error("Refund must be more than zero");
      return;
    }

    refund.mutate(
      {
        order_id: order.id,
        amount_minor: amountMinor,
        method,
        reason_code: reason,
        note: note.trim() || undefined,
      },
      {
        onSuccess: () => {
          setAmount("");
          setNote("");
          onOpenChange(false);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Refund</DialogTitle>
          <DialogDescription>{order.order_no}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="refund-amount">Amount</Label>
            <Input
              id="refund-amount"
              inputMode="decimal"
              autoFocus
              className="h-12 text-center text-xl tabular-nums"
              placeholder={minorToDecimalString(order.total_minor, minorUnits)}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <button
              type="button"
              className="text-xs text-brand hover:underline"
              onClick={() => setAmount(minorToDecimalString(order.total_minor, minorUnits))}
            >
              Refund the full amount
            </button>
          </div>

          <div className="space-y-2">
            <Label>Method</Label>
            <Select value={method} onValueChange={(v) => setMethod(v)}>
              <SelectTrigger className="h-11 capitalize">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {bootstrap.pack.payment_methods.map((m) => (
                  <SelectItem key={m} value={m} className="capitalize">
                    {m.toLowerCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Reason</Label>
            <Select value={reason} onValueChange={(v) => setReason(v as RefundReasonCode)}>
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REFUND_REASON_CODES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r.toLowerCase().replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="refund-note">Note</Label>
            <Input
              id="refund-note"
              className="h-11"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" disabled={!amount || refund.isPending} onClick={submit}>
            {refund.isPending && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
            Refund
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
