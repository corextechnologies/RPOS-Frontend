"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { AddStaffDialog } from "@/components/warehouse/staff/AddStaffDialog";
import { StaffTable } from "@/components/warehouse/staff/StaffTable";
import { WarehouseUnassigned } from "@/components/warehouse/WarehouseUnassigned";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import {
  useCreateWarehouseStaff,
  useWarehouseStaff,
} from "@/lib/hooks/use-warehouse-staff";
import type { CreateWarehouseStaffForm } from "@/lib/schemas/warehouse-staff";
import { isMissingWarehouseAssignment } from "@/lib/types/warehouse";

export default function WarehouseStaffPage() {
  const { can } = useAuth();
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const staff = useWarehouseStaff(page);
  const createStaff = useCreateWarehouseStaff();

  const unassigned = isMissingWarehouseAssignment(staff.error);
  const total = staff.data?.total ?? 0;
  const pageSize = staff.data?.page_size ?? 20;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleAdd = async (values: CreateWarehouseStaffForm) => {
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
            Staff
          </h1>
          <p className="mt-1 text-sm text-muted">
            Staff you created for your warehouse.
          </p>
        </div>
        {!unassigned && can("staff:create") && (
          <Button type="button" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" />
            Add staff
          </Button>
        )}
      </div>

      {unassigned ? (
        <WarehouseUnassigned />
      ) : (
        <>
          <StaffTable
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

      <AddStaffDialog
        open={adding}
        onOpenChange={setAdding}
        onSubmit={handleAdd}
        isSubmitting={createStaff.isPending}
      />
    </div>
  );
}
