"use client";

import Link from "next/link";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  createKitchenWarehouseRequestDefaults,
  createKitchenWarehouseRequestSchema,
  kitchenRequestLineDefaults,
  type CreateKitchenWarehouseRequestForm,
} from "@/lib/schemas/kitchen-request";
import type { KitchenProduct, KitchenWarehouse } from "@/lib/types/kitchen";

interface NewWarehouseRequestFormProps {
  warehouses: KitchenWarehouse[];
  products: KitchenProduct[];
  isSubmitting: boolean;
  onSubmit: (values: CreateKitchenWarehouseRequestForm) => Promise<void>;
}

/**
 * Split out from the page so it mounts only once the warehouse list has loaded:
 * `useForm` reads `defaultValues` once, at mount, so preselecting a lone
 * warehouse has to happen with the data already in hand rather than by pushing
 * it into form state from an effect later.
 */
export function NewWarehouseRequestForm({
  warehouses,
  products,
  isSubmitting,
  onSubmit,
}: NewWarehouseRequestFormProps) {
  const form = useForm<CreateKitchenWarehouseRequestForm>({
    resolver: zodResolver(createKitchenWarehouseRequestSchema),
    defaultValues: {
      ...createKitchenWarehouseRequestDefaults,
      // With exactly one warehouse there is no choice to make.
      warehouse_id: warehouses.length === 1 ? warehouses[0].id : "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lines",
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="warehouse_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Warehouse</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a warehouse" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {warehouses.map((warehouse) => (
                    <SelectItem key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                      {warehouse.location ? ` · ${warehouse.location}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="flex flex-col gap-3 rounded-xl border border-line bg-surface-2/40 px-4 py-4 sm:flex-row sm:items-start"
            >
              <FormField
                control={form.control}
                name={`lines.${index}.product_id`}
                render={({ field: productField }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Product</FormLabel>
                    <Select
                      value={productField.value}
                      onValueChange={productField.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a product" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name}
                            {product.sku ? ` · ${product.sku}` : ""}
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
                name={`lines.${index}.quantity_requested`}
                render={({ field: qtyField }) => (
                  <FormItem className="sm:w-32">
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        step="1"
                        inputMode="numeric"
                        placeholder="0"
                        {...qtyField}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {fields.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove line ${index + 1}`}
                  className="text-danger sm:mt-8"
                  onClick={() => remove(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => append(kitchenRequestLineDefaults)}
        >
          <Plus className="h-4 w-4" />
          Add line
        </Button>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea placeholder="e.g. Weekly top-up" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" asChild>
            <Link href="/kitchen/requests/warehouse">Cancel</Link>
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Sending…" : "Send request"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
