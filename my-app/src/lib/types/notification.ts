/**
 * Inbox rows from `GET /v1/notifications`. Shared by every portal — unlike the
 * request DTOs, this one shape serves them all.
 *
 * There is no WebSocket, SSE, or push: these are database rows you poll.
 */
export interface AppNotification {
  id: string;
  restaurant_id?: string;
  user_id?: string;
  title: string;
  body: string;
  /**
   * Polymorphic, and deliberately typed as a plain string.
   *
   * Known values today are "request", "stock_count" and "product" (the
   * low-stock alert, added in Phase 4.1). More will appear in later phases
   * WITHOUT an API version bump, so this must not be a union — narrowing it
   * would turn a future value into a type error at the boundary and tempt a
   * crash. Switch on it with a safe default instead; see notificationLink().
   */
  entity_type: string;
  entity_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationFilters {
  page?: number;
  page_size?: number;
}
