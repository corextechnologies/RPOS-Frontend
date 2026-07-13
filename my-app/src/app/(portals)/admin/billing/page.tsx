"use client";

import { useAdminBilling } from "@/lib/hooks/use-billing";
import { BillingView } from "@/components/billing/BillingView";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/state";

export default function AdminBillingPage() {
  const billing = useAdminBilling();

  if (billing.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (billing.isError || !billing.data) {
    return <ErrorState onRetry={() => billing.refetch()} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-content">Billing</h1>
        <p className="mt-1 text-sm text-muted">
          Your restaurant subscription and invoice history (read-only).
        </p>
      </div>

      <BillingView billing={billing.data} />
    </div>
  );
}
