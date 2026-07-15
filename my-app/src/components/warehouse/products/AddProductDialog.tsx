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
  createWarehouseProductDefaults,
  createWarehouseProductSchema,
  type CreateWarehouseProductForm,
} from "@/lib/schemas/warehouse-stock";

interface AddProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CreateWarehouseProductForm) => Promise<void>;
  isSubmitting: boolean;
}

/**
 * The warehouse introduces a product; Admin prices it afterwards.
 *
 * There is deliberately no cost field: the response has no `cost_price` at all,
 * and procurement cost is Admin-only.
 */
export function AddProductDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: AddProductDialogProps) {
  const form = useForm<CreateWarehouseProductForm>({
    resolver: zodResolver(createWarehouseProductSchema),
    defaultValues: createWarehouseProductDefaults,
  });

  useEffect(() => {
    if (open) form.reset(createWarehouseProductDefaults);
  }, [open, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add product</DialogTitle>
          <DialogDescription>
            Adds the product to your catalog so you can receive stock against it.
            Admin sets the cost price afterwards.
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
                {isSubmitting ? "Adding…" : "Add product"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
