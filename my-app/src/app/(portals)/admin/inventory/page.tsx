"use client";

import { useMemo, useState } from "react";
import { AdminInventoryTable } from "@/components/admin/inventory/AdminInventoryTable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBranches, useKitchens, useWarehouses } from "@/lib/hooks/use-locations";
import { useAdminInventory } from "@/lib/hooks/use-requests";
import type { AdminInventoryFilters, AdminLocationType } from "@/lib/types/admin";

const LOCATION_TYPES: AdminLocationType[] = ["BRANCH", "KITCHEN", "WAREHOUSE"];

export default function AdminInventoryPage() {
  const [locationType, setLocationType] = useState<AdminLocationType | "all">("all");
  const [locationId, setLocationId] = useState<string>("all");

  const branches = useBranches();
  const kitchens = useKitchens();
  const warehouses = useWarehouses();

  const locations =
    locationType === "BRANCH"
      ? branches.data
      : locationType === "KITCHEN"
        ? kitchens.data
        : locationType === "WAREHOUSE"
          ? warehouses.data
          : undefined;

  // Only the filters the user actually set — the API treats an omitted key as
  // "no filter", not as a wildcard value.
  const filters: AdminInventoryFilters = useMemo(
    () => ({
      ...(locationType !== "all" && { location_type: locationType }),
      ...(locationId !== "all" && { location_id: locationId }),
    }),
    [locationType, locationId],
  );

  const inventory = useAdminInventory(filters);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
          Inventory
        </h1>
        <p className="mt-1 text-sm text-muted">
          On-hand stock across every branch, kitchen, and warehouse.
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-end">
        <Select
          value={locationType}
          onValueChange={(v) => {
            setLocationType(v as AdminLocationType | "all");
            // A location only belongs to one type, so the previous selection is
            // meaningless once the type changes.
            setLocationId("all");
          }}
        >
          <SelectTrigger className="sm:w-56">
            <SelectValue placeholder="Location type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All locations</SelectItem>
            {LOCATION_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {locationType !== "all" && (
          <Select value={locationId} onValueChange={setLocationId}>
            <SelectTrigger className="sm:w-56">
              <SelectValue placeholder="Location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All {locationType.toLowerCase()}s</SelectItem>
              {locations?.map((loc) => (
                <SelectItem key={loc.id} value={loc.id}>
                  {loc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <AdminInventoryTable
        items={inventory.data}
        isLoading={inventory.isLoading}
        isError={inventory.isError}
        onRetry={() => inventory.refetch()}
      />
    </div>
  );
}
