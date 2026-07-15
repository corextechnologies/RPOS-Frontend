"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { WarehouseUnassigned } from "@/components/warehouse/WarehouseUnassigned";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/state";
import { Textarea } from "@/components/ui/textarea";
import { useWarehouseProductOptions } from "@/lib/hooks/use-warehouse-inventory";
import { useCreateWarehousePo } from "@/lib/hooks/use-warehouse-requests";
import {
  createPurchaseOrderDefaults,
  createPurchaseOrderSchema,
  purchaseOrderLineDefaults,
  type CreatePurchaseOrderForm,
} from "@/lib/schemas/warehouse-po";
import { isMissingWarehouseAssignment } from "@/lib/types/warehouse";

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const { products, isLoading, isError, error } = useWarehouseProductOptions();
  const createPo = useCreateWarehousePo();

  const form = useForm<CreatePurchaseOrderForm>({
    resolver: zodResolver(createPurchaseOrderSchema),
    defaultValues: createPurchaseOrderDefaults,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lines",
  });

  const onSubmit = async (values: CreatePurchaseOrderForm) => {
    await createPo.mutateAsync({
      lines: values.lines.map((line) => ({
        product_id: line.product_id,
        quantity_requested: Number(line.quantity_requested),
      })),
      notes: values.notes || undefined,
    });
    router.push("/warehouse/requests/po");
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/warehouse/requests/po" aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
            New purchase order
          </h1>
          <p className="text-sm text-muted">Request stock from Admin.</p>
        </div>
      </div>

      {isMissingWarehouseAssignment(error) ? (
        <WarehouseUnassigned />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Order lines</CardTitle>
            <CardDescription>
              Admin reviews each line and may approve a smaller quantity than
              requested.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : isError ? (
              <ErrorState description="Failed to load products." />
            ) : products.length === 0 ? (
              <EmptyState
                title="No products available"
                description="Products can only be selected once they exist in your warehouse."
              />
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
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
                    onClick={() => append(purchaseOrderLineDefaults)}
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
                          <Textarea placeholder="e.g. Weekly restock" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-3 pt-2">
                    <Button type="button" variant="outline" asChild>
                      <Link href="/warehouse/requests/po">Cancel</Link>
                    </Button>
                    <Button type="submit" disabled={createPo.isPending}>
                      {createPo.isPending ? "Sending…" : "Send to Admin"}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
