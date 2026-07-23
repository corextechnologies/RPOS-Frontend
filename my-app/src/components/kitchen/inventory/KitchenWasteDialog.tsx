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
import { defaultReasonFor, MOVEMENT_TYPE_LABELS } from "@/lib/stock/waste-reason";
import {
  kitchenWasteDefaults,
  kitchenWasteSchema,
  type KitchenWasteForm,
} from "@/lib/schemas/kitchen-stock";
import type { KitchenInventoryItem } from "@/lib/types/kitchen";
import { KitchenStockSummary } from "./KitchenStockSummary";

interface KitchenWasteDialogProps {
  item: KitchenInventoryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: KitchenWasteForm) => Promise<void>;
  isSubmitting: boolean;
  /** Preselects EXPIRY and the matching reason from the near-expiry list. */
  defaultMovementType?: KitchenWasteForm["movement_type"];
}

export function KitchenWasteDialog({
  item,
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  defaultMovementType = "WASTE",
}: KitchenWasteDialogProps) {
  const form = useForm<KitchenWasteForm>({
    resolver: zodResolver(kitchenWasteSchema),
    defaultValues: kitchenWasteDefaults,
  });

  useEffect(() => {
    if (open) {
      form.reset({
        ...kitchenWasteDefaults,
        movement_type: defaultMovementType,
        // Opening from the near-expiry list already says why.
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

        {item && <KitchenStockSummary item={item} />}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* Shared with the Warehouse — one list, one analytics dimension. */}
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
                      {Object.entries(MOVEMENT_TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
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
                      // A soft bound only: the server is the authority, and
                      // answers `insufficient_stock` if this is beaten.
                      max={item?.quantity}
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
                    <Textarea placeholder="e.g. Left out overnight" {...field} />
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
