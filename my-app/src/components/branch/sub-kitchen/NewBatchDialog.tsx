"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateBatchJob, useSubKitchenRecipes } from "@/lib/hooks/use-sub-kitchen";

/**
 * Queue a prep-ahead batch. The list is the items the station has a recipe for —
 * so completing the batch always draws ingredients automatically, never asking
 * the chef to hand-enter what a no-recipe item consumed.
 */
export function NewBatchDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const recipes = useSubKitchenRecipes();
  const create = useCreateBatchJob();

  const products = useMemo(() => {
    const byId = new Map<number, string>();
    for (const r of recipes.data ?? []) {
      if (!byId.has(r.product_id)) byId.set(r.product_id, r.product_name ?? `#${r.product_id}`);
    }
    return [...byId.entries()].map(([id, name]) => ({ id, name }));
  }, [recipes.data]);

  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [note, setNote] = useState("");

  // Reset each time the dialog opens.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setProductId("");
      setQuantity("1");
      setNote("");
    }
  }

  const valid = !!productId && Number(quantity) > 0;

  const submit = () => {
    create.mutate(
      {
        product_id: Number(productId),
        quantity: Number(quantity),
        note: note.trim() || undefined,
      },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New batch job</DialogTitle>
          <DialogDescription>Prep ahead of orders — this queues on the board.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Item</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder={products.length ? "Choose…" : "No items"} />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs" htmlFor="batch-qty">
              How many
            </Label>
            <Input
              id="batch-qty"
              className="h-12 text-center text-xl tabular-nums"
              inputMode="numeric"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value.replace(/\D/g, ""))}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs" htmlFor="batch-note">
              Note (optional)
            </Label>
            <Input
              id="batch-note"
              className="h-10"
              placeholder="e.g. morning prep"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!valid || create.isPending} onClick={submit}>
            {create.isPending ? "Queuing…" : "Queue batch"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
