"use client";

import { useRef, useState } from "react";
import { Check, RotateCw, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProduceDialog } from "@/components/kitchen/ProduceDialog";
import { posErrorMessage, unproducedLineIds } from "@/lib/api/errors";
import {
  useMarkKitchenRequestLineProduced,
  useUpdateKitchenRequestStatus,
} from "@/lib/hooks/use-kitchen-requests";
import { newIdempotencyKey } from "@/lib/pos/idempotency";
import { PRODUCT_KIND_LABEL, productKindBadgeVariant } from "@/lib/product-kind";
import { cn } from "@/lib/utils";
import type { KitchenRequest, KitchenRequestLineItem } from "@/lib/types/kitchen";
import { toast } from "sonner";

/** The approved amount, falling back to requested when there was no partial approval. */
function effectiveQty(line: KitchenRequestLineItem): number {
  return line.quantity_approved ?? line.quantity_requested;
}

/** Zeroed by a partial approval → can't be produced, so it's exempt from the gate. */
function isExempt(line: KitchenRequestLineItem): boolean {
  return line.quantity_approved === 0;
}

function isMade(line: KitchenRequestLineItem): boolean {
  return line.kind === "FINISHED_GOOD";
}

/**
 * The kitchen produces a branch request line by line, in place. Finished goods
 * open the "Make something" dialog (a real production run) before the line is
 * ticked; resale items are set aside. "Mark produced" (IN_PRODUCTION → PRODUCED)
 * only unlocks once every non-exempt line is produced — the server enforces the
 * same gate.
 *
 * Retry safety: produce and tick are separate calls. If produce succeeds but the
 * tick fails, the line enters a "retry" state whose button ticks ONLY — it never
 * re-opens the produce dialog (ticking an already-produced line is a safe no-op).
 * And every produce carries a per-line Idempotency-Key, so even a retried produce
 * replays instead of crediting stock twice.
 */
export function BranchRequestProductionPanel({
  request,
  canUpdate,
}: {
  request: KitchenRequest;
  canUpdate: boolean;
}) {
  const markLine = useMarkKitchenRequestLineProduced(request.id);
  const updateStatus = useUpdateKitchenRequestStatus(request.id);

  const [producingLine, setProducingLine] = useState<KitchenRequestLineItem | null>(null);
  // The idempotency key for the line currently in the dialog — held in state (set
  // when the dialog opens) so render never reads a ref.
  const [producingKey, setProducingKey] = useState<string | undefined>(undefined);
  const [pendingTick, setPendingTick] = useState<Set<string>>(new Set());
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set());
  // Per-line produce Idempotency-Keys, stable across retries; a ref so a re-render
  // never re-mints one mid-flight. The line whose produce is in flight is tracked
  // separately because the dialog nulls `producingLine` before onProduced fires.
  const lineKeys = useRef<Record<string, string>>({});
  const inFlightLineId = useRef<string | null>(null);

  const requiredLines = request.line_items.filter((l) => !isExempt(l));
  const allProduced =
    requiredLines.length > 0 && requiredLines.every((l) => l.produced);

  if (!canUpdate) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Production</CardTitle>
          <CardDescription>Your role has read-only access to requests.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const setPending = (lineId: string, on: boolean) =>
    setPendingTick((prev) => {
      const next = new Set(prev);
      if (on) next.add(lineId);
      else next.delete(lineId);
      return next;
    });

  const tickLine = (lineId: string) => {
    markLine.mutate(lineId, {
      onSuccess: () => {
        setPending(lineId, false);
        delete lineKeys.current[lineId];
      },
      onError: (err) => {
        setPending(lineId, true);
        toast.error(posErrorMessage(err));
      },
    });
  };

  const startMakeMade = (line: KitchenRequestLineItem) => {
    const key = lineKeys.current[line.id] ?? newIdempotencyKey();
    lineKeys.current[line.id] = key;
    inFlightLineId.current = line.id;
    setProducingKey(key);
    setProducingLine(line);
  };

  const markProduced = () => {
    updateStatus.mutate(
      { to_status: "PRODUCED" },
      {
        onError: (err) => {
          // Belt-and-braces: the button is already gated on `allProduced`, but if
          // the client is stale the server still 409s — highlight the culprits.
          const ids = unproducedLineIds(err);
          if (ids.length) setHighlighted(new Set(ids));
        },
      },
    );
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Production</CardTitle>
          <CardDescription>
            Make each product, then mark the request produced. Made items open the
            production dialog; resale items are set aside.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ul className="space-y-2">
            {request.line_items.map((line) => {
              const exempt = isExempt(line);
              return (
                <li
                  key={line.id}
                  className={cn(
                    "flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3",
                    highlighted.has(line.id)
                      ? "border-danger bg-danger/5"
                      : "border-line bg-surface-2",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "font-medium",
                        exempt ? "text-faint line-through" : "text-content",
                      )}
                    >
                      {effectiveQty(line)}× {line.product_name}
                    </span>
                    {line.kind && (
                      <Badge variant={productKindBadgeVariant(line.kind)}>
                        {PRODUCT_KIND_LABEL[line.kind]}
                      </Badge>
                    )}
                  </div>

                  {exempt ? (
                    <span className="text-xs text-faint">Not required</span>
                  ) : line.produced ? (
                    <Badge variant="success">
                      <Check className="mr-1 size-3.5" aria-hidden />
                      Ready
                    </Badge>
                  ) : pendingTick.has(line.id) ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={markLine.isPending}
                      onClick={() => tickLine(line.id)}
                    >
                      <RotateCw className="mr-1.5 size-3.5" aria-hidden />
                      Retry
                    </Button>
                  ) : isMade(line) ? (
                    <Button variant="outline" size="sm" onClick={() => startMakeMade(line)}>
                      Mark made
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={markLine.isPending}
                      onClick={() => tickLine(line.id)}
                    >
                      Set aside
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="flex items-center justify-between gap-3 pt-1">
            <p className="text-xs text-muted">
              {allProduced
                ? "All products ready."
                : "Make every product to mark this request produced."}
            </p>
            <Button disabled={!allProduced || updateStatus.isPending} onClick={markProduced}>
              <Send className="mr-1.5 size-4" aria-hidden />
              Mark produced
            </Button>
          </div>
        </CardContent>
      </Card>

      <ProduceDialog
        open={producingLine !== null}
        onOpenChange={(o) => {
          if (!o) setProducingLine(null);
        }}
        initialProductId={producingLine?.product_id}
        initialQuantity={producingLine ? effectiveQty(producingLine) : undefined}
        initialProductName={producingLine?.product_name}
        lockProduct
        idempotencyKey={producingKey}
        onProduced={() => {
          const lineId = inFlightLineId.current;
          if (lineId) tickLine(lineId);
        }}
      />
    </>
  );
}
