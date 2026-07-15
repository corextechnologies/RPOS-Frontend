"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { LocationList } from "@/components/admin/locations/LocationList";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useBranches, useDeleteBranch } from "@/lib/hooks/use-locations";

export default function AdminBranchesPage() {
  const router = useRouter();
  const branches = useBranches();
  const deleteBranch = useDeleteBranch();
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(
    null,
  );

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
        onEdit={(id) => router.push(`/admin/branches/${id}/edit`)}
        onDelete={(item) => setPendingDelete(item)}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title="Delete branch?"
        description={
          pendingDelete
            ? `Permanently delete “${pendingDelete.name}”? This cannot be undone.`
            : "Permanently delete this branch? This cannot be undone."
        }
        confirmLabel="Delete branch"
        destructive
        loading={deleteBranch.isPending}
        onConfirm={async () => {
          if (!pendingDelete) return;
          await deleteBranch.mutateAsync(pendingDelete.id);
          setPendingDelete(null);
        }}
      />
    </div>
  );
}
