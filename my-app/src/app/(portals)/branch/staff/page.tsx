"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, UserRound } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageState } from "@/components/ui/page-state";
import { BranchStaffTable } from "@/components/branch/staff/BranchStaffTable";
import { BranchStaffDetailDialog } from "@/components/branch/staff/BranchStaffDetailDialog";
import { CredentialsDialog } from "@/components/ui/credentials-dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { EmployeeImageField } from "@/components/admin/employees/EmployeeImageField";
import { StaffDocumentField } from "@/components/staff/StaffDocumentField";
import { StaffFormFields } from "@/components/staff/StaffFormFields";
import { STAFF_STALE_TIME_MS } from "@/lib/types/staff";
import {
  createBranchStaffDefaults,
  createBranchStaffSchema,
  type CreateBranchStaffForm,
} from "@/lib/schemas/branch-staff";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { BranchPosition } from "@/lib/types/super-admin";
import type { BranchStaff, CreateBranchStaffInput, CreateBranchStaffResult, UpdateBranchStaffInput } from "@/lib/types/branch";

/**
 * Branch staff, and the position that decides what they can do at a till.
 *
 * Position is not a label — the server resolves it into the capability list the
 * POS gates on, so someone created without one has an empty capability set and
 * is refused everywhere. That is why this screen exists and why position is
 * required rather than optional.
 */
const POSITIONS: Array<{ value: BranchPosition; label: string; hint: string }> = [
  {
    value: "CASHIER",
    label: "Cashier",
    hint: "Takes orders and cash. Opens and closes the drawer and the shift.",
  },
  {
    value: "SALESPERSON",
    label: "Salesperson",
    hint: "Takes orders and card payments. No cash drawer.",
  },
  {
    value: "ORDER_TAKER",
    label: "Order taker",
    hint: "Takes orders only. The curbside-tablet profile — no payments.",
  },
];

export default function BranchStaffPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [created, setCreated] = useState<CreateBranchStaffResult | null>(null);
  const [editing, setEditing] = useState<BranchStaff | null>(null);
  const [detail, setDetail] = useState<BranchStaff | null>(null);
  const [confirm, setConfirm] = useState<{
    type: "revoke" | "delete";
    staff: BranchStaff;
  } | null>(null);

  const staff = useQuery({
    queryKey: ["branch-staff"],
    queryFn: () => api.listBranchStaff(),
    // Photos and CNIC scans are signed URLs that expire after ~15 min, so
    // cached rows go stale in a way a normal list never does. Refetch inside
    // that window, and again on tab focus.
    staleTime: STAFF_STALE_TIME_MS,
    refetchInterval: STAFF_STALE_TIME_MS,
    refetchOnWindowFocus: true,
  });

  const revokeMut = useMutation({
    mutationFn: (id: string) => api.revokeBranchStaff(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["branch-staff"] });
      setConfirm(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Couldn't revoke access"),
  });

  const restoreMut = useMutation({
    mutationFn: (id: string) => api.restoreBranchStaff(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["branch-staff"] }),
    onError: (err) => toast.error(err instanceof Error ? err.message : "Couldn't restore access"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.deleteBranchStaff(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["branch-staff"] });
      setConfirm(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Couldn't delete staff"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateBranchStaffInput }) =>
      api.updateBranchStaff(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["branch-staff"] });
      setEditing(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Couldn't update staff"),
  });

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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
            Staff
          </h1>
          <p className="mt-1 text-sm text-muted">
            Who works this branch, and what they can do on the till.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-1.5 size-4" aria-hidden />
          Add staff
        </Button>
      </div>

      <PageState
        isLoading={staff.isLoading}
        isError={!!staff.error}
        data={staff.data}
        isEmpty={(rows) => rows.length === 0}
        errorTitle="Couldn't load staff"
        errorDescription={staff.error instanceof Error ? staff.error.message : undefined}
        emptyTitle="No staff yet"
        emptyDescription="Add someone, then they can unlock a till with their PIN."
      >
        {(rows) => (
          <BranchStaffTable
            items={rows}
            onRowClick={(person) => setDetail(person)}
            onEdit={(person) => setEditing(person)}
            onRevoke={(person) => setConfirm({ type: "revoke", staff: person })}
            onRestore={(person) => restoreMut.mutate(person.id)}
            onDelete={(person) => setConfirm({ type: "delete", staff: person })}
          />
        )}
      </PageState>

      <AddStaffDialog open={open} onOpenChange={setOpen} onCreated={setCreated} />

      <BranchStaffDetailDialog
        staff={detail}
        open={detail !== null}
        onOpenChange={(o) => { if (!o) setDetail(null); }}
      />

      <EditBranchStaffDialog
        staff={editing}
        onOpenChange={(o) => { if (!o) setEditing(null); }}
        onSave={(id, body) => updateMut.mutate({ id, body })}
        isSaving={updateMut.isPending}
      />

      <CredentialsDialog
        open={created !== null}
        onOpenChange={(o) => !o && setCreated(null)}
        title="Staff added"
        description="Give them these once. The password isn't shown again — they set their own PIN on the till afterwards."
        contextLabel="Branch staff"
        restaurantName={created?.email ?? ""}
        email={created?.email ?? ""}
        temporaryPassword={created?.temporary_password ?? undefined}
        credentialEmailSent={created?.credential_email_sent ?? false}
        onDone={() => setCreated(null)}
      />

      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(o) => { if (!o) setConfirm(null); }}
        title={confirm?.type === "delete" ? "Delete staff member?" : "Revoke access?"}
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

function AddStaffDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (result: CreateBranchStaffResult) => void;
}) {
  const qc = useQueryClient();
  const form = useForm<CreateBranchStaffForm>({
    resolver: zodResolver(createBranchStaffSchema),
    defaultValues: createBranchStaffDefaults,
  });

  useEffect(() => {
    if (open) form.reset(createBranchStaffDefaults);
  }, [open, form]);

  const create = useMutation({
    mutationFn: (input: CreateBranchStaffInput) => api.createBranchStaff(input),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["branch-staff"] });
      onCreated(result);
      onOpenChange(false);
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Couldn't add this person"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Eight fields including three uploads — scrollable so the footer stays
          reachable on a laptop screen. */}
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserRound className="size-4 text-brand" aria-hidden />
            Add staff
          </DialogTitle>
          <DialogDescription>They&apos;ll be added to this branch.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            className="space-y-5"
            onSubmit={form.handleSubmit((values) =>
              // Every field is required by the form and the server (422 on a
              // partial body), so send them all.
              create.mutate({
                email: values.email.trim(),
                full_name: values.full_name.trim(),
                phone_number: values.phone_number.trim(),
                address: values.address.trim(),
                image_url: values.image_url,
                cnic_front_url: values.cnic_front_url,
                cnic_back_url: values.cnic_back_url,
                position: values.position,
              }),
            )}
          >
            <StaffFormFields
              control={form.control}
              namePlaceholder="Sara Khan"
              emailPlaceholder="sara@restaurant.com"
              roleField={
                <FormField
                  control={form.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Position</FormLabel>
                      {/* A fixed picker, never free text — the till derives its
                          capability list from this value. */}
                      <div className="space-y-2">
                        {POSITIONS.map((p) => (
                          <button
                            key={p.value}
                            type="button"
                            onClick={() => field.onChange(p.value)}
                            className={cn(
                              "w-full rounded-xl border p-3 text-left transition",
                              field.value === p.value
                                ? "border-brand bg-brand/10"
                                : "border-line bg-surface hover:border-brand/50",
                            )}
                          >
                            <span className="text-sm font-medium text-content">{p.label}</span>
                            <span className="mt-0.5 block text-xs text-faint">{p.hint}</span>
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-faint">
                        Decides what they can do on a till. A curbside tablet has no drawer, so
                        it refuses cash whatever the position.
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              }
            />

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? "Adding…" : "Add"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function EditBranchStaffDialog({
  staff,
  onOpenChange,
  onSave,
  isSaving,
}: {
  staff: BranchStaff | null;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, body: UpdateBranchStaffInput) => void;
  isSaving: boolean;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [position, setPosition] = useState<BranchPosition>("CASHIER");
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
      setPosition(staff.position ?? "CASHIER");
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
            <Label htmlFor="edit-staff-name">Full name</Label>
            <Input
              id="edit-staff-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-staff-email">Email</Label>
            <Input
              id="edit-staff-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-staff-phone">Phone number</Label>
            <Input
              id="edit-staff-phone"
              type="tel"
              placeholder="+92 300 1234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-staff-address">Address</Label>
            <Input
              id="edit-staff-address"
              placeholder="12 Mall Road, Lahore"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Position</Label>
            <div className="space-y-2">
              {POSITIONS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPosition(p.value)}
                  className={cn(
                    "w-full rounded-xl border p-3 text-left transition",
                    position === p.value
                      ? "border-brand bg-brand/10"
                      : "border-line bg-surface hover:border-brand/50",
                  )}
                >
                  <span className="text-sm font-medium text-content">{p.label}</span>
                  <span className="mt-0.5 block text-xs text-faint">{p.hint}</span>
                </button>
              ))}
            </div>
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
              const body: UpdateBranchStaffInput = {};
              const trimmedEmail = email.trim();
              if (trimmedEmail !== staff.email) body.email = trimmedEmail;
              const trimmedName = name.trim();
              if (trimmedName !== (staff.full_name ?? "")) body.full_name = trimmedName;
              if (position !== staff.position) body.position = position;
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
