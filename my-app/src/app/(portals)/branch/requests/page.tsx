"use client";

import { useMemo, useState } from "react";
import { PackageCheck, Plus, Trash2 } from "lucide-react";
import {
  useBranchInventory,
  useBranchKitchens,
  useBranchRequests,
  useCreateBranchRequest,
  useReceiveBranchRequest,
} from "@/lib/hooks/use-branch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageState } from "@/components/ui/page-state";
import { Badge } from "@/components/ui/badge";
import { RequestStatusBadge } from "@/components/admin/requests/RequestStatusBadge";
import { formatDate, titleCase } from "@/lib/utils";
import type { RequestFilters, RequestStatus } from "@/lib/types/admin";
import type { CreateBranchRequestLineInput } from "@/lib/types/branch";

const REQUESTS_PAGE_SIZE = 20;

const STATUS_OPTIONS: Array<RequestStatus | "all"> = [
  "all",
  "PENDING",
  "APPROVED",
  "PARTIALLY_APPROVED",
  "REJECTED",
  "FORWARDED_TO_KITCHEN",
  "IN_PRODUCTION",
  "PRODUCED",
  "DISPATCHED",
  "RECEIVED",
];

/**
 * Stock the branch asks head office for (type BRANCH_TO_ADMIN). The branch
 * raises the request here; Admin approves, rejects, or forwards it to a kitchen.
 * This screen is the branch's own view of what it has asked for and where each
 * ask stands.
 */
