"use client";

import { useEffect, useMemo, useState } from "react";
import {
  actionLabel,
  allowedTransitions,
  isDestructiveTransition,
} from "@/lib/admin/request-transitions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useKitchens } from "@/lib/hooks/use-locations";
import { requestActionSchema } from "@/lib/schemas/request-action";
import type {
  RequestStatus,
  StockRequest,
  UpdateRequestStatusInput,
} from "@/lib/types/admin";

interface RequestActionPanelProps {
  request: StockRequest;
  canUpdate: boolean;
  isSubmitting: boolean;
  onSubmit: (body: UpdateRequestStatusInput) => Promise<void>;
}

export function RequestActionPanel({
  request,
  canUpdate,
  isSubmitting,
  onSubmit,
}: RequestActionPanelProps) {
  const transitions = useMemo(
    () => allowedTransitions(request.type, request.status),
    [request.type, request.status],
  );

  const [selected, setSelected] = useState<RequestStatus | null>(null);
  const [notes, setNotes] = useState("");
  const [lineQtys, setLineQtys] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      request.line_items.map((line) => [
        line.id,
        String(line.quantity_approved ?? line.quantity_requested),
      ]),
    ),
  );
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [kitchenId, setKitchenId] = useState("");

  // Only the forward action needs this, but the request is cached and shared, so
  // fetching here keeps the picker colocated with its one consumer.
  const kitchens = useKitchens();

  useEffect(() => {
    setSelected(null);
    setNotes("");
    setErrorMessage(undefined);
    setRejectOpen(false);
    setKitchenId("");
    setLineQtys(
      Object.fromEntries(
        request.line_items.map((line) => [
          line.id,
          String(line.quantity_approved ?? line.quantity_requested),
        ]),
      ),
    );
  }, [request.id, request.status]);

  if (!canUpdate) return null;

  if (transitions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
          <CardDescription>No Admin actions available in this status.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const startAction = (toStatus: RequestStatus) => {
    setErrorMessage(undefined);
    if (isDestructiveTransition(toStatus)) {
      setSelected(toStatus);
      setRejectOpen(true);
      return;
    }
    setSelected(toStatus);
    if (toStatus === "PARTIALLY_APPROVED") {
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

  const submit = async (toStatus: RequestStatus) => {
    setErrorMessage(undefined);

    const line_approvals =
      toStatus === "PARTIALLY_APPROVED"
        ? request.line_items.map((line) => ({
            line_id: line.id,
            quantity_approved: Number(lineQtys[line.id]),
          }))
        : undefined;

    const forwarding = toStatus === "FORWARDED_TO_KITCHEN";

    const parsed = requestActionSchema.safeParse({
      to_status: toStatus,
      notes: notes.trim() || undefined,
      line_approvals,
      target_location_type: forwarding ? "KITCHEN" : undefined,
      target_location_id: forwarding ? kitchenId || undefined : undefined,
    });

    if (!parsed.success) {
      setErrorMessage(parsed.error.issues[0]?.message ?? "Invalid action");
      return;
    }

    if (toStatus === "PARTIALLY_APPROVED" && line_approvals) {
      for (const line of request.line_items) {
        const approval = line_approvals.find((a) => a.line_id === line.id);
        if (
          !approval ||
          !Number.isFinite(approval.quantity_approved) ||
          approval.quantity_approved > line.quantity_requested
        ) {
          setErrorMessage(
            `Enter a valid quantity for ${line.product_name} (0–${line.quantity_requested}).`,
          );
          return;
        }
      }
    }

    const body: UpdateRequestStatusInput = {
      to_status: parsed.data.to_status,
      notes: parsed.data.notes,
      line_approvals: parsed.data.line_approvals,
      target_location_type: parsed.data.target_location_type,
      target_location_id: parsed.data.target_location_id,
    };

    try {
      await onSubmit(body);
      setSelected(null);
      setNotes("");
      setKitchenId("");
      setRejectOpen(false);
    } catch (err) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Failed to update request.");
      }
    }
  };

  const showPartialEditor = selected === "PARTIALLY_APPROVED";
  const showConfirmPanel =
    selected !== null && selected !== "REJECTED" && selected !== "PARTIALLY_APPROVED";
  const showKitchenPicker = selected === "FORWARDED_TO_KITCHEN";
  const kitchenOptions = kitchens.data ?? [];
  const forwardBlocked = showKitchenPicker && !kitchenId;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
          <CardDescription>
            Available transitions for the current status. Partial approval requires per-line quantities.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap gap-2">
            {transitions.map((toStatus) => (
              <Button
                key={toStatus}
                type="button"
                variant={isDestructiveTransition(toStatus) ? "destructive" : "outline"}
                disabled={isSubmitting}
                onClick={() => startAction(toStatus)}
              >
                {actionLabel(toStatus)}
              </Button>
            ))}
          </div>

          {(showPartialEditor || showConfirmPanel) && (
            <div className="space-y-4 rounded-xl border border-line bg-surface-2 p-4">
              <p className="text-sm font-medium text-content">
                {selected ? actionLabel(selected) : "Action"}
              </p>

              {showPartialEditor && (
                <div className="space-y-3">
                  {request.line_items.map((line) => (
                    <div key={line.id} className="grid gap-2 sm:grid-cols-[1fr_140px] sm:items-end">
                      <div>
                        <p className="text-sm font-medium text-content">{line.product_name}</p>
                        <p className="text-xs text-muted">
                          Requested: {line.quantity_requested}
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`qty-${line.id}`}>Approved qty</Label>
                        <Input
                          id={`qty-${line.id}`}
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

              {showKitchenPicker && (
                <div className="space-y-1.5">
                  <Label htmlFor="forward-kitchen">Kitchen</Label>
                  {kitchens.isError ? (
                    <p className="text-sm text-danger">
                      Could not load kitchens.{" "}
                      <button
                        type="button"
                        className="underline"
                        onClick={() => void kitchens.refetch()}
                      >
                        Retry
                      </button>
                    </p>
                  ) : kitchenOptions.length === 0 && !kitchens.isLoading ? (
                    <p className="text-sm text-muted">
                      No kitchens exist yet. Create one before forwarding this request.
                    </p>
                  ) : (
                    <Select value={kitchenId} onValueChange={setKitchenId}>
                      <SelectTrigger id="forward-kitchen" disabled={kitchens.isLoading}>
                        <SelectValue
                          placeholder={kitchens.isLoading ? "Loading…" : "Choose a kitchen"}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {kitchenOptions.map((kitchen) => (
                          <SelectItem key={kitchen.id} value={kitchen.id}>
                            {kitchen.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <p className="text-xs text-muted">
                    Only this kitchen will see the request.
                  </p>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="action-notes">Notes (optional)</Label>
                <Textarea
                  id="action-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add a note for this action"
                  rows={3}
                />
              </div>

              {errorMessage && <p className="text-sm text-danger">{errorMessage}</p>}

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={() => {
                    setSelected(null);
                    setErrorMessage(undefined);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={isSubmitting || !selected || forwardBlocked}
                  onClick={() => selected && void submit(selected)}
                >
                  {isSubmitting ? "Saving…" : "Confirm"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={rejectOpen}
        onOpenChange={(open) => {
          setRejectOpen(open);
          if (!open) setSelected(null);
        }}
        title="Reject this request?"
        description="This will mark the request as rejected. This action cannot be undone from the Admin portal."
        confirmLabel="Reject request"
        destructive
        loading={isSubmitting}
        onConfirm={async () => {
          await submit("REJECTED");
        }}
      />
    </>
  );
}
