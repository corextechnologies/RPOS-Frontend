"use client";

import { ProductionTargetStatusBadge } from "@/components/production-targets/ProductionTargetStatusBadge";
import {
  Card,
  CardContent,
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
import type { ProductionTarget } from "@/lib/types/production-target";
import { formatDate } from "@/lib/utils";

/** Read-only display of a target — the same for Admin and Kitchen. */
export function ProductionTargetDetail({ target }: { target: ProductionTarget }) {
  const totalUnits = target.lines.reduce((sum, l) => sum + l.quantity, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Field label="Kitchen" value={target.kitchen_name} />
            <Field label="Date" value={target.target_date} />
            <div className="space-y-1">
              <dt className="text-sm text-muted">Status</dt>
              <dd>
                <ProductionTargetStatusBadge status={target.status} />
              </dd>
            </div>
            <Field label="Created" value={formatDate(target.created_at)} />
            <div className="space-y-1 sm:col-span-2">
              <dt className="text-sm text-muted">Note</dt>
              <dd className="text-content">{target.note ?? "-"}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Products to make</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {target.lines.map((line) => (
                <TableRow key={line.id}>
                  <TableCell className="font-medium text-content">
                    {line.product_name}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted">
                    {line.quantity}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell className="font-medium text-content">Total</TableCell>
                <TableCell className="text-right font-medium tabular-nums text-content">
                  {totalUnits}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="font-medium text-content">{value}</dd>
    </div>
  );
}
