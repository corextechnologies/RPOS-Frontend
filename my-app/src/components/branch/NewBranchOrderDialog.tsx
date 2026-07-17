"use client";

import { useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
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
import { PriceMismatchDialog } from "@/components/pos/PriceMismatchDialog";
import { useBranchCustomers, useCreateBranchOrder } from "@/lib/hooks/use-branch";
import { useProductPricing } from "@/lib/hooks/use-pricing";
import { isApiCode, POS_ERROR } from "@/lib/api/errors";
import { ApiError } from "@/lib/types/super-admin";
import { toast } from "sonner";
import type { BranchOrderLineInput } from "@/lib/types/branch";

interface DraftLine extends BranchOrderLineInput {
  uid: string;
}

/**
 * A branch order, taken at the counter without a till.
 *
 * **`unit_price` is never sent.** The Phase 5 delta made it optional and
 * demoted it to a *proposal*; omitting it lets the server price, which is the
 * only way to be sure the customer is charged what the catalogue says. The 409
 * path still exists and is still handled — a POS device replaying a stale cart
 * will hit it — but there is no reason for this form to propose anything, so it
 * doesn't.
 *
 * Money on this surface is decimal strings, not minor units: these are the
 * original Phase 5 endpoints and they're deliberately unchanged.
 */
export function NewBranchOrderDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const products = useProductPricing();
  const customers = useBranchCustomers();
  const create = useCreateBranchOrder();

  const [customerId, setCustomerId] = useState<string>("");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([
    { uid: "l0", product_id: "", quantity: 1 },
  ]);
  const [mismatch, setMismatch] = useState<ApiError | null>(null);

  const usable = lines.filter((l) => l.product_id && l.quantity > 0);
  const valid = usable.length > 0;

  function update(uid: string, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((l) => (l.uid === uid ? { ...l, ...patch } : l)));
  }

  function reset() {
    setLines([{ uid: `l${Date.now()}`, product_id: "", quantity: 1 }]);
    setCustomerId("");
    setNote("");
    setMismatch(null);
  }

  async function submit() {
    try {
      await create.mutateAsync({
        customer_id: customerId || null,
        note: note.trim() || undefined,
        // No unit_price. The server prices.
        lines: usable.map(({ product_id, quantity }) => ({ product_id, quantity })),
      });
      toast.success("Order recorded");
      reset();
      onOpenChange(false);
    } catch (err) {
      // Shouldn't happen while we omit unit_price — but the contract allows it,
      // and a 409 rendered as "Request failed" would waste the breakdown the
      // server took the trouble to send.
      if (isApiCode(err, POS_ERROR.PRICE_MISMATCH)) {
        setMismatch(err);
        return;
      }
      toast.error(err instanceof Error ? err.message : "Couldn't record the order");
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New order</DialogTitle>
            <DialogDescription>
              Priced by the server from the catalogue — nothing to key in.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Customer</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Walk-in" />
                </SelectTrigger>
                <SelectContent>
                  {(customers.data?.items ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                      {c.phone ? ` · ${c.phone}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Items</Label>
              {lines.map((line) => (
                <div key={line.uid} className="flex items-end gap-2">
                  <div className="min-w-0 flex-1">
                    <Select
                      value={line.product_id}
                      onValueChange={(v) => update(line.uid, { product_id: v })}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Product…" />
                      </SelectTrigger>
                      <SelectContent>
                        {(products.data ?? []).map((p) => (
                          <SelectItem key={p.id} value={p.id} disabled={!p.is_available}>
                            {p.name}
                            {/* An unpriced product is a 409
                                `product_not_priced` waiting to happen — say so
                                here rather than after they've hit submit. */}
                            {!p.selling_price && " — not priced"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-20">
                    <Input
                      className="h-10"
                      inputMode="numeric"
                      value={line.quantity}
                      onChange={(e) =>
                        update(line.uid, {
                          quantity: Math.max(0, parseInt(e.target.value, 10) || 0),
                        })
                      }
                    />
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-10"
                    disabled={lines.length <= 1}
                    onClick={() => setLines((prev) => prev.filter((l) => l.uid !== line.uid))}
                    aria-label="Remove line"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </div>
              ))}

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setLines((prev) => [
                    ...prev,
                    { uid: `l${Date.now()}`, product_id: "", quantity: 1 },
                  ])
                }
              >
                <Plus className="mr-1.5 size-3.5" aria-hidden />
                Add item
              </Button>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs" htmlFor="order-note">
                Note
              </Label>
              <Input
                id="order-note"
                className="h-10"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button disabled={!valid || create.isPending} onClick={() => void submit()}>
              {create.isPending && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
              Record order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/*
        No `formatTotal`: the branch surface has no minor-unit total, and its
        `details` carry per-line decimal strings. Passing a POS formatter here
        would need POS context this screen doesn't have.
      */}
      <PriceMismatchDialog
        error={mismatch}
        open={mismatch !== null}
        onOpenChange={(o) => !o && setMismatch(null)}
        busy={create.isPending}
        onAcceptServerPrice={() => void submit()}
      />
    </>
  );
}
