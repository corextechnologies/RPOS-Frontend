"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Share2, Unlink } from "lucide-react";
import { useBilling, useInvoices, useRestaurant, useRestaurantMutations } from "@/lib/hooks/use-restaurants";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState, EmptyState } from "@/components/ui/state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, titleCase } from "@/lib/utils";
import type { Invoice } from "@/lib/types/super-admin";

export default function BillingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { can } = useAuth();
  const restaurant = useRestaurant(id);
  const billing = useBilling(id);
  const invoices = useInvoices(id);
  const mutations = useRestaurantMutations();
  const [confirmInvoice, setConfirmInvoice] = useState<{
    invoice: Invoice;
    action: "share" | "unshare";
  } | null>(null);

  const handleShareConfirm = async () => {
    if (!confirmInvoice) return;
    if (confirmInvoice.action === "share") {
      await mutations.shareInvoice.mutateAsync(confirmInvoice.invoice.id);
    } else {
      await mutations.unshareInvoice.mutateAsync(confirmInvoice.invoice.id);
    }
    setConfirmInvoice(null);
    invoices.refetch();
  };

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

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted">Next billing date</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-2xl font-semibold">{formatDate(b.next_billing_date)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted">Plan amount</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-2xl font-semibold">${b.plan_amount}/mo</p>
            <p className="text-sm text-muted">{titleCase(b.plan_tier)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted">Plan status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={b.plan_status === "active" ? "success" : "warning"} className="text-sm">
              {titleCase(b.plan_status)}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invoice history</CardTitle>
          <CardDescription>Share invoices to make them visible in the restaurant admin portal.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {invoices.isLoading && (
            <div className="space-y-3 p-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          )}
          {invoices.isError && (
            <ErrorState onRetry={() => invoices.refetch()} />
          )}
          {!invoices.isLoading && !invoices.isError && invoices.data?.length === 0 && (
            <EmptyState title="No invoices yet" description="Invoices will appear here after billing cycles." />
          )}
          {invoices.data && invoices.data.length > 0 && (
            <>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Shared</TableHead>
                      <TableHead className="w-32" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.data.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell>{inv.period}</TableCell>
                        <TableCell>{formatDate(inv.billing_date)}</TableCell>
                        <TableCell>${inv.amount}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              inv.status === "paid"
                                ? "success"
                                : inv.status === "overdue"
                                  ? "destructive"
                                  : "warning"
                            }
                          >
                            {titleCase(inv.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={inv.shared_with_admin ? "success" : "secondary"}>
                            {inv.shared_with_admin ? "Shared" : "Not shared"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {can("billing:share") && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setConfirmInvoice({
                                  invoice: inv,
                                  action: inv.shared_with_admin ? "unshare" : "share",
                                })
                              }
                            >
                              {inv.shared_with_admin ? (
                                <><Unlink className="h-3.5 w-3.5" /> Unshare</>
                              ) : (
                                <><Share2 className="h-3.5 w-3.5" /> Share</>
                              )}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="space-y-3 p-4 md:hidden">
                {invoices.data.map((inv) => (
                  <Card key={inv.id}>
                    <CardContent className="space-y-2 p-4">
                      <div className="flex justify-between">
                        <p className="font-medium">{inv.period}</p>
                        <p className="font-semibold">${inv.amount}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={inv.status === "paid" ? "success" : inv.status === "overdue" ? "destructive" : "warning"}>
                          {titleCase(inv.status)}
                        </Badge>
                        <Badge variant={inv.shared_with_admin ? "success" : "secondary"}>
                          {inv.shared_with_admin ? "Shared" : "Not shared"}
                        </Badge>
                      </div>
                      {can("billing:share") && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() =>
                            setConfirmInvoice({
                              invoice: inv,
                              action: inv.shared_with_admin ? "unshare" : "share",
                            })
                          }
                        >
                          {inv.shared_with_admin ? "Unshare with admin" : "Share with admin"}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {confirmInvoice && (
        <ConfirmDialog
          open={!!confirmInvoice}
          onOpenChange={(open) => !open && setConfirmInvoice(null)}
          title={confirmInvoice.action === "share" ? "Share invoice" : "Unshare invoice"}
          description={
            confirmInvoice.action === "share"
              ? `Make the ${confirmInvoice.invoice.period} invoice visible to the restaurant admin?`
              : `Hide the ${confirmInvoice.invoice.period} invoice from the restaurant admin?`
          }
          confirmLabel={confirmInvoice.action === "share" ? "Share" : "Unshare"}
          onConfirm={handleShareConfirm}
          loading={mutations.shareInvoice.isPending || mutations.unshareInvoice.isPending}
        />
      )}
    </div>
  );
}
