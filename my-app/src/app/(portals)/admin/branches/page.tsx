"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { LocationList } from "@/components/admin/locations/LocationList";
import { Button } from "@/components/ui/button";
import { useBranches } from "@/lib/hooks/use-locations";

export default function AdminBranchesPage() {
  const branches = useBranches();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
            Branches
          </h1>
          <p className="mt-1 text-sm text-muted">
            Manage branch locations for your restaurant.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/branches/new">
            <Plus className="h-4 w-4" />
            Add branch
          </Link>
        </Button>
      </div>

      <LocationList
        kind="branch"
        items={branches.data}
        isLoading={branches.isLoading}
        isError={branches.isError}
        onRetry={() => branches.refetch()}
      />
    </div>
  );
}
