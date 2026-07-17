"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { posApi } from "@/lib/api/pos.api";
import { posAdminApi } from "@/lib/api/pos-admin.api";
import { isOfflineError } from "@/lib/api/pos-client";
import { posErrorMessage } from "@/lib/api/errors";
import { outbox } from "@/lib/pos/outbox";
import type { Minor } from "@/lib/money";
import type { PosOrder, PosOrderCreate } from "@/lib/types/pos";

export const posOrderKeys = {
  list: (page?: number) => ["pos-orders", page ?? 1] as const,
  one: (id: number) => ["pos-order", id] as const,
  flagged: ["pos-orders-flagged"] as const,
};

export function usePosOrders(opts?: { page?: number; enabled?: boolean }) {
  const page = opts?.page ?? 1;
  return useQuery({
    queryKey: posOrderKeys.list(page),
    queryFn: () => posApi.listOrders(page),
    // Gated on ORDER_READ by the caller. Fetching a list we may not read would
    // be a guaranteed 403 in the network log every time the tab opens.
    enabled: opts?.enabled ?? true,
    retry: false,
  });
}

export function usePosOrder(id: number | null) {
  return useQuery({
    queryKey: posOrderKeys.one(id ?? 0),
    queryFn: () => posApi.getOrder(id as number),
    enabled: id != null,
    retry: false,
  });
}

/**
 * The flagged review queue.
 *
 * Portal token, not a device one — per the backend's route list, and it fits:
 * reviewing a flagged sale is a manager at a desk, not a cashier mid-queue.
 * Lives in the branch portal.
 */
export function useFlaggedOrders(opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: posOrderKeys.flagged,
    queryFn: () => posAdminApi.flaggedOrders(),
    enabled: opts?.enabled ?? true,
    retry: false,
  });
}

/**
 * Parked orders — the recall list.
 *
 * Filtered client-side because the guide documents no status filter on
 * `GET /pos/orders`. Fine at a counter's volume; if a branch parks hundreds,
 * ask for `?status=PARKED` rather than paginating through everything here.
 */
export function useParkedOrders() {
  const query = usePosOrders();
  return {
    ...query,
    parked: (query.data?.items ?? []).filter((o) => o.status === "PARKED"),
  };
}

export type CreateOrderOutcome =
  | { kind: "created"; order: PosOrder }
  | { kind: "queued"; localId: string };

/**
 * Create an order — outbox first, network second.
 *
 * The sequence matters and is not negotiable:
 *
 * 1. Write to the outbox. If the tab dies on the next line, the sale survives.
 * 2. Post it, reusing the outbox record's `Idempotency-Key`. A retry of this
 *    exact intent is a replay, not a second order.
 * 3. On success, drop the record; the server owns the order now.
 * 4. On *offline*, keep it and report `queued` — the cashier carries on, and
 *    `drainOutbox` will deliver it. This is the normal path in a branch with a
 *    flaky link, not an error.
 * 5. On a *server rejection* (409 price_mismatch, item_unavailable, …), drop
 *    the record and rethrow. Retrying cannot help: the server has ruled, the
 *    cart needs a human decision, and leaving it queued would silently re-post
 *    an order the server already refused.
 */
export function useCreateOrder() {
  const qc = useQueryClient();

  return useMutation<CreateOrderOutcome, unknown, { input: PosOrderCreate; totalMinor: Minor }>({
    mutationFn: async ({ input, totalMinor }) => {
      const record = await outbox.enqueue(input, totalMinor);
      try {
        const order = await posApi.createOrder(input, record.idempotency_key);
        await outbox.remove(record.local_id);
        return { kind: "created", order };
      } catch (err) {
        if (isOfflineError(err)) return { kind: "queued", localId: record.local_id };
        await outbox.remove(record.local_id);
        throw err;
      }
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["pos-orders"] });
      if (res.kind === "queued") {
        toast.success("Saved offline — it'll sync when the connection is back.");
      }
    },
  });
}

/**
 * Send: fires the KOT and deducts stock.
 *
 * Idempotent server-side, which is what makes the retry-after-timeout safe —
 * re-sending never double-deducts. So this deliberately does NOT go through the
 * outbox: sending needs a real order id, which only exists once the create has
 * landed.
 */
export function useSendOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => posApi.sendOrder(id),
    onSuccess: (order) => {
      qc.invalidateQueries({ queryKey: ["pos-orders"] });
      qc.setQueryData(posOrderKeys.one(order.id), order);
      // Sending consumes stock, so what's sellable may have just changed.
      qc.invalidateQueries({ queryKey: ["pos-availability"] });
      toast.success(`Sent to kitchen · ${order.order_no}`);
    },
    onError: (err) => toast.error(posErrorMessage(err)),
  });
}

export function useParkOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: "PARKED" | "DRAFT" }) =>
      posApi.setOrderStatus(id, status),
    onSuccess: (order) => {
      qc.invalidateQueries({ queryKey: ["pos-orders"] });
      qc.setQueryData(posOrderKeys.one(order.id), order);
      toast.success(order.status === "PARKED" ? "Order parked" : "Order recalled");
    },
    onError: (err) => toast.error(posErrorMessage(err)),
  });
}

export function useKot(orderId: number | null) {
  return useQuery({
    queryKey: ["pos-kot", orderId],
    queryFn: () => posApi.kot(orderId as number),
    enabled: orderId != null,
    retry: false,
  });
}
