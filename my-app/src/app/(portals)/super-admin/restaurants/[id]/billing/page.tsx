"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useBilling, useRestaurant } from "@/lib/hooks/use-restaurants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState, EmptyState } from "@/components/ui/state";
import { formatDate, titleCase } from "@/lib/utils";
import { formatPlanAmount } from "@/lib/types/super-admin";

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
  const invoices = b.invoices ?? [];

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

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted">Next billing date</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-2xl font-semibold">
              {b.next_billing_date ? formatDate(b.next_billing_date) : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted">Plan amount</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-2xl font-semibold">${formatPlanAmount(b.plan_amount)}/mo</p>
            <p className="text-sm text-muted">{titleCase(String(b.plan_tier))}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted">Plan status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={r.plan_status === "active" ? "success" : "warning"} className="text-sm">
              {titleCase(r.plan_status)}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invoice history</CardTitle>
          <CardDescription>Invoices will be available in a future release.</CardDescription>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <EmptyState title="No invoices yet" description="Invoices will appear here after billing cycles." />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
