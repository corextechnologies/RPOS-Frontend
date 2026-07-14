"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { LocationList } from "@/components/admin/locations/LocationList";
import { Button } from "@/components/ui/button";
import { useKitchens } from "@/lib/hooks/use-locations";

export default function AdminKitchensPage() {
  const kitchens = useKitchens();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
            Kitchens
          </h1>
          <p className="mt-1 text-sm text-muted">
            Manage kitchen locations for your restaurant.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/kitchens/new">
            <Plus className="h-4 w-4" />
            Add kitchen
          </Link>
        </Button>
      </div>

      <LocationList
        kind="kitchen"
        items={kitchens.data}
        isLoading={kitchens.isLoading}
        isError={kitchens.isError}
        onRetry={() => kitchens.refetch()}
      />
    </div>
  );
}