export default function BranchRequestsPage() {
  const [status, setStatus] = useState<RequestStatus | "all">("all");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);

  const filters: RequestFilters = useMemo(
    () => ({ status, page, page_size: REQUESTS_PAGE_SIZE }),
    [status, page],
  );

  const { data, isLoading, error, isFetching } = useBranchRequests(filters);
  const receiveRequest = useReceiveBranchRequest();

  const total = data?.total ?? 0;
  const pageSize = data?.page_size ?? REQUESTS_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
            Requests
          </h1>
          <p className="mt-1 text-sm text-muted">
            Stock this branch has asked head office for, and where each ask stands.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-1.5 size-4" aria-hidden />
          New request
        </Button>
      </div>

      <div className="flex justify-end">
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value as RequestStatus | "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="sm:w-56">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {option === "all"
                  ? "All statuses"
                  : option
                      .split("_")
                      .map((p) => titleCase(p.toLowerCase()))
                      .join(" ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <PageState
        isLoading={isLoading}
        isError={!!error}
        data={data?.items}
        isEmpty={(rows) => rows.length === 0}
        errorTitle="Couldn't load requests"
        errorDescription={error instanceof Error ? error.message : undefined}
        emptyTitle="No requests yet"
        emptyDescription="Ask head office for stock with New request. Everything you raise appears here."
      >
        {(rows) => (
          <ul className="space-y-3">
            {rows.map((req) => (
              <li key={req.id} className="rounded-2xl border border-line bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-muted">{formatDate(req.created_at)}</p>
                    {req.notes && (
                      <p className="mt-0.5 text-xs italic text-faint">{req.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <RequestStatusBadge status={req.status} />
                    {req.status === "DISPATCHED" && (
                      <Button
                        size="sm"
                        disabled={receiveRequest.isPending}
                        onClick={() => receiveRequest.mutate(req.id)}
                      >
                        <PackageCheck className="mr-1.5 size-4" aria-hidden />
                        Mark received
                      </Button>
                    )}
                  </div>
                </div>
                <ul className="mt-3 divide-y divide-line rounded-xl bg-surface-2 px-3">
                  {req.line_items.map((line) => (
                    <li
                      key={line.id}
                      className="flex justify-between gap-3 py-2 text-sm"
                    >
                      <span className="min-w-0 truncate text-content">
                        {line.product_name}
                      </span>
                      <span className="tabular-nums text-muted">
                        {line.quantity_approved != null &&
                        line.quantity_approved !== line.quantity_requested
                          ? `${line.quantity_approved} / ${line.quantity_requested}`
                          : line.quantity_requested}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </PageState>

      {total > pageSize && (
        <div className="flex items-center justify-end gap-3">
          <p className="text-sm text-muted">
            Page {page} of {totalPages}
          </p>
          <Button
            type="button"
            variant="outline"
            disabled={page <= 1 || isFetching}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={page >= totalPages || isFetching}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
        </div>
      )}

      <NewRequestDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

type DraftLine = CreateBranchRequestLineInput & { uid: string };

function newLine(): DraftLine {
  return { uid: `l${Date.now()}-${Math.round(performance.now())}`, product_id: "", quantity_requested: 1 };
}

function NewRequestDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: inventory } = useBranchInventory();
  const kitchens = useBranchKitchens();
  const create = useCreateBranchRequest();
  const [lines, setLines] = useState<DraftLine[]>([newLine()]);
  const [kitchenId, setKitchenId] = useState("");
  const [notes, setNotes] = useState("");

  // The branch's own catalogue. Pricing is Admin-only and absent from this
  // shape, so inventory — not the pricing catalogue — is the branch-scoped
  // source, same as the sub-kitchen dialog. Deduped: one product, many batches.
  const products = Array.from(
    new Map((inventory ?? []).map((i) => [i.product_id, i.product_name])).entries(),
  ).map(([id, name]) => ({ id, name }));

  const kitchenOptions = kitchens.data ?? [];
  // No central kitchen (or none created yet) → don't force choosing one. Admin
  // fulfils from the warehouse and the branch sub-kitchen produces locally.
  const noKitchens = !kitchens.isLoading && kitchenOptions.length === 0;
  const usable = lines.filter((l) => l.product_id && l.quantity_requested > 0);
  const valid = usable.length > 0 && (noKitchens || !!kitchenId);

  function update(uid: string, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((l) => (l.uid === uid ? { ...l, ...patch } : l)));
  }

  function reset() {
    setLines([newLine()]);
    setKitchenId("");
    setNotes("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New stock request</DialogTitle>
          <DialogDescription>
            {noKitchens
              ? "What this branch needs. Admin reviews and approves it."
              : "What this branch needs, and which kitchen should fulfil it. Admin reviews and approves it."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {!noKitchens && (
            <div className="space-y-1">
              <Label className="text-xs">Fulfilling kitchen</Label>
              <Select value={kitchenId} onValueChange={setKitchenId}>
                <SelectTrigger className="h-10">
                  <SelectValue
                    placeholder={kitchens.isLoading ? "Loading kitchens…" : "Choose a kitchen…"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {kitchenOptions.map((k) => (
                    <SelectItem key={k.id} value={k.id}>
                      {k.name}
                      {k.location ? ` — ${k.location}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {lines.map((line) => (
            <div key={line.uid} className="flex items-end gap-2">
              <div className="min-w-0 flex-1 space-y-1">
                <Label className="text-xs">Product</Label>
                <Select
                  value={line.product_id}
                  onValueChange={(v) => update(line.uid, { product_id: v })}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Choose…" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-20 space-y-1">
                <Label className="text-xs">Qty</Label>
                <Input
                  className="h-10"
                  inputMode="numeric"
                  value={line.quantity_requested}
                  onChange={(e) =>
                    update(line.uid, {
                      quantity_requested: Math.max(0, parseInt(e.target.value, 10) || 0),
                    })
                  }
                />
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="size-10"
                disabled={lines.length <= 1}
                onClick={() => setLines((prev) => prev.filter((l) => l.uid !== line.uid))}
                aria-label="Remove line"
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </div>
          ))}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setLines((prev) => [...prev, newLine()])}
          >
            <Plus className="mr-1.5 size-3.5" aria-hidden />
            Add line
          </Button>

          <div className="space-y-2">
            <Label htmlFor="req-notes">Notes</Label>
            <Textarea
              id="req-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything head office should know…"
            />
          </div>

          {!valid && (
            <Badge variant="outline" className="text-warning">
              {!noKitchens && !kitchenId
                ? "Pick a kitchen and add at least one product"
                : "Add at least one product with a quantity"}
            </Badge>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!valid || create.isPending}
            onClick={() =>
              create.mutate(
                {
                  kitchen_id: kitchenId || undefined,
                  notes: notes.trim() || undefined,
                  lines: usable.map(({ product_id, quantity_requested }) => ({
                    product_id,
                    quantity_requested,
                  })),
                },
                {
                  onSuccess: () => {
                    onOpenChange(false);
                    reset();
                  },
                },
              )
            }
          >
            Send request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
