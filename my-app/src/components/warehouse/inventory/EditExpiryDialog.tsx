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
  updateStockExpirySchema,
  type UpdateStockExpiryForm,
} from "@/lib/schemas/warehouse-stock";
import type { InventoryItem } from "@/lib/types/warehouse";
import { StockItemSummary } from "./StockItemSummary";

interface EditExpiryDialogProps {
  /** The batch being edited; `null` keeps the dialog closed. */
  item: InventoryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: UpdateStockExpiryForm) => Promise<void>;
  isSubmitting: boolean;
}

/**
 * Correct a batch's expiry date — set it, change it, or clear it for
 * non-perishable stock. Only the date changes; quantity is never touched here.
 */
export function EditExpiryDialog({
  item,
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: EditExpiryDialogProps) {
  const form = useForm<UpdateStockExpiryForm>({
    resolver: zodResolver(updateStockExpirySchema),
    defaultValues: { expiry_date: "" },
  });

  useEffect(() => {
    if (open && item) {
      form.reset({ expiry_date: item.expiry_date ?? "" });
    }
  }, [open, item, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit expiry date</DialogTitle>
          <DialogDescription>
            Set or correct when this batch expires. Leave it blank for
            non-perishable stock.
          </DialogDescription>
        </DialogHeader>

        {item && <StockItemSummary item={item} />}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="expiry_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expiry date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
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
                {isSubmitting ? "Saving…" : "Save expiry date"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
