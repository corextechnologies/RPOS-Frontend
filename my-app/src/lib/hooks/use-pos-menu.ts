"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { posApi } from "@/lib/api/pos.api";
import { posAdminApi } from "@/lib/api/pos-admin.api";
import { isOfflineError } from "@/lib/api/pos-client";
import { posErrorMessage } from "@/lib/api/errors";
import type { AvailabilityRow, MenuItem, PosMenu, SetAvailabilityInput } from "@/lib/types/pos";
import { toast } from "sonner";

const MENU_CACHE_KEY = "rpos-pos-menu";
const MENU_ETAG_KEY = "rpos-pos-menu-etag";

/**
 * The menu is cached to localStorage rather than to React Query alone, for one
 * reason: a till that reloads with no network must still be able to sell. React
 * Query's cache dies with the tab.
 *
 * A *published* menu version is immutable server-side, which is what makes this
 * safe to cache indefinitely — the ETag can be trusted absolutely and a 304 is
 * the expected answer on every reload, not a nice-to-have.
 */
function readCachedMenu(): { menu: PosMenu; etag: string | null } | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(MENU_CACHE_KEY);
  if (!raw) return null;
  try {
    return { menu: JSON.parse(raw) as PosMenu, etag: window.localStorage.getItem(MENU_ETAG_KEY) };
  } catch {
    return null;
  }
}

function writeCachedMenu(menu: PosMenu, etag: string | null) {
  window.localStorage.setItem(MENU_CACHE_KEY, JSON.stringify(menu));
  if (etag) window.localStorage.setItem(MENU_ETAG_KEY, etag);
}

export const posMenuKeys = {
  menu: (version?: number) => ["pos-menu", version ?? "published"] as const,
  availability: ["pos-availability"] as const,
};

/**
 * The menu.
 *
 * Two distinct jobs, and conflating them corrupts the offline cache:
 *
 * - **`version` omitted** — the published menu the till sells from. This is the
 *   one persisted to localStorage, because a till that reloads with no network
 *   must still be able to sell.
 * - **`version` given** — a *historical* version, fetched to reprint an old
 *   order at the prices it was sold at. This must NOT touch the persisted
 *   cache: writing version 2's items over the published cache would leave the
 *   till selling last month's menu the next time it started up offline.
 */
export function usePosMenu(version?: number) {
  const isPublished = version === undefined;

  return useQuery({
    queryKey: posMenuKeys.menu(version),
    // Immutable once published — never refetch on focus, never expire.
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
    enabled: version === undefined || Number.isFinite(version),
    queryFn: async (): Promise<PosMenu> => {
      // Only the published menu reads or writes the durable cache.
      const cached = isPublished ? readCachedMenu() : null;
      try {
        const res = await posApi.menu(cached?.etag ?? null, version);
        if (res.status === 304 && cached) return cached.menu;
        if (res.status === 200) {
          if (isPublished) writeCachedMenu(res.data, res.etag);
          return res.data;
        }
        // 304 with no cache: the ETag we sent came from a cache that has since
        // been cleared. Ask again unconditionally rather than return nothing.
        const fresh = await posApi.menu(null, version);
        if (fresh.status === 200) {
          if (isPublished) writeCachedMenu(fresh.data, fresh.etag);
          return fresh.data;
        }
        throw new Error("Menu unavailable");
      } catch (err) {
        // Selling from a stale menu beats not selling. The shell already tells
        // the user they're offline. A historical version has no fallback and
        // shouldn't invent one — the reprint simply isn't available offline.
        if (isOfflineError(err) && cached) return cached.menu;
        throw err;
      }
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
 * The menu as the grid should render it: cached items, live availability.
 *
 * Availability wins where the two disagree — the menu blob may be hours old,
 * the poll is seconds old. Where availability is silent (offline, or an item it
 * doesn't mention) the menu's own flag stands.
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
