"use client";

import { CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PrepTicketSummary } from "./PrepTicketSummary";
import {
  isPrepOpen,
  prepActionLabel,
  prepAllowedTransitions,
} from "@/lib/sub-kitchen/prep-transitions";
import {
  useCancelPrepTicket,
  useUpdatePrepStatus,
} from "@/lib/hooks/use-sub-kitchen";
import type { PrepTicket } from "@/lib/types/sub-kitchen";

/** The working card — the summary plus the moves. Sub-kitchen portal only. */
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
        <PrepTicketSummary ticket={ticket} />

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
