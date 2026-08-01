"use client";

import { Flame, Hash } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PrepStatusBadge } from "./PrepStatusBadge";
import { formatDate } from "@/lib/utils";
import type { PrepTicket } from "@/lib/types/sub-kitchen";

/**
 * Everything a prep ticket *shows* and nothing it can *do*.
 *
 * Split out so the Branch portal's read-only board renders tickets without
 * touching a component that has mutation hooks in it. A `readOnly` boolean on
 * the operate card would have been the alternative, and the failure mode there
 * is one call site passing it wrong and putting live buttons in a watch view.
 * There is no flag to get wrong if the buttons aren't in the file.
 */
export function PrepTicketSummary({ ticket }: { ticket: PrepTicket }) {
  return (
    <div className="space-y-3">
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
          <p className="text-xs font-medium uppercase tracking-wide text-faint">Customer note</p>
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
    </div>
  );
}
