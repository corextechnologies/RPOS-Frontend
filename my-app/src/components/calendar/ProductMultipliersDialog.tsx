"use client";

import { useMemo, useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useDeleteProductMultiplier,
  useEventProductMultipliers,
  usePutProductMultipliers,
} from "@/lib/hooks/use-calendar";
import { useSellableProducts } from "@/lib/hooks/use-pos-admin";
import { multiplierLabel } from "@/lib/forecast/format";
import type { CalendarEvent } from "@/lib/types/forecast";

/**
 * Per-product multipliers for one event (§5). A product's own number always
 * beats its tag. `is_proposed` rows are suggestions the system will one day
 * make from last year's actuals — rendered as "confirm?", not a settled value
 * (nothing sets it yet, but the flag is live).
 */
export function ProductMultipliersDialog({
  open,
  onOpenChange,
  event,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: CalendarEvent;
}) {
  const rows = useEventProductMultipliers(open ? event.id : null);
  const products = useSellableProducts();
  const put = usePutProductMultipliers(event.id);
  const remove = useDeleteProductMultiplier(event.id);

  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [addProduct, setAddProduct] = useState("");
  const [addValue, setAddValue] = useState("2.0");

  const existingIds = useMemo(
    () => new Set((rows.data ?? []).map((r) => r.product_id)),
    [rows.data],
  );
  const pickable = (products.data ?? []).filter((p) => !existingIds.has(p.id));

  const valueFor = (productId: number, current: string) =>
    drafts[productId] ?? current;

  const saveOne = (productId: number, value: string, isProposed = false) => {
    put.mutate(
      {
        multipliers: { [String(productId)]: value },
        is_proposed: isProposed,
        replace: false,
      },
      { onSuccess: () => setDrafts((d) => omit(d, productId)) },
    );
  };

  const addOne = () => {
    if (!addProduct || !addValue) return;
    put.mutate(
      { multipliers: { [addProduct]: addValue }, is_proposed: false, replace: false },
      {
        onSuccess: () => {
          setAddProduct("");
          setAddValue("2.0");
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{event.name} — per-product multipliers</DialogTitle>
          <DialogDescription>
            A specific dish&apos;s exact number. It always beats the category tag.
          </DialogDescription>
        </DialogHeader>

        {rows.isLoading ? (
          <p className="py-8 text-center text-sm text-muted">Loading…</p>
        ) : (
          <div className="space-y-4">
            {(rows.data ?? []).length > 0 && (
              <div className="rounded-xl border border-line">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Multiplier</TableHead>
                      <TableHead className="w-40" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(rows.data ?? []).map((row) => {
                      const value = valueFor(row.product_id, row.multiplier);
                      const dirty = value !== row.multiplier;
                      return (
                        <TableRow key={row.product_id}>
                          <TableCell className="text-content">
                            {row.product_name}
                            {row.is_proposed && (
                              <Badge variant="warning" className="ml-2">
                                Suggested {multiplierLabel(row.multiplier)} — confirm?
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <span className="text-muted">×</span>
                              <Input
                                type="number"
                                min={0}
                                step="0.1"
                                className="h-8 w-24 text-right tabular-nums"
                                value={value}
                                onChange={(e) =>
                                  setDrafts((d) => ({ ...d, [row.product_id]: e.target.value }))
                                }
                              />
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              {row.is_proposed && !dirty && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => saveOne(row.product_id, row.multiplier, false)}
                                  disabled={put.isPending}
                                >
                                  <Check className="mr-1 size-3.5" aria-hidden />
                                  Confirm
                                </Button>
                              )}
                              {dirty && (
                                <Button
                                  size="sm"
                                  onClick={() => saveOne(row.product_id, value, false)}
                                  disabled={put.isPending}
                                >
                                  Save
                                </Button>
                              )}
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-8"
                                onClick={() => remove.mutate(row.product_id)}
                                disabled={remove.isPending}
                                aria-label={`Remove ${row.product_name}`}
                                title="Revert to the tag rule"
                              >
                                <X className="size-4" aria-hidden />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="flex items-end gap-2 rounded-xl border border-line bg-surface-2/40 p-3">
              <div className="flex-1">
                <Select value={addProduct} onValueChange={setAddProduct}>
                  <SelectTrigger>
                    <SelectValue placeholder="Add a product…" />
                  </SelectTrigger>
                  <SelectContent>
                    {pickable.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-muted">×</span>
                <Input
                  type="number"
                  min={0}
                  step="0.1"
                  className="h-9 w-24 tabular-nums"
                  value={addValue}
                  onChange={(e) => setAddValue(e.target.value)}
                />
              </div>
              <Button onClick={addOne} disabled={!addProduct || put.isPending}>
                <Plus className="mr-1 size-4" aria-hidden />
                Add
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function omit(record: Record<number, string>, key: number): Record<number, string> {
  const next = { ...record };
  delete next[key];
  return next;
}
