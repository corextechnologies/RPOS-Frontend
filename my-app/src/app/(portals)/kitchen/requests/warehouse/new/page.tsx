"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { KitchenNoAccess } from "@/components/kitchen/KitchenNoAccess";
import { KitchenUnassigned } from "@/components/kitchen/KitchenUnassigned";
import { NewWarehouseRequestForm } from "@/components/kitchen/requests/NewWarehouseRequestForm";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/state";
import { useAuth } from "@/lib/auth";
import { useKitchenProductOptions } from "@/lib/hooks/use-kitchen-inventory";
import {
  useCreateKitchenWarehouseRequest,
  useKitchenWarehouses,
} from "@/lib/hooks/use-kitchen-requests";
import type { CreateKitchenWarehouseRequestForm } from "@/lib/schemas/kitchen-request";
import { isMissingKitchenAssignment } from "@/lib/types/kitchen";

export default function NewKitchenWarehouseRequestPage() {
  const router = useRouter();
  const { can } = useAuth();
  const allowed = can("kitchen-warehouse-requests:create");

  const warehouses = useKitchenWarehouses();
  const products = useKitchenProductOptions();
  const createRequest = useCreateKitchenWarehouseRequest();

  const unassigned =
    isMissingKitchenAssignment(warehouses.error) ||
    isMissingKitchenAssignment(products.error);

  const onSubmit = async (values: CreateKitchenWarehouseRequestForm) => {
    await createRequest.mutateAsync({
      warehouse_id: values.warehouse_id,
      lines: values.lines.map((line) => ({
        product_id: line.product_id,
        quantity_requested: Number(line.quantity_requested),
      })),
      notes: values.notes || undefined,
    });
    router.push("/kitchen/requests/warehouse");
  };

  const body = () => {
    if (!allowed) return <KitchenNoAccess />;
    if (unassigned) return <KitchenUnassigned />;

    if (warehouses.isPending || products.isLoading) {
      return (
        <Card>
          <CardContent className="space-y-3 p-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      );
    }

    // A failure here is a failure, not an empty list — the distinction matters
    // now that the warehouse list is a real query rather than local config.
    if (warehouses.isError) {
      return (
        <Card>
          <CardContent className="p-0">
            <ErrorState
              description="Failed to load warehouses."
              onRetry={() => warehouses.refetch()}
            />
          </CardContent>
        </Card>
      );
    }

    if (products.isError) {
      return (
        <Card>
          <CardContent className="p-0">
            <ErrorState description="Failed to load products." />
          </CardContent>
        </Card>
      );
    }

    // An empty list now means exactly one thing: Admin has not added a
    // warehouse. It is no longer ambiguous with a missing local config.
    if ((warehouses.data?.length ?? 0) === 0) {
      return (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              title="No warehouses yet"
              description="Your Admin has not added a warehouse to this restaurant. Once they do, it appears here."
            />
          </CardContent>
        </Card>
      );
    }

    if (products.products.length === 0) {
      return (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              title="No products available"
              description="Products can only be selected once they exist in your kitchen."
            />
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle>Request lines</CardTitle>
          <CardDescription>
            The warehouse approves and dispatches; you confirm receipt when it
            arrives.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NewWarehouseRequestForm
            warehouses={warehouses.data ?? []}
            products={products.products}
            isSubmitting={createRequest.isPending}
            onSubmit={onSubmit}
          />
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/kitchen/requests/warehouse" aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
            Request stock
          </h1>
          <p className="text-sm text-muted">Ask a warehouse to send raw stock.</p>
        </div>
      </div>

      {body()}
    </div>
  );
}
