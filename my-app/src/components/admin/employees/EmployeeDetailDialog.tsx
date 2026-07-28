"use client";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StaffAvatar } from "@/components/ui/staff-avatar";
import type { Employee } from "@/lib/types/admin";
import { formatDate, formatRole } from "@/lib/utils";

interface EmployeeDetailDialogProps {
  employee: Employee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationLabel: (employee: Employee) => string;
}

/** A single label/value row in the details grid. */
function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs font-medium uppercase tracking-wide text-faint">{label}</dt>
      <dd className="text-sm text-content">{value}</dd>
    </div>
  );
}

/** Branch staff carry a POS position; nobody else does. */
function isBranchStaff(employee: Employee): boolean {
  return employee.role === "BRANCH_STAFF";
}

export function EmployeeDetailDialog({
  employee,
  open,
  onOpenChange,
  locationLabel,
}: EmployeeDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {employee && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3 text-left">
                <StaffAvatar imageUrl={employee.image_url} name={employee.full_name} size="lg" />
                <div className="space-y-1">
                  <DialogTitle>{employee.full_name}</DialogTitle>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{formatRole(employee.role)}</Badge>
                    <Badge variant={employee.is_active ? "success" : "destructive"}>
                      {employee.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </div>
            </DialogHeader>

            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Email" value={employee.email} />
              <Field
                label="Phone"
                value={
                  employee.phone_number ? (
                    <span className="tabular-nums">{employee.phone_number}</span>
                  ) : (
                    "—"
                  )
                }
              />
              <Field label="Role" value={formatRole(employee.role)} />
              <Field label="Location" value={locationLabel(employee)} />
              {isBranchStaff(employee) && (
                <Field
                  label="Position"
                  value={employee.position ? formatRole(employee.position) : "—"}
                />
              )}
              <Field
                label="Created"
                value={employee.created_at ? formatDate(employee.created_at) : "—"}
              />
            </dl>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
