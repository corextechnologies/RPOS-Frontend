"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { StockUnitSelect } from "./StockUnitSelect";
import {
  updateWarehouseProductSchema,
  type UpdateWarehouseProductForm,
} from "@/lib/schemas/warehouse-stock";
import type { WarehouseProduct } from "@/lib/types/warehouse";

/** The two kinds a warehouse may own — mirrors `AddProductDialog`'s `KINDS`. */
const KINDS = [
  {
    value: "RAW_MATERIAL" as const,
    label: "Raw material",
    hint: "Bought and consumed — flour, patties. Never sold on its own.",
  },
  {
    value: "RESALE" as const,
    label: "For resale",
    hint: "Bought and sold untouched — bottled drinks.",
  },
];

interface EditProductDialogProps {
  /** The product being edited; `null` keeps the dialog closed. */
  product: WarehouseProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: UpdateWarehouseProductForm) => Promise<void>;
  isSubmitting: boolean;
}

/**
 * Fill in or correct a product's catalog details — its name, category, or a SKU
 * that's been showing as "-".
 *
 * There is intentionally NO quantity field. Quantity lives on the inventory
 * row, not the product, and is changed through "Adjust quantity" / receiving /
 * write-off — never here. Usable from anywhere a product is listed (inventory,
 * the waste log), since it edits the catalog product, not a stock row.
 */
export function EditProductDialog({
  product,
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: EditProductDialogProps) {
  const form = useForm<UpdateWarehouseProductForm>({
    resolver: zodResolver(updateWarehouseProductSchema),
    defaultValues: {
      name: "",
      sku: "",
      kind: "RAW_MATERIAL",
      stock_unit: "EACH",
      units_per_pack: "",
    },
  });

  // Reseed only when the dialog opens or a genuinely different product loads —
  // keyed on `product.id`, NOT the object reference. The parent passes a fresh
  // object literal every render, so depending on `product` itself would re-run
  // this on every re-render (e.g. when `isPending` flips on save, or a
  // background inventory refetch lands) and wipe the user's in-progress edits —
  // notably snapping the unit back to its seed the instant "Save" is clicked.
  useEffect(() => {
    if (open && product) {
      form.reset({
        name: product.name,
        sku: product.sku ?? "",
        // Fall back to the default only for legacy rows that never had a kind.
        kind: product.kind ?? "RAW_MATERIAL",
        // Same for the unit — legacy rows predate it.
        stock_unit: product.stock_unit ?? "EACH",
        units_per_pack:
          product.units_per_pack != null && product.units_per_pack > 0
            ? String(product.units_per_pack)
            : "",
      });
    }
    // Intentionally keyed on identity, not the `product` object or `form`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product?.id]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit product</DialogTitle>
          <DialogDescription>
            Update this product&apos;s catalog details. To change how much is on
            hand, use &ldquo;Adjust quantity&rdquo; instead.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Flour" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="kind"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <div className="grid grid-cols-2 gap-2">
                    {KINDS.map((k) => (
                      <button
                        key={k.value}
                        type="button"
                        onClick={() => field.onChange(k.value)}
                        className={cn(
                          "rounded-xl border p-3 text-left transition",
                          field.value === k.value
                            ? "border-brand bg-brand/10"
                            : "border-line bg-surface hover:border-brand/50",
                        )}
                      >
                        <span className="text-sm font-medium text-content">{k.label}</span>
                        <span className="mt-0.5 block text-xs text-faint">{k.hint}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted">
                    Things the kitchen makes are added by the kitchen, not here.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="stock_unit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit</FormLabel>
                  <FormControl>
                    <StockUnitSelect
                      value={field.value}
                      onValueChange={field.onChange}
                    />
                  </FormControl>
                  <p className="text-xs text-muted">
                    How this product is stocked and counted.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="units_per_pack"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Units per pack (optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      step="1"
                      inputMode="numeric"
                      placeholder="e.g. 5"
                      {...field}
                    />
                  </FormControl>
                  <p className="text-xs text-muted">
                    1 pack = this many of the unit above. Clear to hide pack
                    counts on inventory.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sku"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SKU</FormLabel>
                  <FormControl>
                    <Input placeholder="FL-001" {...field} />
                  </FormControl>
                  <p className="text-xs text-muted">
                    Optional, but must be unique across your restaurant.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving…" : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
