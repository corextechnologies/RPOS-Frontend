"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type {
  UpdateWarehouseRequestStatusInput,
  WarehouseRequest,
  WarehouseRequestStatus,
} from "@/lib/types/warehouse";
import {
  warehouseActionHint,
  warehouseActionLabel,
  warehouseAllowedTransitions,
} from "@/lib/warehouse/request-transitions";

interface WarehouseRequestActionPanelProps {
  request: WarehouseRequest;
  canUpdate: boolean;
  isSubmitting: boolean;
  onSubmit: (body: UpdateWarehouseRequestStatusInput) => Promise<void>;
}

/** Copy for statuses the warehouse cannot act on, so the panel never dead-ends. */
function waitingCopy(request: WarehouseRequest): string {
  if (request.request_type === "WAREHOUSE_TO_ADMIN_PO") {
    return request.status === "RECEIVED"
      ? "This order is closed."
      : "Admin has this order. You can act once it reaches In Queue.";
  }
  if (request.status === "DISPATCHED") {
    return "Dispatched. The kitchen confirms receipt on their side.";
  }
  return "Nothing to do here.";
}

export function WarehouseRequestActionPanel({
  request,
  canUpdate,
  isSubmitting,
  onSubmit,
}: WarehouseRequestActionPanelProps) {
  const [pending, setPending] = useState<WarehouseRequestStatus | null>(null);
  const [notes, setNotes] = useState("");

  const transitions = warehouseAllowedTransitions(
    request.request_type,
    request.status,
  );

  if (!canUpdate || transitions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
          <CardDescription>{waitingCopy(request)}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const hint = pending ? warehouseActionHint(request.request_type, pending) : null;

  const reset = () => {
    setPending(null);
    setNotes("");
  };

  const confirm = async () => {
    if (!pending) return;
    await onSubmit({ to_status: pending, notes: notes || undefined });
    reset();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Actions</CardTitle>
        <CardDescription>
          Moves available from the current status.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {transitions.map((status) => (
            <Button
              key={status}
              type="button"
              variant={pending === status ? "default" : "outline"}
              onClick={() => setPending(status)}
            >
              {warehouseActionLabel(status)}
            </Button>
          ))}
        </div>

        {pending && (
          <div className="space-y-4 rounded-xl border border-line bg-surface-2/40 px-4 py-4">
            <div className="space-y-1">
              <p className="font-medium text-content">
                {warehouseActionLabel(pending)}
              </p>
              {hint && <p className="text-sm text-muted">{hint}</p>}
            </div>

            <div className="space-y-2">
              <label
                htmlFor="warehouse-action-notes"
                className="text-sm font-medium text-content"
              >
                Notes (optional)
              </label>
              <Textarea
                id="warehouse-action-notes"
                placeholder="Add a note for this action"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={reset}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="button" onClick={confirm} disabled={isSubmitting}>
                {isSubmitting ? "Working…" : "Confirm"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
