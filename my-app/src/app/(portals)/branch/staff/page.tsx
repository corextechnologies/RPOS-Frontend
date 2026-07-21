"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal, Pencil, Plus, ShieldCheck, ShieldOff, Trash2, TriangleAlert, UserRound } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageState } from "@/components/ui/page-state";
import { CredentialsDialog } from "@/components/ui/credentials-dialog";
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
  const [confirm, setConfirm] = useState<{
    type: "revoke" | "delete";
    staff: BranchStaff;
  } | null>(null);

  const staff = useQuery({
    queryKey: ["branch-staff"],
    queryFn: () => api.listBranchStaff(),
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
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[72px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((person) => (
                    <TableRow key={person.id}>
                      <TableCell className="text-content">
                        {person.full_name || <span className="text-faint">—</span>}
                      </TableCell>
                      <TableCell className="text-muted">{person.email}</TableCell>
                      <TableCell>
                        {person.position ? (
                          <Badge variant="secondary">
                            {person.position.toLowerCase().replace(/_/g, " ")}
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="gap-1">
                            <TriangleAlert className="size-3" aria-hidden />
                            none — can&apos;t use a till
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={person.is_active ? "secondary" : "outline"}>
                          {person.is_active ? "active" : "revoked"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label="Actions">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditing(person)}>
                              <Pencil className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {person.is_active ? (
                              <DropdownMenuItem onClick={() => setConfirm({ type: "revoke", staff: person })}>
                                <ShieldOff className="mr-2 h-4 w-4" /> Revoke access
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => restoreMut.mutate(person.id)}>
                                <ShieldCheck className="mr-2 h-4 w-4" /> Restore access
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-danger"
                              onClick={() => setConfirm({ type: "delete", staff: person })}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </PageState>

      <AddStaffDialog open={open} onOpenChange={setOpen} onCreated={setCreated} />

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
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [position, setPosition] = useState<BranchPosition>("CASHIER");

  const create = useMutation({
    mutationFn: (input: CreateBranchStaffInput) => api.createBranchStaff(input),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["branch-staff"] });
      onCreated(result);
      onOpenChange(false);
      setEmail("");
      setName("");
      setPosition("CASHIER");
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Couldn't add this person"),
  });

  const valid = /\S+@\S+\.\S+/.test(email);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserRound className="size-4 text-brand" aria-hidden />
            Add staff
          </DialogTitle>
          <DialogDescription>They&apos;ll be added to this branch.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="staff-email">Email</Label>
            <Input
              id="staff-email"
              type="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="staff-name">Name</Label>
            <Input id="staff-name" value={name} onChange={(e) => setName(e.target.value)} />
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
            <p className="text-xs text-faint">
              Decides what they can do on a till. A curbside tablet has no drawer, so it refuses
              cash whatever the position.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!valid || create.isPending}
            onClick={() =>
              create.mutate({ email: email.trim(), full_name: name.trim() || undefined, position })
            }
          >
            Add
          </Button>
        </DialogFooter>
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

  const staffId = staff?.id;
  const [prevId, setPrevId] = useState<string | undefined>();
  if (staffId !== prevId) {
    setPrevId(staffId);
    if (staff) {
      setEmail(staff.email);
      setName(staff.full_name ?? "");
      setPosition(staff.position ?? "CASHIER");
    }
  }

  const validEmail = /\S+@\S+\.\S+/.test(email);

  return (
    <Dialog open={staff !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
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
            <Label htmlFor="edit-staff-email">Email</Label>
            <Input
              id="edit-staff-email"
              type="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-staff-name">Name</Label>
            <Input
              id="edit-staff-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
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
