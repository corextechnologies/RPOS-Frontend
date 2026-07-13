"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useBilling, useRestaurant } from "@/lib/hooks/use-restaurants";
import { BillingView } from "@/components/billing/BillingView";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/state";

export default function BillingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const restaurant = useRestaurant(id);
  const billing = useBilling(id);

  if (restaurant.isLoading || billing.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (restaurant.isError || billing.isError) {
    return <ErrorState onRetry={() => { restaurant.refetch(); billing.refetch(); }} />;
  }

  const r = restaurant.data!;
  const b = billing.data!;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/super-admin/restaurants/${id}`} aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Billing</h1>
          <p className="text-sm text-muted">{r.name}</p>
        </div>
      </div>

      <BillingView billing={b} planStatus={r.plan_status} />
    </div>
  );
}
