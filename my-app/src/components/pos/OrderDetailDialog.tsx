"use client";

import { Flag, Printer, ReceiptText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OrderLines } from "./OrderLines";
import { Money } from "./Money";
import { usePosMenu } from "@/lib/hooks/use-pos-menu";
import { formatDate } from "@/lib/utils";
import type { PosOrder } from "@/lib/types/pos";

/**
 * One order, in full.
 *
 * Fetches the order's OWN menu version (`?version=`) rather than the live one.
 * The guide offers that parameter specifically "for reprinting old orders": a
 * published version is immutable, so pinning to `order.menu_version_id` is what
 * makes a month-old order render at the prices and names it was actually sold
 * at. Reading today's menu would quietly restate history.
 *
 * The fetch is a warm-up for the KOT/receipt views rather than something this
 * dialog needs — the order's own lines already carry names and prices — but it
 * puts the right version in cache before either is opened.
 */
export function OrderDetailDialog({
  order,
  open,
  onOpenChange,
  onKot,
  onReceipt,
}: {
  order: PosOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onKot: (orderId: number) => void;
  onReceipt: (order: PosOrder) => void;
}) {
  usePosMenu(open && order ? order.menu_version_id : undefined);

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="font-mono text-sm">{order.order_no}</span>
            <Badge variant={order.status === "SENT" ? "secondary" : "outline"}>
              {order.status.toLowerCase()}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {formatDate(order.created_at)} · {order.order_type.toLowerCase().replace(/_/g, " ")}
          </DialogDescription>
        </DialogHeader>

        {order.flagged_for_review && (
          <p className="flex items-start gap-2 rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">
            <Flag className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <span>
              {/* Flagged means accepted-but-different, not rejected. Saying so
                  stops a manager "fixing" a sale that already happened. */}
              Accepted, but priced differently from what the terminal expected.
              {order.flag_reason && ` ${order.flag_reason}`}
            </span>
          </p>
        )}

        <OrderLines order={order} />

        <dl className="space-y-1 border-t border-line pt-3 text-sm">
          <Row label="Subtotal" minor={order.subtotal_minor} />
          {order.discount_minor > 0 && <Row label="Discount" minor={-order.discount_minor} />}
          <Row label="Tax" minor={order.tax_minor} />
          <div className="flex justify-between border-t border-line pt-1.5">
            <dt className="font-medium text-content">Total</dt>
            <dd>
              <Money minor={order.total_minor} emphasis />
            </dd>
          </div>
          {order.due_minor > 0 && (
            <div className="flex justify-between">
              <dt className="text-warning">Due</dt>
              <dd>
                <Money minor={order.due_minor} className="text-warning" />
              </dd>
            </div>
          )}
        </dl>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="outline" onClick={() => onKot(order.id)}>
            <Printer className="mr-1.5 size-4" aria-hidden />
            Kitchen ticket
          </Button>
          <Button onClick={() => onReceipt(order)}>
            <ReceiptText className="mr-1.5 size-4" aria-hidden />
            Receipt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, minor }: { label: string; minor: number }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted">{label}</dt>
      <dd>
        <Money minor={minor} className="text-content" />
      </dd>
    </div>
  );
}
