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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { STOCK_UNITS, STOCK_UNIT_LABEL } from "@/lib/stock-unit";
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
    defaultValues: { name: "", sku: "", kind: "RAW_MATERIAL", stock_unit: "EACH" },
  });

  // Reseed whenever a different product is opened.
  useEffect(() => {
    if (open && product) {
      form.reset({
        name: product.name,
        sku: product.sku ?? "",
        // Fall back to the default only for legacy rows that never had a kind.
        kind: product.kind ?? "RAW_MATERIAL",
        // Same for the unit — legacy rows predate it.
        stock_unit: product.stock_unit ?? "EACH",
      });
    }
  }, [open, product, form]);

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
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a unit" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {STOCK_UNITS.map((unit) => (
                        <SelectItem key={unit} value={unit}>
                          {STOCK_UNIT_LABEL[unit]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted">
                    How this product is stocked and counted.
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
