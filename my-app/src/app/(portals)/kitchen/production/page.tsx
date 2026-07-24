"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Factory, Plus, Send, Trash2, TriangleAlert } from "lucide-react";
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
import { useAuth } from "@/lib/auth";
import {
  useKitchenCatalogue,
  useKitchenProduction,
  useKitchenRecipes,
  useProduceKitchenProduct,
} from "@/lib/hooks/use-kitchen-recipes";
import { useKitchenInventory } from "@/lib/hooks/use-kitchen-inventory";
import { useCreateDispatchNotification } from "@/lib/hooks/use-kitchen-requests";
import { formatDate } from "@/lib/utils";
import { formatStockQty, type StockUnit } from "@/lib/stock-unit";
import { tryConvertQty } from "@/lib/unit-convert";
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
  const [notifyOpen, setNotifyOpen] = useState(false);

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
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setNotifyOpen(true)}>
              <Send className="mr-1.5 size-4" aria-hidden />
              Notify Admin
            </Button>
            <Button onClick={() => setOpen(true)}>
              <Plus className="mr-1.5 size-4" aria-hidden />
              Make something
            </Button>
          </div>
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
      <NotifyAdminDialog open={notifyOpen} onOpenChange={setNotifyOpen} />
    </div>
  );
}

type NotifyLine = { product_id: string; product_name: string; on_hand: number; quantity: string };

/**
 * Tells Admin which produced goods are ready to dispatch. Auto-filled from what
 * the kitchen holds (one line per product, summed across batches); the chef
 * trims quantities or drops lines before sending. Admin then splits each line
 * across branches.
 */
function NotifyAdminDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const inventory = useKitchenInventory();
  // "What we make" — finished goods only. Dispatch is about sending produced
  // items to branches, not the raw components (chicken, buns…) the kitchen holds
  // to cook with, so those are excluded here.
  const catalogue = useKitchenCatalogue();
  const notify = useCreateDispatchNotification();
  const [lines, setLines] = useState<NotifyLine[] | null>(null);
  const [notes, setNotes] = useState("");

  const finishedIds = useMemo(
    () => new Set((catalogue.data ?? []).map((c) => c.id)),
    [catalogue.data],
  );

  // Seed the lines from finished-goods stock the first time the dialog has data,
  // then leave the chef's edits alone. Aggregate batches so it reads one row per
  // product.
  const seeded = useMemo<NotifyLine[]>(() => {
    const byProduct = new Map<string, NotifyLine>();
    for (const item of inventory.data ?? []) {
      if (!finishedIds.has(item.product_id)) continue;
      const existing = byProduct.get(item.product_id);
      if (existing) {
        existing.on_hand += item.quantity;
        existing.quantity = String(existing.on_hand);
      } else {
        byProduct.set(item.product_id, {
          product_id: item.product_id,
          product_name: item.product.name,
          on_hand: item.quantity,
          quantity: String(item.quantity),
        });
      }
    }
    return [...byProduct.values()].filter((l) => l.on_hand > 0);
  }, [inventory.data, finishedIds]);

  const rows = lines ?? seeded;

  function update(productId: string, patch: Partial<NotifyLine>) {
    setLines(rows.map((l) => (l.product_id === productId ? { ...l, ...patch } : l)));
  }

  function reset() {
    setLines(null);
    setNotes("");
  }

  const usable = rows.filter((l) => Number(l.quantity) > 0);
  const overCommitted = rows.find((l) => Number(l.quantity) > l.on_hand);
  const valid = usable.length > 0 && !overCommitted;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Notify Admin</DialogTitle>
          <DialogDescription>
            Produced goods ready to dispatch. Admin allocates these across branches.
          </DialogDescription>
        </DialogHeader>

        {inventory.isLoading || catalogue.isLoading ? (
          <p className="py-6 text-center text-sm text-muted">Loading stock…</p>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">
            No finished goods on hand to dispatch. Make something first.
          </p>
        ) : (
          <div className="space-y-3">
            {rows.map((line) => (
              <div key={line.product_id} className="flex items-end gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-content">
                    {line.product_name}
                  </p>
                  <p className="text-xs text-muted">{line.on_hand} on hand</p>
                </div>
                <div className="w-24 space-y-1">
                  <Label className="text-xs">Dispatch</Label>
                  <Input
                    className="h-10"
                    inputMode="numeric"
                    value={line.quantity}
                    onChange={(e) =>
                      update(line.product_id, {
                        quantity: e.target.value.replace(/\D/g, "") || "0",
                      })
                    }
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-10"
                  onClick={() =>
                    setLines(rows.filter((l) => l.product_id !== line.product_id))
                  }
                  aria-label={`Remove ${line.product_name}`}
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </div>
            ))}

            <div className="space-y-1.5">
              <Label htmlFor="notify-notes" className="text-xs">
                Notes
              </Label>
              <Textarea
                id="notify-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anything Admin should know…"
              />
            </div>

            {overCommitted && (
              <p className="flex items-start gap-2 rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">
                <TriangleAlert className="mt-0.5 size-3 shrink-0" aria-hidden />
                {overCommitted.product_name}: only {overCommitted.on_hand} on hand.
              </p>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!valid || notify.isPending}
            onClick={() =>
              notify.mutate(
                {
                  notes: notes.trim() || undefined,
                  lines: usable.map((l) => ({
                    product_id: l.product_id,
                    quantity: Number(l.quantity),
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
            <Send className="mr-1.5 size-4" aria-hidden />
            Notify Admin
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
  const recipes = useKitchenRecipes();
  const inventory = useKitchenInventory();
  const produce = useProduceKitchenProduct();

  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [batchCode, setBatchCode] = useState("");

  const picked = (catalogue.data ?? []).find((p) => p.id === productId);
  // Producing something with no recipe is 409 `no_active_recipe`. Saying so
  // before they hit the button beats an error toast afterwards.
  const noRecipe = picked && picked.has_recipe === false;
  const valid = !!productId && Number(quantity) > 0 && !noRecipe;

  // What producing this many will draw from stock — one line per component,
  // converted into the ingredient's stock unit and multiplied by the batch
  // count, so the chef sees "10 buns → 1 kg flour" before committing.
  const qtyNum = Number(quantity);
  const activeRecipe = picked
    ? (recipes.data ?? []).find((r) => r.is_active && r.product_name === picked.name)
    : undefined;
  // Keyed by the numeric portion of the product id ("prod-001" → 1), because a
  // recipe component references it as a number while inventory rows carry the
  // string id. Also remember each product's stock_unit so a recipe response that
  // omits it (or an older cached row) still converts kg↔g correctly.
  const onHandById = useMemo(() => {
    const totals = new Map<number, number>();
    const units = new Map<number, StockUnit>();
    for (const item of inventory.data ?? []) {
      const key = Number(item.product_id.replace(/\D/g, "")) || 0;
      totals.set(key, (totals.get(key) ?? 0) + item.quantity);
      if (item.product.stock_unit) units.set(key, item.product.stock_unit);
    }
    return { totals, units };
  }, [inventory.data]);
  const projection =
    activeRecipe && Number.isFinite(qtyNum) && qtyNum > 0
      ? (() => {
          const batches = Math.ceil(qtyNum / (activeRecipe.yield_qty || 1));
          return activeRecipe.components.map((c) => {
            const from = c.unit ?? c.stock_unit ?? "EACH";
            // Prefer recipe.stock_unit, then inventory product, then entry unit.
            const to =
              c.stock_unit ??
              onHandById.units.get(c.component_product_id) ??
              from;
            const perBatch = tryConvertQty(c.quantity, from, to) ?? c.quantity;
            const needed = perBatch * batches;
            const onHand = onHandById.totals.get(c.component_product_id);
            return {
              id: c.component_product_id,
              name: c.component_name ?? `#${c.component_product_id}`,
              needed,
              unit: to,
              onHand,
              short: onHand != null && onHand < needed,
            };
          });
        })()
      : [];

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

          {projection.length > 0 && (
            <div className="space-y-1.5 rounded-lg border border-line bg-surface-2/50 px-3 py-2.5">
              <p className="text-xs font-medium uppercase tracking-wide text-faint">
                Will use
              </p>
              <ul className="space-y-1">
                {projection.map((p) => (
                  <li key={p.id} className="flex justify-between gap-2 text-sm">
                    <span className="truncate text-content">{p.name}</span>
                    <span
                      className={
                        p.short
                          ? "shrink-0 tabular-nums text-warning"
                          : "shrink-0 tabular-nums text-muted"
                      }
                    >
                      {formatStockQty(p.needed, p.unit)}
                      {p.onHand != null && (
                        <span className="text-faint">
                          {" "}
                          / {formatStockQty(p.onHand, p.unit)}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
              {projection.some((p) => p.short) && (
                <p className="flex items-start gap-1.5 text-xs text-warning">
                  <TriangleAlert className="mt-0.5 size-3 shrink-0" aria-hidden />
                  Not enough stock for this many.
                </p>
              )}
            </div>
          )}

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
