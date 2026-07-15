"use client";

import { useMemo, useState } from "react";
import { EditPricingDialog } from "@/components/admin/pricing/EditPricingDialog";
import { PricingTable } from "@/components/admin/pricing/PricingTable";
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
import type { UpdatePricingForm } from "@/lib/schemas/pricing";
import type { ProductPricing } from "@/lib/types/admin";

type PricingView = "all" | "unpriced";

export default function AdminPricingPage() {
  const { can } = useAuth();
  const [view, setView] = useState<PricingView>("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<ProductPricing | null>(null);

  const all = useProductPricing();
  // Kept mounted in both views so the queue count stays visible from "All products".
  const unpriced = useProductPricing(true);
  const active = view === "unpriced" ? unpriced : all;

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

  const handleSave = async (values: UpdatePricingForm) => {
    if (!editing) return;
    await updatePricing.mutateAsync({
      productId: editing.id,
      body: { cost_price: values.cost_price },
    });
    setEditing(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
          Pricing
        </h1>
        <p className="mt-1 text-sm text-muted">
          Admin-only product cost prices for your restaurant.
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
        emptyTitle={view === "unpriced" ? "Nothing waiting" : "No products yet"}
        emptyDescription={
          view === "unpriced"
            ? "Every product has a price."
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
    </div>
  );
}
