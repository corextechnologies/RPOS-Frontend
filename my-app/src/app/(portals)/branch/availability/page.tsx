"use client";

import { useState } from "react";
import { Flag, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EightySixDialog } from "@/components/branch/EightySixDialog";
import { usePublishedMenu } from "@/lib/hooks/use-pos-admin";
import { useSetAvailability } from "@/lib/hooks/use-pos-menu";
import { useFlaggedOrders } from "@/lib/hooks/use-pos-orders";
import { posErrorMessage } from "@/lib/api/errors";
import { formatDate } from "@/lib/utils";
import type { MenuItem } from "@/lib/types/pos";

/**
 * 86-ing and the flagged-order queue — the manager's POS jobs.
 *
 * Both live here rather than on the till because `GET /pos/menu`,
 * `PUT /pos/availability/{id}` and `GET /pos/orders/flagged` take an ordinary
 * role-gated token, not a device-bound one.
 *
 * The item list is read from `GET /pos/menu` (via `usePublishedMenu`), NOT the
 * till-only `GET /pos/availability`: the latter demands a device-paired token, so
 * a manager on the web portal gets `device_not_bound`. The published menu already
 * carries each item's `is_available` / `unavailable_reason`, and the toggle stays
 * on `PUT /pos/availability/{id}`, which a plain manager session can call.
 */
export default function BranchAvailabilityPage() {
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const setAvailability = useSetAvailability();

  const menu = usePublishedMenu();
  const flagged = useFlaggedOrders();

  const flaggedItems = flagged.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-content">
          Menu availability
        </h1>
        <p className="mt-1 text-sm text-muted">
          Take items off the menu, and review sales the server flagged.
        </p>
      </div>

      {/*
        Flagged = accepted, but priced differently from what the terminal
        expected — usually the menu moved before the till refreshed. Policy is
        "device wins for facts, server wins for rules": the sale stands and a
        human rules on the difference. It is neither rejected nor silently fixed.
      */}
      {flaggedItems.length > 0 && (
        <Card className="border-danger/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-danger">
              <Flag className="size-4" aria-hidden />
              Needs review ({flaggedItems.length})
            </CardTitle>
            <CardDescription>
              Accepted, but the price differed from what the terminal expected. The sale stands —
              check why.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-line">
              {flaggedItems.map((order) => (
                <li key={order.id} className="flex items-center gap-3 py-2 text-sm">
                  <span className="font-mono text-xs text-content">{order.order_no}</span>
                  <span className="min-w-0 flex-1 truncate text-muted">
                    {order.flag_reason ?? "Price differed"}
                  </span>
                  <span className="shrink-0 text-xs text-faint">
                    {formatDate(order.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Items</CardTitle>
          <CardDescription>
            Off-menu items stay visible to staff, greyed out — &ldquo;we&apos;ve run out&rdquo;
            is worth saying.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {menu.isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="size-5 animate-spin text-brand" aria-label="Loading" />
            </div>
          ) : menu.error ? (
            <p className="p-6 text-center text-sm text-danger">
              {posErrorMessage(menu.error)}
            </p>
          ) : !menu.data?.items?.length ? (
            <p className="p-10 text-center text-sm text-muted">
              No menu published yet, so there&apos;s nothing to take off it.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {menu.data.items.map((item) => (
                <li key={item.id} className="flex items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-content">{item.name}</p>
                    <p className="text-xs text-muted">
                      {item.category ?? "Uncategorised"}
                      {!item.is_available && item.unavailable_reason
                        ? ` · ${item.unavailable_reason}`
                        : ""}
                    </p>
                  </div>
                  <Badge variant={item.is_available ? "secondary" : "destructive"}>
                    {item.is_available ? "on" : "off"}
                  </Badge>
                  <Button variant="outline" size="sm" onClick={() => setEditing(item)}>
                    {item.is_available ? "86 it" : "Put back"}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <EightySixDialog
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        title={editing?.name ?? ""}
        isAvailable={editing?.is_available ?? false}
        currentReason={editing?.unavailable_reason}
        isPending={setAvailability.isPending}
        onSubmit={(available, reason, autoClearAt) => {
          if (!editing) return;
          setAvailability.mutate(
            {
              id: editing.id,
              body: {
                is_available: available,
                reason: available ? undefined : reason || "86'd",
                auto_clear_at: autoClearAt,
              },
            },
            {
              onSuccess: () => {
                // The toggle invalidates the till's availability key; this page
                // reads from the published menu, so refetch it to reflect the flip.
                void menu.refetch();
                setEditing(null);
              },
            },
          );
        }}
      />
    </div>
  );
}
