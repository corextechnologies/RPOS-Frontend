"use client";

import { useMemo, useState } from "react";
import { EmployeeList } from "@/components/admin/employees/EmployeeList";
import { Button } from "@/components/ui/button";
import { useEmployees } from "@/lib/hooks/use-employees";
import { useBranches, useKitchens, useWarehouses } from "@/lib/hooks/use-locations";
import type { Employee } from "@/lib/types/admin";

export default function AdminEmployeesPage() {
  const [page, setPage] = useState(1);
  const employees = useEmployees(page);
  const branches = useBranches();
  const kitchens = useKitchens();
  const warehouses = useWarehouses();

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
      return "—";
    };
  }, [branches.data, kitchens.data, warehouses.data]);

  const total = employees.data?.total ?? 0;
  const pageSize = employees.data?.page_size ?? 20;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
          Employees
        </h1>
        <p className="mt-1 text-sm text-muted">
          All restaurant employees across branches, kitchens, and warehouses.
        </p>
      </div>

      <EmployeeList
        items={employees.data?.items}
        isLoading={employees.isLoading}
        isError={employees.isError}
        onRetry={() => employees.refetch()}
        locationLabel={locationLabel}
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
    </div>
  );
}
