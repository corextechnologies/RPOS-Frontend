"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ProductionTargetForm } from "@/components/admin/production-targets/ProductionTargetForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/state";
import { useAuth } from "@/lib/auth";
import { useProductPricing } from "@/lib/hooks/use-pricing";
import {
  useProductionTarget,
  useUpdateProductionTarget,
} from "@/lib/hooks/use-production-targets";

export default function EditProductionTargetPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { can } = useAuth();
  const { data, isLoading, isError, refetch } = useProductionTarget(params.id);
  // Match the create form: only sellable goods, not raw materials.
  const products = useProductPricing({ sellable_only: true });
  const update = useUpdateProductionTarget();

  const backHref = `/admin/production-targets/${params.id}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={backHref} aria-label="Back">
            <ArrowLeft className="size-4" aria-hidden />
          </Link>
        </Button>
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
            Edit production target
          </h1>
          <p className="text-sm text-muted">Only the note and products can change.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : isError || !data ? (
        <Card>
          <CardContent className="p-0">
            <ErrorState
              description="Couldn't load this target."
              onRetry={() => refetch()}
            />
          </CardContent>
        </Card>
      ) : !can("production-targets:update") ? (
        <p className="text-sm text-muted">
          You do not have permission to edit production targets.
        </p>
      ) : data.status !== "PENDING" ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              title="This target can't be edited"
              description={`It has already been ${data.status.toLowerCase()} by the kitchen.`}
            />
          </CardContent>
        </Card>
      ) : (
        <ProductionTargetForm
          mode="edit"
          kitchens={[]}
          products={products.data ?? []}
          productsLoading={products.isLoading}
          submitting={update.isPending}
          cancelHref={backHref}
          submitLabel="Save changes"
          initial={{
            kitchen_id: data.kitchen_id,
            kitchen_name: data.kitchen_name,
            target_date: data.target_date,
            note: data.note ?? "",
            lines: data.lines.map((l) => ({
              product_id: l.product_id,
              quantity: String(l.quantity),
            })),
          }}
          onSubmit={(value) => {
            update
              .mutateAsync({
                id: params.id,
                body: {
                  note: value.note.trim(),
                  lines: value.lines.map((l) => ({
                    product_id: l.product_id,
                    quantity: Number(l.quantity),
                  })),
                },
              })
              .then(() => router.push(backHref))
              .catch(() => {});
          }}
        />
      )}
    </div>
  );
}
