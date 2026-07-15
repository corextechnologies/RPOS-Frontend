"use client";

import { Badge } from "@/components/ui/badge";
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
import type { KitchenRequest } from "@/lib/types/kitchen";
import { formatDate } from "@/lib/utils";
import { KitchenStatusBadge } from "./KitchenStatusBadge";

export function KitchenRequestDetail({ request }: { request: KitchenRequest }) {
  const isWarehouseRequest = request.request_type === "KITCHEN_TO_WAREHOUSE";

  // A partial approval sets quantity_approved below requested on at least one
  // line, and the kitchen produces the approved amount — so both numbers matter.
  const isPartial = request.line_items.some(
    (line) =>
      line.quantity_approved != null &&
      line.quantity_approved < line.quantity_requested,
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Details</CardTitle>
              <CardDescription>
                Requested {formatDate(request.created_at)}
              </CardDescription>
            </div>
            <KitchenStatusBadge status={request.status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {request.status === "DISPATCHED" && isWarehouseRequest && (
            <div className="rounded-xl border border-line bg-surface-2/40 px-4 py-3">
              <p className="text-sm font-medium text-content">In transit</p>
              <p className="mt-1 text-sm text-muted">
                The warehouse has released this stock but your kitchen is not
                credited until you confirm receipt.
              </p>
            </div>
          )}

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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1.5">
              <CardTitle>Lines</CardTitle>
              <CardDescription>
                {isWarehouseRequest
                  ? "This request type has no partial approval — you receive what was asked for."
                  : "Produce and allocate the approved quantity."}
              </CardDescription>
            </div>
            {isPartial && <Badge variant="warning">Partially approved</Badge>}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Requested</TableHead>
                <TableHead className="text-right">
                  {isWarehouseRequest ? "Quantity" : "Approved"}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {request.line_items.map((line) => {
                const effective = line.quantity_approved ?? line.quantity_requested;
                const reduced =
                  line.quantity_approved != null &&
                  line.quantity_approved < line.quantity_requested;
                return (
                  <TableRow key={line.id}>
                    <TableCell>
                      <p className="font-medium text-content">{line.product_name}</p>
                    </TableCell>
                    <TableCell className="text-right text-muted">
                      {line.quantity_requested}
                    </TableCell>
                    <TableCell className="text-right">
                      {/* Never render a literal "null": for a warehouse request
                          quantity_approved stays null by design, and the
                          requested amount is the real number. */}
                      <span
                        className={
                          reduced
                            ? "font-medium text-warning"
                            : "font-medium text-content"
                        }
                      >
                        {effective}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
