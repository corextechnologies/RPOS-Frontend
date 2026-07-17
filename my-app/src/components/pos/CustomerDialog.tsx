"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, UserPlus, UserRound } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { posApi } from "@/lib/api/pos.api";
import { usePosSession } from "@/lib/pos/pos-session";
import { posErrorMessage } from "@/lib/api/errors";
import { toast } from "sonner";
import type { PosCustomer } from "@/lib/types/pos";

/**
 * Attach a customer to the order.
 *
 * Gated on CUSTOMER_READ / CUSTOMER_CREATE from the bootstrap capability list —
 * an order-taker who may take a name but not create a record gets search only.
 *
 * Search is by phone or name because at a counter the phone is what the
 * customer volunteers, and it's the only thing close to unique. Note that
 * duplicates across branches are expected and correct: a customer is a branch
 * record, so the same person at two branches is two rows, and deduping them is
 * a CRM problem this deliberately doesn't have.
 */
export function CustomerDialog({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (customer: PosCustomer | null) => void;
}) {
  const { can } = usePosSession();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const results = useQuery({
    queryKey: ["pos-customers", search],
    queryFn: () => posApi.searchCustomers(search),
    enabled: open && search.trim().length >= 2 && can("CUSTOMER_READ"),
    retry: false,
  });

  const create = useMutation({
    mutationFn: (input: { name: string; phone?: string }) => posApi.createCustomer(input),
    onSuccess: (customer) => {
      qc.invalidateQueries({ queryKey: ["pos-customers"] });
      onPick(customer);
      onOpenChange(false);
      setCreating(false);
      setName("");
      setPhone("");
      toast.success("Customer added");
    },
    onError: (err) => toast.error(posErrorMessage(err)),
  });

  if (!can("CUSTOMER_READ") && !can("CUSTOMER_CREATE")) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80dvh] overflow-y-auto sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{creating ? "New customer" : "Add a customer"}</DialogTitle>
          <DialogDescription>
            {creating ? "They'll be saved to this branch." : "Search by name or phone."}
          </DialogDescription>
        </DialogHeader>

        {creating ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="c-name">Name</Label>
              <Input
                id="c-name"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-phone">Phone</Label>
              <Input
                id="c-phone"
                inputMode="tel"
                placeholder="0300 1234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setCreating(false)}>
                Back
              </Button>
              <Button
                disabled={name.trim().length < 2 || create.isPending}
                onClick={() =>
                  create.mutate({ name: name.trim(), phone: phone.trim() || undefined })
                }
              >
                {create.isPending && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
                Add
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <Input
              autoFocus
              placeholder="Name or phone…"
              className="h-11"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            {results.isFetching ? (
              <div className="flex justify-center py-6">
                <Loader2 className="size-5 animate-spin text-brand" aria-label="Searching" />
              </div>
            ) : results.error ? (
              <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
                {posErrorMessage(results.error)}
              </p>
            ) : search.trim().length >= 2 && !results.data?.length ? (
              <p className="py-6 text-center text-sm text-muted">No one matching.</p>
            ) : (
              <ul className="divide-y divide-line">
                {(results.data ?? []).map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 py-2.5 text-left hover:text-brand"
                      onClick={() => {
                        onPick(c);
                        onOpenChange(false);
                      }}
                    >
                      <UserRound className="size-4 shrink-0 text-faint" aria-hidden />
                      <span className="min-w-0 flex-1 truncate text-sm text-content">
                        {c.name}
                      </span>
                      <span className="shrink-0 text-xs tabular-nums text-muted">
                        {c.phone ?? ""}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <DialogFooter className="gap-2 sm:justify-between">
              {can("CUSTOMER_CREATE") ? (
                <Button variant="outline" onClick={() => setCreating(true)}>
                  <UserPlus className="mr-1.5 size-4" aria-hidden />
                  New
                </Button>
              ) : (
                <span />
              )}
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
