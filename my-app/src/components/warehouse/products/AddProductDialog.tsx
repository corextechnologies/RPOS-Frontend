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

export function AddProductDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: AddProductDialogProps) {
  const form = useForm<CreateWarehouseProductForm>({
    resolver: zodResolver(createWarehouseProductSchema),
    defaultValues: createWarehouseProductDefaults,
    // Validate as the user types so the submit button can stay disabled until
    // every required field is filled, rather than only complaining on submit.
    mode: "onChange",
  });

  const canSubmit = form.formState.isValid && !isSubmitting;

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
              name="kind"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>What is it?</FormLabel>
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
                  {/* The kitchen makes finished goods, so there is no third
                      option here — offering one would imply the warehouse could
                      create a burger. */}
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
                    How this product is stocked and counted — each, kg, litre, and
                    so on.
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
                    Must be unique across your restaurant.
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
              <Button type="submit" disabled={!canSubmit}>
                {isSubmitting ? "Adding…" : "Add product"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
