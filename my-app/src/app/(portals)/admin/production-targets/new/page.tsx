"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ProductionTargetForm } from "@/components/admin/production-targets/ProductionTargetForm";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useKitchens } from "@/lib/hooks/use-locations";
import { useProductPricing } from "@/lib/hooks/use-pricing";
import { useCreateProductionTarget } from "@/lib/hooks/use-production-targets";

export default function NewProductionTargetPage() {
  const router = useRouter();
  const { can } = useAuth();
  const kitchens = useKitchens();
  // Only things the restaurant sells — production targets are for finished/
  // sellable goods, not raw materials like flour or cheese.
  const products = useProductPricing({ sellable_only: true });
  const create = useCreateProductionTarget();

  const allowed = can("production-targets:create");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/production-targets" aria-label="Back">
            <ArrowLeft className="size-4" aria-hidden />
          </Link>
        </Button>
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
            New production target
          </h1>
          <p className="text-sm text-muted">
            Tell a kitchen how many of each product to make.
          </p>
        </div>
      </div>

      {!allowed ? (
        <p className="text-sm text-muted">
          You do not have permission to create production targets.
        </p>
      ) : (
        <ProductionTargetForm
          mode="create"
          kitchens={kitchens.data ?? []}
          products={products.data ?? []}
          productsLoading={products.isLoading}
          submitting={create.isPending}
          cancelHref="/admin/production-targets"
          submitLabel="Create target"
          onSubmit={(value) => {
            // The hook toasts on error (incl. duplicate_target); only navigate
            // on success, and swallow the rejection so it isn't unhandled.
            create
              .mutateAsync({
                kitchen_id: value.kitchen_id,
                target_date: value.target_date,
                note: value.note.trim() || undefined,
                lines: value.lines.map((l) => ({
                  product_id: l.product_id,
                  quantity: Number(l.quantity),
                })),
              })
              .then((created) => router.push(`/admin/production-targets/${created.id}`))
              .catch(() => {});
          }}
        />
      )}
    </div>
  );
}
