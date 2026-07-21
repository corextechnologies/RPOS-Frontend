"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Kitchen, ProductPricing } from "@/lib/types/admin";

export interface ProductionTargetFormValue {
  kitchen_id: string;
  target_date: string;
  note: string;
  lines: Array<{ product_id: string; quantity: string }>;
}

/**
 * Shared by the create and edit screens. On edit the kitchen and date are fixed
 * — the API only accepts `note` and `lines` on a PATCH — so they render as
 * read-only summary rows rather than inputs.
 */
export function ProductionTargetForm({
  mode,
  kitchens,
  products,
  productsLoading,
  initial,
  submitting,
  cancelHref,
  submitLabel,
  onSubmit,
}: {
  mode: "create" | "edit";
  kitchens: Kitchen[];
  products: ProductPricing[];
  productsLoading: boolean;
  initial?: Partial<ProductionTargetFormValue> & { kitchen_name?: string };
  submitting: boolean;
  cancelHref: string;
  submitLabel: string;
  onSubmit: (value: ProductionTargetFormValue) => void;
}) {
  const [kitchenId, setKitchenId] = useState(initial?.kitchen_id ?? "");
  const [targetDate, setTargetDate] = useState(initial?.target_date ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [lines, setLines] = useState<ProductionTargetFormValue["lines"]>(
    initial?.lines && initial.lines.length > 0
      ? initial.lines
      : [{ product_id: "", quantity: "" }],
  );
  const [touched, setTouched] = useState(false);

  const productName = useMemo(() => {
    const map = new Map(products.map((p) => [p.id, p.name]));
    return (id: string) => map.get(id) ?? "";
  }, [products]);

  const validLines = lines.filter(
    (l) => l.product_id && Number.isInteger(Number(l.quantity)) && Number(l.quantity) > 0,
  );
  const hasDuplicateProduct =
    new Set(lines.filter((l) => l.product_id).map((l) => l.product_id)).size !==
    lines.filter((l) => l.product_id).length;

  const canSubmit =
    (mode === "edit" || (!!kitchenId && !!targetDate)) &&
    validLines.length === lines.length &&
    lines.length > 0 &&
    !hasDuplicateProduct;

  function updateLine(index: number, patch: Partial<{ product_id: string; quantity: string }>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function submit() {
    setTouched(true);
    if (!canSubmit) return;
    onSubmit({
      kitchen_id: kitchenId,
      target_date: targetDate,
      note,
      lines,
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Target details</CardTitle>
          <CardDescription>
            {mode === "create"
              ? "Choose a kitchen and the day the target is for."
              : "Kitchen and date are fixed once a target is created."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {mode === "create" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="target-kitchen">Kitchen</Label>
                <Select value={kitchenId} onValueChange={setKitchenId}>
                  <SelectTrigger id="target-kitchen" aria-invalid={touched && !kitchenId}>
                    <SelectValue placeholder="Select a kitchen" />
                  </SelectTrigger>
                  <SelectContent>
                    {kitchens.map((k) => (
                      <SelectItem key={k.id} value={k.id}>
                        {k.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="target-date">Date</Label>
                <Input
                  id="target-date"
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  aria-invalid={touched && !targetDate}
                />
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-sm text-muted">Kitchen</p>
                <p className="font-medium text-content">
                  {initial?.kitchen_name ?? "-"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted">Date</p>
                <p className="font-medium text-content">{initial?.target_date ?? "-"}</p>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="target-note">Note (optional)</Label>
            <Textarea
              id="target-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Ramadan rush — extra biryani"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Products to make</CardTitle>
          <CardDescription>
            How many of each product this kitchen should produce.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {lines.map((line, index) => {
            const qtyValid =
              line.quantity === "" ||
              (Number.isInteger(Number(line.quantity)) && Number(line.quantity) > 0);
            return (
              <div key={index} className="flex flex-wrap items-end gap-3">
                <div className="min-w-[200px] flex-1 space-y-1.5">
                  {index === 0 && <Label>Product</Label>}
                  <Select
                    value={line.product_id}
                    onValueChange={(v) => updateLine(index, { product_id: v })}
                  >
                    <SelectTrigger
                      aria-label={`Product for line ${index + 1}`}
                      aria-invalid={touched && !line.product_id}
                    >
                      <SelectValue
                        placeholder={productsLoading ? "Loading…" : "Select a product"}
                      >
                        {productName(line.product_id)}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-28 space-y-1.5">
                  {index === 0 && <Label>Quantity</Label>}
                  <Input
                    type="number"
                    min={1}
                    step="1"
                    inputMode="numeric"
                    aria-label={`Quantity for line ${index + 1}`}
                    aria-invalid={touched && !qtyValid}
                    value={line.quantity}
                    onChange={(e) => updateLine(index, { quantity: e.target.value })}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove line ${index + 1}`}
                  disabled={lines.length === 1}
                  onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))}
                >
                  <Trash2 className="size-4 text-danger" aria-hidden />
                </Button>
              </div>
            );
          })}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setLines((prev) => [...prev, { product_id: "", quantity: "" }])}
          >
            <Plus className="mr-1.5 size-4" aria-hidden />
            Add product
          </Button>

          {touched && hasDuplicateProduct && (
            <p className="text-sm text-danger">
              Each product can only appear once — combine the duplicate lines.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" asChild>
          <Link href={cancelHref}>Cancel</Link>
        </Button>
        <Button type="button" disabled={submitting || (touched && !canSubmit)} onClick={submit}>
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}
