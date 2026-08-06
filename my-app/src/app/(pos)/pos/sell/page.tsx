"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { CartProvider, useCart } from "@/lib/pos/cart";
import { useResolvedMenu, type ResolvedMenuItem } from "@/lib/hooks/use-pos-menu";
import { useCreateOrder, useParkOrder, useParkedOrders } from "@/lib/hooks/use-pos-orders";
import { useSubmitOrder } from "@/lib/hooks/use-pos-submit";
import { buildLocalOrder } from "@/lib/pos/offline/local-order";
import { isNetworkError } from "@/lib/api/pos-client";
import { usePosCurrency, usePosSession } from "@/lib/pos/pos-session";
import { formatMinor } from "@/lib/money";
import { MenuGrid } from "@/components/pos/MenuGrid";
import { ModifierSheet } from "@/components/pos/ModifierSheet";
import { RefusalSheet } from "@/components/pos/RefusalSheet";
import { enqueueRefusal } from "@/lib/pos/offline/refusals";
import { CartPanel } from "@/components/pos/CartPanel";
import { PriceMismatchDialog } from "@/components/pos/PriceMismatchDialog";
import { TenderDialog } from "@/components/pos/TenderDialog";
import { ParkedOrdersSheet } from "@/components/pos/ParkedOrdersSheet";
import { isApiCode, POS_ERROR, posErrorMessage } from "@/lib/api/errors";
import { ApiError } from "@/lib/types/super-admin";
import { toast } from "sonner";
import type { PosOrder } from "@/lib/types/pos";

export default function SellPage() {
  return (
    <CartProvider>
      <Sell />
    </CartProvider>
  );
}

