"use client";

import { useMemo, useState } from "react";
import { WasteEventsTable } from "@/components/waste/WasteEventsTable";
import { WasteEventDetailDialog } from "@/components/waste/WasteEventDetailDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useBranches, useKitchens, useWarehouses } from "@/lib/hooks/use-locations";
import { useAdminWasteEvents } from "@/lib/hooks/use-requests";
import type { AdminLocationType } from "@/lib/types/admin";
import type { StockMovementType } from "@/lib/types/warehouse";
import type { WasteEvent, WasteEventFilters } from "@/lib/types/waste";

const LOCATION_TYPES: AdminLocationType[] = ["BRANCH", "KITCHEN", "WAREHOUSE"];
const MOVEMENT_TYPES: StockMovementType[] = ["WASTE", "EXPIRY"];

export default function AdminWastePage() {
  const [locationType, setLocationType] = useState<AdminLocationType | "all">("all");
  const [locationId, setLocationId] = useState<string>("all");
  const [movementType, setMovementType] = useState<StockMovementType | "all">("all");
  const [viewing, setViewing] = useState<WasteEvent | null>(null);
  const [search, setSearch] = useState("");

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

  const filters: WasteEventFilters = useMemo(
    () => ({
      ...(locationType !== "all" && { location_type: locationType }),
      ...(locationId !== "all" && { location_id: locationId }),
      ...(movementType !== "all" && { movement_type: movementType }),
    }),
    [locationType, locationId, movementType],
  );

  const waste = useAdminWasteEvents(filters);

  const locationName = useMemo(() => {
    const branchNames = new Map((branches.data ?? []).map((b) => [b.id, b.name]));
    const kitchenNames = new Map((kitchens.data ?? []).map((k) => [k.id, k.name]));
    const warehouseNames = new Map((warehouses.data ?? []).map((w) => [w.id, w.name]));

    return (event: WasteEvent) => {
      if (event.location_type === "BRANCH")
        return branchNames.get(event.location_id) ?? event.location_id;
      if (event.location_type === "KITCHEN")
        return kitchenNames.get(event.location_id) ?? event.location_id;
      if (event.location_type === "WAREHOUSE")
        return warehouseNames.get(event.location_id) ?? event.location_id;
      return event.location_id;
    };
  }, [branches.data, kitchens.data, warehouses.data]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
          Waste &amp; expired
        </h1>
        <p className="mt-1 text-sm text-muted">
          Everything written off across every branch, kitchen, and warehouse.
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-end">
        <Input
          className="sm:mr-auto sm:w-72"
          placeholder="Search name, SKU, or batch…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          value={movementType}
          onValueChange={(v) => setMovementType(v as StockMovementType | "all")}
        >
          <SelectTrigger className="sm:w-44">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {MOVEMENT_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type === "EXPIRY" ? "Expiry" : "Waste"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={locationType}
          onValueChange={(v) => {
            setLocationType(v as AdminLocationType | "all");
            // A location belongs to one type, so the prior pick is meaningless
            // once the type changes.
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

      <WasteEventsTable
        items={waste.data}
        isLoading={waste.isLoading}
        isError={waste.isError}
        onRetry={() => waste.refetch()}
        showLocation
        locationName={locationName}
        onSelect={setViewing}
        search={search}
      />

      <WasteEventDetailDialog
        event={viewing}
        open={!!viewing}
        onOpenChange={(open) => {
          if (!open) setViewing(null);
        }}
        locationLabel={viewing ? locationName(viewing) : undefined}
      />
    </div>
  );
}
