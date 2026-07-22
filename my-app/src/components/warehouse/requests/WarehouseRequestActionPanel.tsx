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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  warehouseTransitionNeedsApprovals,
  warehouseTransitionNeedsReceipts,
} from "@/lib/warehouse/request-transitions";
import {
  seedReceiptDrafts,
  validateReceipts,
  type ReceiptDraft,
} from "@/lib/schemas/warehouse-receipt";
import { PoReceiptsEditor } from "./PoReceiptsEditor";

interface WarehouseRequestActionPanelProps {
  request: WarehouseRequest;
  canUpdate: boolean;
  isSubmitting: boolean;
  onSubmit: (body: UpdateWarehouseRequestStatusInput) => Promise<void>;
}

/**
 * Copy for statuses the warehouse cannot act on, so the panel never dead-ends.
 *
 * Branches on `request_type` first: DISPATCHED means "act on this" for a PO and
 * "waiting on the kitchen" for a kitchen request.
 */
function waitingCopy(request: WarehouseRequest): string {
  if (request.request_type === "WAREHOUSE_TO_ADMIN_PO") {
    if (request.status === "RECEIVED") return "This order is closed.";
    if (request.status === "REPORTED") {
      return "Admin is reviewing your report. You can book the goods in once they respond.";
    }
    return "Admin has this order. You can act once it is dispatched to you.";
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
  const [drafts, setDrafts] = useState<ReceiptDraft[]>([]);
  const [lineQtys, setLineQtys] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

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

  const hint = pending
    ? warehouseActionHint(request.request_type, pending, request.status)
    : null;

  const needsReceipts =
    pending != null &&
    warehouseTransitionNeedsReceipts(request.request_type, pending);

  const needsApprovals =
    pending != null &&
    warehouseTransitionNeedsApprovals(request.request_type, pending);

  // Coming out of REPORTED, the warehouse confirms the whole order's total, not
  // the delivery that just arrived.
  const isCumulative = request.status === "RESOLVED" || request.status === "REPORTED";

  const validation = needsReceipts
    ? validateReceipts(drafts, request.line_items)
    : null;

  // A report where every quantity matches and nothing was written is not a
  // report — the API answers `nothing_reported`, so the button stays disabled.
  const reportBlocked =
    pending === "REPORTED" && validation != null && !validation.differs;
  const quantitiesInvalid = (validation?.invalid.length ?? 0) > 0;

  const start = (status: WarehouseRequestStatus) => {
    setPending(status);
    setErrorMessage(undefined);
    if (warehouseTransitionNeedsReceipts(request.request_type, status)) {
      setDrafts(seedReceiptDrafts(request.line_items));
    }
    if (warehouseTransitionNeedsApprovals(request.request_type, status)) {
      setLineQtys(
        Object.fromEntries(
          request.line_items.map((line) => [
            line.id,
            String(line.quantity_approved ?? line.quantity_requested),
          ]),
        ),
      );
    }
  };

  const reset = () => {
    setPending(null);
    setNotes("");
    setDrafts([]);
    setLineQtys({});
    setErrorMessage(undefined);
  };

  const patchDraft = (lineItemId: string, patch: Partial<ReceiptDraft>) => {
    setDrafts((prev) =>
      prev.map((d) => (d.line_item_id === lineItemId ? { ...d, ...patch } : d)),
    );
  };

  const confirm = async () => {
    if (!pending) return;
    if (needsReceipts && quantitiesInvalid) {
      setErrorMessage("Enter a whole quantity within the ordered amount for every line.");
      return;
    }
    if (needsApprovals) {
      for (const line of request.line_items) {
        const value = Number(lineQtys[line.id]);
        if (
          !Number.isInteger(value) ||
          value < 0 ||
          value > line.quantity_requested
        ) {
          setErrorMessage(
            `Enter a valid quantity for ${line.product_name} (0–${line.quantity_requested}).`,
          );
          return;
        }
      }
    }
    try {
      await onSubmit({
        to_status: pending,
        notes: notes || undefined,
        // Per-line approved quantities for a partial approval.
        line_approvals: needsApprovals
          ? request.line_items.map((line) => ({
              line_item_id: line.id,
              quantity_approved: Number(lineQtys[line.id]),
            }))
          : undefined,
        // One entry per line: omitting a line loses its batch and expiry, which
        // would hide that stock from near-expiry alerts and labels.
        line_receipts: needsReceipts
          ? drafts.map((d) => ({
              line_item_id: d.line_item_id,
              quantity_received: Number(d.quantity_received),
              batch_code: d.batch_code || undefined,
              expiry_date: d.expiry_date || undefined,
              issue_note: d.issue_note || undefined,
            }))
          : undefined,
      });
      // Only clear the panel on success. On failure (e.g. a 409
      // `insufficient_stock`) the mutation's own `onError` has already surfaced
      // a toast — we swallow the rejection here so it isn't an unhandled promise
      // rejection, and keep the panel open so the action can be retried.
      reset();
    } catch {
      // Handled by the mutation's onError; nothing to do but stop the throw.
    }
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
              onClick={() => start(status)}
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

            {needsReceipts && (
              <PoReceiptsEditor
                lines={request.line_items}
                drafts={drafts}
                mode={pending === "REPORTED" ? "REPORTED" : "RECEIVED"}
                isCumulative={isCumulative}
                onChange={patchDraft}
              />
            )}

            {needsApprovals && (
              <div className="space-y-3">
                {request.line_items.map((line) => (
                  <div
                    key={line.id}
                    className="grid gap-2 sm:grid-cols-[1fr_140px] sm:items-end"
                  >
                    <div>
                      <p className="text-sm font-medium text-content">
                        {line.product_name}
                      </p>
                      <p className="text-xs text-muted">
                        Requested: {line.quantity_requested}
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`approve-qty-${line.id}`}>Approved qty</Label>
                      <Input
                        id={`approve-qty-${line.id}`}
                        type="number"
                        min={0}
                        max={line.quantity_requested}
                        step={1}
                        value={lineQtys[line.id] ?? ""}
                        onChange={(e) =>
                          setLineQtys((prev) => ({
                            ...prev,
                            [line.id]: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {reportBlocked && (
              <p className="text-sm text-muted">
                Nothing differs from the order yet. Change a quantity or describe
                the problem before reporting.
              </p>
            )}

            {errorMessage && <p className="text-sm text-danger">{errorMessage}</p>}

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
              <Button
                type="button"
                onClick={confirm}
                disabled={isSubmitting || reportBlocked || quantitiesInvalid}
              >
                {isSubmitting ? "Working…" : "Confirm"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
