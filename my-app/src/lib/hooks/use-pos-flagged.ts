"use client";

import { useCallback, useEffect, useState } from "react";
import {
  dismissFlagged,
  readFlagged,
  subscribeFlagged,
  type FlaggedOrder,
} from "@/lib/pos/offline/sync-state";

export interface PosFlaggedState {
  /** Sales the server accepted but flagged on sync — for a manager to review. */
  flagged: FlaggedOrder[];
  loading: boolean;
  /** Mark one reviewed and drop it from the list. */
  dismiss: (localId: string) => Promise<void>;
}

/**
 * The device's own record of flagged sales (§9). These are sales that physically
 * happened offline and the server *accepted* — it just disagreed about the price
 * (PRICE_DRIFT) or found stock oversold (STOCK_OVERSELL). Accept + flag, never
 * reject: this list is for a manager to reconcile, and dismissing an entry is
 * "I've looked at it", not a state change on the server.
 *
 * Updates live via `subscribeFlagged` the moment a drain records one.
 */
export function usePosFlagged(): PosFlaggedState {
  const [flagged, setFlagged] = useState<FlaggedOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setFlagged(await readFlagged());
    setLoading(false);
  }, []);

  useEffect(() => {
    const kick = window.setTimeout(() => void refresh(), 0);
    const unsub = subscribeFlagged(() => void refresh());
    return () => {
      window.clearTimeout(kick);
      unsub();
    };
  }, [refresh]);

  const dismiss = useCallback(
    async (localId: string) => {
      await dismissFlagged(localId);
      // subscribeFlagged fires on dismiss too, but refresh here so the caller
      // sees the change synchronously even if it isn't subscribed.
      await refresh();
    },
    [refresh],
  );

  return { flagged, loading, dismiss };
}