function Sell() {
  const { items, categories, isLoading, error } = useResolvedMenu();
  const { can, offline } = usePosSession();
  const { currency, minorUnits } = usePosCurrency();
  const cart = useCart();

  const [picked, setPicked] = useState<ResolvedMenuItem | null>(null);
  const [refusalItem, setRefusalItem] = useState<ResolvedMenuItem | null>(null);
  const [mismatch, setMismatch] = useState<ApiError | null>(null);
  const [tenderFor, setTenderFor] = useState<PosOrder | null>(null);
  const [recallOpen, setRecallOpen] = useState(false);

  const createOrder = useCreateOrder();
  const submitOrder = useSubmitOrder();
  const parkOrder = useParkOrder();
  const { parked } = useParkedOrders();

  const busy = createOrder.isPending || submitOrder.isPending || parkOrder.isPending;

  /**
   * Send the cart through the submit seam — the one place an order becomes real.
   *
   * `acceptServerPrice` drops the proposal so the server prices unopposed: the
   * resolution to a 409 is the menu moved, the customer is waiting, and the
   * correct answer is the server's number.
   *
   * A recalled order already has a server id (`cart.order_id`), so we send that
   * rather than fork a second order; the seam handles create-then-send otherwise
   * and, if the network is down, queues the whole sale and returns a local order
   * to tender against.
   */
  async function send(acceptServerPrice = false) {
    try {
      const input = cart.toCreateInput();
      if (acceptServerPrice) delete input.expected_total_minor;

      const { order } = await submitOrder.mutateAsync({
        create: input,
        deviceTotalMinor: cart.subtotalMinor,
        existingOrderId: cart.cart.order_id,
        localOrder: buildLocalOrder(cart.cart, cart.subtotalMinor, currency),
      });
      setMismatch(null);
      cart.reset();
      setTenderFor(order);
    } catch (err) {
      if (isApiCode(err, POS_ERROR.PRICE_MISMATCH)) {
        setMismatch(err);
        return;
      }
      toast.error(posErrorMessage(err));
    }
  }

  /**
   * Park is a server-side hold, so it needs a connection. The cart is persisted
   * on-device regardless, so an offline "park" is really "it's already safe here"
   * — say that rather than a bare network error.
   */
  async function park() {
    try {
      const input = cart.toCreateInput();
      const created = cart.cart.order_id
        ? ({ id: cart.cart.order_id } as PosOrder)
        : await createOrder.mutateAsync(input);
      await parkOrder.mutateAsync({ id: created.id, status: "PARKED" });
      cart.reset();
    } catch (err) {
      if (isApiCode(err, POS_ERROR.PRICE_MISMATCH)) {
        setMismatch(err);
        return;
      }
      if (isNetworkError(err)) {
        toast.info("You're offline — this cart is saved on the device.");
        return;
      }
      toast.error(posErrorMessage(err));
    }
  }

  async function recall(order: PosOrder) {
    try {
      // Back to DRAFT before editing — PARKED is a resting state, and a send
      // from it would be an `invalid_order_status`.
      const draft = await parkOrder.mutateAsync({ id: order.id, status: "DRAFT" });
      cart.hydrateFrom(draft, items);
      setRecallOpen(false);
    } catch (err) {
      toast.error(posErrorMessage(err));
    }
  }

  /**
   * Queue an offline turn-away for a sold-out item. Online the server records
   * refusals from the 409 itself, so this path only ever runs offline (the grid
   * only offers the action then). `available_units` is 0 — the tile is only
   * tappable when `onHand === 0` — and `occurred_at` is stamped at enqueue.
   */
  async function recordTurnAway(item: ResolvedMenuItem, requestedUnits: number) {
    try {
      await enqueueRefusal({
        menu_item_id: item.id,
        reason: "OUT_OF_STOCK",
        requested_units: requestedUnits,
        available_units: 0,
      });
      toast.success(
        `Logged — ${item.name}${requestedUnits > 1 ? ` ×${requestedUnits}` : ""} turned away.`,
      );
    } catch {
      toast.error("Couldn't log that turn-away. Try again.");
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-brand" aria-label="Loading menu" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-danger">{posErrorMessage(error)}</p>
        <p className="mt-1 text-sm text-muted">
          This terminal needs an online menu before it can sell.
        </p>
      </div>
    );
  }

  return (
    <div className="grid h-[calc(100dvh-3.5rem)] grid-cols-1 md:grid-cols-[1fr_20rem] lg:grid-cols-[1fr_24rem]">
      <div className="min-h-0 overflow-hidden">
        {/*
          No 86-ing from the till: `PUT /pos/availability/{id}` needs an
          ordinary token and this device holds a device-bound one. It's in the
          branch portal instead. The grid still greys items out — reading
          availability IS a device route.

          Offline, a sold-out tile becomes a turn-away logger: the device is the
          only witness to demand it refuses while disconnected, so we capture it
          here and sync it later. Online, the server records refusals from the
          409 itself, so the grid leaves those tiles inert.
        */}
        <MenuGrid
          items={items}
          categories={categories}
          offline={offline}
          onRecordTurnAway={setRefusalItem}
          onPick={(item) =>
            // No options to choose? Straight into the cart. A modal that only
            // exists to be dismissed is a tax on every order.
            item.modifier_groups.length === 0 ? cart.addItem(item, []) : setPicked(item)
          }
        />
      </div>

      <CartPanel
        busy={busy}
        canCreate={can("ORDER_CREATE")}
        parkedCount={parked.length}
        onSend={() => void send(false)}
        onPark={() => void park()}
        onRecall={() => setRecallOpen(true)}
      />

      <ModifierSheet
        item={picked}
        open={picked !== null}
        onOpenChange={(open) => !open && setPicked(null)}
        onAdd={(item, ids, note, needsPrep) => cart.addItem(item, ids, note, needsPrep)}
      />

      <RefusalSheet
        item={refusalItem}
        open={refusalItem !== null}
        onOpenChange={(open) => !open && setRefusalItem(null)}
        onRecord={(item, qty) => void recordTurnAway(item, qty)}
      />

      <ParkedOrdersSheet
        open={recallOpen}
        onOpenChange={setRecallOpen}
        onRecall={(o) => void recall(o)}
        busy={busy}
      />

      <PriceMismatchDialog
        error={mismatch}
        open={mismatch !== null}
        onOpenChange={(open) => !open && setMismatch(null)}
        busy={busy}
        onAcceptServerPrice={() => void send(true)}
        formatTotal={(minor) => formatMinor(minor, currency, minorUnits)}
      />

      {/* `key` gives each order a fresh tender dialog — see TenderDialog. */}
      <TenderDialog
        key={tenderFor?.id ?? "none"}
        order={tenderFor}
        open={tenderFor !== null}
        onOpenChange={(open) => !open && setTenderFor(null)}
        onSettled={() => setTenderFor(null)}
      />
    </div>
  );
}
