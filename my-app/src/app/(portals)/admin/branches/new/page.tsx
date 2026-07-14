"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { LocationCreateForm } from "@/components/admin/locations/LocationCreateForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCreateBranch } from "@/lib/hooks/use-locations";
import type { LocationForm } from "@/lib/schemas/location";
import { ApiError } from "@/lib/types/super-admin";

export default function NewBranchPage() {
  const router = useRouter();
  const createBranch = useCreateBranch();
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const onSubmit = async (values: LocationForm) => {
    setErrorMessage(undefined);
    try {
      await createBranch.mutateAsync({
        name: values.name,
        location: values.location || undefined,
      });
      router.push("/admin/branches");
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Failed to create branch.");
      }
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/branches" aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
            Add branch
          </h1>
          <p className="text-sm text-muted">
            Create a branch location for your restaurant.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Branch details</CardTitle>
          <CardDescription>
            Name is required. Location is optional and shown on the branches list.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LocationCreateForm
            kind="branch"
            onSubmit={onSubmit}
            isSubmitting={createBranch.isPending}
            errorMessage={errorMessage}
          />
        </CardContent>
      </Card>
    </div>
  );
}
