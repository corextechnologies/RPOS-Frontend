"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { posApi } from "@/lib/api/pos.api";
import { posErrorMessage } from "@/lib/api/errors";
import { newIdempotencyKey } from "@/lib/pos/idempotency";
import type {
  ApplyDiscountInput,
  CreateDiscountRuleInput,
  PaymentInput,
  PaymentMethod,
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
     * One key per call. Each tender in a split bill is a distinct user intent —
     * "take 500 cash" then "take 600 card" are two intents, not one retried —
     * so they must not share a key or the second would replay the first.
     *
     * (A retry of a *failed* call is a different matter: React Query's retry is
     * off for this mutation precisely so a retry can't reuse this key with the
     * server having already committed.)
     */
    mutationFn: ({ orderId, input }: { orderId: number; input: PaymentInput }) =>
      posApi.pay(orderId, input, newIdempotencyKey()),
    retry: false,
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ["pos-order", vars.orderId] });
      qc.invalidateQueries({ queryKey: ["pos-orders"] });
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
