"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Factory, Plus, TriangleAlert } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useAuth } from "@/lib/auth";
import {
  useKitchenCatalogue,
  useKitchenProduction,
  useProduceKitchenProduct,
} from "@/lib/hooks/use-kitchen-recipes";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import type { ProductionLineRole } from "@/lib/types/branch";

/**
 * Making things.
 *
 * A recipe that nothing consumes is decoration — this is the screen that makes
 * it do something. Producing 10 burgers consumes 20 buns and 10 patties from
 * *kitchen* stock and credits 10 burgers back to it.
 *
 * Note where this happens: the kitchen, not the branch. The branch receives
 * finished burgers and sells them 1:1 — it never holds the buns, which is why
 * exploding a recipe at the branch would have failed hunting for components it
 * was never allocated.
 */
export default function KitchenProductionPage() {
  const { can } = useAuth();
  const runs = useKitchenProduction();
  const [open, setOpen] = useState(false);

  const isManager = can("kitchen-staff:create");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
            Production
          </h1>
          <p className="mt-1 text-sm text-muted">
            What this kitchen made, and what it used up doing it.
          </p>
        </div>
        {isManager && (
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-1.5 size-4" aria-hidden />
            Make something
          </Button>
        )}
      </div>

      <PageState
        isLoading={runs.isLoading}
        isError={!!runs.error}
        data={runs.data}
        isEmpty={(rows) => rows.length === 0}
        errorTitle="Couldn't load production"
        errorDescription={runs.error instanceof Error ? runs.error.message : undefined}
        emptyTitle="Nothing made yet"
        emptyDescription="Producing an item consumes its recipe's ingredients from kitchen stock."
      >
        {(rows) => (
          <ul className="space-y-3">
            {rows.map((run) => {
              const output = run.lines.find((l) => l.role === "OUTPUT");
              return (
                <li key={run.id} className="rounded-2xl border border-line bg-surface p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="flex items-center gap-2 text-sm font-medium text-content">
                      <Factory className="size-4 text-brand" aria-hidden />
                      {output ? `${output.quantity}× ${output.product_name}` : "Run"}
                    </p>
                    <p className="text-xs text-muted">{formatDate(run.created_at)}</p>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <LineGroup title="Used" role="INPUT" lines={run.lines} />
                    <LineGroup title="Made" role="OUTPUT" lines={run.lines} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </PageState>

      <ProduceDialog open={open} onOpenChange={setOpen} />
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

function ProduceDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const catalogue = useKitchenCatalogue();
  const produce = useProduceKitchenProduct();

  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [batchCode, setBatchCode] = useState("");

  const picked = (catalogue.data ?? []).find((p) => p.id === productId);
  // Producing something with no recipe is 409 `no_active_recipe`. Saying so
  // before they hit the button beats an error toast afterwards.
  const noRecipe = picked && picked.has_recipe === false;
  const valid = !!productId && Number(quantity) > 0 && !noRecipe;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Make something</DialogTitle>
          <DialogDescription>
            Ingredients come out of kitchen stock before the output goes in.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Item</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Choose…" />
              </SelectTrigger>
              <SelectContent>
                {(catalogue.data ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                    {p.has_recipe === false && " — no recipe"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {noRecipe && (
            <p className="flex items-start gap-2 rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">
              <TriangleAlert className="mt-0.5 size-3 shrink-0" aria-hidden />
              No recipe yet, so there&apos;s nothing to consume. Add one first.
            </p>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs" htmlFor="prod-qty">
              How many
            </Label>
            <Input
              id="prod-qty"
              className="h-12 text-center text-xl tabular-nums"
              inputMode="numeric"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value.replace(/\D/g, "") || "0")}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs" htmlFor="prod-batch">
              Batch code
            </Label>
            <Input
              id="prod-batch"
              className="h-10"
              placeholder="Optional"
              value={batchCode}
              onChange={(e) => setBatchCode(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!valid || produce.isPending}
            onClick={() => {
              const numericId = Number(productId.replace(/\D/g, ""));
              if (!numericId) {
                toast.error("Couldn't resolve this product's id");
                return;
              }
              produce.mutate(
                {
                  product_id: numericId,
                  quantity: Number(quantity),
                  batch_code: batchCode.trim() || null,
                },
                {
                  onSuccess: () => {
                    onOpenChange(false);
                    setProductId("");
                    setQuantity("1");
                    setBatchCode("");
                  },
                },
              );
            }}
          >
            Make
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
