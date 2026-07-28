"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus } from "lucide-react";
import { AddStaffDialog } from "@/components/warehouse/staff/AddStaffDialog";
import { EmployeeImageField } from "@/components/admin/employees/EmployeeImageField";
import { StaffDocumentField } from "@/components/staff/StaffDocumentField";
import { StaffTable } from "@/components/warehouse/staff/StaffTable";
import { WarehouseNoAccess } from "@/components/warehouse/WarehouseNoAccess";
import { WarehouseUnassigned } from "@/components/warehouse/WarehouseUnassigned";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import {
  useCreateWarehouseStaff,
  useWarehouseStaff,
} from "@/lib/hooks/use-warehouse-staff";
import type { CreateWarehouseStaffForm } from "@/lib/schemas/warehouse-staff";
import type { WarehouseStaff } from "@/lib/types/warehouse";
import type { UpdateWarehouseStaffInput } from "@/lib/types/warehouse";
import { isMissingWarehouseAssignment } from "@/lib/types/warehouse";
import { toast } from "sonner";

export default function WarehouseStaffPage() {
  const { can } = useAuth();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const allowed = can("staff:read");
  const staff = useWarehouseStaff(page, allowed);
  const createStaff = useCreateWarehouseStaff();
  const [editing, setEditing] = useState<WarehouseStaff | null>(null);
  const [confirm, setConfirm] = useState<{ staff: WarehouseStaff } | null>(null);

  const unassigned = isMissingWarehouseAssignment(staff.error);
  const total = staff.data?.total ?? 0;
  const pageSize = staff.data?.page_size ?? 20;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // No revoke/restore here: warehouse staff are personnel records with no login
  // to revoke, and those routes 404. Delete is the only removal.
  const deleteMut = useMutation({
    mutationFn: (id: string) => api.deleteWarehouseUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["warehouse-staff"] });
      setConfirm(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Couldn't delete staff"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateWarehouseStaffInput }) =>
      api.updateWarehouseUser(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["warehouse-staff"] });
      setEditing(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Couldn't update staff"),
  });

  const handleAdd = async (values: CreateWarehouseStaffForm) => {
    // Every field is required by the form, so send them all — the server 422s
    // on a partial create body.
    await createStaff.mutateAsync({
      email: values.email,
      full_name: values.full_name,
      job_title: values.job_title,
      phone_number: values.phone_number,
      address: values.address,
      image_url: values.image_url,
      cnic_front_url: values.cnic_front_url,
      cnic_back_url: values.cnic_back_url,
    });
    setAdding(false);
  };

  const handleConfirm = async () => {
    if (!confirm) return;
    await deleteMut.mutateAsync(confirm.staff.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
            Staff
          </h1>
          <p className="mt-1 text-sm text-muted">
            Everyone working at your warehouse.
          </p>
        </div>
        {!unassigned && allowed && can("staff:create") && (
          <Button type="button" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" />
            Add staff
          </Button>
        )}
      </div>

      {!allowed ? (
        <WarehouseNoAccess />
      ) : unassigned ? (
        <WarehouseUnassigned />
      ) : (
        <>
          <StaffTable
            items={staff.data?.items}
            isLoading={staff.isLoading}
            isError={staff.isError}
            onRetry={() => staff.refetch()}
            onEdit={(s) => setEditing(s)}
            onDelete={(s) => setConfirm({ staff: s })}
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

      <EditWarehouseStaffDialog
        staff={editing}
        onOpenChange={(o) => { if (!o) setEditing(null); }}
        onSave={(id, body) => updateMut.mutate({ id, body })}
        isSaving={updateMut.isPending}
      />

      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(o) => { if (!o) setConfirm(null); }}
        title="Delete staff member?"
        description={
          confirm
            ? `Permanently delete “${confirm.staff.full_name || confirm.staff.email}”? This erases the record and cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        destructive
        loading={deleteMut.isPending}
        onConfirm={handleConfirm}
      />
    </div>
  );
}

function EditWarehouseStaffDialog({
  staff,
  onOpenChange,
  onSave,
  isSaving,
}: {
  staff: WarehouseStaff | null;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, body: UpdateWarehouseStaffInput) => void;
  isSaving: boolean;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [cnicFront, setCnicFront] = useState("");
  const [cnicBack, setCnicBack] = useState("");

  const staffId = staff?.id;
  const [prevId, setPrevId] = useState<string | undefined>();
  if (staffId !== prevId) {
    setPrevId(staffId);
    if (staff) {
      setEmail(staff.email);
      setName(staff.full_name ?? "");
      setJobTitle(staff.job_title ?? "");
      setPhone(staff.phone_number ?? "");
      setAddress(staff.address ?? "");
      setImageUrl(staff.image_url ?? "");
      setCnicFront(staff.cnic_front_url ?? "");
      setCnicBack(staff.cnic_back_url ?? "");
    }
  }

  const validEmail = /\S+@\S+\.\S+/.test(email);

  return (
    <Dialog open={staff !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="size-4 text-brand" aria-hidden />
            Edit staff
          </DialogTitle>
          <DialogDescription>
            Update details for {staff?.full_name || staff?.email || "this person"}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Photo</Label>
            <EmployeeImageField
              value={imageUrl}
              onChange={setImageUrl}
              upload={(file) => api.uploadStaffDocument(file, "personal")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-wh-staff-name">Full name</Label>
            <Input
              id="edit-wh-staff-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-wh-staff-role">Role</Label>
            <Input
              id="edit-wh-staff-role"
              placeholder="Loader"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-wh-staff-email">Email</Label>
            <Input
              id="edit-wh-staff-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-wh-staff-phone">Phone number</Label>
            <Input
              id="edit-wh-staff-phone"
              type="tel"
              placeholder="+92 300 1234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-wh-staff-address">Address</Label>
            <Input
              id="edit-wh-staff-address"
              placeholder="12 Mall Road, Lahore"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>CNIC — front</Label>
            <StaffDocumentField
              value={cnicFront}
              onChange={setCnicFront}
              label="CNIC front"
            />
          </div>

          <div className="space-y-2">
            <Label>CNIC — back</Label>
            <StaffDocumentField
              value={cnicBack}
              onChange={setCnicBack}
              label="CNIC back"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={isSaving || !validEmail}
            onClick={() => {
              if (!staff) return;
              const body: UpdateWarehouseStaffInput = {};
              const trimmedEmail = email.trim();
              if (trimmedEmail !== staff.email) body.email = trimmedEmail;
              const trimmedName = name.trim();
              if (trimmedName !== (staff.full_name ?? "")) body.full_name = trimmedName;
              const trimmedRole = jobTitle.trim();
              if (trimmedRole !== (staff.job_title ?? "")) body.job_title = trimmedRole;
              const trimmedPhone = phone.trim();
              if (trimmedPhone !== (staff.phone_number ?? "")) body.phone_number = trimmedPhone;
              const trimmedAddress = address.trim();
              if (trimmedAddress !== (staff.address ?? "")) body.address = trimmedAddress;
              if (imageUrl !== (staff.image_url ?? "")) body.image_url = imageUrl;
              if (cnicFront !== (staff.cnic_front_url ?? "")) body.cnic_front_url = cnicFront;
              if (cnicBack !== (staff.cnic_back_url ?? "")) body.cnic_back_url = cnicBack;
              onSave(staff.id, body);
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
