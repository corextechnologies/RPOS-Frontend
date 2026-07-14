"use client";

import { useMemo, useState } from "react";
import { EditPricingDialog } from "@/components/admin/pricing/EditPricingDialog";
import { PricingTable } from "@/components/admin/pricing/PricingTable";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { useProductPricing, useUpdateProductPricing } from "@/lib/hooks/use-pricing";
import type { UpdatePricingForm } from "@/lib/schemas/pricing";
import type { ProductPricing } from "@/lib/types/admin";

export default function AdminPricingPage() {
  const { can } = useAuth();
  const pricing = useProductPricing();
  const updatePricing = useUpdateProductPricing();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<ProductPricing | null>(null);

  const filtered = useMemo(() => {
    const items = pricing.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.sku ?? "").toLowerCase().includes(q),
    );
  }, [pricing.data, search]);

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
            Pricing
          </h1>
          <p className="mt-1 text-sm text-muted">
            Admin-only product cost prices for your restaurant.
          </p>
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
        isLoading={pricing.isLoading}
        isError={pricing.isError}
        onRetry={() => pricing.refetch()}
        canEdit={can("pricing:update")}
        onEdit={setEditing}
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
