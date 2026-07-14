"use client";

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
  updatePricingSchema,
  type UpdatePricingForm,
} from "@/lib/schemas/pricing";
import type { ProductPricing } from "@/lib/types/admin";

interface EditPricingDialogProps {
  product: ProductPricing | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: UpdatePricingForm) => Promise<void>;
  isSubmitting: boolean;
}

export function EditPricingDialog({
  product,
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: EditPricingDialogProps) {
  const form = useForm<UpdatePricingForm>({
    resolver: zodResolver(updatePricingSchema),
    values: {
      cost_price: product?.cost_price != null ? Number(product.cost_price) : 0,
    },
  });

  const handleSubmit = async (values: UpdatePricingForm) => {
    await onSubmit(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit cost price</DialogTitle>
          <DialogDescription>
            {product
              ? `Set the Admin-only cost price for ${product.name}.`
              : "Set the Admin-only cost price for this product."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="cost_price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cost price</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="0.00"
                      value={Number.isFinite(field.value) ? field.value : ""}
                      onChange={(e) => {
                        const next = e.target.value;
                        field.onChange(next === "" ? Number.NaN : Number(next));
                      }}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                  </FormControl>
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
                {isSubmitting ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
