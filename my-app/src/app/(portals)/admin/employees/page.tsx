"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { EmployeeList } from "@/components/admin/employees/EmployeeList";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import {
  useDeleteEmployee,
  useEmployees,
  useRestoreEmployee,
  useRevokeEmployee,
} from "@/lib/hooks/use-employees";
import { useBranches, useKitchens, useWarehouses } from "@/lib/hooks/use-locations";
import { titleCase } from "@/lib/utils";
import type { AdminLocationType, Employee } from "@/lib/types/admin";

/** Which location an employee is attached to, derived from whichever id is set. */
function employeeLocationType(employee: Employee): AdminLocationType | null {
  if (employee.branch_id) return "BRANCH";
  if (employee.kitchen_id) return "KITCHEN";
  if (employee.warehouse_id) return "WAREHOUSE";
  return null;
}

function employeeLocationId(employee: Employee): string | null {
  return employee.branch_id ?? employee.kitchen_id ?? employee.warehouse_id ?? null;
}

const SUB_STAFF_LOCATION_TYPES: AdminLocationType[] = ["BRANCH", "KITCHEN", "WAREHOUSE"];

export default function AdminEmployeesPage() {
  const router = useRouter();
  const { can } = useAuth();
  const [page, setPage] = useState(1);
  const [subLocationType, setSubLocationType] = useState<AdminLocationType | "all">("all");
  const [subLocationId, setSubLocationId] = useState<string>("all");
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

  // Sub staff span branches, kitchens, and warehouses — the same location axis
  // the Inventory page filters on. Filter client-side off each employee's
  // branch/kitchen/warehouse id so the dropdown mirrors that page's behavior.
  const subStaffLocations =
    subLocationType === "BRANCH"
      ? branches.data
      : subLocationType === "KITCHEN"
        ? kitchens.data
        : subLocationType === "WAREHOUSE"
          ? warehouses.data
          : undefined;

  const filteredSubStaff = useMemo(() => {
    if (subLocationType === "all") return subStaff;
    return subStaff.filter((e) => {
      if (employeeLocationType(e) !== subLocationType) return false;
      if (subLocationId !== "all") return employeeLocationId(e) === subLocationId;
      return true;
    });
  }, [subStaff, subLocationType, subLocationId]);

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

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-display text-lg font-semibold text-content">Sub Staff</h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Select
            value={subLocationType}
            onValueChange={(v) => {
              setSubLocationType(v as AdminLocationType | "all");
              // A location belongs to one type, so the previous specific
              // selection is meaningless once the type changes.
              setSubLocationId("all");
            }}
          >
            <SelectTrigger className="sm:w-48">
              <SelectValue placeholder="Location type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All locations</SelectItem>
              {SUB_STAFF_LOCATION_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {titleCase(type.toLowerCase())}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {subLocationType !== "all" && (
            <Select value={subLocationId} onValueChange={setSubLocationId}>
              <SelectTrigger className="sm:w-48">
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All {subLocationType.toLowerCase()}s</SelectItem>
                {subStaffLocations?.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>
      <EmployeeList
        items={filteredSubStaff}
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
