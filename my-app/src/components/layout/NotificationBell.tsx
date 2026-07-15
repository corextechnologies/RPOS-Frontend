"use client";

import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth";
import {
  useMarkNotificationRead,
  useNotifications,
} from "@/lib/hooks/use-notifications";
import { notificationLink } from "@/lib/notifications/links";
import type { AppNotification } from "@/lib/types/notification";
import { cn, formatDate } from "@/lib/utils";

export function NotificationBell() {
  const router = useRouter();
  const { user } = useAuth();
  const notifications = useNotifications();
  const markRead = useMarkNotificationRead();

  const items = notifications.data?.items ?? [];
  const unread = items.filter((n) => !n.is_read).length;

  const open = (notification: AppNotification) => {
    if (!notification.is_read) markRead.mutate(notification.id);
    const href = notificationLink(notification, user?.role);
    // No link is a legitimate outcome — an unknown entity_type, or one this role
    // has no screen for. Marking it read is still the right thing to do.
    if (href) router.push(href);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={
          unread > 0 ? `Notifications (${unread} unread)` : "Notifications"
        }>
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] font-semibold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 p-0">
        <DropdownMenuLabel className="px-4 py-3">
          Notifications
          {unread > 0 && (
            <span className="ml-2 text-xs font-normal text-muted">
              {unread} unread
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="m-0" />

        {notifications.isPending ? (
          <p className="px-4 py-6 text-center text-sm text-muted">Loading…</p>
        ) : items.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted">
            Nothing here yet.
          </p>
        ) : (
          <ul className="max-h-96 overflow-y-auto">
            {items.map((notification) => {
              const href = notificationLink(notification, user?.role);
              return (
                <li key={notification.id}>
                  <button
                    type="button"
                    onClick={() => open(notification)}
                    className={cn(
                      "w-full space-y-1 border-b border-line px-4 py-3 text-left last:border-b-0",
                      href ? "cursor-pointer hover:bg-surface-2" : "cursor-default",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={cn(
                          "text-sm",
                          notification.is_read
                            ? "text-muted"
                            : "font-medium text-content",
                        )}
                      >
                        {notification.title}
                      </p>
                      {!notification.is_read && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" />
                      )}
                    </div>
                    <p className="text-xs text-muted">{notification.body}</p>
                    <p className="text-xs text-faint">
                      {formatDate(notification.created_at)}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
