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
import { Textarea } from "@/components/ui/textarea";
import {
  wasteStockDefaults,
  wasteStockSchema,
  type WasteStockForm,
} from "@/lib/schemas/warehouse-stock";
import type { InventoryItem } from "@/lib/types/warehouse";
import { StockItemSummary } from "./StockItemSummary";

interface WasteStockDialogProps {
  item: InventoryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: WasteStockForm) => Promise<void>;
  isSubmitting: boolean;
  /** Preselects EXPIRY when opened from the near-expiry list. */
  defaultMovementType?: WasteStockForm["movement_type"];
}

export function WasteStockDialog({
  item,
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  defaultMovementType = "WASTE",
}: WasteStockDialogProps) {
  const form = useForm<WasteStockForm>({
    resolver: zodResolver(wasteStockSchema),
    defaultValues: wasteStockDefaults,
  });

  useEffect(() => {
    if (open) {
      form.reset({ ...wasteStockDefaults, movement_type: defaultMovementType });
    }
  }, [open, defaultMovementType, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Write off stock</DialogTitle>
          <DialogDescription>
            Remove wasted or expired stock from this batch. This cannot be undone
            from here — use an adjustment to correct a mistake.
          </DialogDescription>
        </DialogHeader>

        {item && <StockItemSummary item={item} />}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="movement_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="WASTE">Waste</SelectItem>
                      <SelectItem value="EXPIRY">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={item?.quantity}
                      step="1"
                      inputMode="numeric"
                      placeholder="0"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g. Past expiry" {...field} />
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
                {isSubmitting ? "Writing off…" : "Write off stock"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
