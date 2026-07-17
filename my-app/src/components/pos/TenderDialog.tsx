"use client";

import { useMemo, useState } from "react";
import { Banknote, CreditCard, Loader2, Smartphone, TicketPercent } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StubTaxBanner } from "./StubTaxBanner";
import { DiscountDialog } from "./DiscountDialog";
import { Money } from "./Money";
import { usePay, usePriceQuote } from "@/lib/hooks/use-pos-payments";
import { usePosBootstrap, usePosCurrency } from "@/lib/pos/pos-session";
import { availablePaymentMethods } from "@/lib/pos/capabilities";
import { formatMinor, minorToDecimalString, parseDecimalToMinor } from "@/lib/money";
import { isApiCode, POS_ERROR, posErrorMessage, readDueMinor } from "@/lib/api/errors";
import { cn } from "@/lib/utils";
import type { PaymentMethod, PosOrder } from "@/lib/types/pos";
import { toast } from "sonner";

const ICONS: Record<string, typeof Banknote> = {
  CASH: Banknote,
  CARD: CreditCard,
  WALLET: Smartphone,
};

/**
 * Tender.
 *
 * The load-bearing sequence: pick a method → **quote** → show what's owed →
 * take money. The quote is not an optimisation, it's the contract — under the
 * PK pack the tax depends on the tender, so the amount owed genuinely changes
 * when the customer says "card" after you'd shown them a cash total. Showing
 * that change is the honest thing; hiding it would mean charging one number and
 * displaying another.
 *
 * Split bills fall out of this for free: each tender is its own call, and
 * `due_minor` shrinks until it hits zero.
 */
