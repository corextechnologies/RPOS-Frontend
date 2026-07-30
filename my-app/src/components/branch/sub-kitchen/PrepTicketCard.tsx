"use client";

import { CircleCheck, Flame, Hash } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PrepStatusBadge } from "./PrepStatusBadge";
import {
  isPrepOpen,
  prepActionLabel,
  prepAllowedTransitions,
} from "@/lib/sub-kitchen/prep-transitions";
import {
  useCancelPrepTicket,
  useUpdatePrepStatus,
} from "@/lib/hooks/use-sub-kitchen";
import { formatDate } from "@/lib/utils";
import type { PrepTicket } from "@/lib/types/sub-kitchen";

export function PrepTicketCard({
  ticket,
  onComplete,
}: {
  ticket: PrepTicket;
  onComplete: (ticket: PrepTicket) => void;
}) {
  const updateStatus = useUpdatePrepStatus();
  const cancel = useCancelPrepTicket();
  const busy = updateStatus.isPending || cancel.isPending;

  const open = isPrepOpen(ticket.status);
  // Cancel has its own control/endpoint, so drop it from the status buttons.
  const moves = prepAllowedTransitions(ticket.status).filter((t) => t !== "CANCELLED");

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-medium text-content">
              {ticket.quantity}× {ticket.product_name}
            </span>
            <Badge variant={ticket.source === "ORDER" ? "warning" : "secondary"}>
              {ticket.source === "ORDER" ? "Order" : "Batch"}
            </Badge>
            {ticket.priority > 0 && (
              <span className="flex items-center gap-1 text-xs text-warning">
                <Flame className="size-3" aria-hidden />
                Priority
              </span>
            )}
          </div>
          <PrepStatusBadge status={ticket.status} />
        </div>

        {ticket.source === "ORDER" && ticket.customization_note && (
          <div className="rounded-lg border border-line bg-surface-2 px-3 py-2">
            <p className="text-xs font-medium uppercase tracking-wide text-faint">
              Customer note
            </p>
            <p className="text-sm text-content">{ticket.customization_note}</p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
          {ticket.order_id && (
            <span className="flex items-center gap-1">
              <Hash className="size-3" aria-hidden />
              Order {ticket.order_id}
            </span>
          )}
          {ticket.due_at && <span>Due {formatDate(ticket.due_at)}</span>}
          {ticket.note && <span className="italic">{ticket.note}</span>}
        </div>

        {open && (
          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <Button
              variant="ghost"
              size="sm"
              className="text-danger"
              disabled={busy}
              onClick={() => cancel.mutate(ticket.id)}
            >
              Cancel
            </Button>
            {moves.map((to) => (
              <Button
                key={to}
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => updateStatus.mutate({ id: ticket.id, body: { status: to } })}
              >
                {prepActionLabel(to)}
              </Button>
            ))}
            <Button size="sm" disabled={busy} onClick={() => onComplete(ticket)}>
              <CircleCheck className="mr-1.5 size-4" aria-hidden />
              Complete
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
