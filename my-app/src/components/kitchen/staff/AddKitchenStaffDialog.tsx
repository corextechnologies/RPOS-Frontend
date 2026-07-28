"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { StaffFormFields } from "@/components/staff/StaffFormFields";
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
  createKitchenStaffDefaults,
  createKitchenStaffSchema,
  type CreateKitchenStaffForm,
} from "@/lib/schemas/kitchen-staff";

interface AddKitchenStaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CreateKitchenStaffForm) => Promise<void>;
  isSubmitting: boolean;
}

export function AddKitchenStaffDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: AddKitchenStaffDialogProps) {
  const form = useForm<CreateKitchenStaffForm>({
    resolver: zodResolver(createKitchenStaffSchema),
    defaultValues: createKitchenStaffDefaults,
  });

  useEffect(() => {
    if (open) form.reset(createKitchenStaffDefaults);
  }, [open, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Eight fields including three uploads — taller than the default, and
          scrollable so the footer stays reachable on a laptop screen. */}
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add staff member</DialogTitle>
          <DialogDescription>
            A roster record for someone in your kitchen. They cannot sign in —
            this is just their details.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <StaffFormFields
              control={form.control}
              namePlaceholder="Priya Sharma"
              emailPlaceholder="chef@restaurant.com"
              roleField={
                <FormField
                  control={form.control}
                  name="job_title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <FormControl>
                        <Input placeholder="Head Chef" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              }
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
                {isSubmitting ? "Adding…" : "Add staff member"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
