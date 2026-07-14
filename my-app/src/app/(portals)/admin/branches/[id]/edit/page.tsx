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
import { useBranches, useUpdateBranch } from "@/lib/hooks/use-locations";
import type { LocationForm } from "@/lib/schemas/location";
import { ApiError } from "@/lib/types/super-admin";

export default function EditBranchPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const branches = useBranches();
  const updateBranch = useUpdateBranch();
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const branch = useMemo(
    () => branches.data?.find((item) => item.id === id),
    [branches.data, id],
  );

  const defaultValues = useMemo(() => {
    if (!branch) return undefined;
    return {
      name: branch.name,
      location: branch.location ?? "",
    };
  }, [branch]);

  const onSubmit = async (values: LocationForm) => {
    setErrorMessage(undefined);
    try {
      await updateBranch.mutateAsync({
        id,
        body: {
          name: values.name,
          location: values.location || undefined,
        },
      });
      router.push("/admin/branches");
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Failed to update branch.");
      }
    }
  };

  if (branches.isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (branches.isError) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/branches" aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <ErrorState
          title="Failed to load branch"
          description="Could not load branches for editing."
          onRetry={() => branches.refetch()}
        />
      </div>
    );
  }

  if (!branch) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/branches" aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <ErrorState
          title="Branch not found"
          description="This branch is missing or was deleted."
          onRetry={() => branches.refetch()}
        />
      </div>
    );
  }

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
            Edit branch
          </h1>
          <p className="text-sm text-muted">Update the branch name or location.</p>
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
            defaultValues={defaultValues}
            submitLabel="Save changes"
            onSubmit={onSubmit}
            isSubmitting={updateBranch.isPending}
            errorMessage={errorMessage}
          />
        </CardContent>
      </Card>
    </div>
  );
}
