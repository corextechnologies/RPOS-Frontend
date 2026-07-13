"use client";

import Link from "next/link";
import { Receipt, ChevronRight } from "lucide-react";
import { useRestaurants } from "@/lib/hooks/use-restaurants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPlanAmount } from "@/lib/types/super-admin";
import { planAmountForTier } from "@/lib/plans/catalog";
import { titleCase } from "@/lib/utils";

export default function BillingOverviewPage() {
  const restaurants = useRestaurants();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-content">Billing</h1>
        <p className="mt-1 text-sm text-muted">Cross-tenant billing overview for all restaurants.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All restaurants</CardTitle>
          <CardDescription>Select a restaurant to view billing and invoice history.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {restaurants.isLoading && (
            <div className="space-y-3 p-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          )}
          {restaurants.isError && (
            <ErrorState onRetry={() => restaurants.refetch()} />
          )}
          {!restaurants.isLoading && !restaurants.isError && restaurants.data?.length === 0 && (
            <EmptyState title="No restaurants" description="Add a restaurant to see billing." />
          )}
          {restaurants.data && restaurants.data.length > 0 && (
            <>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Restaurant</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Monthly</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-32" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {restaurants.data.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell>{titleCase(r.plan_tier)}</TableCell>
                        <TableCell>
                          {r.plan_amount != null
                            ? `$${formatPlanAmount(r.plan_amount)}`
                            : `$${formatPlanAmount(planAmountForTier(r.plan_tier) ?? null)}`}
                        </TableCell>
                        <TableCell>
                          <Badge variant={r.plan_status === "active" ? "success" : "warning"}>
                            {titleCase(r.plan_status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/super-admin/restaurants/${r.id}/billing`}>
                              View billing
                              <ChevronRight className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="space-y-3 p-4 md:hidden">
                {restaurants.data.map((r) => (
                  <Card key={r.id}>
                    <CardContent className="flex items-center justify-between gap-3 p-4">
                      <div>
                        <p className="font-medium">{r.name}</p>
                        <p className="text-sm text-muted">
                          {titleCase(r.plan_tier)} · $
                          {r.plan_amount != null
                            ? formatPlanAmount(r.plan_amount)
                            : formatPlanAmount(planAmountForTier(r.plan_tier) ?? null)}
                          /mo
                        </p>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/super-admin/restaurants/${r.id}/billing`}>
                          <Receipt className="h-4 w-4" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
