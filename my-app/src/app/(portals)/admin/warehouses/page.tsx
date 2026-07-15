"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { LocationList } from "@/components/admin/locations/LocationList";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useWarehouses, useDeleteWarehouse } from "@/lib/hooks/use-locations";

export default function AdminWarehousesPage() {
  const router = useRouter();
  const warehouses = useWarehouses();
  const deleteWarehouse = useDeleteWarehouse();
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(
    null,
  );

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
        onEdit={(id) => router.push(`/admin/warehouses/${id}/edit`)}
        onDelete={(item) => setPendingDelete(item)}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title="Delete warehouse?"
        description={
          pendingDelete
            ? `Permanently delete “${pendingDelete.name}”? This cannot be undone.`
            : "Permanently delete this warehouse? This cannot be undone."
        }
        confirmLabel="Delete warehouse"
        destructive
        loading={deleteWarehouse.isPending}
        onConfirm={async () => {
          if (!pendingDelete) return;
          await deleteWarehouse.mutateAsync(pendingDelete.id);
          setPendingDelete(null);
        }}
      />
    </div>
  );
}
