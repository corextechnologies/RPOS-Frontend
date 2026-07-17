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
import { Switch } from "@/components/ui/switch";
import { pricingPatch, updatePricingSchema, type UpdatePricingForm } from "@/lib/schemas/pricing";
import type { ProductPricing, UpdateProductPricingInput } from "@/lib/types/admin";

interface EditPricingDialogProps {
  product: ProductPricing | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Receives a PATCH built from dirty fields only — see `pricingPatch`. */
  onSubmit: (patch: UpdateProductPricingInput) => Promise<void>;
  isSubmitting: boolean;
}

export function EditPricingDialog({
  product,
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: EditPricingDialogProps) {
  /**
   * Values stay strings all the way through. The previous version parsed to
   * `Number` here and pushed `NaN` around for the empty case, which meant money
   * had been through a float before it was ever validated.
   */
  const form = useForm<UpdatePricingForm>({
    resolver: zodResolver(updatePricingSchema),
    values: {
      cost_price: product?.cost_price ?? "",
      selling_price: product?.selling_price ?? "",
      category: product?.category ?? "",
      is_available: product?.is_available ?? true,
    },
  });

  // A raw material has no sell price and no availability — those fields are
  // meaningless for a sack of flour, so they are REMOVED below rather than
  // disabled. The server 409s `product_not_sellable` on any attempt anyway.
  const isSellable = product?.is_sellable ?? true;

  const handleSubmit = async (values: UpdatePricingForm) => {
    // Dirty fields only — `pricingPatch` keeps the "absent leaves, null clears"
    // rule in one tested place rather than in every dialog that edits a product.
    await onSubmit(pricingPatch(values, form.formState.dirtyFields, isSellable));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit pricing</DialogTitle>
          <DialogDescription>
            {product
              ? isSellable
                ? `Pricing and availability for ${product.name}.`
                : `Cost of ${product.name}.`
              : "Pricing for this product."}
          </DialogDescription>
        </DialogHeader>

        {!isSellable && product && (
          <p className="rounded-lg bg-surface-2 px-3 py-2 text-xs text-muted">
            {product.kind === "RAW_MATERIAL"
              ? "A raw material — bought and consumed, never sold. Only its cost applies."
              : "This product can't be sold."}
          </p>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
            {isSellable && (
            <FormField
              control={form.control}
              name="selling_price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Selling price</FormLabel>
                  <FormControl>
                    <Input inputMode="decimal" placeholder="0.00" {...field} />
                  </FormControl>
                  <p className="text-xs text-faint">What the customer pays. Orders are priced from this — leave it empty and the
                    product can&apos;t be sold.</p>
                  <FormMessage />
                </FormItem>
              )}
            />
            )}

            <FormField
              control={form.control}
              name="cost_price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cost price</FormLabel>
                  <FormControl>
                    <Input inputMode="decimal" placeholder="0.00" {...field} />
                  </FormControl>
                  {/* Admin-only, and it never appears on a branch or POS
                      payload — that separation is structural, not cosmetic. */}
                  <p className="text-xs text-faint">Admin-only. Never shown to branches.</p>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isSellable && (
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <FormControl>
                    <Input placeholder="Mains, Drinks…" {...field} />
                  </FormControl>
                  <p className="text-xs text-faint">Groups the item on the till&apos;s menu.</p>
                  <FormMessage />
                </FormItem>
              )}
            />
            )}

            {isSellable && (
            <FormField
              control={form.control}
              name="is_available"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between gap-4 rounded-xl border border-line p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Available</FormLabel>
                    <p className="text-xs text-faint">Turn off to stop this being sold anywhere.</p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !form.formState.isDirty}>
                {isSubmitting ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
