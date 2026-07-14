"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Play } from "lucide-react";
import { useBilling, useRestaurant } from "@/lib/hooks/use-restaurants";
import { useBillingOps } from "@/lib/hooks/use-billing";
import { BillingView } from "@/components/billing/BillingView";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/state";

export default function BillingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const restaurant = useRestaurant(id);
  const billing = useBilling(id);
  const { recordPayment, updateInvoice, runBillingCycle } = useBillingOps(id);

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
      </div>

      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Ops</CardTitle>
          <CardDescription>
            Optional scheduled-cycle catch-up. Preferred flow: record payment on create or via
            Record payment below, then mark invoices paid.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={runBillingCycle.isPending || r.plan_status !== "active"}
            onClick={() => runBillingCycle.mutate()}
          >
            <Play className="h-4 w-4" />
            {runBillingCycle.isPending ? "Running…" : "Run billing cycle"}
          </Button>
        </CardContent>
      </Card>

      <BillingView
        billing={b}
        planStatus={r.plan_status}
        canManageInvoices
        recordPaymentPending={recordPayment.isPending}
        invoiceActionPending={updateInvoice.isPending}
        onRecordPayment={() => recordPayment.mutate(id)}
        onMarkPaid={(inv) =>
          updateInvoice.mutate({ restaurantId: id, invoiceId: inv.id, paid: true })
        }
        onMarkUnpaid={(inv) =>
          updateInvoice.mutate({ restaurantId: id, invoiceId: inv.id, paid: false })
        }
      />
    </div>
  );
}
