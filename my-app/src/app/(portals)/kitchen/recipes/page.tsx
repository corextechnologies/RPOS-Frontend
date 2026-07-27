"use client";

import { useState } from "react";
import { ChefHat, Info, Plus, Trash2, Utensils } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { StockUnitSelect } from "@/components/warehouse/products/StockUnitSelect";
import { useAuth } from "@/lib/auth";
import {
  useCreateKitchenProduct,
  useCreateKitchenRecipe,
  useKitchenCatalogue,
  useKitchenRecipes,
} from "@/lib/hooks/use-kitchen-recipes";
import { useKitchenInventory } from "@/lib/hooks/use-kitchen-inventory";
import { formatBasisPoints } from "@/lib/money";
import { formatStockQty, stockUnitLabel, type StockUnit } from "@/lib/stock-unit";
import { convertibleUnits, tryConvertQty } from "@/lib/unit-convert";
import { toast } from "sonner";
import type { RecipeComponentInput } from "@/lib/types/kitchen";

/**
 * Recipes — what the kitchen makes, and what it makes it from.
 *
 * These moved here from Admin when products gained a `kind`, and the move is
 * the point rather than a tidy-up: a recipe describes what the KITCHEN does
 * with the components the kitchen actually holds. Under Admin there was no
 * catalogue to attach one to.
 *
 * Two rules the UI has to respect:
 * - **Versioned, not edited.** Saving a recipe for a product that already has
 *   one supersedes it (v1 → v2) and retires the old. There is no PATCH, because
 *   editing a recipe would rewrite what past production runs actually consumed.
 * - **Components can't be made items.** Ingredients are raw materials or resale
 *   items; a burger made of burgers is `409 nested_recipe_unsupported`.
 */
