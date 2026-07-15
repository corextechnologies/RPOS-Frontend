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
import { Textarea } from "@/components/ui/textarea";
import {
  adjustStockDefaults,
  adjustStockSchema,
  type AdjustStockForm,
} from "@/lib/schemas/warehouse-stock";
import type { InventoryItem } from "@/lib/types/warehouse";
import { StockItemSummary } from "./StockItemSummary";

interface AdjustStockDialogProps {
  item: InventoryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: AdjustStockForm) => Promise<void>;
  isSubmitting: boolean;
}

export function AdjustStockDialog({
  item,
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: AdjustStockDialogProps) {
  const form = useForm<AdjustStockForm>({
    resolver: zodResolver(adjustStockSchema),
    defaultValues: adjustStockDefaults,
  });

  useEffect(() => {
    if (open) form.reset(adjustStockDefaults);
  }, [open, form]);

  const delta = Number(form.watch("quantity_delta"));
  const preview =
    item && Number.isInteger(delta) && delta !== 0
      ? item.quantity + delta
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust quantity</DialogTitle>
          <DialogDescription>
            Correct the counted quantity for this batch. Use a negative number to
            remove stock.
          </DialogDescription>
        </DialogHeader>

        {item && <StockItemSummary item={item} />}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="quantity_delta"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adjustment</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="1"
                      inputMode="numeric"
                      placeholder="e.g. -5"
                      {...field}
                    />
                  </FormControl>
                  {preview !== null && (
                    <p
                      className={
                        preview < 0 ? "text-sm text-danger" : "text-sm text-muted"
                      }
                    >
                      {preview < 0
                        ? "That would drop this batch below zero."
                        : `New on-hand for this batch: ${preview}`}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g. Count correction" {...field} />
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
                {isSubmitting ? "Adjusting…" : "Adjust quantity"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
