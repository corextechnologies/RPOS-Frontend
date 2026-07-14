"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { LocationCreateForm } from "@/components/admin/locations/LocationCreateForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/state";
import { useWarehouses, useUpdateWarehouse } from "@/lib/hooks/use-locations";
import type { LocationForm } from "@/lib/schemas/location";
import { ApiError } from "@/lib/types/super-admin";

export default function EditWarehousePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const warehouses = useWarehouses();
  const updateWarehouse = useUpdateWarehouse();
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const warehouse = useMemo(
    () => warehouses.data?.find((item) => item.id === id),
    [warehouses.data, id],
  );

  const defaultValues = useMemo(() => {
    if (!warehouse) return undefined;
    return {
      name: warehouse.name,
      location: warehouse.location ?? "",
    };
  }, [warehouse]);

  const onSubmit = async (values: LocationForm) => {
    setErrorMessage(undefined);
    try {
      await updateWarehouse.mutateAsync({
        id,
        body: {
          name: values.name,
          location: values.location || undefined,
        },
      });
      router.push("/admin/warehouses");
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Failed to update warehouse.");
      }
    }
  };

  if (warehouses.isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (warehouses.isError) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/warehouses" aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <ErrorState
          title="Failed to load warehouse"
          description="Could not load warehouses for editing."
          onRetry={() => warehouses.refetch()}
        />
      </div>
    );
  }

  if (!warehouse) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/warehouses" aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <ErrorState
          title="Warehouse not found"
          description="This warehouse is missing or was deleted."
          onRetry={() => warehouses.refetch()}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/warehouses" aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
            Edit warehouse
          </h1>
          <p className="text-sm text-muted">Update the warehouse name or location.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Warehouse details</CardTitle>
          <CardDescription>
            Name is required. Location is optional and shown on the warehouses list.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LocationCreateForm
            kind="warehouse"
            defaultValues={defaultValues}
            submitLabel="Save changes"
            onSubmit={onSubmit}
            isSubmitting={updateWarehouse.isPending}
            errorMessage={errorMessage}
          />
        </CardContent>
      </Card>
    </div>
  );
}
