"use client";

import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { deviceServices } from "@/lib/pos/offline/device-services";
import { drainOutbox } from "@/lib/pos/offline/drain";
import { isOnline, onConnectivityChange, onOnline } from "@/lib/pos/offline/connectivity";

/** How often to re-check the queue and opportunistically retry backed-off entries. */
const TICK_MS = 30_000;

export interface PosSyncState {
  /** How many actions are still queued — the badge count. */
  queued: number;
  /** A drain pass is running right now. */
  syncing: boolean;
  /** The browser reports no connection. A hint for the badge, not the source of truth. */
  offline: boolean;
  /** Drain now — safe to call anytime; overlapping calls are a no-op (single-flight). */
  drain: () => Promise<void>;
}

/**
 * Drives the outbox drain from the UI: on mount (a device may boot with a
 * backlog), whenever the network returns, and on a slow tick to retry entries
 * whose backoff has elapsed. Exposes the queue depth for the shell's indicator.
 *
 * Mount this once, high in the POS tree (the shell), not per screen.
 */
export function usePosSync(): PosSyncState {
  const qc = useQueryClient();
  const [queued, setQueued] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [offline, setOffline] = useState(!isOnline());

  const refreshCount = useCallback(async () => {
    setQueued(await deviceServices.outbox.count());
  }, []);

  const drain = useCallback(async () => {
    setSyncing(true);
    try {
      const summary = await drainOutbox();
      // If anything actually settled, the server's order/stock state moved —
      // pull the fresh lists so the till reflects it.
      if (summary.orders.settled > 0 || summary.payments.settled > 0) {
        qc.invalidateQueries({ queryKey: ["pos-orders"] });
        qc.invalidateQueries({ queryKey: ["pos-availability"] });
      }
    } finally {
      setSyncing(false);
      await refreshCount();
    }
  }, [qc, refreshCount]);

  useEffect(() => {
    // Deferred a tick rather than run in the effect body — the same shape the
    // rest of the POS uses, so an initial drain's setState doesn't cascade a
    // synchronous re-render.
    const kick = window.setTimeout(() => {
      void refreshCount();
      if (isOnline()) void drain();
    }, 0);
    const offOnline = onOnline(() => void drain());
    const offChange = onConnectivityChange((online) => setOffline(!online));
    const tick = window.setInterval(() => {
      void refreshCount();
      if (isOnline()) void drain();
    }, TICK_MS);
    return () => {
      window.clearTimeout(kick);
      offOnline();
      offChange();
      window.clearInterval(tick);
    };
  }, [drain, refreshCount]);

  return { queued, syncing, offline, drain };
}
