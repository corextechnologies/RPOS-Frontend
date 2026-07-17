"use client";

import { Printer } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { OrderLines } from "./OrderLines";
import { Money } from "./Money";
import { StubTaxBanner } from "./StubTaxBanner";
import { usePosBootstrap } from "@/lib/pos/pos-session";
import { formatDate } from "@/lib/utils";
import type { PosOrder } from "@/lib/types/pos";

/**
 * The customer receipt.
 *
 * The rule that shapes this, verbatim from the wiring guide:
 *
 * > "Do not ship a customer-facing receipt claiming a tax total while
 * > [`pack.is_stub`] is true."
 *
 * So when the pack is a stub, the tax row is **not rendered as a number**. It
 * says the rules are pending instead. That is not cosmetic: printing "Tax:
 * PKR 0.00" under a stub pack is a claim about what was remitted to a
 * provincial authority, and it would be false. The total still prints — the
 * customer paid it — but nothing on the page asserts a tax figure.
 */
export function ReceiptDialog({
  order,
  open,
  onOpenChange,
}: {
  order: PosOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { branch, device, pack } = usePosBootstrap();
  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Receipt</DialogTitle>
        </DialogHeader>

        <StubTaxBanner />

        {/* `print-area` is what the print stylesheet keeps; everything else on
            the page is dropped. See globals.css. */}
        <div className="print-area space-y-3 rounded-xl border border-line p-4">
          <div className="text-center">
            <p className="font-display text-sm font-semibold text-content">{branch.code}</p>
            <p className="font-mono text-xs text-muted">{order.order_no}</p>
            <p className="text-xs text-faint">
              {formatDate(order.created_at)} · {device.code}
            </p>
          </div>

          <OrderLines order={order} />

          <dl className="space-y-1 border-t border-line pt-3 text-sm">
            <Row label="Subtotal" minor={order.subtotal_minor} />
            {order.discount_minor > 0 && <Row label="Discount" minor={-order.discount_minor} />}

            {pack.is_stub ? (
              <div className="flex justify-between gap-2">
                <dt className="text-muted">Tax</dt>
                <dd className="text-right text-xs italic text-warning">
                  Rules pending — not a tax receipt
                </dd>
              </div>
            ) : (
              <Row label="Tax" minor={order.tax_minor} />
            )}

            <div className="flex justify-between border-t border-line pt-1.5">
              <dt className="font-medium text-content">Total</dt>
              <dd>
                <Money minor={order.total_minor} emphasis className="text-lg" />
              </dd>
            </div>

            {order.paid_minor > 0 && <Row label="Paid" minor={order.paid_minor} />}
            {order.due_minor > 0 && <Row label="Due" minor={order.due_minor} />}
          </dl>

          {!pack.is_stub && (
            <p className="text-center text-[10px] text-faint">{pack.version}</p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="mr-1.5 size-4" aria-hidden />
            Print
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
