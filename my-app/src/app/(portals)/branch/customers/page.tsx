"use client";

import { useState } from "react";
import { Search, Trash2, Pencil } from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  useBranchCustomers,
  useCreateBranchCustomer,
  useDeleteBranchCustomer,
  useUpdateBranchCustomer,
} from "@/lib/hooks/use-branch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageState } from "@/components/ui/page-state";
import { formatDate } from "@/lib/utils";
import type { BranchCustomer } from "@/lib/types/branch";

/**
 * Customers are scoped to the signed-in user's branch, server-side. There is no
 * branch picker here and there must not be one: cross-branch duplicates are
 * expected and correct, and a UI that offers to look at another branch's
 * customers is asking for a 404 it can't explain.
 */
export default function BranchCustomersPage() {
  const { can } = useAuth();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [editing, setEditing] = useState<BranchCustomer | null>(null);
  const [deleting, setDeleting] = useState<BranchCustomer | null>(null);

  const { data, isLoading, error } = useBranchCustomers(
    debounced ? { search: debounced } : undefined,
  );
  const remove = useDeleteBranchCustomer();

  // Search is server-side (it matches phone as well as name), so it's debounced
  // rather than fired per keystroke.
  function onSearchChange(value: string) {
    setSearch(value);
    window.clearTimeout((onSearchChange as unknown as { t?: number }).t);
    (onSearchChange as unknown as { t?: number }).t = window.setTimeout(
      () => setDebounced(value.trim()),
      300,
    );
  }

  const customers = data?.items ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
            Customers
          </h1>
          <p className="mt-1 text-sm text-muted">Customers of this branch.</p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint"
          aria-hidden
        />
        <Input
          className="pl-9"
          placeholder="Search name or phone…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <PageState
        isLoading={isLoading}
        isError={!!error}
        data={customers}
        isEmpty={(rows) => rows.length === 0}
        errorTitle="Couldn't load customers"
        errorDescription={error instanceof Error ? error.message : undefined}
        emptyTitle={debounced ? "No matches" : "No customers yet"}
        emptyDescription={
          debounced
            ? "Try a different name or phone number."
            : "Customers you add at this branch will appear here."
        }
      >
        {(rows) => (
          <div className="rounded-2xl border border-line bg-surface">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium text-content">{c.name}</TableCell>
                    <TableCell className="tabular-nums text-muted">{c.phone ?? "-"}</TableCell>
                    <TableCell className="text-muted">{formatDate(c.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {can("branch-customers:update") && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditing(c)}
                            aria-label={`Edit ${c.name}`}
                          >
                            <Pencil className="size-4" aria-hidden />
                          </Button>
                        )}
                        {can("branch-customers:delete") && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleting(c)}
                            aria-label={`Remove ${c.name}`}
                          >
                            <Trash2 className="size-4 text-danger" aria-hidden />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </PageState>

      <CustomerDialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        customer={editing}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Remove ${deleting?.name ?? "customer"}?`}
        description="Past orders keep this customer. They just can't be added to new ones."
        confirmLabel="Remove"
        destructive
        onConfirm={() => {
          if (deleting) remove.mutate(deleting.id);
          setDeleting(null);
        }}
      />
    </div>
  );
}

function CustomerDialog({
  open,
  onOpenChange,
  customer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: BranchCustomer | null;
}) {
  const create = useCreateBranchCustomer();
  const update = useUpdateBranchCustomer();
  const editing = !!customer;

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [touched, setTouched] = useState(false);

  // Re-seed the fields when a different customer is opened.
  const [seededFor, setSeededFor] = useState<string | null>(null);
  if (open && customer && seededFor !== customer.id) {
    setSeededFor(customer.id);
    setName(customer.name);
    setPhone(customer.phone ?? "");
  }
  if (open && !customer && seededFor !== null) {
    setSeededFor(null);
    setName("");
    setPhone("");
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (name.trim().length < 2) return;

    const done = () => {
      onOpenChange(false);
      setName("");
      setPhone("");
      setTouched(false);
      setSeededFor(null);
    };

    // Note there is no `branch_id` in either payload — it comes from the token.
    if (editing && customer) {
      update.mutate(
        { id: customer.id, body: { name: name.trim(), phone: phone.trim() } },
        { onSuccess: done },
      );
    } else {
      create.mutate({ name: name.trim(), phone: phone.trim() || undefined }, { onSuccess: done });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit customer" : "Add customer"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={touched && name.trim().length < 2}
            />
            {touched && name.trim().length < 2 && (
              <p className="text-xs text-danger">Name must be at least 2 characters.</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              inputMode="tel"
              placeholder="0300 1234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending || update.isPending}>
              {editing ? "Save" : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
