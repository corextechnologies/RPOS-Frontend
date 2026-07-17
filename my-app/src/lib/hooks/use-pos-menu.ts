"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { posApi } from "@/lib/api/pos.api";
import { posAdminApi } from "@/lib/api/pos-admin.api";
import { posErrorMessage } from "@/lib/api/errors";
import type { AvailabilityRow, MenuItem, PosMenu, SetAvailabilityInput } from "@/lib/types/pos";
import { toast } from "sonner";

export const posMenuKeys = {
  menu: (version?: number) => ["pos-menu", version ?? "published"] as const,
  availability: ["pos-availability"] as const,
};

/**
 * The menu.
 *
 * Two distinct jobs:
 *
 * - **`version` omitted** — the published menu the till sells from.
 * - **`version` given** — a *historical* version, fetched to reprint an old
 *   order at the prices it was sold at.
 */
export function usePosMenu(version?: number) {
  return useQuery({
    queryKey: posMenuKeys.menu(version),
    // Immutable once published — never refetch on focus, never expire.
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
    enabled: version === undefined || Number.isFinite(version),
    queryFn: async (): Promise<PosMenu> => {
      const res = await posApi.menu(null, version);
      if (res.status === 200) return res.data;
      throw new Error("Menu unavailable");
    },
  });
}

/**
 * Availability is polled separately and deliberately.
 *
 * It is explicitly NOT covered by the menu's ETag — it moves with stock, while
 * the menu version never moves at all. Folding the two together would mean
 * either giving up the menu's permanent cache or serving stale stock; keeping
 * them apart is what lets both be correct.
 */
export function usePosAvailability(pollMs = 20_000) {
  return useQuery({
    queryKey: posMenuKeys.availability,
    queryFn: () => posApi.availability(),
    refetchInterval: pollMs,
    refetchOnWindowFocus: true,
    staleTime: 5_000,
    retry: false,
  });
}

export interface ResolvedMenuItem extends MenuItem {
  /** Live availability folded over the cached menu's baked-in flag. */
  available: boolean;
  reason: string | null;
  onHand: number | null;
}

/**
 * The menu as the grid should render it: published items, live availability.
 *
 * Availability wins where the two disagree. Where availability is silent, the
 * menu's own flag stands.
 */
export function useResolvedMenu(version?: number) {
  const menu = usePosMenu(version);
  const availability = usePosAvailability();

  const items = useMemo<ResolvedMenuItem[]>(() => {
    const rows = new Map<number, AvailabilityRow>(
      (availability.data ?? []).map((r) => [r.menu_item_id, r]),
    );
    return (menu.data?.items ?? []).map((item) => {
      const live = rows.get(item.id);
      return {
        ...item,
        available: live ? live.is_available : item.is_available,
        reason: live ? live.reason : item.unavailable_reason,
        onHand: live?.on_hand ?? null,
      };
    });
  }, [menu.data, availability.data]);

  const categories = useMemo(() => {
    const seen = new Set<string>();
    for (const item of items) if (item.category) seen.add(item.category);
    return [...seen].sort();
  }, [items]);

  return {
    items,
    categories,
    menuVersionId: menu.data?.menu_version_id ?? null,
    isLoading: menu.isLoading,
    error: menu.error,
    refetch: menu.refetch,
  };
}

/**
 * 86-ing — manager-only, and **not from the till**.
 *
 * `PUT /pos/availability/{id}` takes an ordinary role-gated token, per the
 * backend's route list. A till holds only a device-bound token, so this hook is
 * for the branch portal; the till reads availability (a device route) and greys
 * items out, but cannot turn one off.
 */
export function useSetAvailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: SetAvailabilityInput }) =>
      posAdminApi.setAvailability(id, body),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: posMenuKeys.availability });
      toast.success(vars.body.is_available ? "Item back on" : "Item 86'd");
    },
    onError: (err) => toast.error(posErrorMessage(err)),
  });
}
