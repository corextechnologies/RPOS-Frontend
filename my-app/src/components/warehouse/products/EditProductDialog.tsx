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
  updateWarehouseProductSchema,
  type UpdateWarehouseProductForm,
} from "@/lib/schemas/warehouse-stock";
import type { InventoryItem } from "@/lib/types/warehouse";

interface EditProductDialogProps {
  /** The row being edited; `null` keeps the dialog closed. */
  item: InventoryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: UpdateWarehouseProductForm) => Promise<void>;
  isSubmitting: boolean;
}

/**
 * Fill in the catalog details a product was created without — most often a SKU
 * that has been showing as "-" in inventory.
 *
 * There is intentionally NO quantity field. Quantity lives on the inventory
 * row, not the product, and is changed through "Adjust quantity" / receiving —
 * never here. The read-only line just reminds the editor what's on hand; it is
 * not editable and is never submitted.
 */
export function EditProductDialog({
  item,
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: EditProductDialogProps) {
  const form = useForm<UpdateWarehouseProductForm>({
    resolver: zodResolver(updateWarehouseProductSchema),
    defaultValues: { name: "", sku: "" },
  });

  // Reseed whenever a different row is opened.
  useEffect(() => {
    if (open && item) {
      form.reset({
        name: item.product.name,
        sku: item.product.sku ?? "",
      });
    }
  }, [open, item, form]);

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

            {/* Read-only: on-hand quantity is not editable from the catalog. */}
            <div className="rounded-xl border border-line bg-surface px-3 py-2">
              <p className="text-xs text-muted">On hand (not editable here)</p>
              <p className="text-sm font-medium text-content">
                {item ? item.quantity : "-"}
                {item?.batch_code ? ` · ${item.batch_code}` : ""}
              </p>
            </div>

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
