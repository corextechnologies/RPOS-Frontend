"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
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
import {
  useReceiveWarehouseStock,
  useWarehouseProductOptions,
} from "@/lib/hooks/use-warehouse-inventory";
import {
  receiveStockDefaults,
  receiveStockSchema,
  type ReceiveStockForm,
} from "@/lib/schemas/warehouse-stock";
import { isMissingWarehouseAssignment } from "@/lib/types/warehouse";

export default function ReceiveStockPage() {
  const { products, isLoading, isError, error } = useWarehouseProductOptions();
  const receiveStock = useReceiveWarehouseStock();

  const form = useForm<ReceiveStockForm>({
    resolver: zodResolver(receiveStockSchema),
    defaultValues: receiveStockDefaults,
  });

  const onSubmit = async (values: ReceiveStockForm) => {
    await receiveStock.mutateAsync({
      product_id: values.product_id,
      quantity: Number(values.quantity),
      batch_code: values.batch_code || undefined,
      expiry_date: values.expiry_date || undefined,
      notes: values.notes || undefined,
    });
    // Intake is repetitive — keep the manager on the form for the next delivery.
    form.reset(receiveStockDefaults);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/warehouse/inventory" aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
            Receive stock
          </h1>
          <p className="text-sm text-muted">
            Record incoming stock into your warehouse.
          </p>
        </div>
      </div>

      {isMissingWarehouseAssignment(error) ? (
        <WarehouseUnassigned />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Delivery details</CardTitle>
            <CardDescription>
              Quantity is added to the matching batch — existing stock is never
              overwritten.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : isError ? (
              <ErrorState description="Failed to load products." />
            ) : products.length === 0 ? (
              <EmptyState
                title="No products available"
                description="Products can only be selected once they exist in your warehouse. Ask your Admin to stock this warehouse first."
              />
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  <FormField
                    control={form.control}
                    name="product_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
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
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
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

                  {/* Batch and expiry drive the expiry alert system, so they are
                      presented as first-class fields rather than fine print. */}
                  <div className="space-y-5 rounded-xl border border-line bg-surface-2/40 px-4 py-4">
                    <div className="space-y-0.5">
                      <p className="font-medium text-content">Batch & expiry</p>
                      <p className="text-sm text-muted">
                        These drive expiry alerts. Leave both blank only for
                        non-perishable, unbatched stock.
                      </p>
                    </div>

                    <FormField
                      control={form.control}
                      name="batch_code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Batch code</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. B-2026-07" {...field} />
                          </FormControl>
                          <p className="text-sm text-muted">
                            Stock with the same batch code is tracked together.
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="expiry_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Expiry date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea placeholder="e.g. Supplier delivery" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-3 pt-2">
                    <Button type="button" variant="outline" asChild>
                      <Link href="/warehouse/inventory">Cancel</Link>
                    </Button>
                    <Button type="submit" disabled={receiveStock.isPending}>
                      {receiveStock.isPending ? "Receiving…" : "Receive stock"}
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