export default function KitchenRecipesPage() {
  const { can } = useAuth();
  const catalogue = useKitchenCatalogue();
  const recipes = useKitchenRecipes();

  const [addProduct, setAddProduct] = useState(false);
  const [addRecipeFor, setAddRecipeFor] = useState<string | null>(null);

  const isManager = can("kitchen-staff:create");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
            What we make
          </h1>
          <p className="mt-1 text-sm text-muted">
            The kitchen&apos;s own items and the recipes that produce them.
          </p>
        </div>
        {isManager && (
          <Button onClick={() => setAddProduct(true)}>
            <Plus className="mr-1.5 size-4" aria-hidden />
            New item
          </Button>
        )}
      </div>

      <p className="flex items-start gap-2 rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm text-muted">
        <Info className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
        <span>
          Add an item here, give it a recipe, then Admin prices it and puts it on the menu.
          Without a recipe it can still reach a menu — but you won&apos;t be able to make any.
        </span>
      </p>

      <PageState
        isLoading={catalogue.isLoading}
        isError={!!catalogue.error}
        data={catalogue.data}
        isEmpty={(rows) => rows.length === 0}
        errorTitle="Couldn't load the catalogue"
        errorDescription={catalogue.error instanceof Error ? catalogue.error.message : undefined}
        emptyTitle="Nothing here yet"
        emptyDescription="Add the things this kitchen makes — burgers, bases, sauces."
      >
        {(rows) => (
          <div className="grid gap-4 md:grid-cols-2">
            {rows.map((item) => {
              const recipe = (recipes.data ?? []).find(
                (r) => r.is_active && r.product_name === item.name,
              );
              return (
                <Card key={item.id}>
                  <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
                    <div className="min-w-0">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Utensils className="size-4 shrink-0 text-brand" aria-hidden />
                        <span className="truncate">{item.name}</span>
                        {recipe && <Badge variant="secondary">v{recipe.version}</Badge>}
                      </CardTitle>
                      <CardDescription>
                        {recipe
                          ? stockUnitLabel(item.stock_unit)
                            ? `Recipe set — counted in ${stockUnitLabel(item.stock_unit)}`
                            : "Recipe set"
                          : item.stock_unit && item.stock_unit !== "EACH"
                            ? `No recipe — counted in ${stockUnitLabel(item.stock_unit)}`
                            : "No recipe — can't be made yet"}
                      </CardDescription>
                    </div>
                    {isManager && (
                      <Button
                        variant={recipe ? "outline" : "default"}
                        size="sm"
                        onClick={() => setAddRecipeFor(item.id)}
                      >
                        {recipe ? "Update recipe" : "Add recipe"}
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent>
                    {recipe ? (
                      <ul className="divide-y divide-line text-sm">
                        {recipe.components.map((c) => (
                          <li key={c.component_product_id} className="flex justify-between py-2">
                            {/* component_name comes with the recipe, so no
                                second lookup to render this. */}
                            <span className="text-content">
                              {c.component_name ?? `#${c.component_product_id}`}
                            </span>
                            <span className="tabular-nums text-muted">
                              {c.quantity}
                              {stockUnitLabel(c.unit ?? c.stock_unit) && (
                                <span className="text-faint"> {stockUnitLabel(c.unit ?? c.stock_unit)}</span>
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
                    ) : (
                      <p className="py-2 text-sm text-warning">
                        Add a recipe to start producing this.
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </PageState>

      <NewProductDialog open={addProduct} onOpenChange={setAddProduct} />
      <NewRecipeDialog
        productId={addRecipeFor}
        open={addRecipeFor !== null}
        onOpenChange={(o) => !o && setAddRecipeFor(null)}
      />
    </div>
  );
}

function NewProductDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const create = useCreateKitchenProduct();
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [stockUnit, setStockUnit] = useState<StockUnit>("EACH");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ChefHat className="size-4 text-brand" aria-hidden />
            New item
          </DialogTitle>
          <DialogDescription>Something this kitchen makes.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="kp-name">Name</Label>
            <Input
              id="kp-name"
              autoFocus
              placeholder="Classic Burger"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kp-sku">SKU</Label>
            <Input
              id="kp-sku"
              placeholder="FG-BURG-01"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kp-unit">Unit</Label>
            <StockUnitSelect
              id="kp-unit"
              value={stockUnit}
              onValueChange={(v) => setStockUnit(v as StockUnit)}
            />
            <p className="text-xs text-muted">How this item is made and counted.</p>
          </div>
          {/* No kind selector: this endpoint only makes finished goods. Offering
              a choice would imply the kitchen could create flour. */}
          <p className="text-xs text-faint">
            Everything added here is something the kitchen makes. Raw materials come from the
            warehouse.
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={name.trim().length < 2 || create.isPending}
            onClick={() =>
              create.mutate(
                {
                  name: name.trim(),
                  sku: sku.trim() || undefined,
                  stock_unit: stockUnit,
                },
                {
                  onSuccess: () => {
                    onOpenChange(false);
                    setName("");
                    setSku("");
                    setStockUnit("EACH");
                  },
                },
              )
            }
          >
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewRecipeDialog({
  productId,
  open,
  onOpenChange,
}: {
  productId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const catalogue = useKitchenCatalogue();
  const inventory = useKitchenInventory();
  const create = useCreateKitchenRecipe();

  const [components, setComponents] = useState<RecipeComponentInput[]>([
    { component_product_id: 0, quantity: 1, wastage_bp: 0 },
  ]);

  const product = (catalogue.data ?? []).find((p) => p.id === productId);
  const existing = product ? true : false;

  /**
   * Ingredients come from what the kitchen actually holds — and the catalogue
   * (finished goods) is excluded, because a component that is itself made is
   * `409 nested_recipe_unsupported`. Each carries its stock unit so a component
   * can be entered in a compatible unit (grams of kg-stocked flour) and shown
   * converted.
   */
  const madeIds = new Set((catalogue.data ?? []).map((p) => p.id));
  const ingredients = Array.from(
    new Map(
      (inventory.data ?? [])
        .filter((i) => !madeIds.has(i.product_id))
        .map((i) => [i.product_id, i.product] as const),
    ).values(),
  ).map((p) => ({ id: p.id, name: p.name, stockUnit: p.stock_unit }));

  // `component_product_id` is numeric on the wire, but product ids are strings
  // like "prod-001" — the same numeric-portion convention the recipe product id
  // already uses on save. Resolve both ways through it.
  const numericId = (v: string) => Number(v.replace(/\D/g, "")) || 0;
  const ingredientByComponentId = (componentId: number) =>
    ingredients.find((p) => numericId(p.id) === componentId);

  const usable = components.filter((c) => c.component_product_id > 0 && c.quantity > 0);

  function update(i: number, patch: Partial<RecipeComponentInput>) {
    setComponents((prev) => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Recipe for one {product.name}</DialogTitle>
          <DialogDescription>
            What making a single {product.name} consumes from kitchen stock. Choose
            how many to make later, in Production.
          </DialogDescription>
        </DialogHeader>

        {existing && product.has_recipe && (
          // Versioned, not edited — say so before they save, not after.
          <p className="rounded-lg bg-accent/10 px-3 py-2 text-xs text-accent">
            This replaces the current recipe with a new version. The old one is retired, and past
            production keeps its history.
          </p>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">Ingredients</Label>
            {components.map((c, i) => {
              const ing = ingredientByComponentId(c.component_product_id);
              const stockUnit = ing?.stockUnit;
              const entryUnit = c.unit ?? stockUnit;
              const unitOptions = stockUnit ? convertibleUnits(stockUnit) : [];
              // Show the draw-down in the ingredient's stock unit when the chef
              // entered a different (compatible) one — "100 g = 0.1 kg".
              const converted =
                entryUnit && stockUnit && entryUnit !== stockUnit && c.quantity > 0
                  ? tryConvertQty(c.quantity, entryUnit, stockUnit)
                  : null;
              return (
              <div key={i} className="space-y-1">
                <div className="flex items-end gap-2">
                  <div className="min-w-0 flex-1 space-y-1">
                    <Select
                      value={ing?.id ?? ""}
                      onValueChange={(v) => {
                        const picked = ingredients.find((p) => p.id === v);
                        // Default the entry unit to how the ingredient is stocked.
                        update(i, {
                          component_product_id: numericId(v),
                          unit: picked?.stockUnit,
                        });
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

                  <div className="w-20 space-y-1">
                    <Label className="text-xs text-faint">Qty</Label>
                    <Input
                      className="h-10"
                      inputMode="decimal"
                      value={c.quantity}
                      onChange={(e) => {
                        const n = Number(e.target.value);
                        update(i, {
                          quantity: e.target.value === "" || n < 0 || !Number.isFinite(n) ? 0 : n,
                        });
                      }}
                    />
                  </div>

                  <div className="w-24 space-y-1">
                    <Label className="text-xs text-faint">Unit</Label>
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
                    className="size-10"
                    disabled={components.length <= 1}
                    onClick={() => setComponents((prev) => prev.filter((_, idx) => idx !== i))}
                    aria-label="Remove ingredient"
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
              onClick={() =>
                setComponents((prev) => [
                  ...prev,
                  { component_product_id: 0, quantity: 1, wastage_bp: 0 },
                ])
              }
            >
              <Plus className="mr-1.5 size-3.5" aria-hidden />
              Add ingredient
            </Button>

            <p className="text-xs text-faint">
              Enter how much a single {product.name} uses. Pick any compatible unit — grams of flour
              stocked in kg is fine, and production converts it. Ingredients can&apos;t be other made
              items.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!usable.length || create.isPending}
            onClick={() => {
              const numericId = Number(product.id.replace(/\D/g, ""));
              if (!numericId) {
                toast.error("Couldn't resolve this product's id");
                return;
              }
              create.mutate(
                {
                  product_id: numericId,
                  // A recipe describes one product; the batch size is chosen at
                  // production time ("Make something"), not here.
                  yield_qty: 1,
                  components: usable,
                },
                {
                  onSuccess: () => {
                    onOpenChange(false);
                    setComponents([{ component_product_id: 0, quantity: 1, wastage_bp: 0 }]);
                  },
                },
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
