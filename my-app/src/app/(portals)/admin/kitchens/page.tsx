"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { LocationList } from "@/components/admin/locations/LocationList";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useKitchens, useDeleteKitchen } from "@/lib/hooks/use-locations";

export default function AdminKitchensPage() {
  const router = useRouter();
  const kitchens = useKitchens();
  const deleteKitchen = useDeleteKitchen();
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(
    null,
  );

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
