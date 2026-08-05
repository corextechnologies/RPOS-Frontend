"use client";

import { useMemo, useState } from "react";
import { EditPricingDialog } from "@/components/admin/pricing/EditPricingDialog";
import { PricingTable } from "@/components/admin/pricing/PricingTable";
import { ProductForecastDialog } from "@/components/admin/pricing/ProductForecastDialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { useProductPricing, useUpdateProductPricing } from "@/lib/hooks/use-pricing";
import type { ProductPricing, UpdateProductPricingInput } from "@/lib/types/admin";

type PricingView = "all" | "unpriced" | "sellable" | "raw";

export default function AdminPricingPage() {
  const { can } = useAuth();
  const [view, setView] = useState<PricingView>("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<ProductPricing | null>(null);
  const [forecastProduct, setForecastProduct] = useState<ProductPricing | null>(null);

  const all = useProductPricing();
  // Kept mounted in every view so the queue count stays visible from "All products".
  const unpriced = useProductPricing({ unpriced: true });
  const sellable = useProductPricing({ sellable_only: true });
  const raw = useProductPricing({ kind: "RAW_MATERIAL" });

  const active =
    view === "unpriced" ? unpriced : view === "sellable" ? sellable : view === "raw" ? raw : all;

  const updatePricing = useUpdateProductPricing();

  const filtered = useMemo(() => {
    const items = active.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.sku ?? "").toLowerCase().includes(q),
    );
  }, [active.data, search]);

  const unpricedCount = unpriced.data?.length ?? 0;

  const handleSave = async (patch: UpdateProductPricingInput) => {
    if (!editing) return;
    // The dialog already narrowed this to dirty fields only — passing it
    // through unchanged is what preserves "absent leaves, null clears".
    await updatePricing.mutateAsync({ productId: editing.id, body: patch });
    setEditing(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
          Pricing
        </h1>
        <p className="mt-1 text-sm text-muted">
          Cost applies to everything. Sell price only to what can actually be sold.
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Select value={view} onValueChange={(v) => setView(v as PricingView)}>
            <SelectTrigger className="sm:w-56">
              <SelectValue placeholder="View" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All products</SelectItem>
              {/* The buy/sell split the kinds exist to make possible. */}
              <SelectItem value="sellable">What we sell</SelectItem>
              <SelectItem value="raw">What we buy</SelectItem>
              <SelectItem value="unpriced">Needs pricing</SelectItem>
            </SelectContent>
          </Select>
          {unpricedCount > 0 && (
            <Badge variant="warning">{unpricedCount} need pricing</Badge>
          )}
        </div>

        <Input
          className="sm:max-w-xs"
          placeholder="Search name or SKU"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <PricingTable
        items={filtered}
        isLoading={active.isLoading}
        isError={active.isError}
        onRetry={() => active.refetch()}
        canEdit={can("pricing:update")}
        onEdit={setEditing}
        onForecast={can("forecast:read") ? setForecastProduct : undefined}
        emptyTitle={view === "unpriced" ? "Nothing waiting" : "No products yet"}
        emptyDescription={
          view === "unpriced"
            ? "Everything sellable has a price."
            : view === "sellable"
              ? "Nothing sellable yet. The kitchen creates made items; the warehouse creates resale ones."
              : "Products will appear here once they exist for your restaurant."
        }
      />

      <EditPricingDialog
        product={editing}
        open={!!editing}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        onSubmit={handleSave}
        isSubmitting={updatePricing.isPending}
      />

      <ProductForecastDialog
        product={forecastProduct}
        open={!!forecastProduct}
        onOpenChange={(open) => {
          if (!open) setForecastProduct(null);
        }}
      />
    </div>
  );
}
