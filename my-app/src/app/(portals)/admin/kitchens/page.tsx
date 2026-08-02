"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { LocationList } from "@/components/admin/locations/LocationList";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/state";
import { useKitchens, useDeleteKitchen } from "@/lib/hooks/use-locations";
import { useRestaurantFeatures } from "@/lib/hooks/use-restaurant-features";

export default function AdminKitchensPage() {
  const router = useRouter();
  const kitchens = useKitchens();
  const deleteKitchen = useDeleteKitchen();
  const { hasCentralKitchen, isLoading: featuresLoading } = useRestaurantFeatures();
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(
    null,
  );

  // This tenant has no central kitchen — production lives in each branch's
  // sub-kitchen, so there is nothing to manage here. Guards direct URL access
  // (hiding the nav item alone would not).
  if (!featuresLoading && !hasCentralKitchen) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
            Kitchens
          </h1>
        </div>
        <EmptyState
          title="Central kitchen is disabled"
          description="This restaurant runs without a central kitchen. Production is handled by each branch's own sub-kitchen."
        />
      </div>
    );
  }

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
        onEdit={(id) => router.push(`/admin/kitchens/${id}/edit`)}
        onDelete={(item) => setPendingDelete(item)}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title="Delete kitchen?"
        description={
          pendingDelete
            ? `Permanently delete “${pendingDelete.name}”? This cannot be undone.`
            : "Permanently delete this kitchen? This cannot be undone."
        }
        confirmLabel="Delete kitchen"
        destructive
        loading={deleteKitchen.isPending}
        onConfirm={async () => {
          if (!pendingDelete) return;
          await deleteKitchen.mutateAsync(pendingDelete.id);
          setPendingDelete(null);
        }}
      />
    </div>
  );
}
