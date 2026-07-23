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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useBranches } from "@/lib/hooks/use-locations";
import { useAllocateProductionTarget } from "@/lib/hooks/use-production-targets";
import type { ProductionTarget } from "@/lib/types/production-target";

type Draft = { uid: string; line_id: string; branch_id: string; quantity: string };

let uidSeq = 0;
const nextUid = () => `ptgt-alloc-${(uidSeq += 1)}`;

/**
 * Admin splitting a COMPLETED production target across branches. Each produced
 * line is divided among one or more branches; a line's total can't exceed what
 * the kitchen produced. Mirrors the dispatch-request allocation panel so the two
 * read and behave the same. Rendered only while the target is COMPLETED.
 */
export function ProductionTargetAllocationPanel({
  target,
}: {
  target: ProductionTarget;
}) {
  const branches = useBranches();
  const allocate = useAllocateProductionTarget(target.id);

  const [drafts, setDrafts] = useState<Draft[]>(() =>
    target.lines.map((line) => ({
      uid: nextUid(),
      line_id: line.id,
      branch_id: "",
      quantity: String(line.quantity),
    })),
  );
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | undefined>();

  const totalsByLine = new Map<string, number>();
  for (const d of drafts) {
    if (!d.branch_id) continue;
    totalsByLine.set(
      d.line_id,
      (totalsByLine.get(d.line_id) ?? 0) + (Number(d.quantity) || 0),
    );
  }

  const usable = drafts.filter((d) => d.branch_id && Number(d.quantity) > 0);
  const overLine = target.lines.find(
    (line) => (totalsByLine.get(line.id) ?? 0) > line.quantity,
  );
  // A branch used twice on the same line is almost certainly a mistake.
  const seen = new Set<string>();
  let duplicate = false;
  for (const d of usable) {
    const k = `${d.line_id}:${d.branch_id}`;
    if (seen.has(k)) duplicate = true;
    seen.add(k);
  }
  const valid = usable.length > 0 && !overLine && !duplicate;

  const update = (uid: string, patch: Partial<Draft>) =>
    setDrafts((prev) => prev.map((d) => (d.uid === uid ? { ...d, ...patch } : d)));

  const addRow = (lineId: string) =>
    setDrafts((prev) => [
      ...prev,
      { uid: nextUid(), line_id: lineId, branch_id: "", quantity: "0" },
    ]);

  const submit = async () => {
    setError(undefined);
    if (overLine) {
      setError(
        `Allocated more ${overLine.product_name} than the ${overLine.quantity} produced.`,
      );
      return;
    }
    if (duplicate) {
      setError("A branch is listed twice on the same product. Combine those rows.");
      return;
    }
    try {
      await allocate.mutateAsync({
        note: note.trim() || undefined,
        allocations: usable.map((d) => ({
          line_id: d.line_id,
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
    <Card>
      <CardHeader>
        <CardTitle>Allocate to branches</CardTitle>
        <CardDescription>
          Split each product across branches. A product&apos;s total can&apos;t exceed
          the quantity the kitchen produced. The kitchen dispatches once allocated.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {target.lines.map((line) => {
          const allocated = totalsByLine.get(line.id) ?? 0;
          const remaining = line.quantity - allocated;
          return (
            <div
              key={line.id}
              className="space-y-2 rounded-xl border border-line bg-surface-2 p-4"
            >
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-medium text-content">{line.product_name}</p>
                <p
                  className={
                    remaining < 0
                      ? "text-xs font-medium text-danger"
                      : "text-xs text-muted"
                  }
                >
                  {allocated} / {line.quantity} allocated
                </p>
              </div>

              {drafts
                .filter((d) => d.line_id === line.id)
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
                        drafts.filter((x) => x.line_id === line.id).length <= 1
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
          <Label htmlFor="ptgt-alloc-note" className="text-xs">
            Note (optional)
          </Label>
          <Textarea
            id="ptgt-alloc-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note for the kitchen"
            rows={2}
          />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex justify-end">
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
  );
}
