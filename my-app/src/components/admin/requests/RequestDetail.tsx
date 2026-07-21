"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatRequestType,
  RequestStatusBadge,
} from "@/components/admin/requests/RequestStatusBadge";
import type { StockRequest } from "@/lib/types/admin";
import { formatDate } from "@/lib/utils";

interface RequestDetailProps {
  request: StockRequest;
  /**
   * Origin name resolved by the caller (e.g. a warehouse name looked up from
   * `source_location_id`). Used when the backend leaves `from_label` empty,
   * as it does on a WAREHOUSE_TO_ADMIN_PO.
   */
  fromLabel?: string;
}

export function RequestDetail({ request, fromLabel }: RequestDetailProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Request details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-faint">Type</p>
            <p className="mt-1 text-content">{formatRequestType(request.type)}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-faint">Status</p>
            <div className="mt-1">
              <RequestStatusBadge status={request.status} />
            </div>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-faint">From</p>
            <p className="mt-1 text-content">{request.from_label || fromLabel || "-"}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-faint">Created</p>
            <p className="mt-1 text-content">{formatDate(request.created_at)}</p>
          </div>
          {request.updated_at && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-faint">Updated</p>
              <p className="mt-1 text-content">{formatDate(request.updated_at)}</p>
            </div>
          )}
          <div className="sm:col-span-2">
            <p className="text-xs font-medium uppercase tracking-wider text-faint">Notes</p>
            <p className="mt-1 text-content">{request.notes || "-"}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Line items</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Qty requested</TableHead>
                <TableHead>Qty approved</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {request.line_items.map((line) => (
                <TableRow key={line.id}>
                  <TableCell>
                    <p className="font-medium text-content">{line.product_name}</p>
                  </TableCell>
                  <TableCell className="text-muted">{line.quantity_requested}</TableCell>
                  <TableCell className="text-muted">
                    {line.quantity_approved == null ? "-" : line.quantity_approved}
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
