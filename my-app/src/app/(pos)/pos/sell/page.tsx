"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { CartProvider, useCart } from "@/lib/pos/cart";
import { useResolvedMenu, type ResolvedMenuItem } from "@/lib/hooks/use-pos-menu";
import {
  useCreateOrder,
  useParkOrder,
  useParkedOrders,
  useSendOrder,
} from "@/lib/hooks/use-pos-orders";
import { usePosCurrency, usePosSession } from "@/lib/pos/pos-session";
import { formatMinor } from "@/lib/money";
import { MenuGrid } from "@/components/pos/MenuGrid";
import { ModifierSheet } from "@/components/pos/ModifierSheet";
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
  const { can } = usePosSession();
  const { currency, minorUnits } = usePosCurrency();
  const cart = useCart();

  const [picked, setPicked] = useState<ResolvedMenuItem | null>(null);
  const [mismatch, setMismatch] = useState<ApiError | null>(null);
  const [tenderFor, setTenderFor] = useState<PosOrder | null>(null);
  const [recallOpen, setRecallOpen] = useState(false);

  const createOrder = useCreateOrder();
  const sendOrder = useSendOrder();
  const parkOrder = useParkOrder();
  const { parked } = useParkedOrders();

  const busy = createOrder.isPending || sendOrder.isPending || parkOrder.isPending;

  /**
   * Get a server-side order for the current cart.
   *
   * A recalled order already has one — re-creating it would fork one order into
   * two. `cart.order_id` is what remembers that, and it survives a reload
   * because the cart is persisted.
   */
  async function ensureOrder(acceptServerPrice: boolean): Promise<PosOrder> {
    if (cart.cart.order_id) {
      return { id: cart.cart.order_id } as PosOrder;
    }
    const input = cart.toCreateInput();
    if (acceptServerPrice) delete input.expected_total_minor;

    return createOrder.mutateAsync(input);
  }

  /**
   * `acceptServerPrice` drops the proposal so the server prices unopposed.
   * That's the resolution to a 409: the menu moved, the customer is waiting,
   * and the correct answer is the server's number.
   */
  async function send(acceptServerPrice = false) {
    try {
      const order = await ensureOrder(acceptServerPrice);
      setMismatch(null);

      const sent = await sendOrder.mutateAsync(order.id);
      cart.reset();
      setTenderFor(sent);
    } catch (err) {
      if (isApiCode(err, POS_ERROR.PRICE_MISMATCH)) {
        setMismatch(err);
        return;
      }
      toast.error(posErrorMessage(err));
    }
  }

  async function park() {
    try {
      const order = await ensureOrder(false);
      await parkOrder.mutateAsync({ id: order.id, status: "PARKED" });
      cart.reset();
    } catch (err) {
      if (isApiCode(err, POS_ERROR.PRICE_MISMATCH)) {
        setMismatch(err);
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
        */}
        <MenuGrid
          items={items}
          categories={categories}
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
        onAdd={(item, ids, note) => cart.addItem(item, ids, note)}
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
