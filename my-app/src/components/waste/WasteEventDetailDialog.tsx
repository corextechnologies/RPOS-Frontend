"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";
import {
  MOVEMENT_TYPE_LABELS,
  WASTE_REASON_LABELS,
} from "@/lib/stock/waste-reason";
import type { WasteEvent } from "@/lib/types/waste";

interface WasteEventDetailDialogProps {
  event: WasteEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Resolved location name (Admin); omitted for the single-warehouse view. */
  locationLabel?: string;
  /** Provided for the Warehouse manager — opens the record for editing. */
  onEdit?: (event: WasteEvent) => void;
}

function Detail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-sm text-content">{children}</dd>
    </div>
  );
}

/**
 * Everything recorded about a single write-off — including the full notes, which
 * the table has no room for. Read-only; the Warehouse manager gets an Edit
 * button, Admin sees the card alone.
 */
export function WasteEventDetailDialog({
  event,
  open,
  onOpenChange,
  locationLabel,
  onEdit,
}: WasteEventDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{event ? event.product.name : "Waste record"}</DialogTitle>
        </DialogHeader>

        {event && (
          <>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
              <Detail label="SKU">{event.product.sku || "-"}</Detail>
              <Detail label="Type">
                <Badge
                  variant={
                    event.movement_type === "EXPIRY" ? "warning" : "destructive"
                  }
                >
                  {MOVEMENT_TYPE_LABELS[event.movement_type]}
                </Badge>
              </Detail>

              <Detail label="Reason">
                {event.waste_reason
                  ? WASTE_REASON_LABELS[event.waste_reason]
                  : "-"}
              </Detail>
              <Detail label="Quantity written off">{event.quantity}</Detail>

              <Detail label="Batch">
                {event.batch_code ? (
                  event.batch_code
                ) : (
                  <Badge variant="secondary">Unbatched</Badge>
                )}
              </Detail>
              <Detail label="Location">
                {locationLabel ?? event.location_type}
              </Detail>

              <Detail label="Written off">
                {formatDate(event.created_at)}
              </Detail>
              <Detail label="By">{event.created_by || "-"}</Detail>
            </dl>

            {/* The whole reason for the card — notes never fit in the table. */}
            <div className="space-y-0.5">
              <dt className="text-xs text-muted">Notes</dt>
              <dd className="whitespace-pre-wrap text-sm text-content">
                {event.notes || "—"}
              </dd>
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {onEdit && event && (
            <Button onClick={() => onEdit(event)}>Edit record</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
