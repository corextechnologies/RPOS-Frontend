"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Ban, Flag, Loader2, RotateCcw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { posAdminApi } from "@/lib/api/pos-admin.api";
import { useSetAvailability } from "@/lib/hooks/use-pos-menu";
import { useFlaggedOrders } from "@/lib/hooks/use-pos-orders";
import { posErrorMessage } from "@/lib/api/errors";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { AvailabilityRow } from "@/lib/types/pos";

const PRESETS: Array<{ label: string; hours: number | null }> = [
  { label: "Rest of shift", hours: null },
  { label: "1 hour", hours: 1 },
  { label: "Until tomorrow", hours: 12 },
];

/**
 * 86-ing and the flagged-order queue — the manager's POS jobs.
 *
 * Both live here rather than on the till because `PUT /pos/availability/{id}`
 * and `GET /pos/orders/flagged` take an ordinary role-gated token, not a
 * device-bound one. A till holds only a device token, so it can *read*
 * availability (a device route) and grey items out, but turning one off is a
 * back-office action.
 */
export default function BranchAvailabilityPage() {
  const [editing, setEditing] = useState<AvailabilityRow | null>(null);

  const availability = useQuery({
    queryKey: ["pos-availability"],
    queryFn: () => posAdminApi.availability(),
    retry: false,
  });
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
          {availability.isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="size-5 animate-spin text-brand" aria-label="Loading" />
            </div>
          ) : availability.error ? (
            <p className="p-6 text-center text-sm text-danger">
              {posErrorMessage(availability.error)}
            </p>
          ) : !availability.data?.length ? (
            <p className="p-10 text-center text-sm text-muted">
              No menu published yet, so there&apos;s nothing to take off it.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {availability.data.map((row) => (
                <li key={row.menu_item_id} className="flex items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-content">Item #{row.menu_item_id}</p>
                    {row.reason && <p className="text-xs text-muted">{row.reason}</p>}
                  </div>
                  {row.on_hand != null && (
                    <span className="shrink-0 text-xs tabular-nums text-faint">
                      {row.on_hand} on hand
                    </span>
                  )}
                  <Badge variant={row.is_available ? "secondary" : "destructive"}>
                    {row.is_available ? "on" : "off"}
                  </Badge>
                  <Button variant="outline" size="sm" onClick={() => setEditing(row)}>
                    {row.is_available ? "86 it" : "Put back"}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <EightySixDialog
        row={editing}
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
      />
    </div>
  );
}

function EightySixDialog({
  row,
  open,
  onOpenChange,
}: {
  row: AvailabilityRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const setAvailability = useSetAvailability();
  const [reason, setReason] = useState("");
  const [hours, setHours] = useState<number | null>(null);

  if (!row) return null;

  function submit(available: boolean) {
    if (!row) return;
    setAvailability.mutate(
      {
        id: row.menu_item_id,
        body: {
          is_available: available,
          reason: available ? undefined : reason.trim() || "86'd",
          // Without an auto-clear, every 86 is permanent until a human
          // remembers — and nobody remembers.
          auto_clear_at:
            available || hours === null
              ? null
              : new Date(Date.now() + hours * 3600_000).toISOString(),
        },
      },
      {
        onSuccess: () => {
          setReason("");
          setHours(null);
          onOpenChange(false);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Item #{row.menu_item_id}</DialogTitle>
          <DialogDescription>
            {row.is_available
              ? "Take this off the menu. Staff still see it, greyed out."
              : (row.reason ?? "Currently off the menu.")}
          </DialogDescription>
        </DialogHeader>

        {row.is_available ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="86-reason">Reason</Label>
              <Input
                id="86-reason"
                autoFocus
                placeholder="Fryer down"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <p className="text-xs text-faint">Shown to staff on the tile.</p>
            </div>

            <div className="space-y-2">
              <Label>Bring it back</Label>
              <div className="grid grid-cols-3 gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setHours(p.hours)}
                    className={cn(
                      "h-10 rounded-xl border text-xs font-medium transition",
                      hours === p.hours
                        ? "border-brand bg-brand/10 text-content"
                        : "border-line bg-surface text-muted hover:border-brand/50",
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={setAvailability.isPending}
                onClick={() => submit(false)}
              >
                <Ban className="mr-1.5 size-4" aria-hidden />
                86 it
              </Button>
            </DialogFooter>
          </>
        ) : (
          <Button
            className="h-11 w-full"
            disabled={setAvailability.isPending}
            onClick={() => submit(true)}
          >
            <RotateCcw className="mr-2 size-4" aria-hidden />
            Put it back on
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
