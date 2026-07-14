"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
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
  locationDefaults,
  locationSchema,
  type LocationForm,
} from "@/lib/schemas/location";
import type { LocationKind } from "./LocationList";

const KIND_LABELS: Record<LocationKind, string> = {
  branch: "branch",
  kitchen: "kitchen",
  warehouse: "warehouse",
};

interface LocationCreateFormProps {
  kind: LocationKind;
  onSubmit: (values: LocationForm) => void;
  isSubmitting: boolean;
  errorMessage?: string;
}

export function LocationCreateForm({
  kind,
  onSubmit,
  isSubmitting,
  errorMessage,
}: LocationCreateFormProps) {
  const form = useForm<LocationForm>({
    resolver: zodResolver(locationSchema),
    defaultValues: locationDefaults,
  });

  const label = KIND_LABELS[kind];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder={`Downtown ${label}`} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location</FormLabel>
              <FormControl>
                <Input placeholder="City Center" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {kind === "branch" && (
          <p className="text-sm text-muted">
            Your plan enforces a branch limit. Creating beyond the limit will be rejected.
          </p>
        )}

        {errorMessage && <p className="text-sm text-danger">{errorMessage}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating…" : `Create ${label}`}
          </Button>
        </div>
      </form>
    </Form>
  );
}