export function TenderDialog({
  order: initialOrder,
  open,
  onOpenChange,
  onSettled,
}: {
  order: PosOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSettled: () => void;
}) {
  const bootstrap = usePosBootstrap();
  const { currency, minorUnits } = usePosCurrency();
  const methods = useMemo(() => availablePaymentMethods(bootstrap), [bootstrap]);

  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [tendered, setTendered] = useState("");
  const [ref, setRef] = useState("");
  const [authCode, setAuthCode] = useState("");
  const [last4, setLast4] = useState("");
  const [dueOverride, setDueOverride] = useState<number | null>(null);
  const [change, setChange] = useState<number | null>(null);
  const [discountOpen, setDiscountOpen] = useState(false);
  // Applying a discount returns an updated order; hold it locally so the totals
  // below reflect it without the caller having to re-plumb the prop.
  const [discounted, setDiscounted] = useState<PosOrder | null>(null);
  const order = discounted ?? initialOrder;

  const quote = usePriceQuote(order?.id ?? null, method);
  const pay = usePay();

  // There's no reset effect here on purpose: callers mount this with
  // `key={order.id}`, so a new order gets fresh state for free. Resetting via
  // an effect would cascade a render to undo state we never needed to keep.
  if (!order) return null;

  // `dueOverride` is the server's own correction from a 409 `overpayment` — it
  // outranks our arithmetic by definition.
  const due = dueOverride ?? quote.data?.total_minor ?? order.due_minor ?? order.total_minor;

  let tenderedMinor: number | null = null;
  try {
    tenderedMinor = tendered ? parseDecimalToMinor(tendered, minorUnits) : null;
  } catch {
    tenderedMinor = null; // mid-typing ("12.") is not an error worth shouting about
  }

  const changeDue = tenderedMinor != null && tenderedMinor >= due ? tenderedMinor - due : null;

  async function submit() {
    if (!method || !order) return;
    try {
      const res = await pay.mutateAsync({
        orderId: order.id,
        input: {
          method,
          amount_minor: due,
          ...(method === "CASH"
            ? { tendered_minor: tenderedMinor ?? undefined }
            : {
                processor_ref: ref || undefined,
                auth_code: authCode || undefined,
                // Formatted, never raw: what goes over the wire is already
                // masked, so a full PAN cannot leave this screen even by
                // accident.
                masked_pan: last4 ? `**** ${last4}` : undefined,
              }),
        },
      });

      if (res.change_minor > 0) {
        setChange(res.change_minor);
        return; // hold the dialog open on the change screen
      }
      toast.success("Paid");
      onSettled();
    } catch (err) {
      if (isApiCode(err, POS_ERROR.OVERPAYMENT)) {
        const serverDue = readDueMinor(err);
        if (serverDue != null) {
          setDueOverride(serverDue);
          toast.warning(`Amount owed is ${formatMinor(serverDue, currency, minorUnits)}`);
          return;
        }
      }
      toast.error(posErrorMessage(err));
    }
  }

  // The change screen. Deliberately its own state and a big number: this is
  // read aloud to a customer while counting notes out of a drawer.
  if (change != null) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Change due</DialogTitle>
          </DialogHeader>
          <p className="py-6 text-center font-display text-5xl font-semibold tabular-nums text-brand">
            {formatMinor(change, currency, minorUnits)}
          </p>
          <DialogFooter>
            <Button
              className="h-12 w-full text-base"
              onClick={() => {
                setChange(null);
                onSettled();
              }}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Take payment</DialogTitle>
          <DialogDescription>{order.order_no}</DialogDescription>
        </DialogHeader>

        <StubTaxBanner />

        <div className="grid grid-cols-3 gap-2">
          {methods.map((m) => {
            const Icon = ICONS[m] ?? CreditCard;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setMethod(m)}
                className={cn(
                  "flex h-20 flex-col items-center justify-center gap-1.5 rounded-xl border text-sm font-medium transition",
                  method === m
                    ? "border-brand bg-brand/10 text-content"
                    : "border-line bg-surface text-muted hover:border-brand/50",
                )}
              >
                <Icon className="size-5" aria-hidden />
                {m.toLowerCase()}
              </button>
            );
          })}
        </div>

        {methods.length === 0 && (
          <p className="rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning">
            This terminal can&apos;t take payment. Send the customer to a till.
          </p>
        )}

        {method && (
          <>
            <div className="rounded-xl border border-line">
              {quote.isFetching ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="size-4 animate-spin text-brand" aria-label="Pricing" />
                </div>
              ) : (
                <dl className="divide-y divide-line text-sm">
                  <Row label="Subtotal" minor={quote.data?.subtotal_minor ?? order.subtotal_minor} />
                  {(quote.data?.discount_minor ?? order.discount_minor) > 0 && (
                    <Row
                      label="Discount"
                      minor={-(quote.data?.discount_minor ?? order.discount_minor)}
                    />
                  )}
                  <Row label="Tax" minor={quote.data?.tax_minor ?? order.tax_minor} />
                  <div className="flex items-center justify-between px-3 py-2.5">
                    <dt className="font-medium text-content">Due</dt>
                    <dd>
                      <Money minor={due} emphasis className="text-xl" />
                    </dd>
                  </div>
                </dl>
              )}
            </div>

            {method === "CASH" ? (
              <div className="space-y-2">
                <Label htmlFor="tendered">Cash received</Label>
                <Input
                  id="tendered"
                  inputMode="decimal"
                  autoFocus
                  className="h-14 text-center text-2xl tabular-nums"
                  placeholder={minorToDecimalString(due, minorUnits)}
                  value={tendered}
                  onChange={(e) => setTendered(e.target.value)}
                />
                <div className="flex gap-2">
                  {/* Exact + the notes a cashier actually reaches for. */}
                  <QuickCash
                    label="Exact"
                    onClick={() => setTendered(minorToDecimalString(due, minorUnits))}
                  />
                  {[50000, 100000, 500000].map((n) => (
                    <QuickCash
                      key={n}
                      label={formatMinor(n, currency, minorUnits)}
                      onClick={() => setTendered(minorToDecimalString(n, minorUnits))}
                    />
                  ))}
                </div>
                {changeDue != null && changeDue > 0 && (
                  <p className="text-center text-sm text-muted">
                    Change <Money minor={changeDue} className="font-medium text-content" />
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="ref">Terminal reference</Label>
                  <Input
                    id="ref"
                    className="h-11"
                    placeholder="Processor reference"
                    value={ref}
                    onChange={(e) => setRef(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="auth">Auth code</Label>
                    <Input
                      id="auth"
                      className="h-11"
                      placeholder="123456"
                      value={authCode}
                      onChange={(e) => setAuthCode(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pan">Last 4</Label>
                    <Input
                      id="pan"
                      className="h-11"
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="4242"
                      value={last4}
                      // Four digits, hard-capped. There is deliberately no way
                      // to type a full PAN here: the guide forbids sending one,
                      // and a field that *could* hold 16 digits is a field
                      // someone eventually types 16 digits into.
                      onChange={(e) => setLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    />
                  </div>
                </div>

                <p className="text-xs text-faint">
                  Copy these from the card terminal&apos;s slip. Never type a full card number.
                </p>
              </div>
            )}
          </>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            variant="ghost"
            className="text-muted"
            onClick={() => setDiscountOpen(true)}
            disabled={pay.isPending}
          >
            <TicketPercent className="mr-1.5 size-4" aria-hidden />
            Discount
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pay.isPending}>
              Later
            </Button>
            <Button
              className="min-w-32"
              disabled={
                !method ||
                pay.isPending ||
                quote.isFetching ||
                (method === "CASH" && (tenderedMinor == null || tenderedMinor < due))
              }
              onClick={() => void submit()}
            >
              {pay.isPending && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
              Take payment
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>

      <DiscountDialog
        order={order}
        open={discountOpen}
        onOpenChange={setDiscountOpen}
        onApplied={(updated) => {
          setDiscounted(updated);
          // The quote is keyed on the order id, not its contents, so a discount
          // wouldn't invalidate it on its own — and a stale quote here is a
          // wrong number in front of a customer.
          setDueOverride(null);
          void quote.refetch();
        }}
      />
    </Dialog>
  );
}

function Row({ label, minor }: { label: string; minor: number }) {
  return (
    <div className="flex items-center justify-between px-3 py-2">
      <dt className="text-muted">{label}</dt>
      <dd>
        <Money minor={minor} className="text-content" />
      </dd>
    </div>
  );
}

function QuickCash({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-10 flex-1 rounded-lg bg-surface-2 text-xs font-medium text-muted transition hover:text-content"
    >
      {label}
    </button>
  );
}
