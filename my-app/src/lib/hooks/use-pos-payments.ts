"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { posApi } from "@/lib/api/pos.api";
import { isNetworkError } from "@/lib/api/pos-client";
import { posErrorMessage } from "@/lib/api/errors";
import { newIdempotencyKey, newLocalId } from "@/lib/pos/idempotency";
import { deviceServices } from "@/lib/pos/offline/device-services";
import { buildLocalPayment } from "@/lib/pos/offline/local-order";
import type {
  ApplyDiscountInput,
  CreateDiscountRuleInput,
  PaymentInput,
  PaymentMethod,
  PaymentResult,
  PriceQuote,
  RefundInput,
} from "@/lib/types/pos";

/**
 * The quote.
 *
 * Called when the tender is chosen and BEFORE money changes hands, because
 * under the PK pack the tax can depend on how the customer pays — card and cash
 * are rated differently in several provinces. That makes "what do I owe?" a
 * question with a different answer per tender, which is why this endpoint
 * exists at all and why the cart screen says "Subtotal" rather than "Total".
 *
 * No side effects, so re-quoting on every method change is free and correct.
 */
export function usePriceQuote(orderId: number | null, method: PaymentMethod | null) {
  return useQuery<PriceQuote>({
    queryKey: ["pos-quote", orderId, method],
    queryFn: () => posApi.priceQuote(orderId as number, { payment_method: method as PaymentMethod }),
    enabled: orderId != null && method != null,
    // A quote is a statement about *now*. Never serve one from cache.
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
}

export function usePay() {
  const qc = useQueryClient();
  return useMutation({
    /**
     * One `client_payment_id` per tender — the forever-anchor (§10 P5). Each
     * tender in a split bill is a distinct intent ("take 500 cash" then "600
     * card"), so each mints its own; replaying the *same* id returns the same
     * Payment, so no double charge on sync. Minted here (not the caller) and
     * persisted in the outbox before the queued path returns.
     *
     * `orderLocalId` ties the tender to its order for the offline path, where
     * there is no server `orderId` yet — payments drain strictly after orders
     * (§13), and the drain resolves `local_id` → the real order.
     *
     * The transport `Idempotency-Key` is separate and per-attempt; React Query's
     * retry is off so a retry can't reuse it against an already-committed charge.
     */
    mutationFn: async ({
      orderId,
      orderLocalId,
      input,
    }: {
      orderId: number;
      orderLocalId: string;
      input: PaymentInput;
    }): Promise<PaymentResult> => {
      const clientPaymentId = input.client_payment_id ?? newLocalId();
      const body: PaymentInput = { ...input, client_payment_id: clientPaymentId };

      // A real server order: take the money live. Fall through to the queue only
      // if the network is unreachable — a server rejection must still surface.
      if (orderId > 0) {
        try {
          return await posApi.pay(orderId, body, newIdempotencyKey());
        } catch (err) {
          if (!isNetworkError(err)) throw err;
        }
      }

      await deviceServices.outbox.enqueue({
        kind: "payment",
        anchor: clientPaymentId,
        body: { order_local_id: orderLocalId, payment: body },
      });
      return buildLocalPayment(orderId, body);
    },
    retry: false,
    onSuccess: (_res, vars) => {
      if (vars.orderId > 0) {
        qc.invalidateQueries({ queryKey: ["pos-order", vars.orderId] });
        qc.invalidateQueries({ queryKey: ["pos-orders"] });
      }
    },
  });
}

export function useRefund() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RefundInput) => posApi.refund(input, newIdempotencyKey()),
    retry: false,
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ["pos-order", vars.order_id] });
      qc.invalidateQueries({ queryKey: ["pos-orders"] });
      toast.success("Refund recorded");
    },
    onError: (err) => toast.error(posErrorMessage(err)),
  });
}

/**
 * Applying a discount can come back 403 `discount_needs_approval`, which is NOT
 * an error — it's a prompt for a manager PIN. So no toast here; the caller
 * inspects the code and escalates. Toasting "forbidden" at a cashier who is
 * doing exactly the right thing is how a POS earns its reputation.
 */
export function useApplyDiscount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, input }: { orderId: number; input: ApplyDiscountInput }) =>
      posApi.applyDiscount(orderId, input),
    retry: false,
    onSuccess: (order) => {
      qc.setQueryData(["pos-order", order.id], order);
      qc.invalidateQueries({ queryKey: ["pos-orders"] });
    },
  });
}

export function useDiscountRules() {
  return useQuery({
    queryKey: ["pos-discount-rules"],
    queryFn: () => posApi.listDiscountRules(),
    retry: false,
  });
}

export function useCreateDiscountRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDiscountRuleInput) => posApi.createDiscountRule(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pos-discount-rules"] });
      toast.success("Discount rule created");
    },
    onError: (err) => toast.error(posErrorMessage(err)),
  });
}
