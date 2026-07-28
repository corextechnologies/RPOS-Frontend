"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StaffAvatar } from "@/components/ui/staff-avatar";
import { StaffDocumentImage } from "@/components/staff/StaffDocumentImage";
import type { WarehouseStaff } from "@/lib/types/warehouse";
import { formatDate } from "@/lib/utils";

interface WarehouseStaffDetailDialogProps {
  staff: WarehouseStaff | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

/** Read-only profile for one warehouse staff member. Mirrors the kitchen roster. */
export function WarehouseStaffDetailDialog({
  staff,
  open,
  onOpenChange,
}: WarehouseStaffDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {staff && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3 text-left">
                <StaffAvatar imageUrl={staff.image_url} name={staff.full_name} size="lg" />
                <DialogTitle>{staff.full_name || staff.email}</DialogTitle>
              </div>
            </DialogHeader>

            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Role" value={staff.job_title || "—"} />
              <Field label="Email" value={staff.email} />
              <Field
                label="Phone"
                value={
                  staff.phone_number ? (
                    <span className="tabular-nums">{staff.phone_number}</span>
                  ) : (
                    "—"
                  )
                }
              />
              <Field label="Address" value={staff.address || "—"} />
              <Field
                label="Added"
                value={staff.created_at ? formatDate(staff.created_at) : "—"}
              />
            </dl>

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-faint">
                CNIC
              </p>
              <div className="grid grid-cols-2 gap-3">
                <StaffDocumentImage url={staff.cnic_front_url} label="CNIC front" />
                <StaffDocumentImage url={staff.cnic_back_url} label="CNIC back" />
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
