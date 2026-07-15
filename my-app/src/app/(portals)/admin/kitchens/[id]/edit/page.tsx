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
import { useKitchens, useUpdateKitchen } from "@/lib/hooks/use-locations";
import type { LocationForm } from "@/lib/schemas/location";
import { ApiError } from "@/lib/types/super-admin";

export default function EditKitchenPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const kitchens = useKitchens();
  const updateKitchen = useUpdateKitchen();
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const kitchen = useMemo(
    () => kitchens.data?.find((item) => item.id === id),
    [kitchens.data, id],
  );

  const defaultValues = useMemo(() => {
    if (!kitchen) return undefined;
    return {
      name: kitchen.name,
      location: kitchen.location ?? "",
    };
  }, [kitchen]);

  const onSubmit = async (values: LocationForm) => {
    setErrorMessage(undefined);
    try {
      await updateKitchen.mutateAsync({
        id,
        body: {
          name: values.name,
          location: values.location || undefined,
        },
      });
      router.push("/admin/kitchens");
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Failed to update kitchen.");
      }
    }
  };

  if (kitchens.isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (kitchens.isError) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/kitchens" aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <ErrorState
          title="Failed to load kitchen"
          description="Could not load kitchens for editing."
          onRetry={() => kitchens.refetch()}
        />
      </div>
    );
  }

  if (!kitchen) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/kitchens" aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <ErrorState
          title="Kitchen not found"
          description="This kitchen is missing or was deleted."
          onRetry={() => kitchens.refetch()}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/kitchens" aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
            Edit kitchen
          </h1>
          <p className="text-sm text-muted">Update the kitchen name or location.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Kitchen details</CardTitle>
          <CardDescription>
            Name is required. Location is optional and shown on the kitchens list.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LocationCreateForm
            kind="kitchen"
            defaultValues={defaultValues}
            submitLabel="Save changes"
            onSubmit={onSubmit}
            isSubmitting={updateKitchen.isPending}
            errorMessage={errorMessage}
          />
        </CardContent>
      </Card>
    </div>
  );
}
