"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { LocationList } from "@/components/admin/locations/LocationList";
import { Button } from "@/components/ui/button";
import { useWarehouses } from "@/lib/hooks/use-locations";

export default function AdminWarehousesPage() {
  const warehouses = useWarehouses();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
            Warehouses
          </h1>
          <p className="mt-1 text-sm text-muted">
            Manage warehouse locations for your restaurant.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/warehouses/new">
            <Plus className="h-4 w-4" />
            Add warehouse
          </Link>
        </Button>
      </div>

      <LocationList
        kind="warehouse"
        items={warehouses.data}
        isLoading={warehouses.isLoading}
        isError={warehouses.isError}
        onRetry={() => warehouses.refetch()}
      />
    </div>
  );
}
