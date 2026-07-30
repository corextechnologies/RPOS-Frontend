"use client";

import { useState } from "react";
import { Loader2, Flag, Printer, Receipt, RotateCcw, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/pos/Money";
import { RefundDialog } from "@/components/pos/RefundDialog";
import { OrderDetailDialog } from "@/components/pos/OrderDetailDialog";
import { KotDialog } from "@/components/pos/KotDialog";
import { ReceiptDialog } from "@/components/pos/ReceiptDialog";
import { TenderDialog } from "@/components/pos/TenderDialog";
import { FlaggedReviewSheet } from "@/components/pos/FlaggedReviewSheet";
import { usePosOrders } from "@/lib/hooks/use-pos-orders";
import { usePosFlagged } from "@/lib/hooks/use-pos-flagged";
import { usePosSession } from "@/lib/pos/pos-session";
import { posErrorMessage } from "@/lib/api/errors";
import { formatDate } from "@/lib/utils";
import type { PosOrder } from "@/lib/types/pos";

export default function OrdersPage() {
  const { can } = usePosSession();
  const canRead = can("ORDER_READ");
  const orders = usePosOrders({ enabled: canRead });

  const { flagged } = usePosFlagged();

  const [refundFor, setRefundFor] = useState<PosOrder | null>(null);
  const [tenderFor, setTenderFor] = useState<PosOrder | null>(null);
  const [detailFor, setDetailFor] = useState<PosOrder | null>(null);
  const [kotFor, setKotFor] = useState<number | null>(null);
  const [receiptFor, setReceiptFor] = useState<PosOrder | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);

  // Gated per the bootstrap capability table: ORDER_READ covers the order list.
  // An order-taker who may create but not review doesn't get a list to review.
  if (!canRead) {
    return (
      <div className="mx-auto max-w-sm p-12 text-center">
        <Receipt className="mx-auto size-8 text-faint" aria-hidden />
        <p className="mt-3 font-display text-base font-semibold text-content">
          Orders aren&apos;t yours to see
        </p>
        <p className="mt-1 text-sm text-muted">
          Your position can take orders but not review them. Ask a manager.
        </p>
      </div>
    );
  }

  if (orders.isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="size-6 animate-spin text-brand" aria-label="Loading orders" />
      </div>
    );
  }

  if (orders.error) {
    return <p className="p-8 text-center text-sm text-danger">{posErrorMessage(orders.error)}</p>;
  }

  const items = orders.data?.items ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4">
      {flagged.length > 0 && (
        <button
          type="button"
          onClick={() => setReviewOpen(true)}
          className="flex w-full items-center gap-3 rounded-xl border border-warning/40 bg-warning/10 p-3 text-left transition hover:bg-warning/15"
        >
          <ShieldAlert className="size-5 shrink-0 text-warning" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-content">
              {flagged.length} offline {flagged.length === 1 ? "sale" : "sales"} to review
            </p>
            <p className="text-xs text-muted">
              Synced with a price or stock flag — tap to reconcile.
            </p>
          </div>
          <span className="text-xs font-medium text-warning">Review</span>
        </button>
      )}

      <section className="space-y-2">
        <h2 className="font-display text-sm font-semibold text-content">Today</h2>
        {items.length === 0 ? (
          <p className="rounded-xl border border-line py-12 text-center text-sm text-muted">
            No orders yet.
          </p>
        ) : (
          <ul className="divide-y divide-line rounded-xl border border-line">
            {items.map((order) => (
              <OrderRow
                key={order.id}
                order={order}
                canRefund={can("REFUND")}
                onRefund={() => setRefundFor(order)}
                onTender={() => setTenderFor(order)}
                onOpen={() => setDetailFor(order)}
                onKot={() => setKotFor(order.id)}
              />
            ))}
          </ul>
        )}
      </section>

      <OrderDetailDialog
        order={detailFor}
        open={detailFor !== null}
        onOpenChange={(o) => !o && setDetailFor(null)}
        onKot={(id) => {
          setDetailFor(null);
          setKotFor(id);
        }}
        onReceipt={(order) => {
          setDetailFor(null);
          setReceiptFor(order);
        }}
      />

      <KotDialog
        orderId={kotFor}
        open={kotFor !== null}
        onOpenChange={(o) => !o && setKotFor(null)}
      />

      <ReceiptDialog
        order={receiptFor}
        open={receiptFor !== null}
        onOpenChange={(o) => !o && setReceiptFor(null)}
      />

      <RefundDialog
        order={refundFor}
        open={refundFor !== null}
        onOpenChange={(open) => !open && setRefundFor(null)}
      />

      {/* `key` gives each order a fresh tender dialog — see TenderDialog. */}
      <TenderDialog
        key={tenderFor?.id ?? "none"}
        order={tenderFor}
        open={tenderFor !== null}
        onOpenChange={(open) => !open && setTenderFor(null)}
        onSettled={() => setTenderFor(null)}
      />

      <FlaggedReviewSheet open={reviewOpen} onOpenChange={setReviewOpen} />
    </div>
  );
}

function OrderRow({
  order,
  canRefund,
  onRefund,
  onTender,
  onOpen,
  onKot,
}: {
  order: PosOrder;
  canRefund: boolean;
  onRefund: () => void;
  onTender: () => void;
  onOpen: () => void;
  onKot: () => void;
}) {
  const due = order.due_minor ?? 0;

  return (
    <li className="flex items-center gap-3 p-3">
      <button
        type="button"
        onClick={onOpen}
        className="min-w-0 flex-1 text-left"
        aria-label={`Open ${order.order_no}`}
      >
        <div className="flex items-center gap-2 text-sm font-medium text-content">
          <span className="truncate font-mono text-xs">{order.order_no}</span>
          <Badge variant={order.status === "SENT" ? "secondary" : "outline"}>
            {order.status.toLowerCase()}
          </Badge>
          {order.flagged_for_review && (
            <Badge variant="destructive" className="gap-1">
              <Flag className="size-3" aria-hidden />
              flagged
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted">
          {order.lines.filter((l) => l.parent_line_id === null).length} item(s) ·{" "}
          {formatDate(order.created_at)}
          {order.flag_reason && <span className="text-danger"> · {order.flag_reason}</span>}
        </p>
      </button>

      <div className="text-right">
        <Money minor={order.total_minor} className="text-sm text-content" />
        {due > 0 && (
          <p className="text-xs text-warning">
            <Money minor={due} /> due
          </p>
        )}
      </div>

      <div className="flex gap-1">
        <Button variant="ghost" size="icon" onClick={onKot} aria-label="Reprint kitchen ticket">
          <Printer className="size-4" aria-hidden />
        </Button>
        {due > 0 && (
          <Button variant="outline" size="sm" onClick={onTender}>
            Pay
          </Button>
        )}
        {canRefund && due === 0 && (
          <Button variant="ghost" size="icon" onClick={onRefund} aria-label="Refund">
            <RotateCcw className="size-4" aria-hidden />
          </Button>
        )}
      </div>
    </li>
  );
}
