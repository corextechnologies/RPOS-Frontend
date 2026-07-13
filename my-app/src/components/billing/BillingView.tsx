"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { BillingSummary, PlanStatus } from "@/lib/types/super-admin";
import { formatPlanAmount } from "@/lib/types/super-admin";
import { formatDate, titleCase } from "@/lib/utils";

interface BillingViewProps {
  billing: BillingSummary;
  planStatus?: PlanStatus;
}

export function BillingView({ billing, planStatus }: BillingViewProps) {
  const invoices = billing.invoices ?? [];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted">Next billing date</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-2xl font-semibold">
              {billing.next_billing_date ? formatDate(billing.next_billing_date) : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted">Plan amount</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-2xl font-semibold">
              ${formatPlanAmount(billing.plan_amount)}/mo
            </p>
            <p className="text-sm text-muted">{titleCase(String(billing.plan_tier))}</p>
          </CardContent>
        </Card>
        {planStatus && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted">Plan status</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant={planStatus === "active" ? "success" : "warning"} className="text-sm">
                {titleCase(planStatus)}
              </Badge>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invoice history</CardTitle>
          <CardDescription>
            Invoices are generated automatically when the billing cycle runs.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {invoices.length === 0 ? (
            <EmptyState
              title="No invoices yet"
              description="Invoices appear here after a billing cycle runs and a charge is due."
            />
          ) : (
            <>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Issued on</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell>{formatDate(inv.issued_on)}</TableCell>
                        <TableCell>${formatPlanAmount(inv.amount)}</TableCell>
                        <TableCell>
                          <Badge variant={inv.paid ? "success" : "warning"}>
                            {inv.paid ? "Paid" : "Unpaid"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="space-y-3 p-4 md:hidden">
                {invoices.map((inv) => (
                  <Card key={inv.id}>
                    <CardContent className="flex items-center justify-between gap-3 p-4">
                      <div>
                        <p className="font-medium">{formatDate(inv.issued_on)}</p>
                        <p className="text-sm text-muted">${formatPlanAmount(inv.amount)}</p>
                      </div>
                      <Badge variant={inv.paid ? "success" : "warning"}>
                        {inv.paid ? "Paid" : "Unpaid"}
                      </Badge>
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
