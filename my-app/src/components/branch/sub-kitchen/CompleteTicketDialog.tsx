"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2, TriangleAlert } from "lucide-react";
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
import {
  useCompletePrepTicket,
  useSubKitchenInventory,
  useSubKitchenRecipes,
} from "@/lib/hooks/use-sub-kitchen";
import { formatStockQty, type StockUnit } from "@/lib/stock-unit";
import { tryConvertQty } from "@/lib/unit-convert";
import type { PrepTicket } from "@/lib/types/sub-kitchen";

const numId = (s: string) => Number(String(s).replace(/\D/g, "")) || 0;

interface InputRow {
  productId: string;
  quantity: string;
}

/**
 * Finishing a ticket moves stock. When the product has a recipe, that's all the
 * chef confirms; otherwise they state what they used (a one-off with no recipe).
 * A shortfall leaves the ticket open to retry — the hook surfaces the error.
 */
export function CompleteTicketDialog({
  ticket,
  open,
  onOpenChange,
}: {
  ticket: PrepTicket | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const complete = useCompletePrepTicket();
  const recipes = useSubKitchenRecipes();
  const inventory = useSubKitchenInventory();

  const activeRecipe = useMemo(() => {
    if (!ticket) return undefined;
    const pid = numId(ticket.product_id);
    return (recipes.data ?? []).find((r) => r.is_active && r.product_id === pid);
  }, [recipes.data, ticket]);
  const hasRecipe = !!activeRecipe;

  // Branch on-hand keyed by product, both for the projection and the picker.
  const onHandById = useMemo(() => {
    const totals = new Map<number, number>();
    const units = new Map<number, StockUnit>();
    for (const item of inventory.data ?? []) {
      const id = numId(item.product_id);
      totals.set(id, (totals.get(id) ?? 0) + item.quantity);
      if (!units.has(id)) units.set(id, item.stock_unit);
    }
    return { totals, units };
  }, [inventory.data]);
  const inventoryReady = inventory.data !== undefined;

  // What the recipe will draw from stock, so a shortfall shows before completing.
  const projection = useMemo(() => {
    if (!activeRecipe || !ticket) return [];
    const batches = Math.ceil(ticket.quantity / (activeRecipe.yield_qty || 1));
    return activeRecipe.components.map((c) => {
      const from = c.unit ?? c.stock_unit ?? "EACH";
      const to = c.stock_unit ?? onHandById.units.get(c.component_product_id) ?? from;
      const perBatch = tryConvertQty(c.quantity, from, to) ?? c.quantity;
      const needed = perBatch * batches;
      const stored = onHandById.totals.get(c.component_product_id);
      const onHand = stored ?? (inventoryReady ? 0 : undefined);
      return {
        id: c.component_product_id,
        name: c.component_name ?? `#${c.component_product_id}`,
        needed,
        unit: to,
        onHand,
        short: onHand != null && onHand < needed,
      };
    });
  }, [activeRecipe, ticket, onHandById, inventoryReady]);

  // Distinct products on hand, for the no-recipe inputs picker.
  const stockProducts = useMemo(() => {
    const seen = new Map<string, string>();
    for (const item of inventory.data ?? []) {
      if (!seen.has(item.product_id)) seen.set(item.product_id, item.product_name);
    }
    return [...seen.entries()].map(([id, name]) => ({ id, name }));
  }, [inventory.data]);

  const [rows, setRows] = useState<InputRow[]>([{ productId: "", quantity: "" }]);
  const [prevId, setPrevId] = useState<string | undefined>();
  if (ticket?.id !== prevId) {
    setPrevId(ticket?.id);
    setRows([{ productId: "", quantity: "" }]);
  }

  const usableRows = rows.filter((r) => r.productId && Number(r.quantity) > 0);
  const canSubmit = hasRecipe || usableRows.length > 0;

  const submit = () => {
    if (!ticket) return;
    const body = hasRecipe
      ? {}
      : {
          inputs: usableRows.map((r) => ({
            product_id: numId(r.productId),
            quantity: Number(r.quantity),
          })),
        };
    complete.mutate(
      { id: ticket.id, body },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Complete this ticket</DialogTitle>
          <DialogDescription>
            {ticket ? `${ticket.quantity}× ${ticket.product_name}. ` : ""}
            Completing moves stock and can&apos;t be undone.
          </DialogDescription>
        </DialogHeader>

        {hasRecipe ? (
          <div className="space-y-3">
            <p className="text-sm text-muted">
              This will consume the recipe&apos;s ingredients from branch stock.
              {ticket?.source === "BATCH"
                ? " The finished item is added back to stock."
                : " Nothing is added back — it goes to the customer."}
            </p>
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
                          p.short ? "shrink-0 tabular-nums text-warning" : "shrink-0 tabular-nums"
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
                    Not enough stock for one or more ingredients — completing may fail.
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="flex items-start gap-2 rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">
              <TriangleAlert className="mt-0.5 size-3 shrink-0" aria-hidden />
              No recipe for this item — enter what you used.
            </p>
            {rows.map((row, i) => (
              <div key={i} className="flex items-end gap-2">
                <div className="flex-1 space-y-1">
                  {i === 0 && <Label className="text-xs">Ingredient</Label>}
                  <Select
                    value={row.productId}
                    onValueChange={(v) =>
                      setRows((rs) => rs.map((r, j) => (j === i ? { ...r, productId: v } : r)))
                    }
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Choose…" />
                    </SelectTrigger>
                    <SelectContent>
                      {stockProducts.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-24 space-y-1">
                  {i === 0 && <Label className="text-xs">Qty</Label>}
                  <Input
                    className="h-10 tabular-nums"
                    inputMode="numeric"
                    value={row.quantity}
                    onChange={(e) =>
                      setRows((rs) =>
                        rs.map((r, j) =>
                          j === i ? { ...r, quantity: e.target.value.replace(/\D/g, "") } : r,
                        ),
                      )
                    }
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-danger"
                  aria-label="Remove"
                  disabled={rows.length === 1}
                  onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRows((rs) => [...rs, { productId: "", quantity: "" }])}
            >
              <Plus className="mr-1.5 size-4" aria-hidden />
              Add ingredient
            </Button>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!canSubmit || complete.isPending} onClick={submit}>
            {complete.isPending ? "Completing…" : "Complete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
