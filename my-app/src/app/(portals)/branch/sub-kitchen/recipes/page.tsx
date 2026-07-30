"use client";

import { useMemo, useState } from "react";
import { Info, Plus, Trash2, Utensils } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { PageState } from "@/components/ui/page-state";
import {
  useCreateSubKitchenRecipe,
  useSubKitchenProducts,
  useSubKitchenRecipes,
} from "@/lib/hooks/use-sub-kitchen";
import { formatBasisPoints } from "@/lib/money";
import { formatStockQty, stockUnitLabel, type StockUnit } from "@/lib/stock-unit";
import { convertibleUnits, tryConvertQty } from "@/lib/unit-convert";
import { toast } from "sonner";
import type { SubKitchenRecipe } from "@/lib/types/sub-kitchen";

const numId = (s: string) => Number(String(s).replace(/\D/g, "")) || 0;

/** A product the chef can write a NEW recipe for. */
interface MakeableProduct {
  productId: number;
  name: string;
}

interface ComponentRow {
  componentId: number;
  quantity: number;
  unit?: StockUnit;
}

export default function SubKitchenRecipesPage() {
  const recipes = useSubKitchenRecipes();
  // `null` = closed; a recipe = update it; a product = write its first recipe.
  const [editing, setEditing] = useState<
    { recipe: SubKitchenRecipe } | { product: MakeableProduct } | null
  >(null);
  const [pickingNew, setPickingNew] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="flex items-start gap-2 text-sm text-muted">
          <Info className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
          <span>
            What each made item is made of. Republishing creates a new version and
            retires the old, so completed prep keeps meaning what it meant.
          </span>
        </p>
        <Button onClick={() => setPickingNew(true)}>
          <Plus className="mr-1.5 size-4" aria-hidden />
          New recipe
        </Button>
      </div>

      <PageState
        isLoading={recipes.isLoading}
        isError={!!recipes.error}
        data={recipes.data}
        isEmpty={(rows) => rows.length === 0}
        errorTitle="Couldn't load recipes"
        errorDescription={recipes.error instanceof Error ? recipes.error.message : undefined}
        onRetry={() => recipes.refetch()}
        emptyTitle="No recipes yet"
        emptyDescription="Add a recipe so the station knows what an item is made of."
      >
        {(rows) => (
          <div className="grid gap-4 md:grid-cols-2">
            {rows.map((recipe) => (
              <Card key={recipe.id}>
                <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
                  <div className="min-w-0">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Utensils className="size-4 shrink-0 text-brand" aria-hidden />
                      <span className="truncate">
                        {recipe.product_name ?? `#${recipe.product_id}`}
                      </span>
                      <Badge variant="secondary">v{recipe.version}</Badge>
                    </CardTitle>
                    <CardDescription>Makes {recipe.yield_qty} per run.</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setEditing({ recipe })}>
                    Update recipe
                  </Button>
                </CardHeader>
                <CardContent>
                  <ul className="divide-y divide-line text-sm">
                    {recipe.components.map((c) => (
                      <li key={c.component_product_id} className="flex justify-between py-2">
                        <span className="text-content">
                          {c.component_name ?? `#${c.component_product_id}`}
                        </span>
                        <span className="tabular-nums text-muted">
                          {c.quantity}
                          {stockUnitLabel(c.unit ?? c.stock_unit) && (
                            <span className="text-faint">
                              {" "}
                              {stockUnitLabel(c.unit ?? c.stock_unit)}
                            </span>
                          )}
                          {c.wastage_bp > 0 && (
                            <span className="ml-1.5 text-xs text-faint">
                              +{formatBasisPoints(c.wastage_bp)} waste
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </PageState>

      <PickProductDialog
        open={pickingNew}
        onOpenChange={setPickingNew}
        recipedIds={new Set((recipes.data ?? []).map((r) => r.product_id))}
        onPick={(product) => {
          setPickingNew(false);
          setEditing({ product });
        }}
      />

      <RecipeFormDialog
        target={editing}
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
      />
    </div>
  );
}

/** Choose which made item a new recipe is for — from the sellable-items list. */
function PickProductDialog({
  open,
  onOpenChange,
  recipedIds,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipedIds: Set<number>;
  onPick: (product: MakeableProduct) => void;
}) {
  const products = useSubKitchenProducts("FINISHED_GOOD");
  const options = useMemo(
    () =>
      (products.data ?? [])
        .map((p) => ({ productId: Number(p.id), name: p.name }))
        .filter((p) => p.productId > 0 && !recipedIds.has(p.productId)),
    [products.data, recipedIds],
  );
  const [value, setValue] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New recipe</DialogTitle>
          <DialogDescription>Pick the item you&apos;re writing a recipe for.</DialogDescription>
        </DialogHeader>
        <Select value={value} onValueChange={setValue}>
          <SelectTrigger className="h-10">
            <SelectValue placeholder={options.length ? "Choose an item…" : "Nothing to add"} />
          </SelectTrigger>
          <SelectContent>
            {options.map((p) => (
              <SelectItem key={p.productId} value={String(p.productId)}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!value}
            onClick={() => {
              const picked = options.find((p) => String(p.productId) === value);
              if (picked) onPick(picked);
            }}
          >
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RecipeFormDialog({
  target,
  open,
  onOpenChange,
}: {
  target: { recipe: SubKitchenRecipe } | { product: MakeableProduct } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  // Ingredients are scoped to what the branch actually stocks, so the chef can't
  // pick something it can never get. The toggle widens to the full catalogue for
  // setting a recipe up before its components have been delivered.
  const [showAll, setShowAll] = useState(false);
  const rawMaterials = useSubKitchenProducts("RAW_MATERIAL", { all: showAll });
  const create = useCreateSubKitchenRecipe();

  const productId = target
    ? "recipe" in target
      ? target.recipe.product_id
      : target.product.productId
    : 0;
  const productName = target
    ? "recipe" in target
      ? target.recipe.product_name ?? `#${target.recipe.product_id}`
      : target.product.name
    : "";
  const isUpdate = !!target && "recipe" in target;

  // Each raw material carries its stock unit for compatible-unit entry. When
  // editing, fold in the recipe's existing components so a scoped list can never
  // silently drop an ingredient the chef is already using.
  const ingredients = useMemo(() => {
    const list = (rawMaterials.data ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      stockUnit: p.stock_unit,
    }));
    if (target && "recipe" in target) {
      const known = new Set(list.map((p) => numId(p.id)));
      for (const c of target.recipe.components) {
        if (!known.has(c.component_product_id)) {
          list.push({
            id: String(c.component_product_id),
            name: c.component_name ?? `#${c.component_product_id}`,
            stockUnit: c.stock_unit,
          });
          known.add(c.component_product_id);
        }
      }
    }
    return list;
  }, [rawMaterials.data, target]);

  const [rows, setRows] = useState<ComponentRow[]>([{ componentId: 0, quantity: 1 }]);
  const [prevKey, setPrevKey] = useState<string | undefined>();
  const key = target ? ("recipe" in target ? target.recipe.id : `p${productId}`) : undefined;
  if (key !== prevKey) {
    setPrevKey(key);
    setShowAll(false);
    if (target && "recipe" in target) {
      setRows(
        target.recipe.components.map((c) => ({
          componentId: c.component_product_id,
          quantity: c.quantity,
          unit: c.unit ?? c.stock_unit,
        })),
      );
    } else {
      setRows([{ componentId: 0, quantity: 1 }]);
    }
  }

  const ingredientById = (id: number) => ingredients.find((p) => numId(p.id) === id);
  const usable = rows.filter((r) => r.componentId > 0 && r.quantity > 0);

  const update = (i: number, patch: Partial<ComponentRow>) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  if (!target) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Recipe for one {productName}</DialogTitle>
          <DialogDescription>
            What making a single {productName} consumes from branch stock.
          </DialogDescription>
        </DialogHeader>

        {isUpdate && (
          <p className="rounded-lg bg-accent/10 px-3 py-2 text-xs text-accent">
            This replaces the current recipe with a new version. The old one is retired.
          </p>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <Label className="text-xs">Ingredients</Label>
            <label className="flex cursor-pointer items-center gap-2 text-xs text-muted">
              Show all products
              <Switch checked={showAll} onCheckedChange={setShowAll} />
            </label>
          </div>
          {!showAll && (
            <p className="text-xs text-faint">
              Showing what this branch stocks. Turn on to add something it hasn&apos;t received yet.
            </p>
          )}
          {rows.map((row, i) => {
            const ing = ingredientById(row.componentId);
            const stockUnit = ing?.stockUnit;
            const entryUnit = row.unit ?? stockUnit;
            const unitOptions = stockUnit ? convertibleUnits(stockUnit) : [];
            const converted =
              entryUnit && stockUnit && entryUnit !== stockUnit && row.quantity > 0
                ? tryConvertQty(row.quantity, entryUnit, stockUnit)
                : null;
            return (
              <div key={i} className="space-y-1">
                <div className="flex items-end gap-2">
                  <div className="min-w-0 flex-1">
                    <Select
                      value={ing?.id ?? ""}
                      onValueChange={(v) => {
                        const picked = ingredients.find((p) => p.id === v);
                        update(i, { componentId: numId(v), unit: picked?.stockUnit });
                      }}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Ingredient…" />
                      </SelectTrigger>
                      <SelectContent>
                        {ingredients.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-20">
                    <Input
                      className="h-10"
                      inputMode="decimal"
                      aria-label="Quantity"
                      value={row.quantity}
                      onChange={(e) => {
                        const n = Number(e.target.value);
                        update(i, {
                          quantity:
                            e.target.value === "" || n < 0 || !Number.isFinite(n) ? 0 : n,
                        });
                      }}
                    />
                  </div>
                  <div className="w-24">
                    <Select
                      value={entryUnit ?? ""}
                      onValueChange={(v) => update(i, { unit: v as StockUnit })}
                      disabled={!stockUnit || unitOptions.length <= 1}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="unit" />
                      </SelectTrigger>
                      <SelectContent>
                        {unitOptions.map((u) => (
                          <SelectItem key={u} value={u}>
                            {stockUnitLabel(u) || u.toLowerCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-10 text-danger"
                    disabled={rows.length <= 1}
                    aria-label="Remove ingredient"
                    onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </div>
                {converted != null && stockUnit && (
                  <p className="pl-1 text-xs text-faint">
                    = {formatStockQty(converted, stockUnit)} drawn from stock
                  </p>
                )}
              </div>
            );
          })}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRows((prev) => [...prev, { componentId: 0, quantity: 1 }])}
          >
            <Plus className="mr-1.5 size-3.5" aria-hidden />
            Add ingredient
          </Button>
          <p className="text-xs text-faint">
            Enter how much a single {productName} uses. Any compatible unit is fine.
            Ingredients can&apos;t be other made items.
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!usable.length || !productId || create.isPending}
            onClick={() => {
              if (!productId) {
                toast.error("Couldn't resolve this product's id");
                return;
              }
              create.mutate(
                {
                  product_id: productId,
                  yield_qty: 1,
                  components: usable.map((r) => ({
                    component_product_id: r.componentId,
                    quantity: r.quantity,
                    unit: r.unit,
                  })),
                },
                { onSuccess: () => onOpenChange(false) },
              );
            }}
          >
            Save recipe
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
