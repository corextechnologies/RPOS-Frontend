"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { BillingSummary, Invoice, PlanStatus } from "@/lib/types/super-admin";
import { formatPlanAmount } from "@/lib/types/super-admin";
import { formatDate, titleCase } from "@/lib/utils";

interface BillingViewProps {
  billing: BillingSummary;
  planStatus?: PlanStatus;
  canManageInvoices?: boolean;
  onMarkPaid?: (invoice: Invoice) => void;
  onMarkUnpaid?: (invoice: Invoice) => void;
  onRecordPayment?: () => void;
  invoiceActionPending?: boolean;
  recordPaymentPending?: boolean;
}

export function BillingView({
  billing,
  planStatus,
  canManageInvoices = false,
  onMarkPaid,
  onMarkUnpaid,
  onRecordPayment,
  invoiceActionPending = false,
  recordPaymentPending = false,
}: BillingViewProps) {
  const invoices = billing.invoices ?? [];

  return (
    <div className="space-y-6">
      {(billing.restaurant_name || billing.owner_contact_email) && (
        <div className="rounded-xl border border-line bg-surface-2/40 px-4 py-3 text-sm">
          {billing.restaurant_name && (
            <p className="font-medium text-content">{billing.restaurant_name}</p>
          )}
          {billing.owner_contact_email && (
            <p className="mt-0.5 text-muted">{billing.owner_contact_email}</p>
          )}
        </div>
      )}

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
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-base">Invoice history</CardTitle>
            <CardDescription>
              {canManageInvoices
                ? "Mark an unpaid invoice as paid to create next month’s invoice."
                : "Subscription invoices for this restaurant."}
            </CardDescription>
          </div>
          {canManageInvoices && invoices.length === 0 && onRecordPayment && (
            <Button
              type="button"
              size="sm"
              disabled={recordPaymentPending}
              onClick={onRecordPayment}
            >
              {recordPaymentPending ? "Recording…" : "Record payment"}
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {invoices.length === 0 ? (
            <EmptyState
              title="No invoices yet"
              description="No invoices yet. Record payment to generate the first invoices."
            />
          ) : (
            <>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Restaurant</TableHead>
                      <TableHead>Owner email</TableHead>
                      <TableHead>Issued on</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      {canManageInvoices && <TableHead className="w-40" />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-medium">
                          {inv.restaurant_name || billing.restaurant_name || "—"}
                        </TableCell>
                        <TableCell className="text-muted">
                          {inv.owner_contact_email || billing.owner_contact_email || "—"}
                        </TableCell>
                        <TableCell>{formatDate(inv.issued_on)}</TableCell>
                        <TableCell>${formatPlanAmount(inv.amount)}</TableCell>
                        <TableCell>
                          <Badge variant={inv.paid ? "success" : "warning"}>
                            {inv.paid ? "Paid" : "Unpaid"}
                          </Badge>
                        </TableCell>
                        {canManageInvoices && (
                          <TableCell>
                            {inv.paid ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={invoiceActionPending}
                                onClick={() => onMarkUnpaid?.(inv)}
                              >
                                Mark unpaid
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                size="sm"
                                disabled={invoiceActionPending}
                                onClick={() => onMarkPaid?.(inv)}
                              >
                                Mark paid
                              </Button>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="space-y-3 p-4 md:hidden">
                {invoices.map((inv) => (
                  <Card key={inv.id}>
                    <CardContent className="space-y-3 p-4">
                      <div>
                        <p className="font-medium">
                          {inv.restaurant_name || billing.restaurant_name || "—"}
                        </p>
                        <p className="text-xs text-muted">
                          {inv.owner_contact_email || billing.owner_contact_email || "—"}
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm">{formatDate(inv.issued_on)}</p>
                          <p className="text-sm text-muted">${formatPlanAmount(inv.amount)}</p>
                        </div>
                        <Badge variant={inv.paid ? "success" : "warning"}>
                          {inv.paid ? "Paid" : "Unpaid"}
                        </Badge>
                      </div>
                      {canManageInvoices && (
                        <Button
                          type="button"
                          variant={inv.paid ? "outline" : "default"}
                          size="sm"
                          className="w-full"
                          disabled={invoiceActionPending}
                          onClick={() => (inv.paid ? onMarkUnpaid?.(inv) : onMarkPaid?.(inv))}
                        >
                          {inv.paid ? "Mark unpaid" : "Mark paid"}
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
    </div>
  );
}
