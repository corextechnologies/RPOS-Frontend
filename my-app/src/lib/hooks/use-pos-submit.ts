"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { posApi } from "@/lib/api/pos.api";
import { isNetworkError } from "@/lib/api/pos-client";
import { newIdempotencyKey } from "@/lib/pos/idempotency";
import { isOnline } from "@/lib/pos/offline/connectivity";
import { deviceServices } from "@/lib/pos/offline/device-services";
import { posOrderKeys } from "@/lib/hooks/use-pos-orders";
import type { Minor } from "@/lib/money";
import type { PosOrder, PosOrderCreate } from "@/lib/types/pos";

/**
 * The submit seam — the one place an order becomes real, online or off.
 *
 * This exists to close the retrofit's central risk: if every screen calls
 * `posApi.createOrder`/`sendOrder` directly, "offline" has to be re-solved at
 * each call site and one of them will forget. Route them all through here and
 * offline is a property of the seam. The rule for the rest of the app is simple:
 * **no screen calls the order-mutating API directly; it calls this.**
 *
 * Online it is exactly today's flow — create (with the price proposal, so a
 * moved menu still surfaces as a 409) then send, which fires the KOT and deducts
 * stock. The only new behaviour is the `catch`: a *network* error (never a
 * server rejection like `price_mismatch`) means we're offline, so the whole sale
 * is queued by `local_id` and the caller gets a local order to finish the tender
 * against. The drain (WP-E) replays it; the backend dedupes on `local_id`, so a
 * replay is safe even days later (§13).
 */
export interface SubmitOrderInput {
  /** The create body. Include `expected_total_minor` unless the user just accepted the server price. */
  create: PosOrderCreate;
  /** What the device would charge — becomes `device_total_minor` in the sync envelope. */
  deviceTotalMinor: Minor;
  /** A recalled/parked order already has a server id; send that instead of creating a second. */
  existingOrderId?: number | null;
  /** The synthetic order to hand back (and tender against) if we end up offline. */
  localOrder: PosOrder;
}

export interface SubmitOrderResult {
  order: PosOrder;
  /** True when the order was queued rather than sent live — drives the caller's messaging. */
  offline: boolean;
}

export function useSubmitOrder() {
  const qc = useQueryClient();

  return useMutation<SubmitOrderResult, unknown, SubmitOrderInput>({
    // Stated here rather than left to the client default: this seam only works
    // if it is allowed to *run* while offline. React Query's "online" mode
    // would park the mutation until connectivity returns, so the till would
    // hang on Send with nothing queued — the exact failure the seam exists to
    // prevent. Not a preference; a precondition.
    networkMode: "always",
    mutationFn: async ({ create, deviceTotalMinor, existingOrderId, localOrder }) => {
      const queueOffline = async (): Promise<SubmitOrderResult> => {
        await deviceServices.outbox.enqueue({
          kind: "order",
          anchor: create.local_id,
          body: {
            // Sync flags drift instead of 409-ing, so the proposal is dropped
            // from the queued envelope (§9).
            order: { ...create, expected_total_minor: undefined },
            device_total_minor: deviceTotalMinor,
            was_sent: true,
            device_sent_at: new Date().toISOString(),
          },
        });
        return { order: localOrder, offline: true };
      };

      // Known-offline fast path. `navigator.onLine === false` is a reliable
      // "definitely offline" signal (only the reverse — true while actually
      // offline — is the unreliable case connectivity.ts warns about). Queue
      // immediately instead of firing a request that may hang with no fast
      // failure for the catch below to see.
      if (!isOnline()) return queueOffline();

      try {
        const order =
          existingOrderId && existingOrderId > 0
            ? await posApi.sendOrder(existingOrderId)
            : await posApi.sendOrder(
                (await posApi.createOrder(create, newIdempotencyKey())).id,
              );
        return { order, offline: false };
      } catch (err) {
        // Only being offline falls back to the queue. A price_mismatch or any
        // other server rejection must reach the caller unchanged.
        if (!isNetworkError(err)) throw err;
        return queueOffline();
      }
    },
    onSuccess: ({ order, offline }) => {
      if (offline) {
        toast.success("Saved on this device — will sync when back online");
        return;
      }
      qc.setQueryData(posOrderKeys.one(order.id), order);
      qc.invalidateQueries({ queryKey: ["pos-orders"] });
      // Sending consumes stock, so what's sellable may have just changed.
      qc.invalidateQueries({ queryKey: ["pos-availability"] });
      toast.success(`Sent to kitchen · ${order.order_no}`);
    },
  });
}
