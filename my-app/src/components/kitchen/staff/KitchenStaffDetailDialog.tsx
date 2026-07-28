"use client";

import { UserRound } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { KitchenStaff } from "@/lib/types/kitchen";
import { formatDate, initials } from "@/lib/utils";

interface KitchenStaffDetailDialogProps {
  staff: KitchenStaff | null;
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

export function KitchenStaffDetailDialog({
  staff,
  open,
  onOpenChange,
}: KitchenStaffDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {staff && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3 text-left">
                {staff.image_url ? (
                  <img
                    src={staff.image_url}
                    alt=""
                    className="size-12 shrink-0 rounded-full border border-line object-cover"
                  />
                ) : (
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-full border border-line bg-surface-2 text-sm font-medium text-faint">
                    {staff.full_name ? (
                      initials(staff.full_name)
                    ) : (
                      <UserRound className="size-5" aria-hidden />
                    )}
                  </span>
                )}
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
              <Field
                label="Added"
                value={staff.created_at ? formatDate(staff.created_at) : "—"}
              />
            </dl>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
