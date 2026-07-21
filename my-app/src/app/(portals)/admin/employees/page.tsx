"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { EmployeeList } from "@/components/admin/employees/EmployeeList";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useAuth } from "@/lib/auth";
import {
  useDeleteEmployee,
  useEmployees,
  useRestoreEmployee,
  useRevokeEmployee,
} from "@/lib/hooks/use-employees";
import { useBranches, useKitchens, useWarehouses } from "@/lib/hooks/use-locations";
import type { Employee } from "@/lib/types/admin";

export default function AdminEmployeesPage() {
  const router = useRouter();
  const { can } = useAuth();
  const [page, setPage] = useState(1);
  const employees = useEmployees(page);
  const branches = useBranches();
  const kitchens = useKitchens();
  const warehouses = useWarehouses();
  const revokeEmployee = useRevokeEmployee();
  const restoreEmployee = useRestoreEmployee();
  const deleteEmployee = useDeleteEmployee();
  const canManage = can("users:create");
  const [confirm, setConfirm] = useState<{
    type: "revoke" | "delete";
    employee: Employee;
  } | null>(null);

  const locationLabel = useMemo(() => {
    const branchNames = new Map((branches.data ?? []).map((b) => [b.id, b.name]));
    const kitchenNames = new Map((kitchens.data ?? []).map((k) => [k.id, k.name]));
    const warehouseNames = new Map((warehouses.data ?? []).map((w) => [w.id, w.name]));

    return (employee: Employee) => {
      if (employee.branch_id) {
        return branchNames.get(employee.branch_id) ?? `Branch ${employee.branch_id}`;
      }
      if (employee.kitchen_id) {
        return kitchenNames.get(employee.kitchen_id) ?? `Kitchen ${employee.kitchen_id}`;
      }
      if (employee.warehouse_id) {
        return warehouseNames.get(employee.warehouse_id) ?? `Warehouse ${employee.warehouse_id}`;
      }
      return "-";
    };
  }, [branches.data, kitchens.data, warehouses.data]);

  const MANAGER_ROLES = ["BRANCH_MANAGER", "KITCHEN_MANAGER", "WAREHOUSE_MANAGER"];
  const managers = useMemo(
    () => (employees.data?.items ?? []).filter((e) => MANAGER_ROLES.includes(e.role)),
    [employees.data?.items],
  );
  const subStaff = useMemo(
    () => (employees.data?.items ?? []).filter((e) => !MANAGER_ROLES.includes(e.role)),
    [employees.data?.items],
  );

  const total = employees.data?.total ?? 0;
  const pageSize = employees.data?.page_size ?? 20;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleConfirm = async () => {
    if (!confirm) return;
    if (confirm.type === "revoke") {
      await revokeEmployee.mutateAsync(confirm.employee.id);
    } else {
      await deleteEmployee.mutateAsync(confirm.employee.id);
    }
    setConfirm(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
            Employees
          </h1>
          <p className="mt-1 text-sm text-muted">
            All restaurant employees across branches, kitchens, and warehouses.
          </p>
        </div>
        {can("users:create") && (
          <Button asChild>
            <Link href="/admin/employees/new">
              <Plus className="h-4 w-4" />
              Add manager
            </Link>
          </Button>
        )}
      </div>

      <h2 className="font-display text-lg font-semibold text-content">Managers</h2>
      <EmployeeList
        items={managers}
        isLoading={employees.isLoading}
        isError={employees.isError}
        onRetry={() => employees.refetch()}
        locationLabel={locationLabel}
        onEdit={
          canManage ? (id) => router.push(`/admin/employees/${id}/edit`) : undefined
        }
        onRevoke={
          canManage ? (employee) => setConfirm({ type: "revoke", employee }) : undefined
        }
        onRestore={
          canManage
            ? (employee) => restoreEmployee.mutateAsync(employee.id)
            : undefined
        }
        onDelete={
          canManage ? (employee) => setConfirm({ type: "delete", employee }) : undefined
        }
        emptyTitle="No managers yet"
        emptyDescription="Branch, kitchen, and warehouse managers will appear here."
      />

      <h2 className="font-display text-lg font-semibold text-content">Sub Staff</h2>
      <EmployeeList
        items={subStaff}
        isLoading={employees.isLoading}
        isError={employees.isError}
        onRetry={() => employees.refetch()}
        locationLabel={locationLabel}
        emptyTitle="No sub-staff yet"
        emptyDescription="Staff members created by managers will appear here."
      />

      {total > pageSize && (
        <div className="flex items-center justify-end gap-3">
          <p className="text-sm text-muted">
            Page {page} of {totalPages}
          </p>
          <Button
            type="button"
            variant="outline"
            disabled={page <= 1 || employees.isFetching}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={page >= totalPages || employees.isFetching}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
        title={confirm?.type === "delete" ? "Delete employee?" : "Revoke access?"}
        description={
          confirm?.type === "delete"
            ? `Permanently delete “${confirm.employee.full_name}”? This cannot be undone.`
            : confirm
              ? `Revoke login access for “${confirm.employee.full_name}”? They will not be able to sign in until restored.`
              : ""
        }
        confirmLabel={confirm?.type === "delete" ? "Delete employee" : "Revoke access"}
        destructive
        loading={revokeEmployee.isPending || deleteEmployee.isPending}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
