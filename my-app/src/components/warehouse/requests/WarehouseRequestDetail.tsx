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

export function WarehouseRequestDetail({ request }: { request: WarehouseRequest }) {
  const isPo = request.request_type === "WAREHOUSE_TO_ADMIN_PO";
  const hasApprovals = request.line_items.some(
    (line) => line.quantity_approved != null,
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Details</CardTitle>
              <CardDescription>
                {isPo ? "Raised" : "Requested"} {formatDate(request.created_at)}
              </CardDescription>
            </div>
            <WarehouseStatusBadge status={request.status} />
          </div>
        </CardHeader>
        <CardContent>
          {request.notes ? (
            <div>
              <p className="text-sm font-medium text-content">Notes</p>
              <p className="mt-1 text-sm text-muted">{request.notes}</p>
            </div>
          ) : (
            <p className="text-sm text-muted">No notes on this request.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lines</CardTitle>
          <CardDescription>
            {hasApprovals
              ? isPo
                ? "Approved quantities may be lower than requested."
                : "Dispatch removes the approved quantity, or the requested quantity where none is set."
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
                    {line.quantity_approved ?? "-"}
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
