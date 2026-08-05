"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { useCompletePrepTicket, useSubKitchenProducts } from "@/lib/hooks/use-sub-kitchen";
import type { PrepTicket } from "@/lib/types/sub-kitchen";
import { formatStockQty, stockUnitLabel, type StockUnit } from "@/lib/stock-unit";
import { convertibleUnits, tryConvertQty } from "@/lib/unit-convert";

const numId = (s: string) => Number(String(s).replace(/\D/g, "")) || 0;

interface InputRow {
  productId: string;
  quantity: string;
  /** The unit the chef is entering in — defaults to the component's stock unit. */
  unit?: StockUnit;
}

/**
 * Finish a made-to-order job by stating exactly which components were used and
 * how much. Completing deducts those from branch stock. The finished item is
 * not touched here — it was already deducted at the sale.
 *
 * Components may be left empty: a labour-only finish (e.g. writing a name on a
 * cake) completes the ticket with no deduction. A shortfall leaves the ticket
 * open to retry — the hook surfaces the error.
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
  // Components only, scoped to what the branch holds; the toggle widens to the
  // full catalogue for a component the branch hasn't received yet.
  const [showAll, setShowAll] = useState(false);
  const products = useSubKitchenProducts("RAW_MATERIAL", { all: showAll });

  const options = (products.data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    stockUnit: p.stock_unit,
  }));
  const stockUnitFor = (productId: string) =>
    options.find((o) => o.id === productId)?.stockUnit;

  const [rows, setRows] = useState<InputRow[]>([{ productId: "", quantity: "" }]);
  const [prevId, setPrevId] = useState<string | undefined>();
  if (ticket?.id !== prevId) {
    setPrevId(ticket?.id);
    setRows([{ productId: "", quantity: "" }]);
    setShowAll(false);
  }

  const usableRows = rows.filter((r) => r.productId && Number(r.quantity) > 0);

  const submit = () => {
    if (!ticket) return;
    complete.mutate(
      {
        id: ticket.id,
        body: {
          inputs: usableRows.map((r) => {
            const stockUnit = stockUnitFor(r.productId);
            const entryUnit = r.unit ?? stockUnit;
            const qty = Number(r.quantity);
            // Stock is deducted in the product's own unit, and the wire carries
            // no unit — so convert what the chef entered (e.g. 200 g) back to the
            // stock unit (e.g. 0.2 kg) before sending.
            const quantity =
              stockUnit && entryUnit && entryUnit !== stockUnit
                ? tryConvertQty(qty, entryUnit, stockUnit) ?? qty
                : qty;
            return { product_id: numId(r.productId), quantity };
          }),
        },
      },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  const showNote = ticket?.source === "ORDER" && !!ticket.customization_note;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Complete this ticket</DialogTitle>
          <DialogDescription>
            {ticket ? `${ticket.quantity}× ${ticket.product_name}. ` : ""}
            Completing deducts the components below from branch stock and can&apos;t be undone.
          </DialogDescription>
        </DialogHeader>

        {showNote && (
          <div className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2.5">
            <p className="text-xs font-medium uppercase tracking-wide text-faint">
              Customer note
            </p>
            <p className="text-sm font-medium text-content">{ticket!.customization_note}</p>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <Label className="text-xs">Components used</Label>
            <label className="flex cursor-pointer items-center gap-2 text-xs text-muted">
              Show all products
              <Switch checked={showAll} onCheckedChange={setShowAll} />
            </label>
          </div>

          {rows.map((row, i) => {
            const stockUnit = stockUnitFor(row.productId);
            const entryUnit = row.unit ?? stockUnit;
            const unitOptions = stockUnit ? convertibleUnits(stockUnit) : [];
            // Show the draw-down in the component's stock unit when the chef
            // entered a different (compatible) one — "200 g = 0.2 kg".
            const converted =
              entryUnit && stockUnit && entryUnit !== stockUnit && Number(row.quantity) > 0
                ? tryConvertQty(Number(row.quantity), entryUnit, stockUnit)
                : null;
            return (
              <div key={i} className="space-y-1">
                <div className="flex items-end gap-2">
                  <div className="min-w-0 flex-1 space-y-1">
                    {i === 0 && <Label className="text-xs">Component</Label>}
                    <Select
                      value={row.productId}
                      onValueChange={(v) =>
                        setRows((rs) =>
                          rs.map((r, j) =>
                            // Default the entry unit to how the component is stocked.
                            j === i ? { ...r, productId: v, unit: stockUnitFor(v) } : r,
                          ),
                        )
                      }
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Choose…" />
                      </SelectTrigger>
                      <SelectContent>
                        {options.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-20 space-y-1">
                    {i === 0 && <Label className="text-xs">Qty</Label>}
                    <Input
                      className="h-10 tabular-nums"
                      inputMode="decimal"
                      value={row.quantity}
                      onChange={(e) =>
                        setRows((rs) =>
                          rs.map((r, j) =>
                            j === i ? { ...r, quantity: e.target.value.replace(/[^\d.]/g, "") } : r,
                          ),
                        )
                      }
                    />
                  </div>
                  <div className="w-24 space-y-1">
                    {i === 0 && <Label className="text-xs">Unit</Label>}
                    <Select
                      value={entryUnit ?? ""}
                      onValueChange={(v) =>
                        setRows((rs) => rs.map((r, j) => (j === i ? { ...r, unit: v as StockUnit } : r)))
                      }
                      disabled={!stockUnit || unitOptions.length <= 1}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="unit" />
                      </SelectTrigger>
                      <SelectContent>
                        {unitOptions.map((u) => (
                          <SelectItem key={u} value={u}>
                            {stockUnitLabel(u) || u.toLowerCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                {converted !== null && (
                  <p className="pl-1 text-xs text-faint">
                    Deducts {formatStockQty(converted, stockUnit)} from stock.
                  </p>
                )}
              </div>
            );
          })}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setRows((rs) => [...rs, { productId: "", quantity: "" }])}
          >
            <Plus className="mr-1.5 size-4" aria-hidden />
            Add component
          </Button>

          <p className="text-xs text-faint">
            Leave empty for a labour-only finish, like writing a name — the job is marked done
            with nothing deducted.
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!ticket || complete.isPending} onClick={submit}>
            {complete.isPending ? "Completing…" : "Complete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
