"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus } from "lucide-react";
import { AddSubChefDialog } from "@/components/kitchen/staff/AddSubChefDialog";
import { SubChefTable } from "@/components/kitchen/staff/SubChefTable";
import { KitchenNoAccess } from "@/components/kitchen/KitchenNoAccess";
import { KitchenUnassigned } from "@/components/kitchen/KitchenUnassigned";
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
  useCreateKitchenStaff,
  useKitchenStaff,
} from "@/lib/hooks/use-kitchen-staff";
import type { CreateKitchenStaffForm } from "@/lib/schemas/kitchen-staff";
import type { KitchenStaff } from "@/lib/types/kitchen";
import type { UpdateKitchenStaffInput } from "@/lib/types/kitchen";
import { isMissingKitchenAssignment } from "@/lib/types/kitchen";
import { toast } from "sonner";

export default function KitchenStaffPage() {
  const { can } = useAuth();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const allowed = can("kitchen-staff:read");
  const staff = useKitchenStaff(page, allowed);
  const createStaff = useCreateKitchenStaff();
  const [editing, setEditing] = useState<KitchenStaff | null>(null);
  const [confirm, setConfirm] = useState<{
    type: "revoke" | "delete";
    staff: KitchenStaff;
  } | null>(null);

  const unassigned = isMissingKitchenAssignment(staff.error);
  const total = staff.data?.total ?? 0;
  const pageSize = staff.data?.page_size ?? 20;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const revokeMut = useMutation({
    mutationFn: (id: string) => api.revokeKitchenUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kitchen-staff"] });
      setConfirm(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Couldn't revoke access"),
  });

  const restoreMut = useMutation({
    mutationFn: (id: string) => api.restoreKitchenUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kitchen-staff"] }),
    onError: (err) => toast.error(err instanceof Error ? err.message : "Couldn't restore access"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.deleteKitchenUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kitchen-staff"] });
      setConfirm(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Couldn't delete staff"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateKitchenStaffInput }) =>
      api.updateKitchenUser(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kitchen-staff"] });
      setEditing(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Couldn't update sub-chef"),
  });

  const handleAdd = async (values: CreateKitchenStaffForm) => {
    await createStaff.mutateAsync({
      email: values.email,
      full_name: values.full_name || undefined,
    });
    setAdding(false);
  };

  const handleConfirm = async () => {
    if (!confirm) return;
    if (confirm.type === "revoke") {
      await revokeMut.mutateAsync(confirm.staff.id);
    } else {
      await deleteMut.mutateAsync(confirm.staff.id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
            Sub-chefs
          </h1>
          <p className="mt-1 text-sm text-muted">
            Everyone in your kitchen.
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
            onEdit={(s) => setEditing(s)}
            onRevoke={(s) => setConfirm({ type: "revoke", staff: s })}
            onRestore={(s) => restoreMut.mutate(s.id)}
            onDelete={(s) => setConfirm({ type: "delete", staff: s })}
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

      <EditKitchenStaffDialog
        staff={editing}
        onOpenChange={(o) => { if (!o) setEditing(null); }}
        onSave={(id, body) => updateMut.mutate({ id, body })}
        isSaving={updateMut.isPending}
      />

      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(o) => { if (!o) setConfirm(null); }}
        title={confirm?.type === "delete" ? "Delete sub-chef?" : "Revoke access?"}
        description={
          confirm?.type === "delete"
            ? `Permanently delete "${confirm.staff.full_name || confirm.staff.email}"? This cannot be undone.`
            : confirm
              ? `Revoke login access for "${confirm.staff.full_name || confirm.staff.email}"? They will not be able to sign in until restored.`
              : ""
        }
        confirmLabel={confirm?.type === "delete" ? "Delete" : "Revoke access"}
        destructive
        loading={revokeMut.isPending || deleteMut.isPending}
        onConfirm={handleConfirm}
      />
    </div>
  );
}

function EditKitchenStaffDialog({
  staff,
  onOpenChange,
  onSave,
  isSaving,
}: {
  staff: KitchenStaff | null;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, body: UpdateKitchenStaffInput) => void;
  isSaving: boolean;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  const staffId = staff?.id;
  const [prevId, setPrevId] = useState<string | undefined>();
  if (staffId !== prevId) {
    setPrevId(staffId);
    if (staff) {
      setEmail(staff.email);
      setName(staff.full_name ?? "");
    }
  }

  const validEmail = /\S+@\S+\.\S+/.test(email);

  return (
    <Dialog open={staff !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="size-4 text-brand" aria-hidden />
            Edit sub-chef
          </DialogTitle>
          <DialogDescription>
            Update details for {staff?.full_name || staff?.email || "this person"}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-kitchen-staff-email">Email</Label>
            <Input
              id="edit-kitchen-staff-email"
              type="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-kitchen-staff-name">Name</Label>
            <Input
              id="edit-kitchen-staff-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
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
              const body: UpdateKitchenStaffInput = {};
              const trimmedEmail = email.trim();
              if (trimmedEmail !== staff.email) body.email = trimmedEmail;
              const trimmedName = name.trim();
              if (trimmedName !== (staff.full_name ?? "")) body.full_name = trimmedName;
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
