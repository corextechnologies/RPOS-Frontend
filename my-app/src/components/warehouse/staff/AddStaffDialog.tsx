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
  createWarehouseStaffDefaults,
  createWarehouseStaffSchema,
  type CreateWarehouseStaffForm,
} from "@/lib/schemas/warehouse-staff";

interface AddStaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CreateWarehouseStaffForm) => Promise<void>;
  isSubmitting: boolean;
}

export function AddStaffDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: AddStaffDialogProps) {
  const form = useForm<CreateWarehouseStaffForm>({
    resolver: zodResolver(createWarehouseStaffSchema),
    defaultValues: createWarehouseStaffDefaults,
  });

  useEffect(() => {
    if (open) form.reset(createWarehouseStaffDefaults);
  }, [open, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Eight fields including three uploads — taller than the default, and
          scrollable so the footer stays reachable on a laptop screen. */}
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add staff member</DialogTitle>
          {/* No mention of sign-in or emailed credentials: warehouse staff are
              personnel records now, not accounts. */}
          <DialogDescription>
            A roster record for someone in your warehouse. They cannot sign in —
            this is just their details.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <StaffFormFields
              control={form.control}
              namePlaceholder="Ali Warehouse"
              emailPlaceholder="staff@restaurant.com"
              roleField={
                <FormField
                  control={form.control}
                  name="job_title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <FormControl>
                        <Input placeholder="Loader" {...field} />
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
