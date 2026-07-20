"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useBranches } from "@/lib/hooks/use-locations";
import {
  useAllocateDispatchRequest,
  useUpdateRequestStatus,
} from "@/lib/hooks/use-requests";
import type { StockRequest } from "@/lib/types/admin";

interface DispatchAllocationPanelProps {
  request: StockRequest;
  canUpdate: boolean;
}

type Draft = { uid: string; line_item_id: string; branch_id: string; quantity: string };

let uidSeq = 0;
const nextUid = () => `alloc-${(uidSeq += 1)}`;

/**
 * Admin approving a KITCHEN_TO_ADMIN dispatch request. Each line (a produced
 * product with a ready quantity) is split across one or more branches; the
 * per-line total can't exceed what's ready. Once allocated, the panel shows a
 * read-only summary. Reject reuses the generic status PATCH.
 */
export function DispatchAllocationPanel({
  request,
  canUpdate,
}: DispatchAllocationPanelProps) {
  const branches = useBranches();
  const allocate = useAllocateDispatchRequest(request.id);
  const reject = useUpdateRequestStatus(request.id);

  const [drafts, setDrafts] = useState<Draft[]>(() =>
    request.line_items.map((line) => ({
      uid: nextUid(),
      line_item_id: line.id,
      branch_id: "",
      quantity: String(line.quantity_requested),
    })),
  );
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [rejectOpen, setRejectOpen] = useState(false);

  // Already allocated (or rejected): read-only. Nothing left for Admin to do.
  if (request.status !== "PENDING") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Allocation</CardTitle>
          <CardDescription>
            {request.status === "ALLOCATED"
              ? "This dispatch has been allocated across branches."
              : "This request is closed."}
          </CardDescription>
        </CardHeader>
        {request.allocations && request.allocations.length > 0 && (
          <CardContent className="space-y-4">
            {request.line_items.map((line) => {
              const rows = request.allocations!.filter(
                (a) => a.line_item_id === line.id,
              );
              if (rows.length === 0) return null;
              return (
                <div key={line.id} className="rounded-xl border border-line bg-surface-2 p-3">
                  <p className="text-sm font-medium text-content">{line.product_name}</p>
                  <ul className="mt-1.5 space-y-1">
                    {rows.map((a, i) => (
                      <li
                        key={`${a.branch_id}-${i}`}
                        className="flex justify-between text-sm"
                      >
                        <span className="text-muted">{a.branch_name}</span>
                        <span className="tabular-nums text-content">{a.quantity}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </CardContent>
        )}
      </Card>
    );
  }

  if (!canUpdate) return null;

  const totalsByLine = new Map<string, number>();
  for (const d of drafts) {
    if (!d.branch_id) continue;
    totalsByLine.set(
      d.line_item_id,
      (totalsByLine.get(d.line_item_id) ?? 0) + (Number(d.quantity) || 0),
    );
  }

  const usable = drafts.filter((d) => d.branch_id && Number(d.quantity) > 0);
  const overByLine = request.line_items.find(
    (line) => (totalsByLine.get(line.id) ?? 0) > line.quantity_requested,
  );
  // A branch used twice on the same line is almost certainly a mistake.
  const dupKey = new Set<string>();
  let duplicate = false;
  for (const d of usable) {
    const k = `${d.line_item_id}:${d.branch_id}`;
    if (dupKey.has(k)) duplicate = true;
    dupKey.add(k);
  }
  const valid = usable.length > 0 && !overByLine && !duplicate;

  const update = (uid: string, patch: Partial<Draft>) =>
    setDrafts((prev) => prev.map((d) => (d.uid === uid ? { ...d, ...patch } : d)));

  const addRow = (lineId: string) =>
    setDrafts((prev) => [
      ...prev,
      { uid: nextUid(), line_item_id: lineId, branch_id: "", quantity: "0" },
    ]);

  const submit = async () => {
    setError(undefined);
    if (overByLine) {
      setError(
        `Allocated more ${overByLine.product_name} than the ${overByLine.quantity_requested} ready.`,
      );
      return;
    }
    if (duplicate) {
      setError("A branch is listed twice on the same product. Combine those rows.");
      return;
    }
    try {
      await allocate.mutateAsync({
        notes: notes.trim() || undefined,
        allocations: usable.map((d) => ({
          line_item_id: d.line_item_id,
          branch_id: d.branch_id,
          quantity: Number(d.quantity),
        })),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to allocate");
    }
  };

  const branchOptions = branches.data ?? [];

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Allocate to branches</CardTitle>
          <CardDescription>
            Split each product across branches. A product&apos;s total can&apos;t exceed
            the quantity the kitchen has ready.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {request.line_items.map((line) => {
            const allocated = totalsByLine.get(line.id) ?? 0;
            const remaining = line.quantity_requested - allocated;
            return (
              <div key={line.id} className="space-y-2 rounded-xl border border-line bg-surface-2 p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-medium text-content">{line.product_name}</p>
                  <p
                    className={
                      remaining < 0
                        ? "text-xs font-medium text-danger"
                        : "text-xs text-muted"
                    }
                  >
                    {allocated} / {line.quantity_requested} allocated
                  </p>
                </div>

                {drafts
                  .filter((d) => d.line_item_id === line.id)
                  .map((d) => (
                    <div key={d.uid} className="flex items-end gap-2">
                      <div className="min-w-0 flex-1 space-y-1">
                        <Label className="text-xs">Branch</Label>
                        <Select
                          value={d.branch_id}
                          onValueChange={(v) => update(d.uid, { branch_id: v })}
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue
                              placeholder={branches.isLoading ? "Loading…" : "Choose…"}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {branchOptions.map((b) => (
                              <SelectItem key={b.id} value={b.id}>
                                {b.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-24 space-y-1">
                        <Label className="text-xs">Qty</Label>
                        <Input
                          className="h-10"
                          inputMode="numeric"
                          value={d.quantity}
                          onChange={(e) =>
                            update(d.uid, {
                              quantity: e.target.value.replace(/\D/g, "") || "0",
                            })
                          }
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-10"
                        disabled={
                          drafts.filter((x) => x.line_item_id === line.id).length <= 1
                        }
                        onClick={() =>
                          setDrafts((prev) => prev.filter((x) => x.uid !== d.uid))
                        }
                        aria-label="Remove branch"
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </Button>
                    </div>
                  ))}

                <Button
                  variant="outline"
                  size="sm"
                  disabled={remaining <= 0}
                  onClick={() => addRow(line.id)}
                >
                  <Plus className="mr-1.5 size-3.5" aria-hidden />
                  Add branch
                </Button>
              </div>
            );
          })}

          <div className="space-y-1.5">
            <Label htmlFor="alloc-notes" className="text-xs">
              Notes (optional)
            </Label>
            <Textarea
              id="alloc-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add a note for the kitchen"
              rows={2}
            />
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="destructive"
              disabled={reject.isPending || allocate.isPending}
              onClick={() => setRejectOpen(true)}
            >
              Reject
            </Button>
            <Button
              type="button"
              disabled={!valid || allocate.isPending}
              onClick={() => void submit()}
            >
              {allocate.isPending ? "Allocating…" : "Allocate to branches"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title="Reject this dispatch?"
        description="The kitchen will see this request as rejected. Nothing is dispatched."
        confirmLabel="Reject request"
        destructive
        loading={reject.isPending}
        onConfirm={async () => {
          await reject.mutateAsync({ to_status: "REJECTED" });
          setRejectOpen(false);
        }}
      />
    </>
  );
}
