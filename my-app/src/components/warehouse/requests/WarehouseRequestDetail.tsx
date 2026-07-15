"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { WarehouseRequest } from "@/lib/types/warehouse";
import { formatDate } from "@/lib/utils";
import { WarehouseStatusBadge } from "./WarehouseStatusBadge";

/**
 * Receiving a PO is a status change only — it does not put stock on the shelf.
 * Intake stays a separate, explicit action, so say so rather than let the two
 * read as one step.
 */
function StatusHint({ request }: { request: WarehouseRequest }) {
  if (request.request_type !== "WAREHOUSE_TO_ADMIN_PO") return null;

  if (request.status === "PENDING") {
    return (
      <p className="text-sm text-muted">
        Waiting on Admin. You can act on this order once it reaches In Queue.
      </p>
    );
  }
  if (request.status === "RECEIVED") {
    return (
      <p className="text-sm text-muted">
        This order is closed. Stock still has to be booked in through Receive
        stock.
      </p>
    );
  }
  return null;
}

export function WarehouseRequestDetail({ request }: { request: WarehouseRequest }) {
  const hasApprovals = request.line_items.some(
    (line) => line.quantity_approved != null,
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Order details</CardTitle>
              <CardDescription>
                Raised {formatDate(request.created_at)}
              </CardDescription>
            </div>
            <WarehouseStatusBadge status={request.status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {request.notes ? (
            <div>
              <p className="text-sm font-medium text-content">Notes</p>
              <p className="mt-1 text-sm text-muted">{request.notes}</p>
            </div>
          ) : (
            <p className="text-sm text-muted">No notes on this order.</p>
          )}
          <StatusHint request={request} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lines</CardTitle>
          <CardDescription>
            {hasApprovals
              ? "Approved quantities may be lower than requested."
              : "Nothing approved yet."}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Requested</TableHead>
                <TableHead className="text-right">Approved</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {request.line_items.map((line) => (
                <TableRow key={line.id}>
                  <TableCell>
                    <p className="font-medium text-content">{line.product_name}</p>
                  </TableCell>
                  <TableCell className="text-right text-muted">
                    {line.quantity_requested}
                  </TableCell>
                  <TableCell className="text-right font-medium text-content">
                    {line.quantity_approved ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
