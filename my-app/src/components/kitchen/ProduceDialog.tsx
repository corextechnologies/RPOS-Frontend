"use client";

import { useMemo, useState } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  useKitchenCatalogue,
  useKitchenRecipes,
  useProduceKitchenProduct,
} from "@/lib/hooks/use-kitchen-recipes";
import { useKitchenInventory } from "@/lib/hooks/use-kitchen-inventory";
import { formatStockQty, type StockUnit } from "@/lib/stock-unit";
import { tryConvertQty } from "@/lib/unit-convert";
import { toast } from "sonner";
import type { ProductionRun } from "@/lib/types/branch";

/** Numeric portion of a product id ("prod-001" → 1); tolerant of id formats. */
function numId(value: string): number {
  return Number(String(value).replace(/\D/g, "")) || 0;
}

interface ProduceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-select this product (catalogue id or a line's product id). */
  initialProductId?: string;
  /** Pre-fill the quantity. */
  initialQuantity?: number;
  /** Display name when the picker is locked and the catalogue hasn't resolved yet. */
  initialProductName?: string;
  /** Hide the item picker and fix production to `initialProductId`. */
  lockProduct?: boolean;
  /** Called after a successful production run — e.g. to mark a target line ready. */
  onProduced?: (run: ProductionRun) => void;
  title?: string;
  description?: string;
}

/**
 * "Make something" — runs a real production: ingredients come out of kitchen
 * stock before the finished good goes in. Shared by the Production page's
 * ad-hoc button and the production-target "Mark made" flow.
 *
 * There is no batch-code field: the server assigns/omits it. Expiry stays, so
 * kitchen-made stock still flows into near-expiry and waste tracking.
 */
export function ProduceDialog({
  open,
  onOpenChange,
  initialProductId,
  initialQuantity,
  initialProductName,
  lockProduct = false,
  onProduced,
  title = "Make something",
  description = "Ingredients come out of kitchen stock before the output goes in.",
}: ProduceDialogProps) {
  const catalogue = useKitchenCatalogue();
  const recipes = useKitchenRecipes();
  const inventory = useKitchenInventory();
  const produce = useProduceKitchenProduct();

  const [productId, setProductId] = useState(initialProductId ?? "");
  const [quantity, setQuantity] = useState(
    initialQuantity != null ? String(initialQuantity) : "1",
  );
  const [expiryDate, setExpiryDate] = useState("");

  // Reset to the caller's pre-fill each time the dialog opens (render-time
  // pattern, no effect). A fresh open of "Make something extra" clears the
  // fields; a "Mark made" open seeds the target line's product and quantity.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setProductId(initialProductId ?? "");
      setQuantity(initialQuantity != null ? String(initialQuantity) : "1");
      setExpiryDate("");
    }
  }

  const picked = (catalogue.data ?? []).find(
    (p) => !!productId && (p.id === productId || numId(p.id) === numId(productId)),
  );
  const lockedName = picked?.name ?? initialProductName ?? "This item";
  // Producing something with no recipe is 409 `no_active_recipe`. Saying so
  // before they hit the button beats an error toast afterwards.
  const noRecipe = picked && picked.has_recipe === false;
  const valid =
    !!productId && Number(quantity) > 0 && !noRecipe && !!expiryDate;

  // What producing this many will draw from stock — one line per component,
  // converted into the ingredient's stock unit and multiplied by the batch
  // count, so the chef sees "10 buns → 1 kg flour" before committing.
  const qtyNum = Number(quantity);
  const activeRecipe = picked
    ? (recipes.data ?? []).find((r) => r.is_active && r.product_name === picked.name)
    : undefined;
  const onHandById = useMemo(() => {
    const totals = new Map<number, number>();
    const units = new Map<number, StockUnit>();
    for (const item of inventory.data ?? []) {
      const key = Number(item.product_id.replace(/\D/g, "")) || 0;
      totals.set(key, (totals.get(key) ?? 0) + item.quantity);
      if (item.product.stock_unit) units.set(key, item.product.stock_unit);
    }
    return { totals, units };
  }, [inventory.data]);
  const projection =
    activeRecipe && Number.isFinite(qtyNum) && qtyNum > 0
      ? (() => {
          const batches = Math.ceil(qtyNum / (activeRecipe.yield_qty || 1));
          return activeRecipe.components.map((c) => {
            const from = c.unit ?? c.stock_unit ?? "EACH";
            const to =
              c.stock_unit ?? onHandById.units.get(c.component_product_id) ?? from;
            const perBatch = tryConvertQty(c.quantity, from, to) ?? c.quantity;
            const needed = perBatch * batches;
            const onHand = onHandById.totals.get(c.component_product_id);
            return {
              id: c.component_product_id,
              name: c.component_name ?? `#${c.component_product_id}`,
              needed,
              unit: to,
              onHand,
              short: onHand != null && onHand < needed,
            };
          });
        })()
      : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Item</Label>
            {lockProduct ? (
              <div className="flex h-10 items-center rounded-lg border border-line bg-surface-2 px-3 text-sm font-medium text-content">
                {lockedName}
              </div>
            ) : (
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Choose…" />
                </SelectTrigger>
                <SelectContent>
                  {(catalogue.data ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                      {p.has_recipe === false && " — no recipe"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {noRecipe && (
            <p className="flex items-start gap-2 rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">
              <TriangleAlert className="mt-0.5 size-3 shrink-0" aria-hidden />
              No recipe yet, so there&apos;s nothing to consume. Add one first.
            </p>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs" htmlFor="prod-qty">
              How many
            </Label>
            <Input
              id="prod-qty"
              className="h-12 text-center text-xl tabular-nums"
              inputMode="numeric"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value.replace(/\D/g, ""))}
            />
          </div>

          {projection.length > 0 && (
            <div className="space-y-1.5 rounded-lg border border-line bg-surface-2/50 px-3 py-2.5">
              <p className="text-xs font-medium uppercase tracking-wide text-faint">
                Will use
              </p>
              <ul className="space-y-1">
                {projection.map((p) => (
                  <li key={p.id} className="flex justify-between gap-2 text-sm">
                    <span className="truncate text-content">{p.name}</span>
                    <span
                      className={
                        p.short
                          ? "shrink-0 tabular-nums text-warning"
                          : "shrink-0 tabular-nums text-muted"
                      }
                    >
                      {formatStockQty(p.needed, p.unit)}
                      {p.onHand != null && (
                        <span className="text-faint">
                          {" "}
                          / {formatStockQty(p.onHand, p.unit)}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
              {projection.some((p) => p.short) && (
                <p className="flex items-start gap-1.5 text-xs text-warning">
                  <TriangleAlert className="mt-0.5 size-3 shrink-0" aria-hidden />
                  Not enough stock for this many.
                </p>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs" htmlFor="prod-expiry">
              Expiry date
            </Label>
            <Input
              id="prod-expiry"
              type="date"
              className="h-10"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!valid || produce.isPending}
            onClick={() => {
              const numericId = numId(productId);
              if (!numericId) {
                toast.error("Couldn't resolve this product's id");
                return;
              }
              produce.mutate(
                {
                  product_id: numericId,
                  quantity: Number(quantity),
                  expiry_date: expiryDate || null,
                },
                {
                  onSuccess: (run) => {
                    onOpenChange(false);
                    setProductId("");
                    setQuantity("1");
                    setExpiryDate("");
                    onProduced?.(run);
                  },
                },
              );
            }}
          >
            Make
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
