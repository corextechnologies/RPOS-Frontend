"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  kitchenActionHint,
  kitchenActionLabel,
  kitchenAllowedTransitions,
  kitchenTransitionNeedsConfirm,
  kitchenWaitingCopy,
} from "@/lib/kitchen/request-transitions";
import type {
  KitchenRequest,
  KitchenRequestStatus,
  UpdateKitchenRequestStatusInput,
} from "@/lib/types/kitchen";

interface KitchenRequestActionPanelProps {
  request: KitchenRequest;
  canUpdate: boolean;
  isSubmitting: boolean;
  onSubmit: (body: UpdateKitchenRequestStatusInput) => Promise<void>;
}

/**
 * Callers must key this on `${request.id}-${request.status}`.
 *
 * A pending action and its notes only make sense for the status they were
 * started against — once the request moves (including via a `stale_status`
 * refetch), remounting drops them, which is what the key buys. Resetting in an
 * effect instead would leave one render showing a stale action.
 */
export function KitchenRequestActionPanel({
  request,
  canUpdate,
  isSubmitting,
  onSubmit,
}: KitchenRequestActionPanelProps) {
  const transitions = useMemo(
    () => kitchenAllowedTransitions(request.request_type, request.status),
    [request.request_type, request.status],
  );

  const [pending, setPending] = useState<KitchenRequestStatus | null>(null);
  const [notes, setNotes] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Buttons come from the current status, so an illegal jump cannot be
  // attempted. A sub-chef sees the same read-only card as a manager with
  // nothing to do.
  if (!canUpdate || transitions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
          <CardDescription>
            {canUpdate
              ? kitchenWaitingCopy(request.request_type, request.status)
              : "Your role has read-only access to requests."}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const submit = async (toStatus: KitchenRequestStatus) => {
    await onSubmit({ to_status: toStatus, notes: notes.trim() || undefined });
    setPending(null);
    setNotes("");
    setConfirmOpen(false);
  };

  const start = (toStatus: KitchenRequestStatus) => {
    setPending(toStatus);
    // ALLOCATED spends real stock and cannot be undone from here.
    if (kitchenTransitionNeedsConfirm(toStatus)) setConfirmOpen(true);
  };

  const hint = pending
    ? kitchenActionHint(request.request_type, pending)
    : null;
  const showPanel = pending !== null && !kitchenTransitionNeedsConfirm(pending);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
          <CardDescription>
            Available moves for the current status.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap gap-2">
            {transitions.map((status) => (
              <Button
                key={status}
                type="button"
                variant={pending === status ? "default" : "outline"}
                disabled={isSubmitting}
                onClick={() => start(status)}
              >
                {kitchenActionLabel(status)}
              </Button>
            ))}
          </div>

          {showPanel && (
            <div className="space-y-4 rounded-xl border border-line bg-surface-2 p-4">
              <p className="text-sm font-medium text-content">
                {pending ? kitchenActionLabel(pending) : "Action"}
              </p>
              {hint && <p className="text-sm text-muted">{hint}</p>}

              <div className="space-y-1.5">
                <Label htmlFor="kitchen-action-notes">Notes (optional)</Label>
                <Textarea
                  id="kitchen-action-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add a note for this action"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={() => {
                    setPending(null);
                    setNotes("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={isSubmitting || !pending}
                  onClick={() => pending && void submit(pending)}
                >
                  {isSubmitting ? "Saving…" : "Confirm"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open);
          if (!open) setPending(null);
        }}
        title="Allocate this request to the branch?"
        description="This removes the approved quantities from your kitchen's on-hand stock and cannot be undone from here. If stock is short, the request stays where it is."
        confirmLabel="Allocate stock"
        loading={isSubmitting}
        onConfirm={async () => {
          await submit("ALLOCATED");
        }}
      />
    </>
  );
}
