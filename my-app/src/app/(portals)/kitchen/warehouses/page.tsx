"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { KitchenInventoryTable } from "@/components/kitchen/inventory/KitchenInventoryTable";
import { KitchenUnassigned } from "@/components/kitchen/KitchenUnassigned";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/state";
import { useAuth } from "@/lib/auth";
import { useKitchenWarehouseInventory } from "@/lib/hooks/use-kitchen-inventory";
import { useKitchenWarehouses } from "@/lib/hooks/use-kitchen-requests";
import { isMissingKitchenAssignment } from "@/lib/types/kitchen";

export default function KitchenWarehouseStockPage() {
  const { can } = useAuth();
  const [warehouseId, setWarehouseId] = useState("");

  const warehouses = useKitchenWarehouses();
  const options = warehouses.data ?? [];

  // With one warehouse there is no choice to make. Derived rather than pushed
  // into state from an effect, so there is no render where nothing is selected.
  const selectedId = warehouseId || (options.length === 1 ? options[0].id : "");
  const inventory = useKitchenWarehouseInventory(selectedId);

  const unassigned =
    isMissingKitchenAssignment(warehouses.error) ||
    isMissingKitchenAssignment(inventory.error);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
            Warehouse stock
          </h1>
          <p className="mt-1 text-sm text-muted">
            What a warehouse has on hand, so you can see what is worth requesting.
          </p>
        </div>
        {!unassigned && can("kitchen-warehouse-requests:create") && (
          <Button asChild>
            <Link href="/kitchen/requests/warehouse/new">
              <Plus className="h-4 w-4" />
              Request stock
            </Link>
          </Button>
        )}
      </div>

      {unassigned ? (
        <KitchenUnassigned />
      ) : warehouses.isPending ? (
        <Card>
          <CardContent className="space-y-3 p-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : warehouses.isError ? (
        <Card>
          <CardContent className="p-0">
            <ErrorState
              description="Failed to load warehouses."
              onRetry={() => warehouses.refetch()}
            />
          </CardContent>
        </Card>
      ) : options.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              title="No warehouses yet"
              description="Your Admin has not added a warehouse to this restaurant. Once they do, its stock appears here."
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="space-y-1.5 p-4 sm:max-w-sm">
              <Label htmlFor="warehouse-picker">Warehouse</Label>
              <Select value={selectedId} onValueChange={setWarehouseId}>
                <SelectTrigger id="warehouse-picker">
                  <SelectValue placeholder="Choose a warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {options.map((warehouse) => (
                    <SelectItem key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                      {warehouse.location ? ` · ${warehouse.location}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Reuses the kitchen inventory table: the rows are the same cost-free
              shape, and this view is read-only — no waste action on stock that
              is not ours. */}
          <KitchenInventoryTable
            items={inventory.data}
            isLoading={inventory.isPending && !!selectedId}
            isError={inventory.isError}
            onRetry={() => inventory.refetch()}
            emptyTitle="Nothing on hand"
            emptyDescription="This warehouse has no stock recorded yet."
          />
        </>
      )}
    </div>
  );
}
