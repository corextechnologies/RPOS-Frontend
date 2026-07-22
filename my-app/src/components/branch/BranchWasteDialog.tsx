"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { WasteReasonSelect } from "@/components/stock/WasteReasonSelect";
import {
  defaultReasonFor,
  MOVEMENT_TYPE_LABELS,
} from "@/lib/stock/waste-reason";
import {
  wasteStockDefaults,
  wasteStockSchema,
  type WasteStockForm,
} from "@/lib/schemas/warehouse-stock";
import type { BranchInventoryItem } from "@/lib/types/branch";

interface BranchWasteDialogProps {
  item: BranchInventoryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: WasteStockForm) => Promise<void>;
  isSubmitting: boolean;
  /** Preselects EXPIRY when opened from an expired row. */
  defaultMovementType?: WasteStockForm["movement_type"];
}

/**
 * Write off wasted or expired stock at a branch. Mirrors the warehouse/kitchen
 * write-off; the waste-reason list is the shared one so waste-rate analytics
 * aggregates across every portal.
 */
export function BranchWasteDialog({
  item,
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  defaultMovementType = "WASTE",
}: BranchWasteDialogProps) {
  const form = useForm<WasteStockForm>({
    resolver: zodResolver(wasteStockSchema),
    defaultValues: wasteStockDefaults,
  });

  useEffect(() => {
    if (open) {
      form.reset({
        ...wasteStockDefaults,
        movement_type: defaultMovementType,
        waste_reason: defaultReasonFor(defaultMovementType),
      });
    }
  }, [open, defaultMovementType, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Write off stock</DialogTitle>
          <DialogDescription>
            Remove wasted or expired stock from this batch. This cannot be undone
            from here.
          </DialogDescription>
        </DialogHeader>

        {item && (
          <div className="rounded-xl border border-line bg-surface px-3 py-2 text-sm">
            <p className="font-medium text-content">{item.product_name}</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-muted">
              {item.batch_code ? (
                <span>Batch {item.batch_code}</span>
              ) : (
                <Badge variant="secondary">Unbatched</Badge>
              )}
              <span>{item.quantity} on hand</span>
              {item.expiry_date && <span>Expires {item.expiry_date}</span>}
            </div>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="waste_reason"
              render={({ field }) => (
                <WasteReasonSelect value={field.value} onChange={field.onChange} />
              )}
            />

            <FormField
              control={form.control}
              name="movement_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Movement type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(MOVEMENT_TYPE_LABELS).map(([value, text]) => (
                        <SelectItem key={value} value={value}>
                          {text}
                        </SelectItem>
                      ))}
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
