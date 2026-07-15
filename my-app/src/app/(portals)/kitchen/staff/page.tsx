"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { AddSubChefDialog } from "@/components/kitchen/staff/AddSubChefDialog";
import { SubChefTable } from "@/components/kitchen/staff/SubChefTable";
import { KitchenNoAccess } from "@/components/kitchen/KitchenNoAccess";
import { KitchenUnassigned } from "@/components/kitchen/KitchenUnassigned";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import {
  useCreateKitchenStaff,
  useKitchenStaff,
} from "@/lib/hooks/use-kitchen-staff";
import type { CreateKitchenStaffForm } from "@/lib/schemas/kitchen-staff";
import { isMissingKitchenAssignment } from "@/lib/types/kitchen";

export default function KitchenStaffPage() {
  const { can } = useAuth();
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const allowed = can("kitchen-staff:read");
  const staff = useKitchenStaff(page, allowed);
  const createStaff = useCreateKitchenStaff();

  const unassigned = isMissingKitchenAssignment(staff.error);
  const total = staff.data?.total ?? 0;
  const pageSize = staff.data?.page_size ?? 20;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleAdd = async (values: CreateKitchenStaffForm) => {
    await createStaff.mutateAsync({
      email: values.email,
      full_name: values.full_name || undefined,
    });
    setAdding(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
            Sub-chefs
          </h1>
          <p className="mt-1 text-sm text-muted">
            Sub-chefs you created for your kitchen.
          </p>
        </div>
        {allowed && !unassigned && can("kitchen-staff:create") && (
          <Button type="button" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" />
            Add sub-chef
          </Button>
        )}
      </div>

      {!allowed ? (
        <KitchenNoAccess />
      ) : unassigned ? (
        <KitchenUnassigned />
      ) : (
        <>
          <SubChefTable
            items={staff.data?.items}
            isLoading={staff.isLoading}
            isError={staff.isError}
            onRetry={() => staff.refetch()}
          />

          {total > pageSize && (
            <div className="flex items-center justify-end gap-3">
              <p className="text-sm text-muted">
                Page {page} of {totalPages}
              </p>
              <Button
                type="button"
                variant="outline"
                disabled={page <= 1 || staff.isFetching}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={page >= totalPages || staff.isFetching}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      <AddSubChefDialog
        open={adding}
        onOpenChange={setAdding}
        onSubmit={handleAdd}
        isSubmitting={createStaff.isPending}
      />
    </div>
  );
}
