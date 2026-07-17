"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useBranchInventory, useCreateProductionRun, useProductionRuns } from "@/lib/hooks/use-branch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { formatDate } from "@/lib/utils";
import type { ProductionLineInput, ProductionLineRole } from "@/lib/types/branch";

/**
 * Sub-kitchen — final prep inside the branch (10 dough → 10 bases).
 *
 * Not a Kitchen entity: it consumes branch stock and produces branch stock, and
 * that is the whole model. A run is all-or-nothing and needs at least one input
 * and one output, which is what stops it being used as a back door to invent or
 * destroy stock without a trace.
 */
export default function BranchProductionPage() {
  const [open, setOpen] = useState(false);
  const { data, isLoading, error } = useProductionRuns();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
            Sub-kitchen
          </h1>
          <p className="mt-1 text-sm text-muted">
            Prep logged at this branch — what went in, what came out.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-1.5 size-4" aria-hidden />
          Log a run
        </Button>
      </div>

      <PageState
        isLoading={isLoading}
        isError={!!error}
        data={data?.items}
        isEmpty={(rows) => rows.length === 0}
        errorTitle="Couldn't load production runs"
        errorDescription={error instanceof Error ? error.message : undefined}
        emptyTitle="No runs logged"
        emptyDescription="Prep work logged here adjusts this branch's stock."
      >
        {(rows) => (
          <ul className="space-y-3">
            {rows.map((run) => (
              <li key={run.id} className="rounded-2xl border border-line bg-surface p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted">{formatDate(run.created_at)}</p>
                  {run.note && <p className="text-xs italic text-faint">{run.note}</p>}
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <LineGroup title="In" role="INPUT" lines={run.lines} />
                  <LineGroup title="Out" role="OUTPUT" lines={run.lines} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </PageState>

      <ProductionDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

function LineGroup({
  title,
  role,
  lines,
}: {
  title: string;
  role: ProductionLineRole;
  lines: { id: string; product_name?: string; role: ProductionLineRole; quantity: number }[];
}) {
  const rows = lines.filter((l) => l.role === role);
  const Icon = role === "INPUT" ? ArrowDown : ArrowUp;

  return (
    <div className="rounded-xl bg-surface-2 p-3">
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-faint">
        <Icon className="size-3" aria-hidden />
        {title}
      </p>
      <ul className="mt-1.5 space-y-1">
        {rows.map((l) => (
          <li key={l.id} className="flex justify-between text-sm">
            <span className="text-content">{l.product_name ?? l.id}</span>
            <span className="tabular-nums text-muted">{l.quantity}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProductionDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: inventory } = useBranchInventory();
  const create = useCreateProductionRun();
  const [lines, setLines] = useState<ProductionLineInput[]>([
    { product_id: "", role: "INPUT", quantity: 1 },
    { product_id: "", role: "OUTPUT", quantity: 1 },
  ]);
  const [note, setNote] = useState("");

  // Products the branch actually holds. A run can only consume what's here.
  const products = Array.from(
    new Map((inventory ?? []).map((i) => [i.product_id, i.product_name])).entries(),
  ).map(([id, name]) => ({ id, name }));

  const hasInput = lines.some((l) => l.role === "INPUT" && l.product_id);
  const hasOutput = lines.some((l) => l.role === "OUTPUT" && l.product_id);
  const valid = hasInput && hasOutput && lines.every((l) => !l.product_id || l.quantity > 0);

  function update(i: number, patch: Partial<ProductionLineInput>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Log a production run</DialogTitle>
          <DialogDescription>
            What was consumed and what was produced. Needs at least one of each.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {lines.map((line, i) => (
            <div key={i} className="flex items-end gap-2">
              <div className="w-24 space-y-1">
                <Label className="text-xs">Role</Label>
                <Select
                  value={line.role}
                  onValueChange={(v) => update(i, { role: v as ProductionLineRole })}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INPUT">In</SelectItem>
                    <SelectItem value="OUTPUT">Out</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                <Label className="text-xs">Product</Label>
                <Select
                  value={line.product_id}
                  onValueChange={(v) => update(i, { product_id: v })}
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
                  value={line.quantity}
                  onChange={(e) =>
                    update(i, { quantity: Math.max(0, parseInt(e.target.value, 10) || 0) })
                  }
                />
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="size-10"
                disabled={lines.length <= 2}
                onClick={() => setLines((prev) => prev.filter((_, idx) => idx !== i))}
                aria-label="Remove line"
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </div>
          ))}

          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setLines((prev) => [...prev, { product_id: "", role: "INPUT", quantity: 1 }])
            }
          >
            <Plus className="mr-1.5 size-3.5" aria-hidden />
            Add line
          </Button>

          <div className="space-y-2">
            <Label htmlFor="prod-note">Note</Label>
            <Input id="prod-note" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>

          {!valid && (
            <Badge variant="outline" className="text-warning">
              Needs at least one input and one output
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
                  lines: lines.filter((l) => l.product_id),
                  note: note.trim() || undefined,
                },
                {
                  onSuccess: () => {
                    onOpenChange(false);
                    setNote("");
                    setLines([
                      { product_id: "", role: "INPUT", quantity: 1 },
                      { product_id: "", role: "OUTPUT", quantity: 1 },
                    ]);
                  },
                },
              )
            }
          >
            Log run
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
