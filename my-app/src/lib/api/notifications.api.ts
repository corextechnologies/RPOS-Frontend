import type { Paginated } from "@/lib/types/admin";
import type {
  AppNotification,
  NotificationFilters,
} from "@/lib/types/notification";
import { request, requestEnvelope } from "./client";
import { idOrNull, numberFromMeta } from "./normalize";

function normalizeNotification(n: AppNotification): AppNotification {
  return {
    ...n,
    id: String(n.id),
    restaurant_id: n.restaurant_id != null ? String(n.restaurant_id) : undefined,
    user_id: n.user_id != null ? String(n.user_id) : undefined,
    entity_id: idOrNull(n.entity_id),
    is_read: Boolean(n.is_read),
  };
}

/** Live notifications API — the inbox is shared by every portal. */
export const notificationsApi = {
  async listNotifications(
    filters?: NotificationFilters,
  ): Promise<Paginated<AppNotification>> {
    const page = filters?.page ?? 1;
    const page_size = filters?.page_size ?? 20;
    const qs = new URLSearchParams({
      page: String(page),
      page_size: String(page_size),
    });
    const { data, meta } = await requestEnvelope<AppNotification[]>(
      `/notifications?${qs.toString()}`,
    );
    const items = (data ?? []).map(normalizeNotification);
    return {
      items,
      page: numberFromMeta(meta, "page", page),
      page_size: numberFromMeta(meta, "page_size", page_size),
      // This endpoint's meta carries page/page_size but not always a total;
      // fall back to what arrived rather than showing a count of zero.
      total: numberFromMeta(meta, "total", items.length),
    };
  },

  async markNotificationRead(id: string): Promise<AppNotification> {
    const data = await request<AppNotification>(`/notifications/${id}/read`, {
      method: "PATCH",
    });
    return normalizeNotification(data);
  },
};
