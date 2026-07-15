"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, queryKeys } from "@/lib/api";
import { toast } from "sonner";

export const NOTIFICATIONS_PAGE_SIZE = 20;

/**
 * 45s, the middle of the contract's 30–60s guidance.
 *
 * There is no WebSocket, SSE, or push — the inbox is database rows we poll — so
 * this interval is the whole delivery mechanism. Refetching on window focus too
 * would double the load for little gain on a screen people leave open.
 */
const POLL_INTERVAL_MS = 45_000;

export function useNotifications(page = 1) {
  return useQuery({
    queryKey: queryKeys.notifications(page),
    queryFn: () =>
      api.listNotifications({ page, page_size: NOTIFICATIONS_PAGE_SIZE }),
    refetchInterval: POLL_INTERVAL_MS,
    // A failed poll is not worth shouting about: the next one is 45s away.
    retry: 1,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.markNotificationRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (err) => {
      const message =
        err instanceof Error ? err.message : "Failed to mark as read";
      toast.error(message);
    },
  });
}
