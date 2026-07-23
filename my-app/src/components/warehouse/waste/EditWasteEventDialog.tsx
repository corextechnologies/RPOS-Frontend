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
import { WasteReasonSelect } from "@/components/stock/WasteReasonSelect";
import {
  defaultReasonFor,
  MOVEMENT_TYPE_LABELS,
} from "@/lib/stock/waste-reason";
import {
  wasteStockSchema,
  wasteStockDefaults,
  type WasteStockForm,
} from "@/lib/schemas/warehouse-stock";
import type { WasteEvent } from "@/lib/types/waste";

interface EditWasteEventDialogProps {
  /** The waste record being corrected; `null` keeps the dialog closed. */
  event: WasteEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: WasteStockForm) => Promise<void>;
  isSubmitting: boolean;
}

/**
 * Correct a past write-off — its quantity, reason, type, or notes. Changing the
 * quantity re-syncs the batch's on-hand server-side, so a mis-keyed write-off
 * can be fixed here rather than with a separate adjustment.
 */
export function EditWasteEventDialog({
  event,
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: EditWasteEventDialogProps) {
  const form = useForm<WasteStockForm>({
    resolver: zodResolver(wasteStockSchema),
    defaultValues: wasteStockDefaults,
  });

  useEffect(() => {
    if (open && event) {
      form.reset({
        quantity: String(event.quantity),
        waste_reason:
          event.waste_reason ?? defaultReasonFor(event.movement_type),
        movement_type: event.movement_type,
        notes: event.notes ?? "",
      });
    }
  }, [open, event, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit waste record</DialogTitle>
          <DialogDescription>
            {event ? (
              <>
                Correcting the write-off for{" "}
                <span className="font-medium text-content">
                  {event.product.name}
                </span>
                {event.batch_code ? ` · batch ${event.batch_code}` : ""}.
              </>
            ) : (
              "Correct a past write-off."
            )}
          </DialogDescription>
        </DialogHeader>

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
                      min={0}
                      step="any"
                      inputMode="decimal"
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
                {isSubmitting ? "Saving…" : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
